import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import release


class ReleaseTests(unittest.TestCase):
    def test_prefers_standard_library_parser(self):
        parser = Mock()
        with patch.object(release.importlib, "import_module", return_value=parser) as load:
            self.assertIs(release.toml_parser(), parser)
            load.assert_called_once_with("tomllib")

    def test_falls_back_to_tomli(self):
        parser = Mock()
        with patch.object(release.importlib, "import_module",
                          side_effect=[ModuleNotFoundError("tomllib"), parser]) as load:
            self.assertIs(release.toml_parser(), parser)
            self.assertEqual([call.args[0] for call in load.call_args_list], ["tomllib", "tomli"])

    def test_missing_parser_has_clean_cli_setup_guidance(self):
        with patch.object(release.importlib, "import_module", side_effect=ModuleNotFoundError):
            with patch.object(sys, "argv", ["release.py", "check", "--tag", "v1.2.3"]):
                with self.assertRaises(SystemExit) as error:
                    release.main()
        message = str(error.exception)
        self.assertIn("Release validation failed:", message)
        self.assertIn(".venv-release/bin/python -m pip install -r scripts/requirements-release.txt", message)
        self.assertNotIn("Traceback", message)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for directory in ["src-tauri", "src", "docs/releases"]:
            (self.root / directory).mkdir(parents=True)
        package = {"version": "1.2.3", "license": "MIT",
                   "repository": {"url": f"git+{release.REPOSITORY}.git"}}
        lock = {"version": "1.2.3", "packages": {"": {"version": "1.2.3", "license": "MIT"}}}
        tauri = {"version": "1.2.3", "bundle": {"license": "MIT"}}
        for name, value in [("package.json", package), ("package-lock.json", lock),
                            ("src-tauri/tauri.conf.json", tauri)]:
            (self.root / name).write_text(json.dumps(value))
        (self.root / "src-tauri/Cargo.toml").write_text(
            f'[package]\nversion = "1.2.3"\nlicense = "MIT"\nrepository = "{release.REPOSITORY}"\n')
        (self.root / "src-tauri/Cargo.lock").write_text(
            '[[package]]\nname = "docker-cleanup"\nversion = "1.2.3"\n')
        (self.root / "src/App.tsx").write_text("<small>v1.2.3 · Linux</small>")
        (self.root / "LICENSE").write_text("MIT License")
        (self.root / "docs/releases/v1.2.3.md").write_text("# Release 1.2.3\n")

    def test_consistent_metadata_and_exact_tag(self):
        self.assertEqual(release.check(self.root, "v1.2.3"), "1.2.3")
        for tag in ["1.2.3", "v1.2.4", "v1.2.3;echo injected", "v1.2.3\n"]:
            with self.assertRaises(ValueError):
                release.check(self.root, tag)

    def test_rejects_each_mismatched_version(self):
        for name in ["package-lock.json", "src-tauri/tauri.conf.json",
                     "src-tauri/Cargo.toml", "src-tauri/Cargo.lock", "src/App.tsx"]:
            path = self.root / name
            original = path.read_text()
            path.write_text(original.replace("1.2.3", "1.2.4"))
            with self.assertRaises(ValueError, msg=name):
                release.check(self.root)
            path.write_text(original)

    def test_rejects_wrong_license_repository_or_missing_notes(self):
        for old, new in [('"MIT"', '"GPL-3.0"'), (release.REPOSITORY, "https://example.invalid/repo")]:
            path = self.root / "src-tauri/Cargo.toml"
            original = path.read_text()
            path.write_text(original.replace(old, new))
            with self.assertRaises(ValueError):
                release.check(self.root)
            path.write_text(original)
        (self.root / "docs/releases/v1.2.3.md").unlink()
        with self.assertRaises(ValueError):
            release.check(self.root)

    def deb(self, version="1.2.3", arch="amd64"):
        if not shutil.which("dpkg-deb"):
            self.skipTest("dpkg-deb required")
        directory = self.root / f"deb-{version}-{arch}"
        (directory / "DEBIAN").mkdir(parents=True)
        (directory / "DEBIAN").chmod(0o755)
        (directory / "DEBIAN/control").write_text(
            f"Package: docker-cleanup\nVersion: {version}\nArchitecture: {arch}\n"
            "Maintainer: Test\nDescription: Fixture\n")
        package = self.root / f"{version}-{arch}.deb"
        subprocess.run(["dpkg-deb", "--build", str(directory), str(package)], check=True, stdout=subprocess.DEVNULL)
        return package

    def test_portable_checksum_manifest_and_notes(self):
        output = self.root / "assets"
        with patch.dict(os.environ, {"GITHUB_SHA": "a" * 40, "GITHUB_RUN_ID": "123"}):
            package = release.stage(self.deb(), output, self.root, "v1.2.3")
        digest = hashlib.sha256(package.read_bytes()).hexdigest()
        self.assertEqual(package.name, "docker-cleanup_1.2.3_amd64.deb")
        self.assertEqual((output / f"{package.name}.sha256").read_text(), f"{digest}  {package.name}\n")
        manifest = json.loads((output / "release-manifest.json").read_text())
        self.assertEqual(manifest["commit"], "a" * 40)
        self.assertEqual(manifest["sha256"], digest)
        self.assertNotIn(str(self.root), json.dumps(manifest))
        self.assertEqual((output / "release-notes.md").read_text(), "# Release 1.2.3\n")
        subprocess.run(["sha256sum", "-c", f"{package.name}.sha256"], cwd=output, check=True, stdout=subprocess.DEVNULL)

    def test_wrong_debian_metadata_is_not_staged(self):
        for version, arch in [("1.2.4", "amd64"), ("1.2.3", "arm64")]:
            with self.assertRaises(ValueError):
                release.stage(self.deb(version, arch), self.root / "assets", self.root)
        self.assertFalse((self.root / "assets").exists())

    def test_never_overwrites_existing_assets(self):
        output = self.root / "assets"
        output.mkdir()
        (output / "user-file").write_text("keep")
        with self.assertRaises(ValueError):
            release.stage(self.deb(), output, self.root)
        self.assertEqual((output / "user-file").read_text(), "keep")

    def test_actual_repository_and_ci_tag_guard(self):
        version = json.loads((release.ROOT / "package.json").read_text())["version"]
        self.assertEqual(release.check(), version)
        bad_tag = f"v{int(version.split('.')[0]) + 1}.0.0"
        env = {**os.environ, "GITHUB_REF_TYPE": "tag", "GITHUB_REF_NAME": bad_tag}
        result = subprocess.run([sys.executable, str(release.ROOT / "scripts/release.py"), "check"],
                                env=env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(f"Tag must be v{version}", result.stderr)


if __name__ == "__main__":
    unittest.main()
