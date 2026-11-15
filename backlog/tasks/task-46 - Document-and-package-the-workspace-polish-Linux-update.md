---
id: TASK-46
title: Document and package the workspace-polish Linux update
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T11:08:00Z'
labels:
  - release
  - docs
milestone: m-2
dependencies:
  - TASK-45
references:
  - docs/user-guide.md
  - docs/testing.md
  - scripts/build-linux.sh
  - tests/native_desktop.py
priority: medium
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The feedback is from the installed application, so the polish needs a verified installable update rather than only browser changes. Explain the changed home/Back and splitter interactions, preserve user data/preferences, and link the new evidence without claiming broader Docker/platform support.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A consistently versioned Linux amd64 Debian update built from locked inputs passes the normalized reproducible-package comparison and the extracted packaged-executable native smoke test.
- [x] #2 The user guide/help documents home-reset versus Back, meaningful treemap labels/full-name disclosure, draggable keyboard-accessible pane controls, independent scrolling and relocated accounting explanations.
- [x] #3 Upgrade verification preserves cleanup history, aliases, project associations and protections from the prior package, plus theme/layout preferences or documented safe layout migration; no user database reset is required.
- [x] #4 Release notes link before/after usability evidence, exact test coverage, checksum and install/upgrade commands, and retain explicit Linux/local-Docker/cache/rootless validation limits.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Version consistently as 0.3.0 and document current home/Back, concise controls, About/help, fitting labels and draggable independent panes. Extend upgrade harness to seed the actual 0.2.0 package with SQLite history/identity/protection plus Dark/width/map preferences, then verify those in extracted 0.3.0. Build normalized locked Debian twice, compare/export/checksum, run packaged/native and final source checks, link reports/limits and close m-2 only when 10/10 verified.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Released 0.3.0 with consistent npm/Cargo/Tauri/UI versions and unchanged application identifier/SQLite schema. Updated user/testing guidance for home versus Back, optional About/accounting help, suffix-fit/hover labels, concise selection labels and independent drag/keyboard splitters. Two complete locked normalized Linux builds compared byte-identically; SHA-256 891f82ef1a61c420e5c34850660491846bffaeed9d3198c6b7f2444f1e7da4f2. Exported artifacts/deb/Docker Cleanup_0.3.0_amd64.deb plus sidecar; local sha256sum -c returned OK. Actual extracted executable passed 22 native checks after seeding the actual 0.2.0 package with history/alias/project/protection, Dark theme, inspector width360 and map height190; all persisted across upgrade. Reports/explorer/results screenshots exported/read back under artifacts/m2/packaged. Final versioned-source run passed all 51 browser journeys (3 workers), 12 frontend/33 Rust/8 Python tests, build/Prettier/Rustfmt and desktop all-target Clippy -D warnings; live Docker safety suite passed20. During concurrent release compilation a broad role query across the 1000-row fixture hit the 5s assertion deadline; narrowed only its attachment locator to the exact asset title, retaining role-based post-search validation, and reran the entire final suite successfully. docs/polish-release.md records checksum/install/upgrade/reproducibility and mock/native/live/Ubuntu/rootless/cache limits. Task-specific handoffs retained; literal session context clearing was unavailable. No unrelated future tasks or destructive backend behavior changed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered reproducible Linux amd64 Debian 0.3.0, full polish documentation and packaged 0.2.0-to-0.3.0 upgrade proof preserving data/theme/layout. Two packages match and exported checksum verifies. Final 51-browser/22-packaged-native plus backend/unit/live safety checks pass.
<!-- SECTION:FINAL_SUMMARY:END -->
