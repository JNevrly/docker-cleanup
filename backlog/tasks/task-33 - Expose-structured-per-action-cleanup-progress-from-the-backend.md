---
id: TASK-33
title: Expose structured per-action cleanup progress from the backend
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:52:00Z'
labels:
  - backend
  - ipc
  - progress
milestone: m-1
dependencies: []
priority: high
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current operation messages do not reliably distinguish checking from deleting or expose a complete live action list. The new UI needs truthful progress events tied to reviewed actions rather than an animated but uninformative global message.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Typed progress events identify the operation/plan, action identity and meaningful queued, checking, deleting, deleted, failed, skipped and cancelled transitions.
- [x] #2 Completed/total counts are based on reviewed executable actions; an Engine-wide cache prune is one scoped operation rather than pretend per-record deletion.
- [x] #3 Terminal events agree with the final persisted/returned outcomes, including partial failure, skipped dependencies, cancellation before worker execution and persistence failure.
- [x] #4 No byte percentage or Docker prune completion percentage is invented where the Engine does not supply it; indeterminate work remains explicitly indeterminate.
- [x] #5 Tests verify event ordering/identity, cache scope, queued cancellation and no post-cancellation scheduling or duplicate execution; existing destructive-call guards remain intact.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Introduce typed cleanup progress payload/status and an outcome-emitting tracker with plan/action identities and executable completed/total counts. Queue reviewed actions, distinguish checking from actual deleting, emit every terminal outcome consistently and normalize Engine cache to one operation. Preserve cancellation before queued worker execution as a returned result with no mutations, persistence-failure evidence and all revalidation guards. Add event-order/identity/count/cache/cancel/replay tests and run backend suite.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added serde-typed CleanupProgress/ActionStatus and ProgressOutcomes tracker in src-tauri/src/progress.rs, mirrored in TypeScript. Queue/check/delete/terminal events include operation/plan/action identities and completed/total executable counts; cache always uses one engine-cache identity. Terminal messages/statuses match final outcomes including failures/skips/cancel. Confirmed plans are consumed before execution checks; each action still refreshes daemon identity/state before mutation. Queued-worker cancellation now returns cancelled outcomes with no destructive calls instead of losing result evidence to an initial refresh error. Cancellation checked again after deleting callbacks before scheduling calls. Verified 12 Rust unit plus 21 service tests, including strict event order, single cache count across two records, replay refusal, partial/dependency outcomes, persistence failure and queued cancellation; no byte/percentage fields fabricated. Handoff: TASK-34 consumes operation-progress typed events and must ignore stale plan identities, reconcile final returned outcomes, and render cache as one indeterminate operation. Rust formatting validated in builder; formatted source sync back will be included in final regression task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Typed per-action progress now emits truthful lifecycle transitions, executable counts and terminal outcomes. Engine prune is one operation; queued cancellation and persistence failure retain honest result evidence. All 33 Rust tests pass, including safety and event ordering/replay regressions.
<!-- SECTION:FINAL_SUMMARY:END -->
