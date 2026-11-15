# Verification

## Without a Docker daemon

```bash
npm ci
npm run build
npm test
npm run format:check
cargo test --locked --manifest-path src-tauri/Cargo.toml --no-default-features
cargo clippy --locked --manifest-path src-tauri/Cargo.toml \
  --all-targets --no-default-features -- -D warnings
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Rust is pinned in `rust-toolchain.toml`; Cargo and npm lockfiles are committed
source inputs. Core tests use temporary Unix API fixtures and SQLite databases.
They assert exact mutation calls, non-forced removal, retained volumes,
protection, stale references, cache scope changes, partial failures, cancellation,
timestamp provenance, schema migrations, and local process/TCP correlation.

Browser journeys use synthetic fixtures or an explicit mock IPC adapter:

```bash
npx playwright install chromium
npm run test:e2e
```

In the supplied harness, use its preinstalled Chromium explicitly if the locally
locked Playwright expects a different browser revision:

```bash
CHROMIUM_PATH=/ms-playwright/chromium-1254/chrome-linux64/chrome npm run test:e2e
```

The browser tests cover the supplied cleanup journey, volume confirmation,
project grouping, filters, keyboard selection, connection/partial-data errors,
cross-endpoint selection resets, disappeared assets, and 1,000 additional assets.
They do not prove native IPC or real Docker mutation; the following suites do.
The usability milestone adds theme/contrast, keyboard pane controls, three
viewport sizes, main-workspace navigation/history, structured inspections,
related links, tri-state selection/cache discovery and typed live progress.
See [the usability validation report](usability-validation.md) for evidence.
The [treemap reliability report](treemap-validation.md) records the exact reported
reference, real whitespace-pointer targets, tiny-group fallback and native W3C
pointer coverage. Full suite: 56 browser journeys; native source run: 24 checks.

## Live disposable Docker journey

First follow [the host setup guide](disposable-docker.md). Inside the sandbox:

```bash
python3 scripts/dind.py setup
python3 scripts/dind.py sync
python3 scripts/dind.py exec \
  'cargo build --locked --manifest-path src-tauri/Cargo.toml --bin cleanup-rpc'
python3 scripts/dind.py download \
  /workspace/src-tauri/target/debug/cleanup-rpc artifacts

DOCKER_CLEANUP_ALLOW_DESTRUCTIVE_TESTS=1 \
DOCKER_CLEANUP_TEST_ENDPOINT=unix:///other_mounts/test-docker/docker.sock \
  python3 tests/integration_docker.py
```

Run `setup` once per disposable environment. An existing builder already has
the dependencies; use `sync` and `exec` again rather than creating another.
The builder uses Rust 1.100.0/Debian 12 and an official Node 24 binary. It is
visible as a running Docker container and is not a cleanup candidate.

The integration runner requires both explicit opt-in and the exact test socket,
then checks the daemon ID and safety label before provisioning small uniquely
labelled resources. It never consults the default Docker endpoint. Cleanup in
`finally` targets only the IDs/names created by that invocation; it may force-stop
its own running fixture, never arbitrary user containers. The application's
deletion calls remain non-forced.

The run retains a structured report in `artifacts/integration-report.json`.
It proves actual inspect/diff/top, writable-byte collection, devcontainer
attribution, protected/referenced volume refusal, reviewed stopped-container
deletion, retained database/shared volumes, separate image follow-up, explicit
volume deletion, and SQLite persistence across process restart.

## Native Tauri/WebKit journey

This launches the real desktop app under Xvfb, drives its WebKit webview through
`tauri-driver`/WebKitWebDriver, and connects its Rust backend to a synthetic
Unix Docker API that records all mutation calls.

```bash
python3 scripts/dind.py exec 'cargo install tauri-driver --locked'
python3 scripts/dind.py exec \
  'cargo build --locked --manifest-path src-tauri/Cargo.toml --features desktop,custom-protocol --bin docker-cleanup'
python3 scripts/dind.py exec \
  'xvfb-run -a dbus-run-session -- python3 tests/native_desktop.py'
```

It verifies native loading (not demo mode), typed IPC, daemon identity, mount
boundaries, diff, environment redaction, stopped-process handling, confirmation,
execution and verification. Only the reviewed container DELETE may be observed.
Reports/screenshots are written to `/workspace/artifacts/` inside the builder:

```bash
python3 scripts/dind.py download /workspace/artifacts/native-report.json artifacts
python3 scripts/dind.py download /workspace/artifacts/native-results.png artifacts
```

The test disables WebKit sandboxing **only inside the disposable root-run
builder**. This is not an application deployment setting. Audio, portal, or FUSE
warnings can occur under Xvfb without affecting this test's features.

## Linux package

On a Linux machine with the documented native build dependencies:

```bash
bash scripts/build-linux.sh
```

The script uses locked dependencies, pinned Rust, and a fixed default
`SOURCE_DATE_EPOCH`. It also repacks the generated archive with `dpkg-deb` to
normalize timestamps and root ownership (the upstream bundler does not normalize
its archive dates). Python 3 and Debian's `dpkg-deb` are therefore required.
Packaging itself does not require Docker or any socket.
The `.deb` is generated under `src-tauri/target/release/bundle/deb/`.

Within the builder:

```bash
python3 scripts/dind.py exec 'bash scripts/build-linux.sh'
python3 scripts/dind.py download \
  /workspace/src-tauri/target/release/bundle/deb artifacts
```

To smoke-test the **packaged** executable, extract the `.deb` with `dpkg-deb -x`
inside the builder and set `DOCKER_CLEANUP_NATIVE_BINARY` to the extracted
`usr/bin/docker-cleanup` when running `tests/native_desktop.py`. A successful
source/debug launch alone is not evidence that the packaged binary works.

For a real prior-release-to-update persistence test, also set
`DOCKER_CLEANUP_UPGRADE_FROM` to an executable extracted from the prior package,
and `DOCKER_CLEANUP_UPGRADE_VERSION=0.3.0` for the treemap-reliability upgrade
(or 0.2.0 for the earlier workspace-polish upgrade).
The default version remains 0.1.0 for the original MVP upgrade test.
The native journey seeds alias/project/protection and a saved cleanup result
through the old application, closes it, then starts the new package using the
same temporary XDG data directory. No real user database or default socket is
touched. Both tests also set Dark theme, 360px inspector width and 190px map
height through the old UI (0.3.0 uses separators; 0.2.0 uses sliders), then verify
their preservation with the new dividers.

For the 0.3.0-to-0.3.1 journey, with both packages copied into the builder:

```bash
dpkg-deb -x '/tmp/docker-cleanup-prior-0.3.0.deb' /tmp/docker-cleanup-prior-0.3.0
dpkg-deb -x 'src-tauri/target/release/bundle/deb/Docker Cleanup_0.3.1_amd64.deb' \
  /tmp/docker-cleanup-update-0.3.1
DOCKER_CLEANUP_NATIVE_BINARY=/tmp/docker-cleanup-update-0.3.1/usr/bin/docker-cleanup \
DOCKER_CLEANUP_UPGRADE_FROM=/tmp/docker-cleanup-prior-0.3.0/usr/bin/docker-cleanup \
DOCKER_CLEANUP_UPGRADE_VERSION=0.3.0 \
  xvfb-run -a dbus-run-session -- python3 tests/native_desktop.py
```

The [packaged upgrade report](../artifacts/m3/packaged/native-report.json) records
29 checks; [0.3.1 release notes](treemap-release.md) include checksum and screenshots.

To reproduce the package comparison, run the complete build script
twice and compare copies with `cmp`; identical hashes are only claimed for the
recorded build environment.
