# Docker Cleanup 0.3.0 — workspace polish

Milestone `m-2`, 2026-11-15.

## Changes

- Slate/graphite surfaces and restrained blue accents; conventional disabled
  buttons without strikethrough or dashed borders.
- Prominent All storage breadcrumbs replace the landscape title. Storage explorer
  returns to the unfiltered category overview; Back still preserves prior context.
- Routine scan status lives beside the title without shifting the workspace.
- Treemap instructions move to the guide, About explanations are optional and
  single-color legends disappear.
- Measured image/project labels retain meaningful suffixes, clip within their
  rectangles and disclose full names on hover/focus. Dense tiny tiles omit text.
- Drag/keyboard dividers resize inspector width and map height; independent
  scrollers fill the viewport. Saved sizes safely clamp to available space, and
  inspector drafts survive collapse/restore.
- Shorter selection/filter labels retain explicit eligibility and selection scope.

## Install or upgrade

Close the running application. On the Linux host, from this checkout:

```bash
sha256sum 'artifacts/deb/Docker Cleanup_0.3.0_amd64.deb'
sudo apt install './artifacts/deb/Docker Cleanup_0.3.0_amd64.deb'
docker-cleanup
```

Run as your normal desktop user, not root. The application identifier, SQLite
schema and data location are unchanged. Installation does not execute Docker
cleanup or reset your history, aliases, projects or protections. Theme/layout
preferences remain local; pane dimensions are constrained to usable viewport
bounds rather than discarded. You may copy the private application-data directory
with the app closed as an extra precaution; this is not a Docker-data backup.

## Verification and boundaries

[Validation report](polish-validation.md) links before/after screenshots,
browser/native/live checks and known limitations. [User guide](user-guide.md)
documents the new controls; [testing.md](testing.md) provides repeatable commands.

Supported scope remains Linux amd64/local Unix Docker. Debian 12/Xvfb is the
tested native builder; a fresh manual Ubuntu desktop install, actual rootless
Engine, other versions/drivers and arbitrary host-process visibility are not
validated here. No external buildx, remote Docker, deep directory sizing or
backup/undo. Nonempty Engine-global cache pruning remains API-fixture tested,
not performed on the reusable development daemon. Logical bytes are not promised
physical recovery, and no invented prune/byte progress is displayed.

## Artifact and upgrade verification

`artifacts/deb/Docker Cleanup_0.3.0_amd64.deb`

SHA-256:

```text
891f82ef1a61c420e5c34850660491846bffaeed9d3198c6b7f2444f1e7da4f2
```

Two complete locked `scripts/build-linux.sh` runs produced byte-identical
normalized packages (`cmp` passed), using Rust 1.100.0, Node 24 and
`SOURCE_DATE_EPOCH=1794614400` in the Debian 12 builder. Reproducibility is
demonstrated in this environment, not promised across arbitrary toolchains.
Prior 0.1.0/0.2.0 packages remain available separately.

The executable extracted from the final `.deb` passed **22 native checks**.
The actual packaged 0.2.0 app first saved an alias, project association,
protection, cleanup result, Dark theme, 360px inspector width and 190px map height.
After closing it, the packaged 0.3.0 app opened the same temporary XDG data and
verified all of them. It also verified native dividers, independent pane height,
stable refresh geometry, label disclosure, explicit review/typed progress and
retained mounted data. No database reset or schema migration was needed.

- [Packaged upgrade report](../artifacts/m2/packaged/native-report.json)
- [Packaged explorer](../artifacts/m2/packaged/native-explorer.png)
- [Packaged results](../artifacts/m2/packaged/native-results.png)
- [Checksum sidecar](../artifacts/deb/Docker%20Cleanup_0.3.0_amd64.deb.sha256)

The full suite covers 51 browser journeys, 12 frontend tests, 33 Rust tests,
8 Python tests and 20 live Docker safety checks. See the validation report for
coverage boundaries and screenshots, including the prior visual baseline.
