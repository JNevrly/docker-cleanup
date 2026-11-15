---
id: TASK-30
title: Add explicit select-all and deselect-all controls with eligibility feedback
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:46:00Z'
labels:
  - frontend
  - selection
milestone: m-1
dependencies:
  - TASK-26
priority: high
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
There is no familiar select-all checkbox, and Select eligible in view can appear to do nothing when the category does not support individual deletion. Selection scope and exclusions must be obvious before a potentially destructive batch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A table-header select-all checkbox selects all individually eligible assets in the current filtered/drilled view and supports unchecked, indeterminate and checked states; deselect-all scope is explicit.
- [x] #2 Visible eligible count, selected-in-view count, selected-outside-view count and clear-all selection are available; selection is preserved across view changes.
- [x] #3 Protected/running/shared-accounting assets and unsupported per-record cache deletion cannot be silently included; exclusion reasons are readable and available to keyboard users.
- [x] #4 When no assets are eligible, bulk selection is disabled with an explanation instead of a silent no-op; cache views point users to the separate builder-cache cleanup action.
- [x] #5 Existing stale-selection, protection, dependency, daemon-change and uncertain-reclaim safeguards remain covered by regression tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Add tri-state table-header selection over individually eligible filtered/drilled assets, explicit deselect-in-view and clear-all scope, eligibility/in-view/outside counts and keyboard-readable exclusion reasons. Keep existing reference/dependency planning semantics and stale/daemon/protection guards. Disable empty bulk actions with an explanation and point cache rows to scoped cleanup. Verify selection states across filters and all regressions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added tri-state header selection across eligible filtered/drilled rows, deselect-in-view preserving outside selections, explicit global clear scope and eligible/in-view/outside counts. Disabled empty bulk actions and added focusable readable exclusion reasons for protected/active/shared/cache assets. Existing selectable/dependency plan behavior preserved. Verification: build and 8 unit tests passed; initial full suite found minimum viewport regression and obsolete exact-text test, corrected without shrinking fonts; final targeted 11 layout/selection/stale-daemon/large-inventory journeys passed, including six rows at 1024x720, indeterminate selection and outside-view preservation. Handoff: TASK-31 must supply direct Engine-wide cache action; cache remains unsupported per-row. All prior inspection/navigation journeys passed in the initial full run.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Explicit tri-state select-all, deselect-in-view, counts, clear-all scope and exclusion explanations are implemented. Verified build, unit tests and 11 focused layout/selection/state regressions; existing dependency and protection rules unchanged.
<!-- SECTION:FINAL_SUMMARY:END -->
