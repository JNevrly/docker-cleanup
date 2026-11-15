---
id: TASK-22
title: Add remote Docker endpoint and context support
status: To Do
assignee: []
created_date: '2026-11-14T22:10:00Z'
labels:
  - post-mvp
  - connectivity
dependencies: []
priority: low
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first release intentionally supports one local Linux endpoint. Remote engines require different identity, authentication, path, and process-correlation semantics rather than treating remote paths as local files.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A separately reviewed design covers SSH/TLS/context authentication and endpoint-scoped state without leaking credentials.
- [ ] #2 Remote workspace paths and host process evidence are not mistaken for local evidence.
- [ ] #3 Cleanup review identifies the remote daemon prominently and prevents cross-endpoint selection or execution.
<!-- AC:END -->
