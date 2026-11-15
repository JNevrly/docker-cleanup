---
id: TASK-14
title: Execute reviewed cleanup batches and report partial failures
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:31:00Z'
labels:
  - backend
  - cleanup
milestone: m-0
dependencies:
  - TASK-13
priority: high
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Docker deletions cannot generally be rolled back, and daemon state may change between review and execution. Users need precise results rather than an all-or-nothing success message.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Only confirmed plan actions execute, with immediate state/protection/reference revalidation and explicit refusal or re-review for material changes.
- [x] #2 Per-action progress, success, failure, and skipped dependencies are reported; failures do not imply rollback or hide successful deletions.
- [x] #3 Cancel stops scheduling further actions and explains any in-flight operation that cannot be interrupted.
- [x] #4 All API calls use constrained typed targets; tests verify no force, automatic container stop, implicit volume removal, or host-file deletion occurs.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify confirmed-only execution, per-action revalidation and partial outcomes with a stateful fixture API and live disposable Docker. Harden queued-worker cancellation and reject concurrent IPC operations; prove skipped dependencies and persistence failures do not imply rollback. Rerun full Rust/native checks before finalizing.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Execution consumes confirmed plans, revalidates daemon and material state before each action, rejects concurrent desktop operations, and preserves queued-worker cancellation. Per-action deleted/failed/skipped/cancelled outcomes survive partial failures; persistence failure is reported without hiding completed deletions. Thirty Rust tests pass, including skipped image dependencies, new volume references, early cancellation, permission failures and replay refusal. Clippy passes for all desktop targets with warnings denied.
<!-- SECTION:FINAL_SUMMARY:END -->
