#!/usr/bin/env python3
"""Normalize Tauri's generated Debian archive using reproducible dpkg metadata."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if not epoch or not epoch.isdecimal():
        raise SystemExit("A nonnegative SOURCE_DATE_EPOCH is required")
    config = json.loads(Path("src-tauri/tauri.conf.json").read_text())
    arch = subprocess.check_output(["dpkg", "--print-architecture"], text=True).strip()
    package = Path("src-tauri/target/release/bundle/deb") / (
        f"{config['productName']}_{config['version']}_{arch}.deb"
    )
    if not package.is_file():
        raise SystemExit(f"Expected generated package: {package}")
    # A checkout may live on a non-POSIX filesystem that forces mode 0777.
    # dpkg control directories require real POSIX modes, so stage under /tmp.
    with tempfile.TemporaryDirectory(prefix="docker-cleanup-deb-") as temporary:
        temporary = Path(temporary)
        root = temporary / "root"
        output = temporary / "normalized.deb"
        subprocess.run(["dpkg-deb", "--raw-extract", str(package), str(root)], check=True)
        subprocess.run(["dpkg-deb", "--root-owner-group", "-Zgzip", "-z9",
                        "--build", str(root), str(output)], check=True)
        shutil.copyfile(output, package)
    print("Normalized archive timestamps/ownership:")
    print(hashlib.sha256(package.read_bytes()).hexdigest(), package)


if __name__ == "__main__":
    main()
