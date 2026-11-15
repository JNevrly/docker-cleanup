---
id: TASK-28
title: Show cleanup history and result details as full workspace pages
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:35:00Z'
labels:
  - frontend
  - history
milestone: m-1
dependencies:
  - TASK-27
priority: high
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user specifically found Cleanup results and history inappropriate as a modal. Long results, partial failures and before/after measurements need readable permanent space and predictable navigation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cleanup history is a main-panel list; choosing an entry opens a full main-panel result detail view, not a modal.
- [x] #2 Result details show daemon identity, before/after usage, original estimate, reported reclaimed bytes, unknown host-free-space data, per-action outcomes and caveats as distinct readable information.
- [x] #3 Back returns to the history list without losing its browsing context; existing persisted MVP records remain readable.
- [x] #4 Newly eligible images can lead back to an explicitly selected explorer batch only for the matching connected daemon; no historical action can silently target another endpoint.
- [x] #5 Empty history, long/partially failed batches and unavailable after-scans are handled without obscuring completed deletions or implying rollback.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Build on TASK-27 main-panel navigation. Add a searchable, sortable, outcome-filtered history list with pagination and parent-held browsing state preserved on result Back. Keep distinct estimates/reported/observed/unknown metrics and legacy result compatibility, handle long mixed-outcome batches and missing after-scans, and verify daemon-matched follow-up selection. Add focused browser fixtures plus native history reopen coverage and rerun regressions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
HistoryPage and ResultPage now render within the main workspace. Search/outcome/order/page state is held in App so Back preserves browsing context; list links open read-only results, and Back avoids unnecessary reload. Completion updates the in-memory list without stealing navigation focus. Original estimate, before/after usage, reported recovery, unknown host delta and per-action partial outcomes remain separate. Follow-up selection requires matching current daemon identity and filters missing/protected/referenced assets before a fresh review. Verification: full 21-browser suite and final 3-history-case rerun passed (45 legacy-format records, 253-outcome partial batch, missing after-scan, empty versus filtered collections, cross-daemon refusal and valid follow-up). 8 unit tests/build/format passed. Native Tauri/WebKit passed 12 checks, including reopening a saved SQLite result via the non-modal history list; reports exported/read back under artifacts/m1/. Handoff: TASK-29 still owns inspector dialogs/link navigation; TASK-33/34 own granular progress, and TASK-36 must produce the updated release package. No backend schema changes or migration were needed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered full main-workspace history and result browsing with searchable/sortable/paginated lists, preserved Back context and readable legacy/long/partial results. Historical records cannot replay plans or select follow-up assets on another daemon. Verified 21 browser journeys, targeted history rerun, unit/build checks and 12 native WebKit checks, including saved result reopen. Updated installer remains a later milestone task.
<!-- SECTION:FINAL_SUMMARY:END -->
