---
id: TASK-26
title: Replace nested cards with a compact resizable explorer workspace
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:16:00Z'
labels:
  - frontend
  - layout
milestone: m-1
dependencies:
  - TASK-25
priority: high
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Large card gaps, dashboard padding and boxed panes consume space needed for readable asset rows. Users need to prioritize the treemap or table and adjust the inspector rather than accepting a fixed dashboard layout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The explorer uses compact navigation, a continuous main workspace and an optional inspector; repeated nested-card borders and large decorative gaps are removed.
- [x] #2 The inspector can be collapsed and resized, and the treemap can be resized or collapsed so the asset table can occupy the available main-panel space.
- [x] #3 Resize/collapse controls are keyboard accessible, have sensible minimum sizes, and restore usable layout preferences after restart.
- [x] #4 At 1024x720 with inspector and treemap collapsed, at least six asset rows plus selection/cleanup controls are visible at normal zoom without reducing the agreed font sizes.
- [x] #5 Layouts are verified at 1024x720, 1440x900 and 1920x1080 with no page-wide horizontal overflow; long names and metadata remain inspectable.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Keep TASK-25 theme tokens/preferences intact. Compact navigation, header, summary strip and explorer spacing into a continuous workspace. Add persisted, keyboard-operable treemap height/collapse and inspector width/collapse controls; make the SVG layout respond to its measured size. Verify row visibility at 1024x720, layout at three viewport sizes, preference restoration, long-name handling and existing browser regressions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented compact geometry in src/workspace.css without changing theme tokens or backend behavior. Added persisted mapCollapsed/mapHeight/inspectorOpen/inspectorWidth preferences, keyboard range controls, Focus asset table / Show landscape and inspector collapse/restore controls. Treemap now measures its SVG via ResizeObserver instead of shrinking fixed-coordinate text. All five targeted layout tests pass at 1024x720, 1440x900 and 1920x1080, including >=6 fully visible asset rows at minimum size, no page overflow, keyboard resizing, restored preferences and long-name inspection. Screenshots artifacts/layout-{1024,1440,1920}.png were read back and inspected. Production build/format checks pass; final full browser regression is running. Handoff: TASK-27 should preserve explorer state and these layout controls while introducing main-workspace navigation; review/history/data dialogs have intentionally not been migrated in this task.

Final full regression: 16/16 browser journeys passed, including all original MVP interaction journeys and the new theme/layout cases.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered a compact continuous explorer with narrower navigation, summary strip, less decorative spacing and persisted keyboard-resizable/collapsible treemap and inspector. Table-focus mode shows at least six complete rows at 1024x720 with >=14px primary text; layouts and long names were tested through 1920x1080. SVG layout now responds to real viewport dimensions. Verified 16 browser journeys, unit tests, production build, formatting and inspected screenshots. Main-workspace review/history navigation is the next task.
<!-- SECTION:FINAL_SUMMARY:END -->
