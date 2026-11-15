---
id: TASK-37
title: Refresh the visual language with a neutral developer-tool palette
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T10:25:00Z'
labels:
  - frontend
  - theme
  - design
milestone: m-2
dependencies: []
references:
  - src/preferences.ts
  - src/theme.css
  - src/workspace.css
priority: medium
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user finds the 0.2.0 mint/beige visual direction institutional and dated despite improved compactness. The agreed direction is a modern developer utility: neutral slate/graphite surfaces, restrained blue accents, clearer hierarchy and category colors concentrated in the visualization, without losing readability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Light and Dark use a coherent neutral slate/graphite surface system with restrained blue interaction accents rather than pervasive mint/beige chrome; category colors remain distinguishable in the visualization.
- [x] #2 Typography, borders, spacing, active navigation and selection have a consistent hierarchy; the refresh does not reintroduce large decorative gaps or nested-card clutter.
- [x] #3 Existing Light/Dark/System persistence and live System switching remain functional; primary text stays at least 14px, secondary text at least 12px, and normal text contrast meets WCAG AA.
- [x] #4 Warnings, destructive actions, protection, focus and selection remain distinguishable without relying only on color; before/after light and dark screenshots demonstrate the intended visual change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Replace mint/beige chrome with neutral slate/graphite semantic palettes and restrained blue interaction accents, preserving category colors and existing compact dimensions. Save prior screenshots, verify palette AA pairings and theme/state persistence with unit/browser tests, and inspect new Light/Dark screenshots. Disabled treatment remains TASK-38.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced mint/beige chrome with slate/graphite surfaces and blue interaction accents, neutralized summary/badge colors, kept category visualization colors and semantic warnings. Existing spacing/geometry retained. Baseline screenshots preserved under artifacts/m2/before; updated artifacts/theme-light.png and theme-dark.png read back and inspected. Verification: all 10 unit tests (including AA palette pairings), production build and 8 theme/layout browser journeys passed; live System switching, in-flight cleanup/selection preservation and readable minimum fonts covered. Handoff: TASK-38 owns disabled treatment; later tasks remove prose and change geometry without undoing palette contrast.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Neutral developer-tool palette delivered in both themes with preserved readable sizing, safety distinctions and preference/state behavior. Verified 10 unit tests, build, 8 browser checks and before/after screenshots.
<!-- SECTION:FINAL_SUMMARY:END -->
