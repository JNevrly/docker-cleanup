# Treemap reliability validation — 2026-11-15

## Cases reproduced

The label fixture uses the reported reference verbatim:

```text
gitext.alps.cz:5000/mmwave-radar/idec/idec-ros2-log-replay-ws/idec_ros2_log_replay_ws_devcontainer:v0
```

It also supplies a second `:latest` reference to the same image. The displayed
short name favors `idec_ros2_log_replay_ws_devcontainer`, while both complete
references remain in hover/focus disclosure and the inspector. Neither the image
ID nor selection/deletion identity is changed. This fixture does not assert that
the user's actual image has multiple tags.

Project-pointer coverage includes 20 long-path small projects and a one-byte
project with no visible leaf or title. Full header rectangles, rather than text
glyphs, receive hover/focus. The compact grouping chevron exposes all measured
groups when a map target is too small, without assigning it fabricated area.

Category-pointer coverage clicks blank header space for Writable layers, Images,
Volumes and shared storage at 40px map height. Tiny cache is reachable through
the category browser. Enter/Space, normal leaf inspection, retained selection/
drafts, root navigation and absence of extra IPC are checked.

## Browser/native distinction

Browser journeys use real mouse movement/clicks and keyboard actions with
synthetic inventory/IPC. The actual Tauri/WebKit journey uses WebDriver W3C
pointer movement/down/up for project-header whitespace, the tiny-project browser
and the three reported category routes, not JavaScript-dispatched clicks for
those interactions. It also checks the reported image name policy.

The matrix exercises Light/Dark/System, 1024×720, 1440×900 and 1920×1080,
shallow/dense maps and splitter resizing. Existing 1,000-asset search/sort,
independent panes, persisted layout, cleanup progress/cancellation and safety
journeys remain part of the complete suite.

## Evidence

Source verification passed: **56 browser journeys**, **24 native checks**,
**13 frontend unit tests**, **12 Rust unit + 21 service tests**, **8 Python tests**,
production build, Prettier, Rustfmt and desktop all-target Clippy with warnings
denied. The separate live journey passed **20 checks** on verified disposable
daemon `d0671bbd-4d1e-4144-bf38-82c69c373223`, including protection/reference
refusal, reviewed deletion, retained mounts, separate image follow-up and restart
persistence. No Engine-global cache prune was executed.

- [Native check/mutation report](../artifacts/m3/native-report.json)
- [Native explorer](../artifacts/m3/native-explorer.png)
- [Live Docker report](../artifacts/integration-report.json)
- [Reported image label and full identity](../artifacts/m3/name-first.png)
- [Tiny-project browser fallback](../artifacts/m3/project-fallback.png)
- [Category pointer at 1024](../artifacts/m3/category-pointer-1024.png)
- [Category pointer at 1440](../artifacts/m3/category-pointer-1440.png)
- [Category pointer at 1920](../artifacts/m3/category-pointer-1920.png)
- [Previous packaged explorer](../artifacts/m2/packaged/native-explorer.png)

## Final 0.3.1 package

Two locked normalized Linux amd64 builds compared byte-identically. Exported
package SHA-256:
`b12cc6fd161d3baeeba9692809bbb24b30648b2c09b9164f312fa13c890e9579`.
The exported sidecar verifies with `sha256sum -c`.

The [final packaged upgrade report](../artifacts/m3/packaged/native-report.json)
records **29 checks**, including real 0.3.0-to-0.3.1 preservation of history,
aliases, project association, protection, Dark theme, 360px inspector width and
190px map height. The prior executable comes from the original 0.3.0 `.deb`,
not newly rebuilt source. See [release notes](treemap-release.md) for installation,
checksum, packaged screenshots and scope.

## Limits

Native tests run on Debian 12/Linux amd64 under Xvfb, against a synthetic Unix
Engine API with exact mutation capture. Live destructive safety tests are
separate and require the exact identity-checked disposable socket. They never
use a default host daemon or globally prune the reusable builder's cache.

The user's private inventory and manually installed Ubuntu desktop have not
been reproduced wholesale. Rootless Engines, other storage drivers/versions,
external buildx and remote Docker remain outside validation. No backup/undo or
physical recovery promise is introduced. Extremely small groups remain small;
the group browser is a navigation fallback, not modified size accounting.
