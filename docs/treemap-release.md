# Docker Cleanup 0.3.1 — treemap reliability

Milestone `m-3`, 2026-11-15.

## Changes

- Image labels prioritize the descriptive repository basename over registry,
  namespace, tag and digest when fitting is needed. Multiple tags are handled
  individually; complete references remain in hover/focus and inspection.
- Full project headers disclose full names and sizes even when their leaves are
  invisible. A compact grouping chevron lists all measured projects/categories
  without giving tiny groups fabricated map area.
- Writable layers, Images and Volumes drill down through full, bounded header
  hit regions. Enter/Space work too; ordinary tiles still inspect assets.
- Selection, inspector drafts, home/Back, storage accounting and destructive
  safeguards are unchanged. No new persistent instructions clutter the explorer.

## Install or upgrade

Close the application. On your Linux host, from this checkout:

```bash
sha256sum -c 'artifacts/deb/Docker Cleanup_0.3.1_amd64.deb.sha256'
sudo apt install './artifacts/deb/Docker Cleanup_0.3.1_amd64.deb'
docker-cleanup
```

Run as your normal desktop user, not root. Application ID, data directory and
SQLite schema are unchanged; no user-data reset or migration is required.
Installation itself does not run Docker cleanup. With the app closed you may
copy its private application-data directory as a precaution; that is not a
backup of Docker data.

## Verification and limits

See the [validation report](treemap-validation.md) for before/after screenshots,
native pointer/mutation evidence and browser/live results, the
[user guide](user-guide.md) for controls, and [testing](testing.md) for commands.

Scope remains Linux amd64 and local Unix Docker. Native validation uses Debian
12/Xvfb; a fresh manual Ubuntu install, private user inventory and actual rootless
Engine are not validated. Other versions/drivers, external buildx and remote
Docker remain outside scope. Nonempty Engine-global cache pruning remains
API-fixture tested, not performed on the reusable builder's daemon.
There is no backup/undo, deep directory sizing or guaranteed physical recovery.

## Reproducible package

`artifacts/deb/Docker Cleanup_0.3.1_amd64.deb`

SHA-256:

```text
b12cc6fd161d3baeeba9692809bbb24b30648b2c09b9164f312fa13c890e9579
```

Two complete locked `scripts/build-linux.sh` runs produced byte-identical
normalized packages (`cmp` passed), using Rust 1.100.0, Node 24 and
`SOURCE_DATE_EPOCH=1794614400` in the Debian 12 builder. This demonstrates
reproducibility in the recorded environment, not across arbitrary toolchains.
The actual 0.3.0 baseline package was separately verified against its published
SHA-256 `891f82ef1a61c420e5c34850660491846bffaeed9d3198c6b7f2444f1e7da4f2`.
Older packages remain available.

- [Checksum sidecar](../artifacts/deb/Docker%20Cleanup_0.3.1_amd64.deb.sha256)

## Packaged upgrade proof

The executable extracted from the final package passed **29 native checks** after
the actual packaged 0.3.0 application seeded alias/project/protection, a saved
cleanup result, Dark theme, a 360px inspector and a 190px map through its own UI.
The new package reopened the same temporary XDG data and verified each value.
No user-data reset was needed. Real native pointer actions then verified project
header whitespace, tiny-project discovery and Writable layers/Images/Volumes
drill-down. Captured mutations were only one reviewed, non-forced container
DELETE per application journey; volumes and bind mounts were retained.

- [Packaged upgrade report](../artifacts/m3/packaged/native-report.json)
- [Packaged explorer](../artifacts/m3/packaged/native-explorer.png)
- [Packaged results](../artifacts/m3/packaged/native-results.png)
- [Previous packaged explorer](../artifacts/m2/packaged/native-explorer.png)

Final versioned-source checks passed 56 browser journeys, 13 frontend tests,
33 Rust tests, 8 Python tests, build/format and desktop Clippy with warnings
denied. The separate identity-checked live Docker suite passed 20 safety checks;
source native verification passed 24 checks before packaging.
