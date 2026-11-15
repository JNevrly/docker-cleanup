---
id: TASK-31
title: Make whole Engine build-cache cleanup discoverable and safely scoped
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:49:00Z'
labels:
  - frontend
  - prune
  - cache
milestone: m-1
dependencies:
  - TASK-27
  - TASK-30
priority: high
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user could not find how to clear build cache, and Select eligible in view silently excluded cache rows. Cache is frequently the cheapest storage to recreate; expose its supported cleanup operation directly while accurately distinguishing global prune from record deletion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The build-cache category has a prominent Clear Engine build cache action and an explanation of rebuild cost; unsupported individual cache rows are not presented with actionable selection checkboxes.
- [x] #2 The action opens a full-page review explicitly identifying Engine-wide eligible cache scope, known size/reclaim uncertainty, in-use cache retention and external buildx exclusion.
- [x] #3 A separate builder-scope acknowledgement is required; protected cache disables the operation with an explanation and scope/protection changes require renewed review.
- [x] #4 Empty, unavailable and unsupported Engine cache states are distinct from measured zero; unsupported age filters are not offered as if supported or silently widened.
- [x] #5 Cache cleanup uses the same progress/results workspace, never claims per-record deletion or fabricated byte progress, and is tested against the existing backend scope safeguards.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Expose direct cache-category full-page review with Engine-wide scope/rebuild/in-use/external-builder caveats and independent acknowledgement. Surface protected/empty/unavailable/unsupported/known-zero cache states from explicit capability evidence; remove cache-row selection and disable unsupported age options rather than widening filters. Preserve backend full-scope/revalidation guards and verify direct discovery, scoped execution, capabilities and protected refusal in browser/backend tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Direct cache-category action opens the full review page, with separate Engine-wide acknowledgement, rebuild cost, in-use retention, external-builder exclusion and reclaim uncertainty. Rows no longer expose per-record selection. Added explicit cache inventory capability (available/unsupported/unavailable) from Engine response; UI distinguishes absent records and reported zero. Generic prune cache age input is disabled and switching scope clears unsupported age. Protected cache blocks preview; backend full-scope fingerprints/protection/age guards unchanged. Verification: 33 browser journeys passed, including direct cache review/execution, separate acknowledgement, protected/empty/unsupported/unavailable/zero fixtures and all select-all/state/layout regressions; backend passed 12 unit plus 19 service tests including new capability evidence, changed scope and explicit prune guards. Production build passed. Handoff: TASK-33 must count Engine-wide prune as ONE executable action even when plan.actions contains several reviewed cache records; outcomes use engine-cache identity. TASK-34 must keep unknown-duration prune indeterminate.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Engine-wide cache cleanup is discoverable, explicitly acknowledged and honest about scope, rebuilding and uncertainty. Distinct cache availability states and no row-level deletion or unsupported age filter. Verified 33 browser journeys and 31 Rust tests, including full-scope safety guards.
<!-- SECTION:FINAL_SUMMARY:END -->
