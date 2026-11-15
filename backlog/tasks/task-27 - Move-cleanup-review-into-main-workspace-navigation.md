---
id: TASK-27
title: Move cleanup review into main-workspace navigation
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:27:00Z'
labels:
  - frontend
  - navigation
milestone: m-1
dependencies:
  - TASK-26
priority: high
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The MVP relies on dialogs for substantial workflows. Reviewing a cleanup should be a navigable workspace with enough room for evidence, retained storage and consequences, not a floating box competing with the explorer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The main workspace has distinct explorer, cleanup review, progress/results and history destinations with clear current location and Back navigation.
- [x] #2 Cleanup review occupies the main panel and displays ordered actions, identity evidence, retained mounts, uncertainty and warnings without a large modal.
- [x] #3 Returning from review preserves explorer filters, grouping, drill-down, selection and inspector context; navigating away never authorizes a deletion.
- [x] #4 Volume data-loss and builder-wide scope acknowledgements remain explicit; exceptional confirmation dialogs may be used but no safeguard is removed during navigation redesign.
- [x] #5 Navigating during execution cannot hide that work is active, re-execute a consumed plan, or silently cancel an operation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Introduce explicit main-workspace explorer/review/progress/results/history destinations with accessible Back navigation while keeping explorer state mounted. Render review as a page, keep volume/cache acknowledgements, consume UI plans on submission and show global active-cleanup navigation/cancellation. Adapt browser/native selectors to the new page semantics and verify preserved filters/selection/inspector context and no replay/navigation-triggered mutation. History browsing/detail refinements remain TASK-28.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Introduced explicit explorer/review/progress/result/history destinations in App.tsx and reusable page/result rendering in CleanupWorkspace.tsx. Explorer remains mounted while hidden so filters, drill-down, selection, scroll and unsaved inspector input survive Back. Submission immediately removes the executable UI plan and exposes a global active-cleanup banner/cancel/navigation; completion does not steal focus from another destination. Volume and builder scope acknowledgements remain enforced. Verification: production build, 8 unit tests, all 18 browser journeys and 10 real Tauri/WebKit checks passed; native helper now asserts main-workspace review, not a dialog. Read back artifacts/workspace-result.png. Handoff: TASK-28 should refine the basic history list/result page with persistent browsing context and explicit empty/partial/long-result coverage, retaining the existing daemon-matching follow-up guard. Filesystem/process dialogs and detailed item progress remain TASK-29 and TASK-34.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cleanup review is now a full main-workspace page with Back navigation and unchanged destructive acknowledgements. Navigation preserves explorer context; active cleanup stays visible across destinations, cannot be replayed, and is not silently cancelled. Verified 18 browser journeys, 8 unit tests, native WebKit review/execution (10 checks), production build and inspected result screenshot.
<!-- SECTION:FINAL_SUMMARY:END -->
