---
id: TASK-36
title: Package and document the usability milestone
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T09:04:00Z'
labels:
  - release
  - docs
milestone: m-1
dependencies:
  - TASK-35
priority: medium
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users reviewed the installed MVP rather than a browser mock. Deliver the redesigned experience as a verified Linux update with clear guidance for cache scope, selection and progress, while preserving their existing history and protections.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A versioned Linux Debian update is produced from locked inputs and passes the reproducible-package comparison and packaged-executable smoke test.
- [x] #2 User documentation describes the new workspace/history navigation, theme/layout controls, select-all scope, category explanations and Engine-wide cache workflow.
- [x] #3 Existing MVP history, aliases, project associations and protection preferences survive the update; any schema/preferences migration is tested.
- [x] #4 Release notes link usability screenshots/test evidence, install/upgrade instructions, the package checksum and remaining Linux/Docker/cache limitations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Release 0.2.0 with consistent npm/Cargo/Tauri/UI versions and unchanged application identifier/database schema. Update user/release/testing guidance. Build locked normalized Debian twice and compare bytes, extract final executable for native smoke tests, and seed history/alias/project/protection through the actual prior 0.1.0 packaged app before launching the update against the same temporary app data. Export package/checksum/reports, read back artifacts and verify milestone 12/12 only after all evidence passes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Released 0.2.0 with consistent npm/Cargo lockfiles, Tauri config and UI version; application identifier/SQLite schema unchanged. User guide covers themes/layout, workspace Back/history, structured inspection/links, explicit selection scope, category help, direct cache acknowledgement and truthful progress. Two complete locked scripts/build-linux.sh runs produced byte-identical normalized Debian packages (cmp PASS), SHA-256 e644bdb6a7ed465b7f3b12ed95075582f7c60635b48f5b83dad0572b42781d31. Exported artifacts/deb/Docker Cleanup_0.2.0_amd64.deb plus checksum sidecar; local sha256sum -c returned OK. Actual final extracted executable passed 16 native checks after creating history/alias/project/protection through the actual packaged 0.1.0 app in the same temporary XDG data directory. Initial upgrade harness had an obsolete protection selector; fixed and rerun successfully, no product change needed. Packaged report/screenshots exported to artifacts/m1/packaged and read back. Final versioned sources passed 34 browser journeys, 10 frontend/33 Rust/8 Python tests, build/Prettier/Rustfmt and desktop all-target Clippy -D warnings; live Docker suite passed 20 checks. docs/usability-release.md links checksum/install/upgrade/evidence and records Debian-only native validation, no new manual Ubuntu install and cache/rootless/buildx limits. Task-specific handoffs retained throughout; literal session context clearing was unavailable.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered reproducible Linux amd64 Debian update 0.2.0 and full workflow/release documentation. Final package checksum verified; two complete builds match. Actual packaged MVP-to-update run passes 16 native checks with history, alias, project and protection preserved. Full browser/unit/native/live safety regressions pass; installer is exported under artifacts/deb/.
<!-- SECTION:FINAL_SUMMARY:END -->
