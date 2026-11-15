---
id: TASK-9
title: Build category and project storage treemaps
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:17:00Z'
labels:
  - frontend
  - visualization
milestone: m-0
dependencies:
  - TASK-5
  - TASK-6
priority: high
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users need to find the few large stopped containers or project groups that dominate usage before examining individual assets. The same inventory should support both storage-category and project-oriented exploration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An interactive treemap switches between storage-category and project grouping with drill-down and breadcrumbs.
- [x] #2 State, age, project, reference status, and protection filters coordinate with an accessible sortable asset list.
- [x] #3 Legends/tooltips explain the size metric, shared buckets, unknown sizes, and snapshot freshness; visible values do not silently mix incompatible metrics.
- [x] #4 Keyboard selection and a non-treemap list alternative are available; loading, empty, partial-error, and large-inventory states are tested.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Exercise category/project treemaps, drill-down, keyboard/list access, filters, unknown sizes and failure states in Playwright. Include a 1,000-additional-asset fixture and inspect rendered screenshots.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented D3 category/project treemaps, breadcrumbs, attributed-size legends and a keyboard-accessible sortable table with state/age/reference/protection/search filters. Seven Playwright journeys pass, including loading/connection/partial-data errors, unknown sizes, hidden selection, endpoint changes, and a 1,000-additional-asset inventory. Rendered screenshots were inspected.
<!-- SECTION:FINAL_SUMMARY:END -->
