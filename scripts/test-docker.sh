#!/usr/bin/env bash
# Run on the Linux host, never inside the agent sandbox.
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
STATE_DIR="${DOCKER_CLEANUP_DIND_STATE_DIR:-${XDG_RUNTIME_DIR:-/tmp}/docker-cleanup-dind-$(id -u)}"
IMAGE="${DOCKER_CLEANUP_DIND_IMAGE:-docker:dind}"
NAME="docker-cleanup-test-$(id -u)"
LABEL="docker-cleanup.test-daemon=true"
SOCKET="/test-socket/docker.sock"

usage() {
  cat <<'EOF'
Usage: bash scripts/test-docker.sh {start|status|harness|stop} [harness arguments]

  start     Pull an image and start a privileged, disposable Docker-in-Docker daemon.
  status    Verify the recorded container, nested daemon ID, and test label.
  harness   Verify the daemon, then launch opencode2-sbx with its socket mounted.
  stop      Remove only the recorded test container and its anonymous storage.

Run on the Linux host using its normal Docker connection. Never mount the host
Docker socket. Privileged DinD is not a strong security boundary; use a disposable
VM for untrusted code. Nested resources consume real host disk space.

Optional environment:
  DOCKER_CLEANUP_DIND_IMAGE       Image tag/digest (default: docker:dind)
  DOCKER_CLEANUP_DIND_STATE_DIR   Private absolute directory (default: runtime dir
                                or /tmp, with a user-specific name)
EOF
}

fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
docker_test() { docker exec "$CONTAINER_ID" docker --host="unix://$SOCKET" "$@"; }

check_directory() {
  [[ "$STATE_DIR" == /* && "$STATE_DIR" != / ]] ||
    fail "State directory must be an absolute path other than /."
  [[ ! -L "$STATE_DIR" ]] || fail "State directory must not be a symlink."
  if [[ -e "$STATE_DIR" ]]; then
    [[ -d "$STATE_DIR" && -O "$STATE_DIR" ]] ||
      fail "State directory must be a directory owned by your user."
    [[ "$(stat -c '%a' "$STATE_DIR")" == 700 ]] ||
      fail "State directory must have mode 700: $STATE_DIR"
  fi
}

read_container() {
  [[ -f "$STATE_DIR/container-id" && ! -L "$STATE_DIR/container-id" ]] ||
    fail "No recorded test container. Run start first."
  CONTAINER_ID="$(cat "$STATE_DIR/container-id")"
  [[ "$CONTAINER_ID" =~ ^[a-f0-9]{64}$ ]] || fail "Invalid recorded container ID."
  local label
  label="$(docker inspect --format '{{index .Config.Labels "docker-cleanup.test-daemon"}}' "$CONTAINER_ID")" ||
    fail "Recorded container not found on the current host Docker connection."
  [[ "$label" == true ]] || fail "Recorded container is missing the safety label."
}

verify() {
  read_container
  [[ -f "$STATE_DIR/expected-daemon-id" ]] || fail "Missing nested daemon identity."
  local actual labels
  actual="$(docker_test info --format '{{.ID}}')" || fail "Nested daemon is unavailable."
  [[ -n "$actual" && "$actual" == "$(cat "$STATE_DIR/expected-daemon-id")" ]] ||
    fail "Nested daemon identity mismatch."
  labels="$(docker_test info --format '{{json .Labels}}')"
  [[ "$labels" == *"\"$LABEL\""* ]] || fail "Nested daemon is missing the safety label."
  printf 'Verified test daemon: %s\nSocket directory: %s\n' "$actual" "$STATE_DIR"
}

command="${1:-help}"
case "$command" in
  help|-h|--help) usage; exit 0 ;;
  start|status|harness|stop) shift ;;
  *) usage >&2; exit 2 ;;
esac
[[ "$command" == harness || $# == 0 ]] || fail "Unexpected arguments."
[[ "${HARNESS_SANDBOX:-}" != 1 ]] || fail "Run this helper on the host, not inside the sandbox."
[[ "$(uname -s)" == Linux ]] || fail "This helper supports Linux hosts only."
command -v docker >/dev/null || fail "Docker CLI is required on the host."
check_directory

case "$command" in
  start)
    if [[ -e "$STATE_DIR/container-id" ]]; then
      verify
      printf 'Already started. Launch with: bash %q harness\n' "$PROJECT_DIR/scripts/test-docker.sh"
      exit 0
    fi
    docker info >/dev/null || fail "Host Docker daemon is unavailable."
    if docker inspect "$NAME" >/dev/null 2>&1; then
      fail "Container $NAME already exists without matching state; refusing to adopt or remove it."
    fi
    # Refuse leftover/foreign files rather than deleting them to make room.
    if [[ -d "$STATE_DIR" && -n "$(find "$STATE_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
      fail "State directory is not empty: $STATE_DIR"
    fi
    (umask 077; mkdir -p -- "$STATE_DIR")
    docker pull "$IMAGE"
    IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE")"
    [[ "$IMAGE_ID" =~ ^sha256:[a-f0-9]{64}$ ]] || fail "Could not resolve immutable image ID."
    printf 'Starting privileged DinD; this is not a strong host-security boundary.\n'
    CONTAINER_ID="$(docker run --detach --rm \
      --name "$NAME" \
      --label "$LABEL" \
      --privileged \
      --env DOCKER_TLS_CERTDIR= \
      --mount "type=bind,src=$STATE_DIR,dst=/test-socket" \
      "$IMAGE_ID" dockerd \
      --host="unix://$SOCKET" \
      --group="$(id -g)" \
      --label="$LABEL")"
    [[ "$CONTAINER_ID" =~ ^[a-f0-9]{64}$ ]] || fail "Unexpected container ID from Docker."
    (umask 077; printf '%s\n' "$CONTAINER_ID" > "$STATE_DIR/container-id")
    ready=0
    for ((attempt=0; attempt<60; attempt++)); do
      if docker_test info >/dev/null 2>&1; then ready=1; break; fi
      sleep 1
    done
    if [[ "$ready" != 1 ]]; then
      docker logs "$CONTAINER_ID" >&2 || true
      fail "Daemon did not become ready. Inspect logs, then run this helper with stop."
    fi
    daemon_id="$(docker_test info --format '{{.ID}}')"
    [[ -n "$daemon_id" ]] || fail "Daemon returned an empty identity; run stop."
    (umask 077; printf '%s\n' "$daemon_id" > "$STATE_DIR/expected-daemon-id")
    verify
    printf '\nLaunch the development sandbox:\n  bash %q harness\n' "$PROJECT_DIR/scripts/test-docker.sh"
    ;;
  status)
    verify
    docker_test system df
    ;;
  harness)
    verify
    command -v opencode2-sbx >/dev/null || fail "opencode2-sbx is not on PATH."
    cd -- "$PROJECT_DIR"
    exec opencode2-sbx -v "$STATE_DIR:/other_mounts/test-docker:rw" "$@"
    ;;
  stop)
    read_container
    # Exact recorded ID only. -v removes anonymous volumes, not named host volumes.
    docker rm --force --volumes "$CONTAINER_ID"
    rm -f -- "$STATE_DIR/container-id" "$STATE_DIR/expected-daemon-id" "$STATE_DIR/docker.sock"
    rmdir -- "$STATE_DIR" ||
      fail "Container removed, but extra files remain in $STATE_DIR; inspect them manually."
    printf 'Removed test daemon and its anonymous storage. No host prune was run.\n'
    ;;
esac
