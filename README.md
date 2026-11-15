# Docker Cleanup

A Linux-first **Tauri 2 + React/TypeScript + Rust** Docker storage explorer.
Understand old development containers before deleting them: category/project
treemaps, explainable identity, mount boundaries, lifecycle evidence, and
reviewed cleanup batches.

## Development

Requirements: Node.js 22.12+ (24 recommended), Rust 1.100.0 (pinned), Python 3,
Debian's `dpkg-deb` for reproducible packaging, and Tauri's Linux
dependencies. On Debian 12 / compatible distributions:

```bash
sudo apt-get update
sudo apt-get install build-essential pkg-config libwebkit2gtk-4.1-dev \
  libssl-dev librsvg2-dev libayatana-appindicator3-dev patchelf libxdo-dev
npm ci
npm run desktop
```

`npm run dev` starts a **synthetic browser demonstration** without Docker or
native dependencies. Its cleanup actions are simulations, not real deletions.
The desktop app starts disconnected. Enter a local endpoint such as
`unix:///var/run/docker.sock`, `unix:///run/user/1000/docker.sock`, or the
explicit disposable test socket. It never repairs socket permissions or
escalates privileges. Docker socket access is highly privileged.

```bash
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
npm run test:e2e
npm run package
```

`npm run package` produces a Debian package under
`src-tauri/target/release/bundle/deb/`. Native tests without the desktop feature
do not require GTK/WebKit or a Docker daemon, but do require a C toolchain for
bundled SQLite.

For a locked build with normalized Debian archive metadata, use
`bash scripts/build-linux.sh`. Install the resulting `.deb` on the Linux host
with `sudo apt install './path/to/Docker Cleanup_0.3.1_amd64.deb'`, then launch
`docker-cleanup`. Do not run the application as root.

See [the user guide](docs/user-guide.md) for the investigation and cleanup
workflow and [verification instructions](docs/testing.md) for fixture, browser,
native desktop, and live disposable-Docker suites.
The [MVP validation report](docs/release-validation.md) records the package
checksum, verified results and remaining limitations.
For the updated workspace, see [0.2.0 release notes](docs/usability-release.md)
and [usability verification](docs/usability-validation.md).
The latest update is [0.3.1 treemap reliability](docs/treemap-release.md), with
[pointer/native validation evidence](docs/treemap-validation.md).
The prior [0.3.0 workspace polish](docs/polish-release.md) remains documented.

## Disposable integration environment

See [the host-side DinD setup](docs/disposable-docker.md). The optional development
builder is created *inside* that disposable daemon:

```bash
python3 scripts/dind.py setup
python3 scripts/dind.py sync
python3 scripts/dind.py exec 'cargo test --manifest-path src-tauri/Cargo.toml'
```

This builder installs native development packages in its own container, not in
the harness or on your host. It uses disk space in the disposable environment.
The helper verifies the daemon identity before making any Docker call.

## Safety boundaries

- No automatic container stops, forced image deletion, or host-file deletion.
- Container removal retains mounted volumes by default.
- Volumes need explicit selection and a separate data-loss confirmation.
- Protected assets are excluded from prune and deletion.
- Every execution revalidates daemon identity and object state/references.
- Partial success and irreversible loss are explicit; there is no pretend undo.
- Dates have sources; unreferenced and old do not mean disposable.
- Shared image data is counted once in the storage map. Recovery estimates are
  uncertain logical-data ranges, not guaranteed physical disk savings.

Local history and preferences are stored in the application's platform-specific
data directory in `history.sqlite`. It contains workspace paths, object metadata
and cleanup results; treat it as private data. Scans occur on demand and every
minute while the desktop explorer is open and idle. No background daemon runs
after the application exits.

See [capabilities and limitations](docs/capabilities.md) for supported Engine
APIs, timestamp semantics, cache scope, and process evidence limitations.
