---
id: TASK-10
title: Build the asset inspector with storage boundaries and evidence
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:24:00Z'
labels:
  - frontend
  - inspection
milestone: m-0
dependencies:
  - TASK-9
  - TASK-7
  - TASK-8
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Before deleting an old development container, users must understand its identity and distinguish writable data from retained workspaces and volumes. Related assets and timestamp sources need to be visible in one place.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The inspector shows names/IDs, image, command, project evidence, state, timestamp semantics, and on-demand related processes.
- [x] #2 Writable layers, image data, mounted volumes, and external bind mounts have explicit retention/deletion explanations.
- [x] #3 Related assets can be navigated and shared-volume container references are visible.
- [x] #4 Users can edit aliases/associations and protection flags, including an unattributed or shared classification.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify the inspector through browser/native journeys: identity, timestamp sources, mount-retention boundaries, related assets, aliases, user project classification and protection. Confirm process and metadata collection remain on-demand.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Inspector presents canonical/friendly identity, state, project evidence, lifecycle sources, ports, mount boundaries and navigable references, with on-demand diff/process/metadata actions. Alias/project editing, protection and relationship navigation are exercised in the eighth passing browser journey; packaged Tauri/WebKit tests also verified mount and metadata inspection.
<!-- SECTION:FINAL_SUMMARY:END -->
