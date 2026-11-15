# MVP 0.1.0 validation — 2026-11-14

## Artifact

`artifacts/deb/Docker Cleanup_0.1.0_amd64.deb`

SHA-256:

```text
ce2693bce830530629d42e830b5aba7493889b853393ee7c22230ac5726e9e3a
```

Two complete `scripts/build-linux.sh` runs in the tested builder produced
byte-for-byte identical normalized packages (`cmp` succeeded). Reproducibility
is demonstrated for this environment, not claimed across arbitrary distributions
or compilers. Lockfiles, the Rust toolchain pin and source SVG are retained.

The actual executable extracted from the final `.deb`, not merely a debug build,
passed the native desktop journey under Xvfb.

## Results

| Suite | Result |
|---|---|
| Rust core/domain/store/transport | 12 tests passed |
| Rust stateful service/safety | 18 tests passed |
| Desktop all-target Clippy, warnings denied | Passed |
| TypeScript + production Vite build | Passed |
| Frontend accounting/safety unit tests | 5 passed |
| Playwright browser journeys | 8 passed |
| Host helper and Debian reproducibility tests | 8 passed |
| Live disposable-Docker journey | 20 checks passed |
| Final packaged Tauri/WebKit journey | 9 checks passed |
| Prettier and Bash syntax checks | Passed |

Evidence files:

- `artifacts/integration-report.json`: live daemon identity, checks and actual
  cleanup results, including retained volumes and a separate image follow-up.
- `artifacts/native-report.json`: packaged executable path, native checks and
  exact synthetic Docker mutation requests.
- `artifacts/native-results.png`: actual packaged desktop result screen.
- `artifacts/journey-after.png`: synthetic browser exploration/follow-up screen.

See [testing.md](testing.md) for reproducible commands.

## Tested environment

- Linux amd64, Debian 12 builder.
- Rust/Cargo 1.100.0; Node 24.22.3 in the builder.
- Tauri 2.12.5, GTK 3.24.38, WebKitGTK 2.50.6.
- Real disposable Docker Engine 29.9.3 / API 1.56 / overlayfs.
- Real Linux local process and loopback-TCP correlation exercised in Rust tests.
- Native GUI tests use a synthetic Unix Docker API with exact mutation capture;
  live Docker tests exercise the same Rust domain service through the headless
  test adapter. Browser demo tests do not claim native/Docker integration.

The root-run disposable GUI builder disables WebKit sandboxing for the test only.
That setting is not part of the installed application. Portal/audio/FUSE warnings
under Xvfb did not prevent the verified UI features.

## Known limits

- Linux/local Unix Docker only. No remote endpoints or cross-platform support.
- Rootless path configuration is supported, but a real rootless daemon and other
  Docker versions/storage drivers have not been validated here.
- Engine-managed build cache only. External buildx builders and per-record cache
  deletion are unsupported. Cache prune/scope safety is covered by API fixtures;
  a real nonempty Engine cache-prune scenario was not exercised.
- Logical-data ranges are not promises of physical disk recovery. Shared image
  layers cannot always be attributed exactly from the available metadata.
- Host free-space change remains unavailable without a trustworthy filesystem
  mapping. Unknown usage and timestamps stay unknown.
- Process attribution is best effort and namespace/permission dependent. The
  harness cannot observe arbitrary host editors through its own `/proc`.
- Changed paths are not a per-directory size scanner. There is no backup/undo
  feature or unattended cleanup.
- The development builder remains in the disposable daemon for reuse. Stopping
  the host-side DinD environment deletes its nested build/test storage; exported
  artifacts in this project remain.
