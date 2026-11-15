---
id: TASK-4
title: Collect normalized Docker inventory and relationship snapshots
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:12:00Z'
labels:
  - backend
  - inventory
milestone: m-0
dependencies:
  - TASK-3
  - TASK-2
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users need to inspect images, writable container layers, volumes, and caches together instead of correlating separate Docker commands. Preserve raw evidence and relationships for later attribution and cleanup decisions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A snapshot includes stable endpoint-scoped IDs, container states and sizes, image references, mounts, volumes, supported cache data, and available lifecycle timestamps.
- [x] #2 References link containers to images and volumes; bind mounts are identified as external, non-deletable relationships.
- [x] #3 Scan progress, cancellation, partial failures, and snapshot freshness are exposed without presenting missing values as zero.
- [x] #4 Fixture tests cover shared images, shared volumes, dangling images, stopped containers, and unavailable size data.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify normalized inventory snapshots and conservative reference handling using the fixture Unix API and live DinD. Cover cancellation, partial inspection failure, zero versus unknown sizes, shared references, and non-mutation; expose freshness and progress in the UI.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Normalized daemon-scoped inventory captures writable sizes, images, volume/mount references, lifecycle dates and Engine cache with explicit unknowns. Progress/cancellation retain the previous valid inventory; incomplete references block cleanup. Twenty-five Rust tests now pass, including unknown sizes, cancelled scans, permission-limited inspection and shared relationships. Live DinD scan and the 20-check cleanup journey passed.
<!-- SECTION:FINAL_SUMMARY:END -->
