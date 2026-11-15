---
id: TASK-16
title: Provide capability-aware scoped prune workflows
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:32:00Z'
labels:
  - backend
  - frontend
  - prune
milestone: m-0
dependencies:
  - TASK-15
  - TASK-2
priority: high
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users also need standard prune operations, but one ambiguous clean-everything button could erase valuable stopped environments or unreferenced databases. Scopes and Docker version behavior must remain explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Separate flows cover stopped containers, dangling images, broader unreferenced images, volumes, and supported builder cache with available filters.
- [x] #2 Each flow explains actual backend semantics, filter support, persistent-data risk, and whether candidate enumeration is complete or only approximate.
- [x] #3 Protection rules cannot be bypassed by bulk prune: the app uses a safe explicit-target alternative or disables the operation when exclusion cannot be guaranteed.
- [x] #4 Volume cleanup has a separate explicit confirmation; broad combined system prune with volumes is not offered as a default.
- [x] #5 Builder-wide prune is never misrepresented as deletion of only individually selected cache records; scope changes require renewed confirmation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify each explicit prune scope and age semantics, protection exclusions, distinct volume acknowledgement and Engine-wide cache confirmation. Test cache scope/protection changes and unsupported age/external-builder behavior rather than substituting broader destructive operations.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Separate GUI scopes cover stopped containers, dangling/all unreferenced images, volumes and Engine-wide cache. Object pruning uses reviewed explicit IDs to honor protection; age filters exclude unknown dates. Volume loss and builder-wide scope require separate acknowledgements. Unit/service tests prove protected/unknown-age exclusions and cache-scope renewal; live volume prune preview/deletion and browser prune review passed. External buildx and cache-age filtering are explicitly unsupported.
<!-- SECTION:FINAL_SUMMARY:END -->
