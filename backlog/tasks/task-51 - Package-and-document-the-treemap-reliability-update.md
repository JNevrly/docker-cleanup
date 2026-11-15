---
id: TASK-51
title: Package and document the treemap reliability update
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T11:55:00Z'
updated_date: '2026-11-15T12:32:00Z'
labels:
  - release
  - docs
milestone: m-3
dependencies:
  - TASK-50
references:
  - scripts/build-linux.sh
  - tests/native_desktop.py
  - docs/user-guide.md
  - docs/testing.md
priority: medium
type: task
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
These corrections respond to the installed 0.3.0 application. Ship a verifiable Linux update with clear label and interaction behavior, preserved user state and evidence that the packaged executable contains the fix. Do not expand platform/Docker scope or replace the accepted visual direction.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A consistently versioned Linux amd64 Debian update from locked inputs passes normalized reproducible-package comparison and targeted native smoke tests using the executable extracted from the final package.
- [x] #2 The user guide/release notes describe name-first truncation, full-reference disclosure, project-header hover/focus and category-header drill-down without introducing new persistent instructional clutter in the explorer.
- [x] #3 Upgrade verification from the actual 0.3.0 package preserves cleanup history, aliases, project associations, protections and theme/pane preferences or documents any safe required migration; no user data reset is required.
- [x] #4 Release notes link the package checksum, installation/upgrade commands, before/after screenshots and exact browser/native coverage, while retaining explicit Linux/local-Docker/rootless/buildx/cache validation limits.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Release focused correction as 0.3.1 with consistent npm/Cargo/Tauri/UI versions, unchanged app ID/schema and updated user/testing/release docs. Extend actual 0.3.0 packaged upgrade seeding to use separators and verify history/alias/project/protection/Dark theme/360px inspector/190px map across restart. Build locked normalized Debian twice, compare bytes, run native journey from final extracted executable against actual prior deb, export/read artifacts+checksum+reports, rerun final source checks and close m-3 only at 5/5 done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Released 0.3.1 consistently across npm/Cargo locks, Tauri and UI; application identifier/schema unchanged. User/testing/release docs explain name-first references, full header pointer/focus, compact all-group fallback and unchanged cleanup safety. Two full locked normalized scripts/build-linux.sh runs compared byte-identically with cmp; SHA-256 b12cc6fd161d3baeeba9692809bbb24b30648b2c09b9164f312fa13c890e9579. Exported artifacts/deb/Docker Cleanup_0.3.1_amd64.deb and sidecar; local sha256sum -c returned OK and dpkg metadata confirms 0.3.1 amd64. Actual prior 0.3.0 package hash matched original published baseline. Extended upgrade harness to seed its separator-based 360px inspector/190px map and Dark theme. Final extracted 0.3.1 executable passed29 native checks after actual 0.3.0 seeding/restart, preserving aliases/project/protection/history/theme/panes. Exported/read artifacts/m3/packaged report/explorer/results; report exact mutations limited to one reviewed non-forced container deletion in each old/new journey. Final versioned-source checks: 56 browser, 13 frontend unit, 12 Rust unit+21 service, 8 Python, production build, Prettier/Rustfmt, desktop all-target Clippy -D warnings pass. Fresh live disposable-Docker safety run passed20; source native24. docs/treemap-release.md and treemap-validation.md link exact checksum/evidence/install/upgrade/limits; local documentation links resolve. Task-specific handoffs retained at boundaries because literal context clearing unavailable. No commit/push or host installation performed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered reproducible Linux amd64 0.3.1 with documented treemap fixes and actual packaged 0.3.0-to-0.3.1 persistence proof. Two builds identical, checksum verifies, 29 packaged-native checks and complete source/live suites pass. All m-3 acceptance criteria verified.
<!-- SECTION:FINAL_SUMMARY:END -->
