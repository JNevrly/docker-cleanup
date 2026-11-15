---
id: TASK-13
title: Generate dependency-aware cleanup plans with safety guards
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:27:00Z'
labels:
  - backend
  - cleanup
  - security
milestone: m-0
dependencies:
  - TASK-12
  - TASK-11
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Selection must become a reviewable sequence rather than immediate deletion. Container removal can unlock image cleanup, while running containers and persistent volumes require different safeguards.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A plan lists ordered actions, prerequisites, estimated savings, irreversible data loss, retained mounts/volumes, and newly eligible images without auto-selecting those images.
- [x] #2 Protected assets and running-container removals are blocked by default; image removal is non-forced and container removal never implicitly deletes volumes.
- [x] #3 Volume deletion requires explicit selection and a distinct confirmation acknowledging possible persistent/database data; bind-mounted host paths are never deletion targets.
- [x] #4 Plans carry inventory provenance and require fresh state validation before execution; unit tests cover stale references and dependency changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify dependency-ordered plans and canonical asset fingerprints against stale references, protection, running containers and changed daemon/cache scope. Confirm mounted data is retained by default, volume loss is separately acknowledged and newly eligible images remain a separate batch.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Plans refresh inventory, record daemon/snapshot identity and material fingerprints, order container/image/volume actions and include identity evidence plus retained mounts. Protection, running containers, outside references and non-deletable shared/bind targets are blocked. Separate volume/cache confirmations and follow-up image batches are enforced. Fixture and live tests prove stale-reference and confirmation guards.
<!-- SECTION:FINAL_SUMMARY:END -->
