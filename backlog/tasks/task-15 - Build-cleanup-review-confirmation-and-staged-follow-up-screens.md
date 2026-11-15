---
id: TASK-15
title: Build cleanup review, confirmation, and staged follow-up screens
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:31:00Z'
labels:
  - frontend
  - cleanup
milestone: m-0
dependencies:
  - TASK-14
priority: high
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The example journey removes a few large stopped containers before considering dangling and then broader unused images. The interface must make consequences and subsequent opportunities clear at each stage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Review displays ordered actions, evidence, volume warnings, retained workspaces, and savings uncertainty before confirmation.
- [x] #2 Progress/results retain per-action outcomes and clearly state irreversibility and partial completion.
- [x] #3 After a batch the inventory refreshes and newly eligible images can be reviewed as a separate user-confirmed batch.
- [x] #4 No delete action occurs merely through selecting, filtering, navigating, or opening the review screen.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify review/confirmation/progress/result screens with retained mount evidence and volume/cache scope warnings. Exercise native IPC execution and browser staged image follow-up; ensure view/selection changes never issue a destructive API request.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Review shows ordered actions, evidence, retained mounts, recovery ranges and irreversible volume/cache warnings, with explicit confirmation gates and accessible cancellation. Results preserve individual outcomes; refreshed inventories expose newly eligible images as a separate reviewed batch. Eight browser journeys, live staged cleanup, and native packaged review/execution checks passed; scan/inspection requests are verified non-mutating.
<!-- SECTION:FINAL_SUMMARY:END -->
