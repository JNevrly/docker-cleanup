---
id: TASK-25
title: Introduce a readable light-first theme and typography system
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:08:00Z'
labels:
  - frontend
  - accessibility
  - theme
milestone: m-1
dependencies: []
priority: high
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The installed MVP uses a dark palette and very small text despite generous empty space. Users particularly struggle to read the Explore assets table and secondary details. Establish readable visual defaults without sacrificing selection, warning or status clarity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Light is the default theme; Light, Dark and System preferences are available and persist across application restarts, with immediate updates in System mode.
- [x] #2 Primary table, detail and control text is at least 14 CSS px at normal zoom; normal body text targets 16 px and secondary metadata is at least 12 px.
- [x] #3 Normal text meets WCAG AA 4.5:1 contrast and large text 3:1 in both explicit themes; focus, selection, protection and destructive warnings are distinguishable without color alone.
- [x] #4 Core explorer, inspector, review and history states use consistent typography/color/spacing rules; switching theme does not lose connection, selection or active cleanup state.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Add a persisted Light/Dark/System preference with immediate media-query updates, semantic theme tokens across the existing UI and readable font minimums. Update SVG theme colors without changing Docker/selection behavior. Verify typography, palette contrast and preference/selection persistence in browser tests plus production build and existing regressions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented semantic Light/Dark/System palettes in src/preferences.ts with persisted local preferences and live OS-theme listeners. src/theme.css raises table/control/detail fonts to >=14px and secondary text to >=12px without changing Docker operations. Contrast tests cover palette text/background pairings; SVG shared tiles now have readable opaque backgrounds. First full verification: 8 unit tests and 11 browser journeys passed, including theme persistence, live system changes, selection/review preservation and an in-flight cleanup that executes exactly once. Targeted final theme rerun is underway after removing transitional theme colors. Handoff: TASK-26 should keep the new tokens/preferences and focus only on compact/resizable layout; existing boxed layout is intentionally not addressed by TASK-25.

Final targeted theme rerun passed all 3 cases; light/dark screenshots read back and inspected. Production TypeScript/Vite build and formatting checks passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered a light-first, persisted Light/Dark/System preference with live system-theme updates, semantic AA-contrast palettes and readable font minimums. Selection, inspector, review and in-flight cleanup state are preserved across theme changes. Verified 8 unit tests, 11 browser journeys, a final 3-case theme rerun, production build and formatting; screenshots retained as artifacts/theme-light.png and artifacts/theme-dark.png. Layout/navigation remain separate follow-on tasks.
<!-- SECTION:FINAL_SUMMARY:END -->
