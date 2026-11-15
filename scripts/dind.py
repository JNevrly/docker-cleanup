#!/usr/bin/env python3
"""Explicit, identity-checked access to the disposable integration daemon."""
import argparse
import http.client
import io
import json
import os
from pathlib import Path
import socket
import struct
import sys
import tarfile
import time
from urllib.parse import urlencode


class Engine:
    def __init__(self):
        self.path = Path("/other_mounts/test-docker/docker.sock")
        self.expected = self.path.with_name("expected-daemon-id").read_text().strip()
        info = self.request("GET", "/info")
        if info["ID"] != self.expected or "docker-cleanup.test-daemon=true" not in info.get("Labels", []):
            raise RuntimeError("Refusing unexpected daemon")

    def request(self, method, path, data=None, raw=False, headers=None):
        conn = http.client.HTTPConnection("localhost", timeout=900)
        conn.sock = socket.socket(socket.AF_UNIX)
        conn.sock.settimeout(900)
        conn.sock.connect(str(self.path))
        if isinstance(data, dict):
            data = json.dumps(data).encode()
            headers = {"Content-Type": "application/json", **(headers or {})}
        try:
            conn.request(method, path, data, headers or {})
            res = conn.getresponse()
            body = res.read()
            if res.status >= 300:
                raise RuntimeError(f"{method} {path}: {res.status} {body[:1000]!r}")
            return body if raw else json.loads(body or b"{}")
        finally:
            conn.close()

    def create(self, image, name, cmd=None):
        self.request("POST", "/images/create?" + urlencode({"fromImage": image}), raw=True)
        return self.request("POST", "/containers/create?" + urlencode({"name": name}), {
            "Image": image, "Cmd": cmd or ["sleep", "infinity"],
            "Labels": {"docker-cleanup.integration": "true"},
            "HostConfig": {"ShmSize": 1073741824},
        })["Id"]

    def exec(self, container, args):
        eid = self.request("POST", f"/containers/{container}/exec", {
            "Cmd": args, "AttachStdout": True, "AttachStderr": True,
        })["Id"]
        data = self.request("POST", f"/exec/{eid}/start", {"Detach": False, "Tty": False}, raw=True)
        while len(data) >= 8:
            length = struct.unpack(">I", data[4:8])[0]
            sys.stdout.buffer.write(data[8:8 + length])
            sys.stdout.buffer.flush()
            data = data[8 + length:]
        code = self.request("GET", f"/exec/{eid}/json")["ExitCode"]
        if code:
            raise RuntimeError(f"Container command failed with exit code {code}")

    def upload(self, container, source):
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive, mode="w") as tar:
            def include(info):
                if any(p in ("node_modules", "target", ".git", "artifacts", ".venv", ".cache") for p in Path(info.name).parts):
                    return None
                return info
            tar.add(source, arcname="workspace", filter=include)
        self.request("PUT", f"/containers/{container}/archive?path=/", archive.getvalue(), raw=True,
                     headers={"Content-Type": "application/x-tar"})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["setup", "install-node", "sync", "exec", "download"])
    parser.add_argument("args", nargs="*")
    options = parser.parse_args()
    engine = Engine()
    name = "docker-cleanup-builder"
    if options.action == "setup":
        cid = engine.create("rust:1.100.0-bookworm", name)
        engine.request("POST", f"/containers/{cid}/start", raw=True)
        engine.exec(cid, ["bash", "-lc",
            "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y "
            "libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev "
            "libssl-dev librsvg2-dev libayatana-appindicator3-dev patchelf "
            "nodejs npm xvfb xauth dbus-x11 webkit2gtk-driver"])
        install_node(engine, name)
    elif options.action == "install-node":
        install_node(engine, name)
    elif options.action == "sync":
        engine.upload(name, Path(__file__).resolve().parents[1])
    elif options.action == "exec":
        engine.exec(name, ["bash", "-lc", "export PATH=/usr/local/cargo/bin:$PATH; cd /workspace && " + " ".join(options.args)])
    elif options.action == "download":
        data = engine.request("GET", f"/containers/{name}/archive?" + urlencode({"path": options.args[0]}), raw=True)
        destination = Path(options.args[1])
        destination.mkdir(parents=True, exist_ok=True)
        with tarfile.open(fileobj=io.BytesIO(data)) as tar:
            for member in tar:
                target = (destination / member.name).resolve()
                if not target.is_relative_to(destination.resolve()):
                    raise RuntimeError("Unsafe archive path")
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                elif member.isfile():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with tar.extractfile(member) as source:
                        target.write_bytes(source.read())
                    target.chmod(member.mode & 0o777)
                else:
                    raise RuntimeError("Unsupported archive entry (links are refused)")


def install_node(engine, builder):
    # Use the official Node image rather than a curl-to-shell installer.
    source = engine.create("node:24-bookworm-slim", "docker-cleanup-node-source")
    try:
        archive = engine.request("GET", f"/containers/{source}/archive?path=/usr/local/bin/node", raw=True)
        engine.request("PUT", f"/containers/{builder}/archive?path=/usr/local/bin", archive, raw=True,
                       headers={"Content-Type": "application/x-tar"})
    finally:
        engine.request("DELETE", f"/containers/{source}?v=true", raw=True)
    engine.exec(builder, ["/usr/local/bin/node", "--version"])


if __name__ == "__main__":
    main()
