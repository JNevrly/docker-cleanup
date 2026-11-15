---
id: TASK-52
title: Prepare MIT-licensed GitHub release and CI for 0.4.0
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T14:07:00Z'
updated_date: '2026-11-15T14:30:00Z'
labels:
  - release
  - ci
  - docs
dependencies: []
priority: high
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user confirmed the application works and will publish it at https://github.com/JNevrly/docker-cleanup. Prepare public-facing release material and GitHub automation, retaining their supplied docs/images/Screenshot.png and existing uncommitted feature work. This request authorizes preparation only, not pushing tags or publishing a release.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MIT license and consistent package/repository metadata are present; README introduces the product with the supplied screenshot, safe install/use instructions, supported scope and useful documentation links.
- [x] #2 GitHub pull-request/push CI verifies locked frontend/backend/browser/Python checks, and Linux packaging exercises reproducibility and the extracted native executable without relying on sandbox-only filesystem paths.
- [x] #3 Version tags are checked against all release metadata and produce a draft GitHub release containing a Debian amd64 package and portable checksum; write permissions and credentials are restricted to the release job.
- [x] #4 Release procedure, validation evidence and CI-not-yet-executed limitations are documented; local helpers/tests/workflow validation pass, and no push/tag/publication is performed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Keep version0.4.0 and all existing feature work. Add MIT license/repository metadata and a public README led by the supplied screenshot. Add pinned-action GitHub PR/push/tag CI: frontend/core/browser/Python checks, Debian12 amd64 two-build comparison, desktop Clippy, real CLI SSH/TLS fixtures and portable extracted-package native smoke. Validate all release versions/tag before build; stage stable-named deb plus basename-only checksum and CI provenance. Use a tag-only draft-release job with contents:write, build jobs read-only and no persisted checkout credentials; no push/tag/publication here. Add release checklist/versioned public notes, test helper edge cases and YAML/actionlint, exercise portable CI script locally where infrastructure permits, and state GitHub-hosted execution remains pending.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added MIT LICENSE and npm/Cargo/Tauri repository/license metadata; README now leads with unchanged user screenshot and public install/safety/use instructions. Added versioned public0.4.0 release notes and maintainer checklist. Workflow pins actions, uses read-only build jobs and a tag-only draft release job with contents:write; no checkout credentials persist and no publish/tag/push performed. release.py validates npm/Cargo/Tauri/UI versions, stable tag, MIT metadata/repository/notes, Debian version/architecture, basename-only checksum and stale-output refusal; seven new unit journeys pass. Portable native harness no longer hardcodes /workspace or tauri-driver installation path. Actionlint1.7.12 verified by SHA passes; frontend14/build/format, Python15 and57 browser journeys pass. Initial full CI Linux script passed against Debian DockerCLI20.10.24, with22 SSH/TLS checks, two identical MIT-containing packages, portable checksums and24 extracted-native checks. Removed redundant Cargo homepage warning and added explicit644 license-mode assertion/test; final same-script run in progress before export/finalization. GitHub-hosted execution remains untested until first push and is documented explicitly.

Final preparation validation complete. Final portable CI Linux script rerun passed against Debian DockerCLI20.10.24: desktop Clippy warnings-denied,22 real SSH/mTLS checks, two complete locked normalized builds byte-identical, exact MIT license content/mode0644 in package,24 extracted-native checks, stage/version/arch validation and portable sha256sum verification. Rust14unit+22service/Rustfmt, frontend14/build/Prettier, Python15 (including release guard/checksum/stale-output/license-mode coverage),57 browser journeys with2workers, actionlint1.7.12 and bash syntax pass. Exported/read final local candidate artifacts/github-release-final/docker-cleanup_0.4.0_amd64.deb plus portable sidecar, manifest and public notes; SHA256 cfd7a07a853aa0463a86e82922311d7b70e265b09a9bf80bf7bb6ad0677dde1e. Read back native/transport evidence under artifacts/release-prep-evidence. Local manifest commit/run fields intentionally empty, not pretending GitHub produced it. docs/releasing.md records verification, first-hosted-run limits, screenshot privacy review and same-version development reinstall instructions. Supplied Screenshot.png hash unchanged af39675447cd5fb785738a258ac6d53672d7d018c40bfc759bca68f939c7b10c. No commit, push, version tag, GitHub API write or release publication. Hosted runner setup/permissions/tag-triggered draft creation still require first push; task completion means preparation/configuration and local verification, not a claim hosted CI ran.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Prepared0.4.0 for JNevrly/docker-cleanup: MIT license, screenshot-led public README, pinned-action GitHub checks/packaging and tag-triggered draft releases with portable checksums. Version/tag/license/architecture/stale-asset guards and release checklist added. Full local packaging flow and core/browser/native/transport suites pass; candidate exported and checksum verifies. Nothing committed/pushed/tagged/published; first hosted CI/release-job confirmation remains explicitly pending.
<!-- SECTION:FINAL_SUMMARY:END -->
