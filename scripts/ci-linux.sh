#!/usr/bin/env bash
# Run in Debian 12 with Tauri build dependencies, tauri-driver, SSH and Docker CLI.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
version="$(python3 scripts/release.py check)"
package="src-tauri/target/release/bundle/deb/Docker Cleanup_${version}_amd64.deb"
output="${RELEASE_OUTPUT_DIR:-release-assets}"
work="$(mktemp -d)"
# Only remove the scratch directory made by this script.
trap 'rm -rf -- "$work"' EXIT

cargo clippy --locked --manifest-path src-tauri/Cargo.toml \
  --all-targets --features desktop -- -D warnings
cargo build --locked --manifest-path src-tauri/Cargo.toml --bin cleanup-rpc
python3 tests/remote_contexts.py

bash scripts/build-linux.sh
cp -- "$package" "$work/first.deb"
bash scripts/build-linux.sh
cmp -- "$work/first.deb" "$package"
echo "PASS: normalized Debian packages are byte-identical"

dpkg-deb -x "$package" "$work/extracted"
cmp LICENSE "$work/extracted/usr/share/doc/docker-cleanup/copyright"
test "$(stat -c '%a' "$work/extracted/usr/share/doc/docker-cleanup/copyright")" = 644
DOCKER_CLEANUP_NATIVE_BINARY="$work/extracted/usr/bin/docker-cleanup" \
DOCKER_CLEANUP_NATIVE_ARTIFACTS="$PWD/artifacts/ci-native" \
  xvfb-run -a dbus-run-session -- python3 tests/native_desktop.py

python3 scripts/release.py stage --package "$package" --output "$output"
(
  cd -- "$output"
  sha256sum -c "docker-cleanup_${version}_amd64.deb.sha256"
)
