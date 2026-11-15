---
id: TASK-35
title: Verify the redesigned usability and existing cleanup safety
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:58:00Z'
labels:
  - testing
  - accessibility
  - safety
milestone: m-1
dependencies:
  - TASK-28
  - TASK-29
  - TASK-30
  - TASK-31
  - TASK-32
  - TASK-34
priority: high
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The redesign touches every major screen and could accidentally trade safety for convenience. Validate the original user complaints through concrete workflows and screenshots, not just component presence or theme tokens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Browser journeys cover readable light/default and dark/system themes, layout resize/collapse, main-page review/history, related-asset links, select-all states, category help and cache cleanup discovery.
- [x] #2 Progress tests cover per-action updates, cancellation, mixed outcomes, navigation during execution and indeterminate cache prune without invented progress.
- [x] #3 Screenshots and keyboard checks at the agreed viewport sizes demonstrate readable tables, efficient space use, retained context and accessible focus; the large synthetic inventory remains usable.
- [x] #4 Native Tauri/WebKit and opt-in identity-checked disposable-Docker regressions prove confirmations, protected/reference guards, retained mounts/volumes and no real-daemon default fallback remain intact.
- [x] #5 Known mock versus live coverage and any unvalidated configuration are recorded honestly; no task or milestone is marked complete merely because code exists.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Run complete browser/unit/format/Rust/clippy/Python suites and identity-checked live Docker integration against the existing disposable daemon. Extend real WebKit journey to observe typed deleting progress before completion, retain screenshots/reports and record mock versus live coverage. Sync back only formatter output for milestone-modified Rust files. Verify all milestone safety/navigation/layout acceptance evidence before release packaging.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Milestone-wide verification passed: 34 browser journeys, 10 frontend unit tests, 12 Rust unit plus 21 service tests, core all-target Clippy with warnings denied, 8 Python tests, production build/Prettier and Backlog doctor. Extended native WebKit fixture with in-flight delay; 13 native checks now include real typed per-item deleting/spinner/count rendering before completion, with exact non-forced mutation capture. Identity-checked live disposable Docker run passed all 20 checks, retaining mounted data and reusable builder. Formatter output for four milestone-modified Rust files synced back and read/checked. Screenshots inspected at three viewport sizes plus light/dark/structured inspector/mixed progress/native progress. docs/usability-validation.md records evidence and honest mock/native/live boundaries, unvalidated rootless/other drivers and no nonempty global cache prune on shared development daemon. Handoff: TASK-36 remains: bump version consistently, document upgrade/navigation/cache/progress, reproduce Debian package twice, smoke-test extracted executable and verify MVP persistence across upgrade. No installer claim until those checks pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Redesigned workflows and unchanged cleanup safeguards verified across 34 browser journeys, 10 frontend/33 Rust/8 Python tests, Clippy, 13 real WebKit checks and 20 live disposable-Docker checks. Evidence and limits documented in docs/usability-validation.md; packaging is next.
<!-- SECTION:FINAL_SUMMARY:END -->
