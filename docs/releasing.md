# GitHub CI and releases

Repository: <https://github.com/JNevrly/docker-cleanup>. License: [MIT](../LICENSE).

## Automation

[CI workflow](../.github/workflows/ci.yml) runs on pull requests, pushes to
`main`/`master`, version tags and manual dispatch:

1. **Checks:** consistent release versions/licensing/tag, pinned actionlint,
   frontend build/unit/format checks, Python unit tests, Rustfmt/core tests/Clippy
   and real Chromium browser journeys.
2. **Debian amd64 package:** Rust 1.100.0/Debian 12 with Node 24, desktop Clippy,
   real CLI SSH/mutual-TLS fixtures, two complete locked normalized package builds
   compared byte-for-byte, MIT license inclusion and a smoke journey using the
   executable extracted from the final package.
3. **Python 3.10 compatibility:** release-helper checks in an isolated environment
   with the pinned `tomli` backport; the normal Python 3.11+ job uses stdlib only.
4. **Draft release:** only a pushed `vX.Y.Z` tag in `JNevrly/docker-cleanup`, after
   all previous jobs pass. Downloads that run's verified assets and creates a
   **draft**, never a published release or an overwrite of an existing release.

Only the draft-release job has `contents: write`; other jobs have read-only
repository access. Checkout credentials are not persisted. Third-party actions
are pinned to commit SHAs. No personal access token or extra repository secret is
required: the release step uses the job-scoped `GITHUB_TOKEN`.
There is no `pull_request_target` execution.

Native CI uses an isolated root-run container/Xvfb; WebKit sandbox disabling
belongs only to the fixture harness, not application deployment. The remote test
creates temporary SSH/TLS credentials and synthetic Engines, never accesses user
contexts or a default Docker daemon. Debian's packaged Docker CLI supplies that
test dependency; runtime local sockets still need no CLI.
Host-only disposable-Docker integration remains a separate explicit opt-in test
in [testing.md](testing.md), not an implicit hosted-CI prune.

Builds upload the Debian package, basename-only SHA-256 sidecar,
`release-manifest.json` and public release notes. Native/browser diagnostics are
separate temporary workflow artifacts, not release assets. Never upload user
databases, Docker credentials or private inventories.

## First release: 0.4.0

Preparation alone does **not** push or publish anything. Before pushing:

- Review `git status` and the complete diff, including existing feature changes.
  Commit the complete intended release—not only the workflow files.
- Verify repository ownership, MIT attribution, README links and the screenshot.
  `docs/images/Screenshot.png` is user-supplied and contains workspace names and
  a daemon ID; public screenshots must be reviewed for sensitive metadata.
- Keep `artifacts/`, `dist/`, `node_modules/`, `release-assets/` and test reports
  ignored. Historical local validation documents may refer to ignored evidence;
  the public release notes must not depend on those files.
- Enable GitHub Actions and allow job-requested release write permissions under
  repository/organization policy. Protect the default branch and restrict version
  tag creation to maintainers.
- Push the reviewed commit to the intended default branch and require green CI.

Then, **when ready to create the draft**:

The release helper supports Python 3.8+. Python 3.11+ includes `tomllib`; on
Python 3.8–3.10 install the pinned `tomli` backport in an isolated environment:

```bash
python3 -m venv .venv-release
.venv-release/bin/python -m pip install -r scripts/requirements-release.txt
.venv-release/bin/python scripts/release.py check --tag v0.4.0
```

If creating the environment fails on Ubuntu/Debian, install the matching
`python3-venv` package first. Alternatively, run the helper directly with an
installed Python 3.11+ interpreter. The following commands assume that
`python3` has either parser available (activate the environment with
`source .venv-release/bin/activate` if using the backport):

```bash
python3 scripts/release.py check --tag v0.4.0
git tag -a v0.4.0 -m "Docker Cleanup 0.4.0"
git push origin v0.4.0
```

The tag must point to the reviewed release commit already pushed to GitHub.
The workflow rejects mismatched npm, npm lock, Cargo, Cargo lock, Tauri or UI
versions, incorrect licensing/repository metadata and missing public notes.

