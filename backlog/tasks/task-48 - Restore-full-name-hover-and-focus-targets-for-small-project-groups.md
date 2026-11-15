---
id: TASK-48
title: Restore full-name hover and focus targets for small project groups
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T11:55:00Z'
updated_date: '2026-11-15T12:14:00Z'
labels:
  - frontend
  - treemap
  - accessibility
milestone: m-3
dependencies: []
references:
  - src/Treemap.tsx
  - src/workspace.css
  - tests/browser/map-labels.spec.ts
  - tests/browser/splitters.spec.ts
  - tests/native_desktop.py
priority: high
type: bug
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In By project, titles shorten acceptably but the installed app often shows no hover box for the project title. This is worst for the smallest project, whose asset rectangle can be effectively invisible, leaving no way to identify the group. Source review shows handlers attached to SVG text rather than the header region; investigate hit testing, clipping and layering in the actual rendering environment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every rendered project group has a reliable header-region hover/focus target that discloses the complete project name and reported group size; targeting does not depend on painted text glyphs or on a visible image/container tile.
- [x] #2 Truncated, empty-text and very small positive-size project groups remain identifiable when their asset rectangles cannot be seen; where no usable visual header area can fit, a discoverable keyboard/pointer-accessible fallback provides the same identification without falsifying storage area.
- [x] #3 Header identification remains usable after map/inspector resizing, drill-down and theme changes; tooltip placement stays within the viewport, and clipping or later-painted assets cannot silently remove the target.
- [x] #4 Hover/focus alone does not inspect an asset, navigate, change cleanup selection or issue Docker requests; intentional project activation retains the existing drill-down semantics and full accessible name.
- [x] #5 Regression tests use actual mouse movement over header whitespace and keyboard focus, not only synthetic event dispatch, with many long-path projects and a smallest group whose leaf tiles have no visible usable area; native WebKit coverage records the same disclosure behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Replace text-only project interactions with full bounded header regions painted above leaves, preserving full accessible names and shared hover/focus disclosure. Add a compact project-browser fallback beside grouping controls for positive-size groups too small for pointer targeting, without inflating map areas. Reset stale tooltips on grouping/layout changes and test real header-whitespace pointer movement, tiny no-leaf groups, keyboard and resizing/theme changes, including native WebKit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced text-only interactions with bounded full header rectangles painted after leaves, retaining full accessible identity and group navigation. Added compact all-projects browser fallback in grouping controls for truly subpixel groups without inflating accounting areas. Tooltips measure/clamp to viewport; layout resets happen before paint and deduplicated mouse-move recovery avoids missing disclosure after resize. Verified build/format, 13 unit tests, 11 existing pointer/layout/navigation journeys, and final two exact-reference/project journeys including 20 long-path small projects plus 1-byte/no-visible-leaf project, real whitespace hover, keyboard, Dark switch, minimum map height, fallback pointer activation, preserved draft/selection and no extra IPC. Native Tauri/WebKit passed 20 checks with genuine W3C pointer movement over project header whitespace and tiny-project fallback; no new destructive calls. Read artifacts/m3/project-fallback.png. Handoff: TASK-49 should verify/finish all category pointer paths using this shared header layer and add category fallback if needed; tests must not dispatch synthetic clicks to claim pointer behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Project names now disclose across the whole header and remain discoverable through an all-projects fallback even when tiles vanish. Real pointer/browser/native evidence passes, with truthful areas and preserved selection/drafts.
<!-- SECTION:FINAL_SUMMARY:END -->
