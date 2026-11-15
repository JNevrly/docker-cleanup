---
id: TASK-21
title: Explore safe on-demand per-directory container storage analysis
status: To Do
assignee: []
created_date: '2026-11-14T22:10:00Z'
labels:
  - post-mvp
  - spike
dependencies: []
priority: low
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The MVP reports asset sizes and changed paths, but cannot explain which directories account for a stopped container writable layer. A deeper scan needs a separately reviewed safety and portability model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Options are evaluated for running and stopped containers across supported storage backends with permissions and side effects documented.
- [ ] #2 Any proposed approach is explicitly opt-in, avoids undocumented Docker storage manipulation, and does not silently start containers.
- [ ] #3 A decision records feasibility, performance, privacy, and whether sizes represent writable changes or the merged filesystem.
<!-- AC:END -->
