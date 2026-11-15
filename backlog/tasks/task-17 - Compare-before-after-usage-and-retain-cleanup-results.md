---
id: TASK-17
title: Compare before/after usage and retain cleanup results
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:32:00Z'
labels:
  - backend
  - frontend
  - history
milestone: m-0
dependencies:
  - TASK-15
  - TASK-16
priority: medium
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users need to know whether a cleanup actually helped, not just whether Docker accepted deletion calls. Docker-reported reclaimed bytes and host free-space changes can differ.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each cleanup retains before/after inventory totals, action outcomes, and Docker-reported reclaimed bytes when available.
- [x] #2 Host filesystem free space is sampled only for a reliably identified relevant filesystem; unavailable mappings are explicit.
- [x] #3 Estimated savings, reported reclaimed bytes, and observed free-space delta are distinct metrics, including concurrent-activity caveats.
- [x] #4 Users can reopen a local cleanup result after restart without treating it as a rollback capability.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify persisted before/after snapshots, action results, estimates and Docker-reported recovery remain distinct. Confirm host free-space stays explicitly unavailable when namespace mapping cannot be established and history remains usable across service restarts.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cleanup records preserve estimates, before/after inventories and per-action outcomes in SQLite. Engine cache-prune recovery is recorded only when supplied; individual deletions and unmappable host-free-space deltas remain unknown with explicit concurrent-activity/namespace caveats. Live tests prove no fabricated figures and history across restart; native and browser results screens passed. Results never claim undo/rollback.
<!-- SECTION:FINAL_SUMMARY:END -->
