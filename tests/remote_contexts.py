#!/usr/bin/env python3
"""Real Docker CLI + verified TLS/SSH against isolated synthetic Engine APIs.

Run in the disposable Debian builder (root solely to run its isolated sshd).
No default daemon, user context, credential directory or external host is used.
"""
import json
import os
from pathlib import Path
import shutil
import socket
import ssl
import subprocess
import tempfile
import threading
import time
from http.server import ThreadingHTTPServer
from native_desktop import FakeEngine, Handler


def main():
    if os.geteuid() != 0 or not shutil.which("sshd") or not shutil.which("docker"):
        raise SystemExit("Run inside the disposable builder with Docker CLI, openssl and openssh-server")
    os.umask(0o077)
    root = Path(__file__).resolve().parents[1]
    checks = []
    def check(name, value):
        assert value, name
        checks.append(name)
        print("PASS:", name, flush=True)

    # sshd StrictModes requires every authorized-key parent to be private;
    # /tmp is intentionally world-writable, even with a private child directory.
    with tempfile.TemporaryDirectory(prefix=".cleanup-remote-", dir="/root") as temporary:
        t = Path(temporary)
        env = {**os.environ, "DOCKER_CONFIG": str(t / "config"),
               "DOCKER_CLEANUP_RPC_DATABASE": str(t / "history.sqlite")}
        for key in ["DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH"]:
            env.pop(key, None)
        def cmd(*args):
            return subprocess.check_output(args, env=env, stderr=subprocess.DEVNULL, text=True)
        def docker(*args):
            return cmd("docker", *args)
        version = docker("--version").strip()
        for name in ["ca", "server", "client"]:
            cmd("openssl", "req", "-newkey", "rsa:2048", "-nodes", "-keyout", str(t / f"{name}.key"),
                "-out", str(t / f"{name}.csr"), "-subj", f"/CN={name}")
        cmd("openssl", "x509", "-req", "-in", str(t / "ca.csr"), "-signkey", str(t / "ca.key"),
            "-out", str(t / "ca.pem"), "-days", "1")
        (t / "extensions").write_text("subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n")
        for name in ["server", "client"]:
            args = ["openssl", "x509", "-req", "-in", str(t / f"{name}.csr"), "-CA", str(t / "ca.pem"),
                    "-CAkey", str(t / "ca.key"), "-CAcreateserial", "-out", str(t / f"{name}.pem"), "-days", "1"]
            if name == "server":
                args += ["-extfile", str(t / "extensions")]
            cmd(*args)
        Handler.removed = False
        Handler.mutations = []
        unix = FakeEngine(str(t / "engine.sock"), Handler)
        tls = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(t / "server.pem", t / "server.key")
        context.load_verify_locations(t / "ca.pem")
        context.verify_mode = ssl.CERT_REQUIRED
        tls.socket = context.wrap_socket(tls.socket, server_side=True)
        for server in [unix, tls]:
            threading.Thread(target=server.serve_forever, daemon=True).start()
        tls_host = f"tcp://127.0.0.1:{tls.server_port}"
        tls_options = f"host={tls_host},ca={t}/ca.pem,cert={t}/client.pem,key={t}/client.key"
        docker("context", "create", "verified-tls", "--docker", tls_options)
        docker("context", "create", "insecure", "--docker", "host=tcp://127.0.0.1:1")
        docker("context", "create", "skip-verification", "--docker", tls_options + ",skip-tls-verify=true")
        for name in ["host", "client"]:
            cmd("ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(t / f"ssh-{name}"))
        (t / "authorized_keys").write_text((t / "ssh-client.pub").read_text())
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            port = s.getsockname()[1]
        (t / "known_hosts").write_text(f"[127.0.0.1]:{port} " + (t / "ssh-host.pub").read_text())
        # Isolate SSH configuration/trust without touching /root/.ssh.
        (t / "ssh_config").write_text(f"Host *\n  IdentityFile {t}/ssh-client\n  UserKnownHostsFile {t}/known_hosts\n  StrictHostKeyChecking yes\n  BatchMode yes\n")
        (t / "bin").mkdir()
        (t / "bin/ssh").write_text(f"#!/bin/sh\nexec /usr/bin/ssh -F '{t}/ssh_config' \"$@\"\n")
        (t / "bin/ssh").chmod(0o700)
        env["PATH"] = str(t / "bin") + ":" + env["PATH"]
        (t / "bridge.py").write_text(
            "import socket,sys,threading\n"
            f"s=socket.socket(socket.AF_UNIX);s.connect({str(t / 'engine.sock')!r})\n"
            "def send():\n"
            " while True:\n"
            "  b=sys.stdin.buffer.read1(65536)\n"
            "  if not b:break\n"
            "  s.sendall(b)\n"
            " s.shutdown(socket.SHUT_WR)\n"
            "threading.Thread(target=send,daemon=True).start()\n"
            "while True:\n"
            " b=s.recv(65536)\n"
            " if not b:break\n"
            " sys.stdout.buffer.write(b);sys.stdout.buffer.flush()\n"
        )
        Path("/run/sshd").mkdir(exist_ok=True)
        Path("/run/sshd").chmod(0o755)
        (t / "sshd_config").write_text(
            f"Port {port}\nListenAddress 127.0.0.1\nHostKey {t}/ssh-host\nPidFile {t}/sshd.pid\n"
            f"AuthorizedKeysFile {t}/authorized_keys\nStrictModes yes\nPasswordAuthentication no\n"
            "KbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\nUsePAM yes\n"
            f"ForceCommand /usr/bin/python3 {t}/bridge.py\nAllowTcpForwarding no\nPermitTTY no\n"
        )
        log = (t / "log").open("w")
        sshd = subprocess.Popen(["/usr/sbin/sshd", "-D", "-e", "-f", str(t / "sshd_config")], stdout=log, stderr=log)
        rpc = None
        try:
            for _ in range(100):
                try:
                    with socket.create_connection(("127.0.0.1", port), timeout=0.1):
                        break
                except OSError:
                    time.sleep(0.05)
            docker("context", "create", "verified-ssh", "--docker", f"host=ssh://root@127.0.0.1:{port}")
            docker("context", "use", "insecure")
            env["DOCKER_HOST"] = "tcp://127.0.0.1:1"
            env["DOCKER_CONTEXT"] = "nonexistent-implicit-context"
            binary = os.environ.get("DOCKER_CLEANUP_RPC_BINARY", str(root / "src-tauri/target/debug/cleanup-rpc"))
            def start():
                return subprocess.Popen([binary], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True, env=env)
            rpc = start()
            def call(kind, **fields):
                rpc.stdin.write(json.dumps({"type": kind, **fields}) + "\n")
                rpc.stdin.flush()
                line = rpc.stdout.readline()
                assert line, "RPC exited"
                value = json.loads(line)
                if "error" in value:
                    raise RuntimeError(value["error"])
                return value["ok"]
            def rejected(kind, **fields):
                try:
                    call(kind, **fields)
                except RuntimeError as error:
                    return str(error)
                raise AssertionError(f"{kind} should be rejected")
            listing = call("contexts")
            check("explicit discovery lists only SSH and verified TLS, not insecure/local contexts",
                  {c["name"] for c in listing} == {"verified-tls", "verified-ssh"})
            for endpoint in ["tcp://127.0.0.1:1", "context://insecure", "context://skip-verification"]:
                check("insecure transport refused: " + endpoint, bool(rejected("scan", endpoint=endpoint)))
            first = call("scan", endpoint="context://verified-tls")
            check("real CLI verified mutual-TLS connects despite poisoned implicit environment",
                  first["daemonId"] == "native-fixture-daemon" and first["capabilities"]["location"] == "remote")
            call("saveAsset", key="volume:keep-database", alias="TLS-only alias", project="TLS project", protected=True)
            check("remote protected volume refuses cleanup", "protected" in rejected("plan", keys=["volume:keep-database"]))
            plan = call("plan", keys=["container:native-old"])
            check("review records explicit context and resolved remote target",
                  plan["endpoint"] == first["endpoint"] and plan["target"] == tls_host)
            check("remote deletion still requires confirmation", "confirm" in rejected("execute", planId=plan["id"], confirmed=False, confirmVolumes=False, confirmCacheScope=False))
            second = call("scan", endpoint="context://verified-ssh")
            volume = next(a for a in second["assets"] if a["id"] == "keep-database")
            check("real authenticated SSH connects; same-daemon endpoint state stays isolated",
                  second["daemonId"] == first["daemonId"] and volume["alias"] == "" and not volume["protected"])
            check("same-daemon endpoint switch invalidates old plan", "expired" in rejected("execute", planId=plan["id"], confirmed=True, confirmVolumes=False, confirmCacheScope=False))
            known_hosts = (t / "known_hosts").read_text()
            (t / "known_hosts").write_text("")
            error = rejected("scan", endpoint="context://verified-ssh")
            check("unknown SSH host trust fails closed without credential disclosure",
                  "connection failed" in error and str(t) not in error)
            (t / "known_hosts").write_text(known_hosts)
            call("scan", endpoint="context://verified-ssh")
            proc = call("processes", key="container:native-old")
            check("remote process collection never correlates local /proc",
                  proc["host"] == [] and any("Remote Engine" in n for n in proc["notes"]))
            check("remote mount/project evidence explicitly labelled daemon-side",
                  all(any("daemon-side" in e for e in a["evidence"]) for a in second["assets"]))
            ssh_plan = call("plan", keys=["container:native-old"])
            rejected("scan", endpoint="context://does-not-exist")
            check("failed switch also invalidates executable plan", "expired" in rejected("execute", planId=ssh_plan["id"], confirmed=True, confirmVolumes=False, confirmCacheScope=False))
            call("scan", endpoint="context://verified-tls")
            plan = call("plan", keys=["container:native-old"])
            # Same context name and same daemon, different resolved address.
            env.pop("DOCKER_CONTEXT"); env.pop("DOCKER_HOST")
            docker("context", "update", "verified-tls", "--docker", tls_options.replace(tls_host, f"tcp://localhost:{tls.server_port}"))
            stale = call("execute", planId=plan["id"], confirmed=True, confirmVolumes=False, confirmCacheScope=False)
            check("retargeted context cannot mutate even the same daemon",
                  not Handler.mutations and all(o["status"] == "failed" for o in stale["outcomes"]))
            # Restore original target and prove persisted endpoint preferences.
            docker("context", "update", "verified-tls", "--docker", tls_options)
            rpc.stdin.close(); rpc.wait(timeout=10)
            rpc = start()
            restored = call("scan", endpoint="context://verified-tls")
            volume = next(a for a in restored["assets"] if a["id"] == "keep-database")
            check("remote aliases projects protections persist across service restart",
                  volume["alias"] == "TLS-only alias" and volume["project"] == "TLS project" and volume["protected"])
            plan = call("plan", keys=["container:native-old"])
            result = call("execute", planId=plan["id"], confirmed=True, confirmVolumes=False, confirmCacheScope=False)
            check("reviewed remote container removal is non-forced with mounted data retained",
                  Handler.mutations == ["/v1.56/containers/native-old?force=false&v=false"]
                  and result["outcomes"][0]["status"] == "deleted"
                  and any(a["id"] == "keep-database" for a in result["after"]["assets"]))
            check("remote execution cannot be replayed", "consumed" in rejected("execute", planId=plan["id"], confirmed=True, confirmVolumes=False, confirmCacheScope=False))
            check("remote result history retains truthful endpoint and daemon identity",
                  any(r["before"]["endpoint"] == "context://verified-tls" and r["plan"]["daemonId"] == first["daemonId"] for r in call("history")))
            # Replacing stored CA causes real TLS authentication failure, not fallback.
            meta = json.loads(docker("context", "inspect", "verified-tls"))[0]
            ca = Path(meta["Storage"]["TLSPath"]) / "docker/ca.pem"
            ca.write_text("invalid CA")
            error = rejected("scan", endpoint="context://verified-tls")
            check("TLS authentication failure is fail-closed and redacted",
                  "connection failed" in error and str(t) not in error and "PRIVATE" not in error)
            rpc.stdin.close(); rpc.wait(timeout=10); rpc = None
            rpc = subprocess.Popen([binary], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True,
                                   env={**env, "PATH": "/nonexistent-no-cli"})
            local = call("scan", endpoint="unix://" + str(t / "engine.sock"))
            check("direct Unix transport works without Docker CLI and does not inherit remote preferences",
                  local["capabilities"]["location"] == "local"
                  and next(a for a in local["assets"] if a["id"] == "keep-database")["alias"] == "")
            rpc.stdin.close(); rpc.wait(timeout=10); rpc = None
            db = (t / "history.sqlite").read_bytes()
            check("persisted state contains no context credential paths or key contents",
                  str(t / "config").encode() not in db and b"PRIVATE KEY" not in db)
            (root / "artifacts").mkdir(exist_ok=True)
            (root / "artifacts/remote-context-report.json").write_text(json.dumps({
                "cli": version, "checks": checks, "mutations": Handler.mutations,
                "scope": "Real CLI/loopback SSH and mutual-TLS; synthetic Engine API, no external host",
            }, indent=2))
            print(f"Remote contexts: {len(checks)} checks passed.", flush=True)
        except Exception:
            log.flush()
            print((t / "log").read_text()[-4000:], flush=True)
            raise
        finally:
            if rpc:
                rpc.stdin.close(); rpc.wait(timeout=10)
            sshd.terminate(); sshd.wait(timeout=10)
            for server in [tls, unix]:
                server.shutdown(); server.server_close()
            log.close()


if __name__ == "__main__":
    main()
