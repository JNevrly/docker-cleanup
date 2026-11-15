#!/usr/bin/env python3
"""Validate release identity and stage portable GitHub release assets. No publishing."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tomllib

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "https://github.com/JNevrly/docker-cleanup"


def check(root=ROOT, tag=None):
    package = json.loads((root / "package.json").read_text())
    lock = json.loads((root / "package-lock.json").read_text())
    tauri = json.loads((root / "src-tauri/tauri.conf.json").read_text())
    cargo = tomllib.loads((root / "src-tauri/Cargo.toml").read_text())["package"]
    cargo_lock = tomllib.loads((root / "src-tauri/Cargo.lock").read_text())
    version = package["version"]
    if not re.fullmatch(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", version):
        raise ValueError("Release version must be stable X.Y.Z")
    versions = [lock["version"], lock["packages"][""]["version"], cargo["version"], tauri["version"]]
    versions += [p["version"] for p in cargo_lock["package"] if p["name"] == "docker-cleanup"]
    if len(versions) != 5 or any(v != version for v in versions):
        raise ValueError("npm/Cargo/Tauri release versions differ")
    if f"v{version} · Linux" not in (root / "src/App.tsx").read_text():
        raise ValueError("UI version differs from release version")
    if tag is not None and tag != f"v{version}":
        raise ValueError(f"Tag must be v{version}, not {tag!r}")
    if any(v != "MIT" for v in [package.get("license"), lock["packages"][""].get("license"),
                                cargo.get("license"), tauri["bundle"].get("license")]):
        raise ValueError("npm/Cargo/Tauri license must be MIT")
    if "MIT License" not in (root / "LICENSE").read_text():
        raise ValueError("MIT LICENSE file missing")
    if cargo.get("repository") != REPOSITORY or package.get("repository", {}).get("url") != f"git+{REPOSITORY}.git":
        raise ValueError("Repository metadata does not match the release repository")
    if not (root / f"docs/releases/v{version}.md").is_file():
        raise ValueError("Versioned public release notes missing")
    return version


def stage(package, output, root=ROOT, tag=None):
    version = check(root, tag)
    package, output = Path(package), Path(output)
    for field, expected in [("Package", "docker-cleanup"), ("Version", version), ("Architecture", "amd64")]:
        actual = subprocess.check_output(["dpkg-deb", "--field", str(package), field], text=True).strip()
        if actual != expected:
            raise ValueError(f"Debian {field} must be {expected}, not {actual}")
    if output.exists() and any(output.iterdir()):
        raise ValueError("Release output directory must be empty; refusing stale/mixed assets")
    output.mkdir(parents=True, exist_ok=True)
    name = f"docker-cleanup_{version}_amd64.deb"
    destination = output / name
    shutil.copyfile(package, destination)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    # Basename only: users verify in their download directory, not our checkout.
    (output / f"{name}.sha256").write_text(f"{digest}  {name}\n")
    shutil.copyfile(root / f"docs/releases/v{version}.md", output / "release-notes.md")
    manifest = {
        "repository": REPOSITORY,
        "version": version,
        "tag": f"v{version}",
        "commit": os.environ.get("GITHUB_SHA", ""),
        "workflowRun": os.environ.get("GITHUB_RUN_ID", ""),
        "package": name,
        "sha256": digest,
        "license": "MIT",
        "reproducibility": "See workflow log for two-build comparison; no cross-toolchain guarantee",
    }
    (output / "release-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["check", "stage"])
    parser.add_argument("--tag")
    parser.add_argument("--package", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "release-assets")
    args = parser.parse_args()
    tag = args.tag
    if tag is None and os.environ.get("GITHUB_REF_TYPE") == "tag":
        tag = os.environ.get("GITHUB_REF_NAME", "")
    try:
        if args.action == "check":
            print(check(tag=tag))
        else:
            if args.package is None:
                parser.error("stage requires --package")
            print(stage(args.package, args.output, tag=tag))
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"Release validation failed: {error}") from error


if __name__ == "__main__":
    main()
