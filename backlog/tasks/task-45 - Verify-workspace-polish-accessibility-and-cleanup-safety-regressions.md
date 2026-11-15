---
id: TASK-45
title: Verify workspace polish, accessibility and cleanup safety regressions
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T11:00:00Z'
labels:
  - testing
  - accessibility
  - safety
milestone: m-2
dependencies:
  - TASK-37
  - TASK-38
  - TASK-39
  - TASK-40
  - TASK-41
  - TASK-42
  - TASK-43
  - TASK-44
references:
  - docs/testing.md
  - tests/browser
  - tests/native_desktop.py
  - tests/integration_docker.py
priority: high
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
This polish changes navigation semantics, label rendering, focus, scroll ownership and pane geometry across the main explorer. Validate the original installed-app complaints through actual behavior and visual evidence without trading away the safety guarantees verified in m-1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Browser journeys cover conventional disabled styling, reduced prose/contextual legends, prominent breadcrumbs, home-reset versus Back semantics, stable refresh placement, meaningful truncation/full-name disclosure and both draggable splitters.
- [x] #2 Screenshots and pointer/keyboard checks at 1024x720, 1440x900 and 1920x1080 demonstrate no text overflow, no refresh-induced workspace movement, independent table/inspector scrolling, persisted usable dimensions and accessible focus in Light/Dark/System.
- [x] #3 Dense synthetic inventories and long image/project names remain searchable and inspectable; resizing and home navigation preserve cleanup selection and unsaved inspector input as specified.
- [x] #4 Existing backend/browser and real Tauri/WebKit regressions still verify review confirmations, protection, dependency checks, retained mount/volume boundaries, cache scope, progress/cancellation and no replay or default-daemon fallback; live Docker work uses only the explicit identity-checked disposable daemon.
- [x] #5 Concrete results/screenshots, remaining limitations and mock versus native/live coverage are recorded honestly; neither this task nor the milestone is completed on code presence alone.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Run final full browser/unit/format/Rust/clippy/Python suites and identity-checked live Docker safety journey. Extend real WebKit checks to separator resizing, independent viewport geometry and label disclosure as well as stable scan status. Retain final screenshots and clearly distinguish synthetic/browser/native/live evidence; resolve regressions before packaging.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final full browser suite passed 51/51 journeys, including added dense open-inspector checks in Light/Dark/System at three viewport sizes. Initial full run exposed dense-inventory measurement overhead; fixed by caching text widths, reading font once per render and skipping invisible tiny labels, then reran the entire suite successfully. 12 frontend unit tests, production build/Prettier, 12 core+21 Rust service tests, Rustfmt, desktop all-target Clippy -D warnings, 8 Python tests and Backlog doctor passed. Real Tauri/WebKit passed 17 checks including both separators, independent viewport height, tooltip keyboard disclosure, stable scan header, confirmation/progress and persisted history. Identity-checked live disposable Docker passed 20 safety checks; reusable builder retained. Final screenshots/reports read back under artifacts/m2; docs/polish-validation.md records mock/native/live boundaries and rootless/buildx/cache/Ubuntu validation limits. Handoff: TASK-46 must version/package twice, smoke-test extracted executable and verify upgrade from actual 0.2.0 including saved theme/map/inspector preferences. No new installer claim yet.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
All polish and safety regressions verified: 51 browser journeys, 12 frontend/33 Rust/8 Python tests, 17 native WebKit checks and 20 live Docker checks pass. Dense performance regression corrected and evidence documented.
<!-- SECTION:FINAL_SUMMARY:END -->
