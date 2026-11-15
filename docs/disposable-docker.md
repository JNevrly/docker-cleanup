# Disposable Docker for the development sandbox

Run the helper **on the Linux host**, not inside `opencode2-sbx`. It requires a
working Docker CLI/daemon and, for launching the harness, `opencode2-sbx` on PATH.
No harness source changes or image rebuild are required for socket access.

## Start and launch

From the host checkout:

```bash
cd /home/josef/data/SW/docker_cleanup
bash scripts/test-docker.sh start
bash scripts/test-docker.sh status
bash scripts/test-docker.sh harness
```

The last command launches the harness from this project with the test socket
directory mounted at `/other_mounts/test-docker:rw`. The project remains writable
by default. Extra launcher options can follow `harness`, for example:

```bash
bash scripts/test-docker.sh harness \
  -v /home/josef/data/SW/harness_sandboxes:/other_mounts/harness_sandboxes:ro
```

Exit the current sandbox before launching a new one from the host. To continue
with the same daemon later, use `status` and `harness` again. The default state
directory is user-specific under `$XDG_RUNTIME_DIR`, or `/tmp` when unset. Keep
the same environment for all helper commands. Only one instance per state
directory/user-specific container name is supported; do not run commands
concurrently.

The helper does **not** change your Docker context or export `DOCKER_HOST`.
Leave your host Docker connection pointing at the daemon that runs the harness.
Changing host Docker context while this environment is active will prevent
verification/cleanup until you restore the original connection.

## Verify from inside the sandbox

```bash
sandbox-context

curl --fail --silent --show-error \
  --unix-socket /other_mounts/test-docker/docker.sock \
  http://localhost/_ping
```

The mount should report requested and live read-write access; the API should
return `OK`. The Docker CLI is not needed inside the sandbox.

For future integration tests, the intended explicit inputs are:

```bash
DOCKER_CLEANUP_TEST_ENDPOINT=unix:///other_mounts/test-docker/docker.sock \
DOCKER_CLEANUP_ALLOW_DESTRUCTIVE_TESTS=1 \
  YOUR_TEST_COMMAND
```

These are a proposed application test contract, not implemented runner options
or harness environment forwarding. The runner must additionally verify
`/other_mounts/test-docker/expected-daemon-id` and the Docker daemon label
`docker-cleanup.test-daemon=true`. It must never fall back to a default endpoint.
The launcher does not forward arbitrary host environment variables, including
`DOCKER_HOST`; configure test processes inside the sandbox explicitly.

## Isolation and limitations

- This is a **privileged Docker-in-Docker container**, not a strong security
  boundary. Use a disposable VM for untrusted code.
- Neither container receives the host Docker socket. No TCP Docker endpoint is
  published. The socket grants full control of the nested daemon.
- The helper verifies a recorded container ID and safety label before acting.
  Before harness launch it also verifies the nested daemon ID and label.
  These checks prevent accidents, not malicious tampering.
- Nested images, containers, volumes, and cache use separate Docker storage,
  backed by the DinD image's anonymous `/var/lib/docker` volume. They still use
  real host disk space. Use small synthetic fixtures.
- Privileged Docker may be disallowed or behave differently under rootless
  Docker, restricted hosts, or particular storage drivers. Inspect startup logs;
  do not weaken host socket permissions to fix this.
- The daemon socket uses your host primary GID. The harness preserves numeric
  UID/GID and supplementary groups. If access fails, compare `id` and
  `ls -ln /other_mounts/test-docker/docker.sock`; do not use `chmod 666`.
- Bind-mount source paths refer to the nested daemon's filesystem, **not** the
  host checkout or the development sandbox. Prefer named volumes and generated
  test data for integration fixtures.
- DinD can exercise API integration but cannot validate attribution to real host
  editors/processes. That needs a separate native Linux validation environment.
- Desktop GUI/package validation needs a suitable Linux graphical environment.

## Image selection

`start` pulls `docker:dind`, resolves its immutable local image ID, and launches
that image. Pin a tested digest for reproducibility across separate setups:

```bash
DOCKER_CLEANUP_DIND_IMAGE='docker@sha256:YOUR_TESTED_DIGEST' \
  bash scripts/test-docker.sh start
```

The default tracks upstream and is not a claim that every Docker version/storage
backend has been validated.

## Stop and delete test data

Exit the sandbox, then run on the host:

```bash
bash scripts/test-docker.sh stop
```

This forcibly removes **only the recorded, labelled test container** and its
anonymous storage. All nested data is lost, including nested named volumes.
It does not run a host prune, delete host named volumes, or remove the downloaded
DinD image. Unexpected files in the socket directory are left for manual review.

If startup times out, use `docker logs docker-cleanup-test-$(id -u)` on the host,
then `stop`. If Docker/the machine removed the container independently, the
helper intentionally refuses to guess: inspect the recorded ID/state and
leftover volumes manually before creating a fresh environment.
