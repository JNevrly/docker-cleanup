---
id: TASK-50
title: >-
  Verify meaningful treemap labels and group interactions in browser and native
  WebKit
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T11:55:00Z'
updated_date: '2026-11-15T12:28:00Z'
labels:
  - testing
  - treemap
  - accessibility
milestone: m-3
dependencies:
  - TASK-47
  - TASK-48
  - TASK-49
references:
  - docs/testing.md
  - docs/polish-validation.md
  - tests/browser
  - tests/native_desktop.py
  - tests/integration_docker.py
priority: high
type: task
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The remaining failures were found in the installed app despite prior fitting and keyboard tests. This correction needs fixtures matching the reported reference and small-group geometry, plus real pointer/native evidence, rather than another pass based solely on DOM presence or dispatched events.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Browser tests cover the exact reported long reference, multiple-tag handling, descriptive-name priority, full-name project disclosure and actual pointer drill-down for every reported broken category, including whitespace targets and nearly invisible leaves.
- [x] #2 Pointer and keyboard checks exercise By project and By category in Light/Dark/System, shallow and dense maps, splitter resizing and 1024x720/1440x900/1920x1080 viewports with no label overflow, stale tooltip or stolen asset interactions.
- [x] #3 The 1000-asset search/sort and dense open-inspector journeys remain usable; selection, unsaved inspector input, home/Back behavior and active cleanup navigation remain covered.
- [x] #4 The actual Tauri/WebKit app passes the targeted project-hover and category-pointer scenarios alongside existing confirmation, protection/dependency, retained-mount, cache-scope and progress/cancellation regressions; any live Docker test uses only the explicit identity-checked disposable daemon.
- [x] #5 Before/after screenshots, concrete test outputs and mock versus native/live limitations are recorded honestly, including any installed environment not reproduced; no task is considered verified just because handlers or text nodes exist.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Complete project-pointer/keyboard theme+viewport matrix alongside existing exact-reference, tiny-group, category and dense tests. Run complete browser/unit/build/format/Rust/Clippy/Python and identity-checked live Docker suites, export/read native pointer reports/screenshots and document coverage/limits before packaging. Native evidence must use W3C pointer movement/down/up for reported interactions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final verification: 56/56 browser journeys with real pointer/keyboard project/category matrix in Light/Dark/System at 1024/1440/1920; exact long reference and multi-tag fixture; 20 small long-path groups plus one-byte invisible group; 1000-asset performance/navigation/selection/drafts/active cleanup preserved. Actual Tauri/WebKit passed 24 checks, exported/read artifacts/m3/native-report.json and native-explorer.png; only reviewed non-forced container deletion captured. Rust 12 unit+21 service, desktop all-target Clippy -D warnings/Rustfmt, 13 frontend units, 8 Python tests, production build and Prettier all pass. Fresh live Docker suite passed20 against exact identity-checked disposable daemon d0671bbd-4d1e-4144-bf38-82c69c373223; report read back. docs/treemap-validation.md records before/after evidence, commands, coverage distinctions and limits. Handoff/context boundary: TASK-51 alone remains: version 0.3.1 consistently, extend upgrade harness for actual 0.3.0 separators/preferences, build normalized locked package twice, compare bytes, run extracted-package 0.3.0 upgrade/native journey, export/read package/checksum/reports and finalize docs. Prior 0.3.0 deb remains original m-2 artifact; no source/backend identity/schema change or commit performed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Verified all treemap fixes in 56 browser and 24 native checks, plus 20 identity-checked live Docker safety checks and full unit/backend/tooling checks. Evidence exported/read; installed Ubuntu/private inventory/rootless/nonempty cache limits explicitly documented.
<!-- SECTION:FINAL_SUMMARY:END -->
