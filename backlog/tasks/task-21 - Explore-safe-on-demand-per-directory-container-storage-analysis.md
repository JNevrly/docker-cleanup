---
id: TASK-21
title: Explore safe on-demand per-directory container storage analysis
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-15T13:16:00Z'
labels:
  - post-mvp
  - spike
dependencies: []
priority: low
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The MVP reports asset sizes and changed paths, but cannot explain which directories account for a stopped container writable layer. A deeper scan needs a separately reviewed safety and portability model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Options are evaluated for running and stopped containers across supported storage backends with permissions and side effects documented.
- [x] #2 Any proposed approach is explicitly opt-in, avoids undocumented Docker storage manipulation, and does not silently start containers.
- [x] #3 A decision records feasibility, performance, privacy, and whether sizes represent writable changes or the merged filesystem.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Evaluate documented Engine APIs and optional exec/helper/archive approaches for running/stopped containers across storage backends. Record safety, permission, side-effect, cost/privacy and writable-versus-merged semantics in a feasibility decision. Treat this task as the existing exploration spike, not authorization to silently execute du, start containers or inspect daemon storage. Present any proposed scanning feature/material scope change for approval before implementation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the proposed investigation-only scope and remote-context design on 2026-11-15. This task evaluates feasibility; it does not ship a directory scanner or authorize filesystem-content collection.

Completed approved research scope in docs/storage-analysis-decision.md, linked from capabilities. Evaluated Engine changes/stat/export, exec du, legacy storage paths, commit and helper approaches for running/stopped containers, legacy/containerd/rootless/remote distinctions, permissions/side effects, privacy and bounded performance model. Decision: no portable per-directory writable-byte scanner; any future export diagnostic must explicitly report merged logical sizes with opt-in content-transfer consent, never start containers or manipulate daemon storage. Official Docker storage/export/copy documentation reviewed; no content scans or cross-driver benchmark claims. Existing service safety test scan_inspect_diff_and_processes_do_not_mutate_daemon passed. Document read back. Handoff: TASK-22 proceeds with user-approved optional Docker CLI SSH/verified-TLS contexts, no filesystem scanner dependency.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Recorded feasibility/safety decision: portable writable-layer directory sizing is unavailable; retain changed-path investigation and require separate opt-in approval for any merged-rootfs diagnostic. No starts/exec/storage manipulation or new content collection. Safety regression passes.
<!-- SECTION:FINAL_SUMMARY:END -->
