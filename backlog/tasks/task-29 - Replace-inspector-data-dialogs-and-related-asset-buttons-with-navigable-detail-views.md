---
id: TASK-29
title: >-
  Replace inspector data dialogs and related-asset buttons with navigable detail
  views
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:44:00Z'
labels:
  - frontend
  - inspection
  - accessibility
milestone: m-1
dependencies:
  - TASK-26
  - TASK-27
priority: medium
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Filesystem/process investigations are currently JSON-heavy dialogs, while Related assets looks like a set of action buttons. Users need readable details and links that communicate navigation rather than mutation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inspector sections or tabs present overview/evidence, storage boundaries, filesystem changes and processes within the inspector or a main-workspace expanded detail view.
- [x] #2 Changed paths show readable added/changed/deleted states and mount context; process views show available PID/program/evidence and unavailable/permission/namespace explanations.
- [x] #3 Related assets are styled and exposed as keyboard-accessible internal links with names, types and relevant status rather than filled action buttons.
- [x] #4 Following a related link changes inspected context without changing selection, and Back restores the previous inspected asset.
- [x] #5 Raw metadata remains optional and environment-redacted; investigations remain on-demand, never starting stopped containers or executing commands inside them.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Replace inspector data modals with per-asset structured Files/Processes/optional Metadata views, with on-demand cached responses and readable errors. Add related-asset links with type/state and an inspection Back stack that does not change selection. Keep daemon-scoped data isolation, environment redaction and read-only backend inspection intact. Adapt native/browser journeys and test keyboard links, Back, no unsolicited requests, structured results and permissions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced inspector JSON modals with Overview/Files/Processes/Metadata inline views and daemon-scoped on-demand response caches. Files show structured change/path/storage boundaries; process tables show PID/program plus host evidence and namespace/unavailable explanations. Related assets are keyboard links with type/state and a Back stack independent of cleanup selection. Optional raw metadata remains backend-redacted. Verified production build, 8 unit tests, all 25 browser journeys (on-demand, permissions, process structure, links/Back, selection preservation and daemon isolation), formatting and 12 native Tauri/WebKit checks including inline diff, metadata redaction and no stopped-container start. Screenshot artifacts/inspector-files.png inspected; table given a readable minimum width with local horizontal scrolling. Handoff: TASK-30 owns bulk selection; TASK-31 owns cache discovery; no backend changes or installer produced in this task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Structured on-demand inspector views replace data dialogs; related-asset links and Back preserve selection. Verified 25 browser journeys, 8 unit tests, build/format and 12 native checks with redaction/read-only safeguards intact.
<!-- SECTION:FINAL_SUMMARY:END -->
