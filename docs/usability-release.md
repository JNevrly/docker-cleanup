# Docker Cleanup 0.2.0 — readable workspace

Usability milestone `m-1`, 2026-11-15.

## Changes

- Light-first Light/Dark/System themes with larger readable text.
- Compact workspace; persisted keyboard-resizable/collapsible map and inspector.
- Main-workspace review, results and searchable history with preserved Back context.
- Structured on-demand Files/Processes views, optional redacted metadata and
  related-asset links that do not change cleanup selection.
- Tri-state select-all with explicit filtered-view scope and eligibility reasons.
- Category explanations and direct, separately acknowledged **Clear Engine build cache**.
- Overall and per-item progress, truthful mixed outcomes and cancellation;
  Engine prune stays one indeterminate-duration operation.

## Install or upgrade

Close the running application first. On the Linux host, from this checkout:

```bash
sha256sum 'artifacts/deb/Docker Cleanup_0.2.0_amd64.deb'
sudo apt install './artifacts/deb/Docker Cleanup_0.2.0_amd64.deb'
docker-cleanup
```

Run the application as your normal desktop user, not root. The package keeps
the same application identifier, data location and SQLite schema. Existing
history, aliases, project associations and protections must not be removed
when upgrading. You may copy the private application-data directory while the
application is closed as an extra precaution. This is not a Docker-data backup.
No Docker cleanup is run by installing the package.

## Verification and limits

See [the usability validation report](usability-validation.md) for test results,
screenshots and mock/native/live coverage, [the user guide](user-guide.md) for
controls and [testing instructions](testing.md) for repeatable commands.

Linux amd64/local Unix Docker only; tested builder is Debian 12.
Other Engine versions/storage drivers and real rootless daemons remain unvalidated.
External buildx builders, remote endpoints, per-record cache deletion, deep
directory sizing, backups and undo remain unsupported. Logical-data estimates
are not promises of physical disk recovery. Cache prune guards are tested
against API fixtures; a nonempty global prune is not run on the shared builder daemon.

## Artifact

`artifacts/deb/Docker Cleanup_0.2.0_amd64.deb` (Linux amd64)

SHA-256:

```text
e644bdb6a7ed465b7f3b12ed95075582f7c60635b48f5b83dad0572b42781d31
```

Two complete `scripts/build-linux.sh` runs using locked npm/Cargo inputs,
Rust 1.100.0 and `SOURCE_DATE_EPOCH=1794614400` produced byte-identical
normalized archives (`cmp` succeeded). This is environment-specific
reproducibility evidence, not a claim across arbitrary distributions/toolchains.
The original 0.1.0 package is retained separately.

The executable extracted from the final 0.2.0 `.deb` passed **16 native
Tauri/WebKit checks**, including a real upgrade from the packaged 0.1.0
executable. That run created history plus an alias, project association and
protection through the MVP, closed it, then verified all four through the update
using the same temporary application-data directory. No database-schema migration
was needed. It also verified inline inspection, real typed progress, explicit
confirmation and retained mounted data.

- [Packaged upgrade/native report](../artifacts/m1/packaged/native-report.json)
- [Packaged progress screenshot](../artifacts/m1/packaged/native-progress.png)
- [Packaged results screenshot](../artifacts/m1/packaged/native-results.png)
- [SHA-256 sidecar](../artifacts/deb/Docker%20Cleanup_0.2.0_amd64.deb.sha256)

Final versioned-source checks: 34 browser journeys, 10 frontend tests,
12 Rust unit + 21 service tests, 8 Python tests, production build, Prettier,
Rustfmt and desktop all-target Clippy with warnings denied passed.
The live Docker safety suite passed 20 checks. The package was validated under
Debian 12/Xvfb; a fresh manual Ubuntu 22.04 desktop install of this update has not
been performed here.
