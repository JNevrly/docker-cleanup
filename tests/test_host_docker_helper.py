"""Host-helper control-flow tests; never contact a real Docker daemon."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/test-docker.sh"
CONTAINER = "a" * 64
FAKE_DOCKER = r"""#!/usr/bin/env python3
import json, os, pathlib, sys
a = sys.argv[1:]
root = pathlib.Path(os.environ["FAKE_ROOT"])
with (root / "calls").open("a") as f:
    f.write(json.dumps(a) + "\n")
marker = root / "running"
if a[0] == "pull" or a == ["info"]:
    pass
elif a[:2] == ["image", "inspect"]:
    print("sha256:" + "b" * 64)
elif a[0] == "inspect":
    if not marker.exists():
        sys.exit(1)
    print("true")
elif a[0] == "run":
    marker.touch()
    print("a" * 64)
elif a[0] == "exec":
    if not marker.exists():
        sys.exit(1)
    if "{{.ID}}" in a:
        print("wrong-id" if os.environ.get("FAKE_WRONG_ID") else "test-daemon")
    elif "{{json .Labels}}" in a:
        print('["docker-cleanup.test-daemon=true"]')
elif a[0] == "rm":
    marker.unlink()
else:
    sys.exit("Unexpected fake Docker arguments: " + repr(a))
"""


class HostHelperTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="docker-helper-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        docker = self.bin / "docker"
        docker.write_text(FAKE_DOCKER)
        docker.chmod(0o755)
        harness = self.bin / "opencode2-sbx"
        harness.write_text(
            "#!/usr/bin/env python3\n"
            "import json, os, pathlib, sys\n"
            'pathlib.Path(os.environ["FAKE_ROOT"], "harness").write_text('
            'json.dumps({"args": sys.argv[1:], "cwd": os.getcwd()}))\n'
        )
        harness.chmod(0o755)
        self.state = self.root / "state"
        self.env = {
            **os.environ,
            "PATH": f"{self.bin}:{os.environ['PATH']}",
            "HARNESS_SANDBOX": "0",
            "DOCKER_CLEANUP_DIND_STATE_DIR": str(self.state),
            "FAKE_ROOT": str(self.root),
        }

    def run_helper(self, *args, success=True, **env):
        result = subprocess.run(
            ["bash", str(SCRIPT), *args],
            env={**self.env, **env},
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        return result

    def calls(self):
        return [
            json.loads(line)
            for line in (self.root / "calls").read_text().splitlines()
        ]

    def test_lifecycle_uses_only_recorded_container(self):
        self.run_helper("start")
        self.assertEqual((self.state / "container-id").read_text().strip(), CONTAINER)
        self.assertEqual(self.state.stat().st_mode & 0o777, 0o700)
        self.run_helper("status")
        self.run_helper("start")  # Idempotent: does not create a second daemon.
        run_calls = [call for call in self.calls() if call[0] == "run"]
        self.assertEqual(len(run_calls), 1)
        self.assertIn("--privileged", run_calls[0])
        self.assertNotIn("/var/run/docker.sock", " ".join(run_calls[0]))
        self.assertFalse(any(arg in ("-p", "--publish") for arg in run_calls[0]))
        self.run_helper("stop")
        self.assertIn(["rm", "--force", "--volumes", CONTAINER], self.calls())
        self.assertFalse(self.state.exists())

    def test_refuses_execution_inside_sandbox(self):
        self.run_helper("start", success=False, HARNESS_SANDBOX="1")
        self.assertFalse((self.root / "calls").exists())

    def test_refuses_unrecorded_existing_container(self):
        (self.root / "running").touch()
        self.run_helper("start", success=False)
        self.assertFalse(any(call[0] in ("run", "rm") for call in self.calls()))

    def test_wrong_daemon_blocks_harness_launch(self):
        self.run_helper("start")
        self.run_helper("harness", success=False, FAKE_WRONG_ID="1")
        self.assertFalse((self.root / "harness").exists())

    def test_harness_receives_mount_and_forwarded_arguments(self):
        self.run_helper("start")
        self.run_helper("harness", "-v", "/reference:ro")
        launched = json.loads((self.root / "harness").read_text())
        self.assertEqual(
            launched["args"],
            ["-v", f"{self.state}:/other_mounts/test-docker:rw", "-v", "/reference:ro"],
        )
        self.assertEqual(launched["cwd"], str(SCRIPT.parents[1]))

    def test_refuses_symlink_state_directory(self):
        self.state.symlink_to(self.root, target_is_directory=True)
        self.run_helper("start", success=False)
        self.assertFalse((self.root / "calls").exists())

    def test_cleanup_preserves_unexpected_files(self):
        self.run_helper("start")
        extra = self.state / "user-file"
        extra.write_text("preserve me")
        self.run_helper("stop", success=False)
        self.assertEqual(extra.read_text(), "preserve me")


if __name__ == "__main__":
    unittest.main()
