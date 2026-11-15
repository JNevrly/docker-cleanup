---
id: TASK-11
title: Inspect container filesystem changes without starting containers
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:25:00Z'
labels:
  - backend
  - frontend
  - inspection
milestone: m-0
dependencies:
  - TASK-10
priority: high
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Large writable layers can hold either disposable tools or work stored only inside a container. Users need Docker diff-equivalent evidence before deciding to delete, without unsafe inspection side effects.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 On-demand changed-path inspection identifies added, changed, and deleted paths using supported Docker APIs where available.
- [x] #2 The UI relates changed paths to mount boundaries and warns that writable-layer data is lost on container deletion.
- [x] #3 Changed-path data is not presented as per-path size measurement; unsupported cases and permission failures are explicit.
- [x] #4 Inspection never starts stopped containers, executes container commands, or directly walks Docker internal storage directories.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify Docker changes output labels added/changed/deleted paths and retains mount-boundary context without claiming per-path sizes. Exercise live stopped-container diff, native rendering and exact GET-only fixture inspection requests.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Docker changes API results now include readable added/changed/deleted status and mount context, explicitly not path-size measurements. Live DinD diff found the generated writable file; native packaged WebKit rendered filesystem evidence. Fixture request capture proves inspection is GET-only and never starts containers, execs commands or reads Docker internal storage.
<!-- SECTION:FINAL_SUMMARY:END -->
