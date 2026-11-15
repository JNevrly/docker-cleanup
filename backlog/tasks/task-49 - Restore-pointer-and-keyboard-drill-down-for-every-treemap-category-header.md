---
id: TASK-49
title: Restore pointer and keyboard drill-down for every treemap category header
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T11:55:00Z'
updated_date: '2026-11-15T12:21:00Z'
labels:
  - frontend
  - treemap
  - navigation
milestone: m-3
dependencies:
  - TASK-48
references:
  - src/Treemap.tsx
  - src/App.tsx
  - tests/browser/category-help.spec.ts
  - tests/browser/navigation.spec.ts
  - tests/native_desktop.py
priority: high
type: bug
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In the installed By category map only Images remains clickable; Writable layers and Volumes no longer deep-dive. Existing keyboard coverage did not catch this pointer regression. Source review indicates text-only header interactions and leaves painted after group headings; validate the actual hit-testing cause rather than assuming it. Coordinate with the project-header interaction correction to avoid competing targets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Actual pointer clicks on the header regions of Writable layers, Images and Volumes each drill into the intended category and update breadcrumbs and the asset list; cache/shared categories behave consistently whenever represented.
- [x] #2 All category headers support Enter/Space activation and meaningful accessible names; blank header space is part of the usable target, and leaf shapes, clipping or tooltip overlays cannot intercept the intended header activation.
- [x] #3 Header targets remain reliable in shallow/dense maps and after resizing, including groups whose height is close to the header height, without expanding a target across neighboring categories or stealing ordinary asset-tile inspection.
- [x] #4 Group navigation leaves cleanup selection and inspector drafts intact, All storage/Storage explorer still return home, and Back retains context; header interactions do not authorize or replay cleanup or issue destructive requests.
- [x] #5 Browser regressions explicitly use real pointer clicks for Writable layers, Images and Volumes, keyboard activation and leaf-versus-header behavior at supported viewport sizes; native WebKit verification proves the previously failing category interactions.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Build on the verified shared header layer: reproduce and assert real whitespace pointer/keyboard activation for Writable layers, Images, Volumes, cache/shared at shallow/dense layouts and all supported viewports. Extend compact group browser to category fallback for subpixel groups, preserving leaf inspection and home/Back/selection/drafts. Add genuine W3C native pointer category clicks, not DOM-dispatched activation; rerun full browser/native suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shared final-painted bounded header hit rectangles now serve all categories; generalized compact group browser supplies a category fallback for subpixel records. Pointer areas do not depend on glyphs, and headers stop at their group bounds so ordinary leaves still inspect assets. Verified full 56-browser suite (3 workers), including real whitespace pointer clicks for Writable layers, Images, Volumes and shared data at 1024/1440/1920, Enter/Space, 40px shallow maps, resize/leaf inspection, tiny-cache fallback, unchanged drafts/selection and only scan IPC. Build/format and 13 unit tests pass. Actual native Tauri/WebKit passed 23 checks, with W3C pointer down/up proving each previously reported category route and preserving inspector context. Handoff: TASK-50 should finish combined project/theme/viewport evidence and full native/live/backend regression reports; TASK-51 owns actual prior-package upgrade and reproducible release.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Category pointer drill-down restored through bounded foreground headers and tiny-category fallback. All 56 browser journeys and 23 real native checks pass, including genuine category clicks rather than synthetic dispatch.
<!-- SECTION:FINAL_SUMMARY:END -->
