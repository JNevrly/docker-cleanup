---
id: TASK-43
title: Add a draggable inspector splitter and independent viewport scrolling
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T10:47:00Z'
labels:
  - frontend
  - layout
  - accessibility
milestone: m-2
dependencies: []
references:
  - src/App.tsx
  - src/workspace.css
  - src/preferences.ts
  - tests/browser/layout.spec.ts
priority: high
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The width slider is less natural than dragging the pane boundary. The inspector also feels tied to the Explore assets panel height, producing clumsy scrolling. The desired desktop-style workspace gives the inspector its own usable viewport-height scroll region independent of the asset table content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A discoverable vertical separator between the combined landscape/assets area and the inspector supports pointer dragging to resize the inspector; the visible width slider is no longer the normal control.
- [x] #2 The separator provides resize affordance, reliable dragging beyond its initial hit area, sensible pane minimum sizes and keyboard-operable separator semantics with meaningful accessible sizing information.
- [x] #3 The workspace uses available viewport height; inspector height/scrolling is independent of asset-table row count, and table and inspector can scroll without moving or extending each other or introducing a competing page-level workspace scrollbar.
- [x] #4 Width and collapse preferences persist, existing 0.2.0 layout preferences remain usable or are safely clamped to available space, and collapse/restore never loses selection or unsaved inspector input.
- [x] #5 Pointer, keyboard and independent-scroll tests cover 1024x720, 1440x900 and 1920x1080, including long inspector details, few/many asset rows and window resizing; cleanup footer and controls remain reachable.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Establish viewport-height explorer with independent table/inspector scrolling and a pointer-capturing keyboard-accessible vertical splitter. Clamp width to available grid space while preserving stored preference; keep inspector mounted when collapsed to retain drafts. Adapt page scroll restoration and existing layout tests; test dragging, keyboard, persistence, scroll independence/few-row geometry at all viewports. Horizontal map splitter remains TASK-44.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added pointer-capturing, keyboard-accessible vertical separator with available-space clamping and persistent inspector width. Established fixed-viewport workspace with independent inspector/table scrollers and internal result/history scroll restoration. Inspector remains mounted when collapsed, preserving drafts. Contained absolute accessibility text within table scroller to eliminate document overflow; compact footer/notes preserve six complete rows at 1024x720. Current map height safely clamps to viewport pending measured horizontal splitter in TASK-44. Verification: build, 12 unit tests, and final 11 layout/splitter/refresh browser journeys passed at three viewports, including pointer capture beyond separator, limits/keyboard, width restart, few-row inspector height, draft-preserving collapse and no document overflow. Read back artifacts/m2/inspector-split-1024.png. Handoff: TASK-44 replaces remaining map slider with measured map/table budget and must maintain these independent scrollers and home/Back semantics.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Draggable keyboard-accessible inspector sizing and independent viewport scrolling delivered, including draft-preserving collapse and safe width migration. Eleven focused layout/refresh/splitter journeys and build/unit tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
