---
id: TASK-40
title: Promote treemap breadcrumbs and make Storage explorer return to overview
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T10:29:00Z'
labels:
  - frontend
  - navigation
  - usability
milestone: m-2
dependencies: []
references:
  - src/App.tsx
  - tests/browser/navigation.spec.ts
  - tests/browser/history.spec.ts
priority: high
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The breadcrumbs are currently buried among explanatory text below the Storage landscape title. Users overlook the way back to the complete overview and reasonably expect the Storage explorer navigation item to return them to the All storage starting point. This explicit home action must differ from context-preserving Back from review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Prominent keyboard-accessible breadcrumbs replace the Storage landscape panel title, with an actionable All storage root and a clear current category/project drill-down label.
- [x] #2 Clicking Storage explorer from a drilled/filtered explorer or another destination returns to the All storage starting point: default category grouping, no category/project drill-down, and no search/state/age/selection-only or eligibility filters hiding assets.
- [x] #3 The home action and breadcrumb navigation do not authorize cleanup, clear cleanup selection, modify protections, discard unsaved inspector input or reset saved pane dimensions/theme.
- [x] #4 Back from review/history retains its existing context-restoring behavior; home navigation during cleanup leaves the running-operation indicator and cancellation available without replaying or cancelling the operation.
- [x] #5 Tests exercise category/project drill-down, home from another page and the explorer itself, keyboard breadcrumb activation and the distinction between home reset and context-preserving Back.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Replace landscape title with semantic prominent breadcrumb navigation and reuse an explicit exploration reset for All storage and Storage explorer. Reset filters/drill/grouping only; preserve selection, inspector drafts, theme/layout and distinct Back context behavior. Add home-versus-Back keyboard/navigation regression and rerun running-cleanup journeys.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Promoted semantic Storage location breadcrumbs into the former landscape heading. All storage and Storage explorer share a home action resetting grouping/drill/search/state/age/eligibility/selection-only filters and sort, not selection, inspector drafts, theme or pane preferences. Back retains its separate context-preserving behavior. Seven home/navigation/history/progress journeys and production build passed, including keyboard root, unsaved draft/selection preservation and home during active cleanup without replay/cancellation. Handoff: TASK-41 moves scan feedback; TASK-43/44 change scroll geometry, not these home/Back semantics.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Prominent header breadcrumbs and predictable explorer-home reset verified with preserved selection/drafts and distinct Back behavior; seven browser journeys/build passed.
<!-- SECTION:FINAL_SUMMARY:END -->
