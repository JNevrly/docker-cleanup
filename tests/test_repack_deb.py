"""Reproducible metadata test using a tiny generated package, never a daemon."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/repack-deb.py"


@unittest.skipUnless(shutil.which("dpkg-deb"), "dpkg-deb required")
class RepackTests(unittest.TestCase):
    def test_different_input_timestamps_produce_identical_normalized_archives(self):
        with tempfile.TemporaryDirectory(prefix="docker-deb-test-") as temporary:
            root = Path(temporary)
            config = root / "src-tauri/tauri.conf.json"
            config.parent.mkdir()
            config.write_text(json.dumps({"productName": "Fixture", "version": "0.1.0"}))
            arch = subprocess.check_output(["dpkg", "--print-architecture"], text=True).strip()
            package = root / f"src-tauri/target/release/bundle/deb/Fixture_0.1.0_{arch}.deb"
            package.parent.mkdir(parents=True)
            source = root / "source"
            (source / "DEBIAN").mkdir(parents=True, mode=0o755)
            (source / "DEBIAN/control").write_text(
                "Package: fixture\nVersion: 0.1.0\nArchitecture: all\n"
                "Maintainer: Test <test@example.invalid>\nDescription: Test fixture\n"
            )
            file = source / "example.txt"
            file.write_text("identical payload\n")
            hashes = []
            for timestamp in [1700000000, 1800000000]:
                os.utime(file, (timestamp, timestamp))
                built = subprocess.run(["dpkg-deb", "--build", str(source), str(package)],
                                       text=True, capture_output=True)
                self.assertEqual(built.returncode, 0, built.stderr)
                subprocess.run(["python3", str(SCRIPT)], cwd=root,
                               env={**os.environ, "SOURCE_DATE_EPOCH": "1600000000"},
                               check=True, capture_output=True)
                hashes.append(hashlib.sha256(package.read_bytes()).hexdigest())
            self.assertEqual(hashes[0], hashes[1])


if __name__ == "__main__":
    unittest.main()
