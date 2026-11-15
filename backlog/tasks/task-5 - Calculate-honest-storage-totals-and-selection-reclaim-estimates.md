---
id: TASK-5
title: Calculate honest storage totals and selection reclaim estimates
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:14:00Z'
labels:
  - backend
  - accounting
milestone: m-0
dependencies:
  - TASK-4
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Image sizes overlap and deleting stopped containers can make additional images eligible for removal. Naive sums would reproduce misleading cleanup estimates and double-count shared project assets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Reported size, shared storage, estimated reclaimable bytes, and unknown values are separate fields with provenance and confidence.
- [x] #2 Selection estimates account for remaining references and shared data across the whole selection, or explicitly show bounds/unknown where the backend cannot establish an exact estimate.
- [x] #3 Shared assets have explicit ownership/accounting buckets and are not counted repeatedly across projects; external bind-mount usage is excluded from Docker-owned totals.
- [x] #4 Tests cover shared layers, shared volumes, joint image selections, and images becoming unreferenced after container removal.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Review Rust/frontend accounting against shared-layer fixtures and live snapshots. Verify unique/shared residual buckets, joint-selection bounds, retained references and unknown values; rerun domain and service tests before finalizing.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rust and frontend accounting separate reported logical size, unique image data, shared residual storage, and unknown measurements. Selection-wide conservative bounds preserve shared-layer uncertainty and references. Shared buckets are counted once; bind mounts are external. Accounting/domain/service tests and live staged container/image cleanup passed.
<!-- SECTION:FINAL_SUMMARY:END -->
