---
id: TASK-39
title: Remove persistent treemap instructions and redundant single-color legends
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T10:27:00Z'
labels:
  - frontend
  - help
  - usability
milestone: m-2
dependencies: []
references:
  - src/App.tsx
  - src/Treemap.tsx
  - docs/user-guide.md
priority: medium
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user reports too much instructional text around a self-explanatory treemap, specifically Tile area = attributed bytes, Click a tile to investigate and the Unknown-size assets remain in the list paragraph. Static explanations bury useful navigation and should live in help instead. The legend also remains visible for a single-color drilled category.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The normal explorer no longer displays the persistent tile-area instruction, click-to-investigate hint or long unknown-size/shared-accounting treemap paragraph; equivalent explanations are available in discoverable help or the user guide.
- [x] #2 The category legend is hidden when the currently rendered map has at most one asset color; multi-color maps show only applicable categories, including multi-category project views.
- [x] #3 Contextual errors, incomplete-scan/unknown measurement states and consequential deletion/protection/cache-scope warnings are not removed or converted into success/zero states.
- [x] #4 Browser tests cover all-storage, one-category, multi-category project, empty and unknown-size views; removing prose does not remove keyboard-accessible names or navigation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Remove the three static treemap instruction blocks, retain measurement/error/risk states and move explanation into the user guide. Derive legend categories from positive attributed assets actually rendered, hiding it for <=1 category. Add browser coverage for all-storage, category/project drill, empty and unknown-size views.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed persistent area/click/unknown-size paragraphs, retaining errors, category risk/context, unknown metrics and empty states. User guide now carries accounting/investigation explanations. Legend derives from positive attributed categories actually rendered and disappears for <=1 color. Build plus seven category/map/state browser journeys passed, including multi-color project, unknown-only and empty views, errors and keyboard drill. Handoff: TASK-40 promotes remaining breadcrumbs; map label sizing is TASK-42.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed instructional clutter and redundant legends, with explanations in user guide and safety/data states retained. Seven focused browser journeys and production build passed.
<!-- SECTION:FINAL_SUMMARY:END -->
