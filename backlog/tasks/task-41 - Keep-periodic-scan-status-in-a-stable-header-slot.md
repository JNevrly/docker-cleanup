---
id: TASK-41
title: Keep periodic scan status in a stable header slot
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T10:31:00Z'
labels:
  - frontend
  - layout
  - refresh
milestone: m-2
dependencies: []
references:
  - src/App.tsx
  - src/workspace.css
  - tests/browser/states.spec.ts
priority: high
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The periodically inserted Reading inventory status box shifts the panels below it and makes routine refresh visually disruptive. The user wants scan feedback beside Make room for what is next rather than another workspace row.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Connection/scan progress appears in a compact reserved header area next to the main title rather than as an inserted full-width row above the workspace.
- [x] #2 Automatic refresh beginning, changing messages and completing does not move the treemap, table or inspector or reset their scroll positions; this is verified by comparing element bounds at the supported viewport sizes.
- [x] #3 Long status messages remain contained at 1024x720 without wrapping the header into extra transient rows, overflowing controls or truncating access to the full status for assistive technology.
- [x] #4 Scan failures and partial inventory remain clearly distinguishable from success; running destructive-cleanup feedback/cancellation remains visible and is not hidden by the quieter refresh treatment.
- [x] #5 Browser coverage includes periodic idle refresh, slow scans, long messages and failure; native verification confirms the status placement without workspace jumps.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Reserve a fixed-height compact progress/cancel slot beside the title and remove transient explorer operation row for non-cleanup work. Keep full accessible status text with visual ellipsis, error/partial warnings and destructive-operation banner. Test periodic refresh with controlled IPC/time and geometry/scroll assertions at three viewports, then verify placement/bounds through real native WebKit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved non-cleanup status/cancel into a reserved single-row header slot beside the title. Long messages visually ellipsize but retain full accessible text/title; errors/partial states and global destructive-operation banner remain separate. Seven periodic-refresh/state browser journeys passed, including controlled 60s idle refresh, exact geometry and table/inspector scroll preservation at 1024/1440/1920 widths, long messages and failure. Production build/format passed. Real native Tauri/WebKit passed 14 checks including refresh header placement with unchanged workspace top while Engine inventory request is in flight. Handoff: TASK-42 fits map labels; TASK-43/44 must preserve stable header geometry in viewport layout.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Routine scans no longer insert a workspace row or shift panels. Verified geometry/scroll stability at three viewports, error states and real WebKit placement.
<!-- SECTION:FINAL_SUMMARY:END -->
