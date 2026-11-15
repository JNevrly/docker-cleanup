---
id: TASK-34
title: Display overall and item-level progress in the cleanup workspace
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:55:00Z'
labels:
  - frontend
  - progress
milestone: m-1
dependencies:
  - TASK-27
  - TASK-28
  - TASK-33
priority: high
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During deletion the MVP does not give enough feedback about what is currently being removed. Users need visible progress for the whole batch and each item, with cancellation in the same accessible workspace.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The main-panel progress page lists all reviewed executable actions with live queued/checking/deleting and terminal statuses; the active item has a spinner and completed items stay visible.
- [x] #2 An overall completed/total progress bar handles success, failure, skipped and cancelled outcomes without implying that all completed actions succeeded.
- [x] #3 Engine-wide cache prune and other unknown-duration work have an indeterminate indicator and scope label rather than a fabricated percentage.
- [x] #4 Cancel remaining actions is always accessible during execution and explains that an in-flight deletion may finish; results remain visible after cancellation or partial failure.
- [x] #5 Progress transitions into the result detail page without a modal; navigation back to the explorer/history leaves an obvious active-operation indicator, and accessible status announcements do not continually steal focus.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Consume typed progress by active plan identity, initialize queued executable rows (cache collapsed to one), reconcile final outcomes and ignore stale/regressive events. Render overall terminal-action counts, per-row spinners/status/evidence and indeterminate Engine prune duration without invented bytes/percent. Keep cancellation/global navigation banner and no focus stealing; add live synthetic IPC and reducer tests plus native regression.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added CleanupProgressPage and pure progress reducers. Reviewed executable rows start queued; typed events apply only to active plan/operation and cannot regress terminal rows. Final outcomes reconcile lost live events. Overall progress counts all terminal statuses separately from successful deletion, with per-item checking/deleting spinners and messages; Engine prune is one indeterminate-duration operation. Cancellation remains accessible and global banner/navigation persists without focus stealing. Verification: 34 browser journeys passed, including live IPC status transitions, mixed outcomes, ignored stale events, focus retention, cancel and navigation, plus indeterminate cache attribute/single row; 10 unit tests, production build/format and 12 native WebKit checks passed. Read back artifacts/cleanup-progress.png. Handoff: TASK-35 should run full native/live regressions and capture final evidence, including builder Rust formatting sync; TASK-36 owns version/installer/docs. No updated installer produced yet.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Main-workspace cleanup now shows truthful overall and per-item progress, independent terminal counts, cancellation and one indeterminate cache operation. Verified 34 browser journeys, 10 unit tests, build/format and 12 native checks; stale events and final reconciliation covered.
<!-- SECTION:FINAL_SUMMARY:END -->
