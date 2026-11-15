---
id: TASK-44
title: Replace the map-height slider with a draggable map/table separator
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T10:55:00Z'
labels:
  - frontend
  - layout
  - accessibility
milestone: m-2
dependencies:
  - TASK-43
references:
  - src/App.tsx
  - src/Treemap.tsx
  - src/workspace.css
  - src/preferences.ts
  - tests/browser/layout.spec.ts
priority: high
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The map height should be changed by dragging the boundary between the landscape and Explore assets, just like a desktop split view. The slider consumes header space and disconnects the control from the region being resized. This builds on the viewport/independent-pane layout work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A discoverable horizontal separator between the landscape block and Explore assets resizes the map by dragging; the visible map-height slider is removed as the normal control.
- [x] #2 The separator supports keyboard resizing and accessible separator values, and clamps dimensions to preserve usable map and table regions at every supported viewport size.
- [x] #3 Resizing changes only the map/table height allocation: the inspector stays independent, the treemap recomputes its layout, and controls/text do not overflow or shrink unreadably.
- [x] #4 Existing map height/collapse preferences are preserved or safely constrained to the viewport, new dimensions persist, and collapse/restore and window resizing cannot leave either pane inaccessible.
- [x] #5 Tests cover pointer dragging, keyboard resizing, restart restoration, both map grouping modes, collapsed map and combined inspector/map resizing at all three supported viewport sizes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Reuse accessible pointer-capturing separator for horizontal map resizing. Measure the explorer fixed controls/legend and reserve usable table space rather than using fixed map-height assumptions; preserve/clamp saved dimensions. Remove map slider, keep category explanations optionally expandable to avoid consuming narrow viewport space, retain scope/data warnings and test combined map/inspector resizing, bounds, persistence and collapse at three viewports.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced map-height slider with pointer-capturing horizontal separator, keyboard arrows/Home/End and measured fixed-control/legend budget reserving usable table space. Saved 0.2.0 map sizes remain valid and are clamped safely; new heights support 40-600px. Category explanations are optional About disclosures and cache review remains prominent inside the independently scrollable asset region, preventing static prose from exhausting a narrow viewport. Shortened visible bulk/filter labels while retaining original accessible names/explicit scope, and compacted narrow summary geometry. Build/12 unit tests passed; 16 layout/splitter/refresh/selection journeys passed, covering pointer/keyboard sizing, limits, persistence, both grouping modes, combined dividers, six rows with map collapsed and no page overflow at three viewports. Prior full run passed other 46 cases; targeted long-label test passes at a viewport with readable tile area, tiny tiles intentionally omit text. Screenshot map-split-1024.png read back. Handoff: TASK-45 must run final complete suites and native/live safety validation; TASK-46 owns updated docs/versioned package and prior-package preference migration test.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Horizontal drag/keyboard map resizing now respects measured viewport space and independent inspector geometry, with persistent safe dimensions. Sixteen focused layout/selection/refresh/splitter journeys and build/unit checks pass.
<!-- SECTION:FINAL_SUMMARY:END -->