Wait for the tag's workflow. Inspect its logs, native evidence and draft assets.
Download the `.deb` and sidecar into a clean directory, run `sha256sum -c`, then
install and smoke-test as a normal user on a supported Linux desktop.
Inspect the package's source commit/run in the manifest. GitHub-generated source
archives are also available; the manifest is not a signed supply-chain attestation.
**Publish the draft manually only after review.**

If replacing a private development package that already reports `0.4.0`, use
`sudo apt install --reinstall ./docker-cleanup_0.4.0_amd64.deb` so the public
package's bundled license/metadata are installed too.

If a draft already exists, CI deliberately fails rather than overwriting it.
Inspect any partial upload and decide whether to delete the draft and rerun.
Never replace a published tag/artifact silently; fix forward with a new version.
Do not compare GitHub's checksum to a historical local build unless the complete
toolchain/environment matches; the guarantee tested is two builds in one CI job.

## Future versions

Update these together:

- `package.json` and both root package versions in `package-lock.json`
- `src-tauri/Cargo.toml` and the root package entry in `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json` and the displayed version in `src/App.tsx`
- `docs/releases/vX.Y.Z.md`, README install example and relevant test expectations

Run `python3 scripts/release.py check --tag vX.Y.Z`, review/check in the changes,
then follow the same tag/draft/publish process. Stable `vX.Y.Z` tags are supported;
prerelease versioning is not configured by this initial pipeline.

## Reproduce CI packaging locally

On a disposable root-run Debian 12 builder with Node 24, pinned Rust, Python 3.11+,
the native dependencies from the workflow, OpenSSH, OpenSSL and Docker CLI:

```bash
cargo install tauri-driver --version 2.1.0 --locked
bash scripts/ci-linux.sh
```

The script never publishes anything and stages assets in `release-assets/`.
That directory must be empty; mixed/stale assets are refused. Use
`RELEASE_OUTPUT_DIR=/path/to/a/new/directory` for a second local run.
Native evidence is in `artifacts/ci-native/`. The harness resolves its executable
and driver from the checkout/PATH; no `/workspace` or `/usr/local/cargo` assumption
is required. `DOCKER_CLEANUP_NATIVE_ARTIFACTS` and
`DOCKER_CLEANUP_TAURI_DRIVER` override those locations when needed.

The repository's sandbox helper can sync and execute this script inside its
identity-checked disposable builder. This is local verification, not proof that
GitHub Actions has run. The first hosted run remains required after pushing.

## Preparation verification — 2026-11-15

Local verification passed:

| Check | Result |
|---|---|
| Version/tag/license guards, portable checksums and stale-asset refusal | 18 Python tests, including ten release-helper cases |
| Frontend unit / production build / formatting | 14 tests; build and Prettier pass |
| Browser journeys | 57 passed with two workers |
| Rust core / formatting / desktop Clippy | 14 unit + 22 service tests; warnings-denied Clippy and Rustfmt pass |
| Real CLI SSH/TLS fixtures with Debian's Docker 20.10.24 | 22 checks passed |
| Packaged native smoke via PATH-resolved driver | 24 checks passed |
| Two complete normalized Linux builds | Byte-identical; bundled MIT license equals `LICENSE`, mode 0644 |
| Workflow validation | SHA-verified actionlint 1.7.12 passes |

The local candidate assets are in `artifacts/github-release-final/`, with
diagnostics in `artifacts/release-prep-evidence/` (both intentionally ignored).
Its manifest has empty commit/run fields because no hosted workflow produced it.
The real GitHub workflow will supply those fields and its own checksum.
The supplied screenshot was used unchanged.

The Python compatibility follow-up passed all 18 Python tests on both Python
3.11.2 (stdlib `tomllib`) and real Python 3.10.22 (`tomli` 2.5.0 in a virtualenv).
Without the backport, Python 3.10 now exits with setup guidance rather than an
import traceback; `--help` still works.

**Not yet verified:** GitHub runner setup, repository permissions, tag-triggered
draft creation and actual release upload. These need the first hosted run.
No commit, push, version tag or release publication was performed during preparation.
