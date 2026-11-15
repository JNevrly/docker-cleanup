# Workspace polish validation — 2026-11-15

## Verified coverage

- Final complete browser suite: **51 journeys passed**, including the dense
  inventory regression under the full six-worker run.

- Frontend: 12 unit tests, including AA palette contrast and measured label-fitting
  edge cases (Unicode, tags, registry ports, digests and aliases).
- Backend: 12 core and 21 stateful service tests; Rustfmt and desktop all-target
  Clippy with warnings denied pass. No destructive backend behavior was changed.
- Python helper/archive safety: 8 tests pass.
- Actual Tauri/WebKit: 17 checks pass against a synthetic Unix Docker API,
  including stable header refresh, both separators, independent inspector height,
  keyboard full-name disclosure, inspection redaction, confirmation, real typed
  progress and saved result reopen.
- Identity-checked live Docker: 20 checks pass, including protected/running/
  referenced refusal, retained mounted data, separate image follow-up, explicit
  volume loss acknowledgement and persisted results/preferences.

Browser coverage includes conventional disabled controls, Light/Dark/System,
home versus Back, optional category help, context-sensitive legends, long labels,
hover/focus disclosure, periodic scan geometry/scroll stability, pointer capture,
keyboard limits, independent pane scrolling and persisted dimensions at
1024×720, 1440×900 and 1920×1080. Dense inventories include 150 additional assets
with open inspector and the existing 1,000-asset search/sort fixture.

An initial full run exposed excessive text measurement on dense inventories.
The fix skips hidden tiny labels, caches widths and avoids repeated computed-style
reads. The focused dense/label/theme/state rerun passed all 8 journeys.

## Visual evidence

- [Previous Light](../artifacts/m2/before/theme-light.png) /
  [previous Dark](../artifacts/m2/before/theme-dark.png)
- [Updated Light](../artifacts/theme-light.png) /
  [updated Dark](../artifacts/theme-dark.png)
- [Minimum-size focused table](../artifacts/layout-1024.png)
- [Inspector divider](../artifacts/m2/inspector-split-1024.png)
- [Map divider](../artifacts/m2/map-split-1024.png)
- [Long names and full-name tooltip](../artifacts/m2/treemap-labels.png)
- [Native explorer](../artifacts/m2/native-explorer.png)
- [Native checks](../artifacts/m2/native-report.json)
- [Live Docker report](../artifacts/integration-report.json)

## Boundaries

Browser journeys use synthetic data or stub IPC; they are not real Docker
evidence. Native tests launch the real Tauri/WebKit app with exact fixture
mutation capture. Live tests use only the opt-in identity-checked disposable
daemon and invocation-owned resources, never the default host daemon.

Tested native platform is Debian 12/Linux amd64 under Xvfb. Rootless Docker,
other Engine/storage-driver versions and a fresh manual Ubuntu desktop install
are not validated here. Global nonempty cache prune remains fixture-tested, not
run against the shared development builder daemon. External buildx, remote
Docker, deep filesystem sizing and backup/undo remain unsupported.

The final package passed 22 native/upgrade checks, including actual 0.2.0
history/identity/protection and theme/pane-preference preservation.
[Release notes](polish-release.md) record the matching two-build comparison,
checksum and exported packaged evidence. Portal/FUSE/audio warnings under Xvfb do not affect
the checked features; root-run WebKit sandbox disabling is test-only.
