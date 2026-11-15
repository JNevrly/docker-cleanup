# Usability milestone validation — 2026-11-15

## Coverage and evidence

| Suite | Verified result |
|---|---|
| Browser journeys | 34 passed |
| Frontend unit tests | 10 passed |
| Rust core/domain/store/transport | 12 passed |
| Rust stateful service/safety/progress | 21 passed |
| Core all-target Clippy, warnings denied | Passed |
| Python host-helper/reproducibility tests | 8 passed |
| Native debug Tauri/WebKit | 13 checks passed |
| Packaged Tauri/WebKit + MVP upgrade | 16 checks passed |
| Desktop all-target Clippy, warnings denied | Passed |
| Live disposable Docker Engine | 20 checks passed |
| TypeScript/Vite and Prettier | Passed |

The browser suite exercises Light/Dark/System persistence, palette AA contrast,
readable type, keyboard resizing/collapse, six visible rows at 1024×720,
1440×900 and 1920×1080 layouts, long names and a 1,000-asset inventory.
It also covers main-page review/history/partial results, preserved Back context,
on-demand structured inspections, related links, tri-state selection and exclusions,
cache discovery/scope/availability, live item statuses, cancellation, mixed outcomes,
stale-event refusal, accessible focus retention and indeterminate Engine cache.

Screenshots:

- [1024×720 table](../artifacts/layout-1024.png)
- [1440×900 table](../artifacts/layout-1440.png)
- [1920×1080 table](../artifacts/layout-1920.png)
- [Light](../artifacts/theme-light.png) / [Dark](../artifacts/theme-dark.png)
- [Structured inspector](../artifacts/inspector-files.png)
- [Mixed cleanup progress](../artifacts/cleanup-progress.png)
- [Real WebKit progress](../artifacts/m1/native-progress.png)
- [Native report](../artifacts/m1/native-report.json)

Native verification launches the actual Tauri app, observes real IPC progress
while a fixture delete is in flight, verifies inline inspection/redaction,
explicit review confirmation and persisted history reopen. The synthetic Unix API
records exactly one non-forced container deletion, with mounted data retained.
No browser mock result is counted as native or live Docker evidence.

[Live report](../artifacts/integration-report.json) verifies the configured daemon
identity, actual inspect/diff/top without exec, running/protected/referenced
refusals, reviewed container removal, retained database/shared volumes, separate
image follow-up, explicit volume acknowledgement and persisted results/preferences.
The runner requires both opt-in and the exact disposable socket, never defaults.

## Boundaries

The tested native environment is Linux amd64 / Debian 12, Rust 1.100.0,
Node 24, Tauri 2 and WebKitGTK. The GUI API fixture is deterministic; it is not a
real Engine. Live Docker integration is a separate opt-in identity-checked suite.
Rootless Docker, other storage drivers/Engine versions, external buildx builders
and arbitrary host-process visibility are not validated by these tests.

Engine cache scope/protection/change rejection is tested against API fixtures.
A real nonempty global Engine cache prune is intentionally not run against the
shared disposable development daemon because it contains the reusable builder.
No physical byte/percentage progress or guaranteed host-space recovery is claimed.
Native Xvfb portal/FUSE/audio warnings do not affect the verified features;
WebKit sandbox disabling is confined to the root-run disposable test builder.

See [testing.md](testing.md) for commands. Release packaging, upgrade checks and
checksums are recorded separately in the usability release notes.
See [0.2.0 release evidence](usability-release.md) for the byte-identical package
comparison, checksum and actual MVP-to-update persistence test.
