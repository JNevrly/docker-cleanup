---
id: TASK-23
title: Design export and backup workflows before destructive cleanup
status: To Do
assignee: []
created_date: '2026-11-14T22:10:00Z'
labels:
  - post-mvp
  - data-safety
dependencies: []
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Warnings alone may not be enough for containers with valuable writable files or database volumes. Backup/export requires its own consistency, storage, and restore story rather than a misleading promise of undo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Container writable-data export and volume backup options document what is included and excluded.
- [ ] #2 Database consistency and running-workload limitations are explicit; backup completion is not presented as proven restorability.
- [ ] #3 A restore verification procedure and storage-space checks are defined before backup is offered as a deletion safeguard.
<!-- AC:END -->
