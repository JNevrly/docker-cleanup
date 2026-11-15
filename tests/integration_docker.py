#!/usr/bin/env python3
"""Opt-in live journey against the explicit disposable daemon, never defaults."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from dind import Engine


def main():
    if os.environ.get("DOCKER_CLEANUP_ALLOW_DESTRUCTIVE_TESTS") != "1":
        raise SystemExit("Set DOCKER_CLEANUP_ALLOW_DESTRUCTIVE_TESTS=1 explicitly")
    endpoint = os.environ.get("DOCKER_CLEANUP_TEST_ENDPOINT")
    if endpoint != "unix:///other_mounts/test-docker/docker.sock":
        raise SystemExit("Explicit verified disposable endpoint required; no default fallback")
    engine = Engine()
    binary = Path(os.environ.get("DOCKER_CLEANUP_RPC_BINARY", "artifacts/cleanup-rpc")).resolve()
    prefix = "cleanup-it-" + uuid.uuid4().hex[:10]
    containers, volumes, images = [], [], []
    root = Path(__file__).resolve().parents[1]
    (root / ".cache").mkdir(exist_ok=True)
    checks = []
    with tempfile.TemporaryDirectory(dir=root / ".cache") as scratch:
        log = open(Path(scratch) / "rpc.log", "w")
        rpc = subprocess.Popen([str(binary)], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=log, text=True,
                               env={**os.environ, "DOCKER_CLEANUP_RPC_DATABASE": str(Path(scratch) / "history.sqlite")})

        def call(kind, **fields):
            rpc.stdin.write(json.dumps({"type": kind, **fields}) + "\n")
            rpc.stdin.flush()
            value = json.loads(rpc.stdout.readline())
            if "error" in value:
                raise RuntimeError(value["error"])
            return value["ok"]

        def rejected(kind, **fields):
            try:
                call(kind, **fields)
            except RuntimeError as error:
                return str(error)
            raise AssertionError(f"{kind} should have been rejected")

        def check(name, condition):
            assert condition, name
            checks.append(name)
            print("PASS:", name, flush=True)

        def create(name, cmd, mounts=None):
            cid = engine.request("POST", "/containers/create?name=" + prefix + "-" + name, {
                "Image": "alpine:3.22", "Cmd": cmd,
                "Labels": {"docker-cleanup.integration": prefix, "devcontainer.local_folder": "/synthetic/workspace"},
                "HostConfig": {"Mounts": mounts or []},
            })["Id"]
            containers.append(cid)
            engine.request("POST", f"/containers/{cid}/start", raw=True)
            return cid

        try:
            engine.request("POST", "/images/create?fromImage=alpine:3.22", raw=True)
            for suffix in ["shared", "database", "orphan", "disposable"]:
                name = prefix + "-" + suffix
                engine.request("POST", "/volumes/create", {"Name": name, "Labels": {"docker-cleanup.integration": prefix}})
                volumes.append(name)
            mounts = [{"Type": "volume", "Source": volumes[0], "Target": "/tools"}]
            old = create("old", ["sh", "-c", "mkdir -p /scratch; dd if=/dev/zero of=/scratch/data bs=1M count=4"], mounts)
            engine.request("POST", f"/containers/{old}/wait")
            recent = create("recent", ["true"], mounts)
            engine.request("POST", f"/containers/{recent}/wait")
            database = create("database", ["true"], [{"Type": "volume", "Source": volumes[1], "Target": "/data"}])
            engine.request("POST", f"/containers/{database}/wait")
            running = create("running", ["sleep", "600"])
            image = engine.request("POST", f"/commit?container={old}&repo={prefix}&tag=dev")["Id"]
            images.append(image)
            child = engine.request("POST", "/containers/create?name=" + prefix + "-image-user", {
                "Image": image, "Cmd": ["true"], "Labels": {"docker-cleanup.integration": prefix},
            })["Id"]
            containers.append(child)
            snapshot = call("scan", endpoint=endpoint)
            check("daemon identity verified by actual Rust adapter", snapshot["daemonId"] == engine.expected)
            old_asset = next(a for a in snapshot["assets"] if a["id"] == old)
            check("actual writable bytes and devcontainer attribution", old_asset["bytes"] >= 4 * 1024 ** 2 and old_asset["project"] == "/synthetic/workspace")
            diff = call("diff", key="container:" + old)
            check("changed-path investigation", any(c["Path"] == "/scratch/data" for c in diff["changes"]))
            meta = call("inspect", key="container:" + old)
            check("environment omitted from inspected metadata", "Env" not in meta.get("Config", {}))
            proc = call("processes", key="container:" + running)
            check("running process evidence collected without exec", proc["container"] is not None)
            check("running-container removal blocked", "stopped" in rejected("plan", keys=["container:" + running]))
            check("referenced database volume removal blocked", "references" in rejected("plan", keys=["volume:" + volumes[1]]))
            call("saveAsset", key="volume:" + volumes[2], alias="Keep orphan database", project="database", protected=True)
            check("protected volume removal blocked", "protected" in rejected("plan", keys=["volume:" + volumes[2]]))
            plan = call("plan", keys=["container:" + old, "container:" + child])
            check("newly unreferenced image is follow-up, not implicitly selected",
                  "image:" + image in plan["newlyEligible"] and not any(a["kind"] == "image" for a in plan["actions"]))
            check("unconfirmed cleanup rejected", "confirm" in rejected("execute", planId=plan["id"], confirmed=False, confirmVolumes=False, confirmCacheScope=False))
            result = call("execute", planId=plan["id"], confirmed=True, confirmVolumes=False, confirmCacheScope=False)
            check("reviewed stopped containers removed", all(o["status"] == "deleted" for o in result["outcomes"]))
            check("shared and database volumes retained", all(v in [a["id"] for a in result["after"]["assets"] if a["kind"] == "volume"] for v in volumes))
            check("no fabricated reclaimed-byte or host-free-space figures", result["reportedReclaimed"] is None and result["hostFreeDelta"] is None)
            plan2 = call("plan", keys=["image:" + image])
            result2 = call("execute", planId=plan2["id"], confirmed=True, confirmVolumes=False, confirmCacheScope=False)
            check("separate follow-up image deletion succeeds", result2["outcomes"][0]["status"] == "deleted")
            images.remove(image)
            # Safety guard: prune preview is not execution. Other fixtures/builder stay untouched.
            preview = call("prunePlan", scope="volumes", olderThanDays=None)
            check("scoped prune preview excludes protected orphan database", "volume:" + volumes[2] not in [a["key"] for a in preview["actions"]])
            check("volume execution requires separate data-loss acknowledgement",
                  "confirm" in rejected("execute", planId=preview["id"], confirmed=True, confirmVolumes=False, confirmCacheScope=False))
            volume_result = call("execute", planId=preview["id"], confirmed=True, confirmVolumes=True, confirmCacheScope=False)
            check("explicitly confirmed unreferenced test volume removed", volume_result["outcomes"][0]["status"] == "deleted")
            volumes.remove(prefix + "-disposable")
            check("cleanup history persists results", len(call("history")) >= 2)
            rpc.stdin.close()
            rpc.wait(timeout=10)
            # Restart the domain service to verify persistence, not just in-memory state.
            rpc = subprocess.Popen([str(binary)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True,
                                   env={**os.environ, "DOCKER_CLEANUP_RPC_DATABASE": str(Path(scratch) / "history.sqlite")})
            restart = call("scan", endpoint=endpoint)
            kept = next(a for a in restart["assets"] if a["id"] == volumes[2])
            check("aliases and protections survive service restart", kept["protected"] and kept["alias"] == "Keep orphan database")
            check("results survive service restart", len(call("history")) >= 2)
            (root / "artifacts").mkdir(exist_ok=True)
            (root / "artifacts/integration-report.json").write_text(json.dumps({
                "daemonId": engine.expected, "checks": checks, "result": result, "followUp": result2,
            }, indent=2))
            print(f"Live integration: {len(checks)} checks passed.", flush=True)
        finally:
            if rpc.poll() is None:
                rpc.stdin.close()
                rpc.wait(timeout=10)
            log.close()
            # Only resources created by this invocation; never global prune.
            for cid in reversed(containers):
                try:
                    engine.request("DELETE", f"/containers/{cid}?force=true&v=false", raw=True)
                except RuntimeError:
                    pass
            for image in images:
                try:
                    engine.request("DELETE", f"/images/{image}?force=false&noprune=true", raw=True)
                except RuntimeError:
                    pass
            for volume in volumes:
                engine.request("DELETE", f"/volumes/{volume}?force=false", raw=True)


if __name__ == "__main__":
    main()
