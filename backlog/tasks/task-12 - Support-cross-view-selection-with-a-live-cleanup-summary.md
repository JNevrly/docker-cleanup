---
id: TASK-12
title: Support cross-view selection with a live cleanup summary
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:24:00Z'
labels:
  - frontend
  - cleanup
milestone: m-0
dependencies:
  - TASK-9
  - TASK-5
  - TASK-7
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users should build a small, deliberate cleanup batch such as the two oldest large containers, rather than pruning every stopped environment. Selection must remain understandable across filtering and navigation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Containers, images, volumes, and supported cache targets can be selected individually or through explicit group actions where deletion granularity supports it.
- [x] #2 The summary shows selected count, estimated reclaimable space or uncertainty, and retained external/shared data without naive size sums.
- [x] #3 Hidden selections remain discoverable and protection blocks accidental group selection of protected assets.
- [x] #4 Selection survives view changes and is revalidated after inventory refresh, with stale/disappeared items explained.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify cross-view selection summaries, group selection eligibility, hidden-selection discovery, retained storage explanations and uncertainty. Exercise disappearing/protected assets and daemon changes so selection cannot silently cross endpoints.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cross-view selection supports safe group actions, live conservative estimates, explicit retained storage, a Show selection view and protected/running/shared/cache eligibility guards. Disappeared/newly protected assets and daemon changes clear invalid selection with explanations. Eight browser journeys pass, including keyboard selection and cross-endpoint/stale-selection regression tests.
<!-- SECTION:FINAL_SUMMARY:END -->
