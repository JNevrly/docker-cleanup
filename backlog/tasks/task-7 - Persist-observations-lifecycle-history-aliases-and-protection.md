---
id: TASK-7
title: Persist observations, lifecycle history, aliases, and protection
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:18:00Z'
labels:
  - backend
  - history
milestone: m-0
dependencies:
  - TASK-4
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Docker does not expose a universal last-used timestamp. Users also need project names and keep decisions to survive restarts without confusing application observations with Docker-reported facts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SQLite stores endpoint-scoped snapshots/observations, user aliases, asset associations, and protection flags with a migration mechanism.
- [x] #2 Container started/finished times, image creation, builder last-use, and application-observed activity are displayed with distinct semantics and sources.
- [x] #3 Docker events and reconnect/rescan behavior update observations while recording monitoring gaps; pre-install history is not fabricated.
- [x] #4 Unknown last use remains unknown, and protected assets can be recognized by cleanup planning after restart.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify SQLite schema migrations, daemon-scoped identity/protection preferences, timestamp provenance and monitoring-gap semantics. Rerun persistence tests and restart the live domain service to prove stored results survive.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
SQLite v2 migrations preserve daemon-scoped snapshots, aliases, project associations, protection and last-observation provenance; future schema downgrades are rejected. Lifecycle, builder, inferred and observed timestamps remain distinct. Bounded event reads preserve source/gap notes without fabricating pre-install history. Migration/event-source unit tests and a fresh 20-check live journey, including service restart persistence, passed.
<!-- SECTION:FINAL_SUMMARY:END -->
