---
id: TASK-55
title: Keep compact treemap headers and asset targets disjoint
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T16:03:00Z'
updated_date: '2026-11-15T16:12:00Z'
labels:
  - bug
  - frontend
  - ci
dependencies: []
priority: high
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub Browser Journeys now fails when Explore Volumes intercepts the Database storage leaf at1024x720 after maximizing the constrained map. Reproduce narrow/short category geometry, repair real SVG hit targets and retain table minimum, ordinary pointer clicks, category navigation and inspector draft isolation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Category header and visible asset leaf hit areas do not overlap at compact or resized map heights, including the CI1024 journey.
- [x] #2 Regression coverage reproduces the failure before the fix and passes after it with real pointer/keyboard interactions; existing100px table minimum and safeguards remain intact.
- [x] #3 Locked-browser full suite, unit/build/format checks and native smoke pass; evidence and hosted-CI limits are recorded without pushing or tagging.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Inspect D3 padding and measured leaf/header geometry; reproduce collapsed/overlapped leaves with deterministic compact heights or control wrapping using the locked browser. Repair adaptive header/leaf layout and semantic targets rather than forcing clicks or changing timeouts. Add unit geometry and browser hit-testing coverage across compact/resized maps, retain existing pointer journeys and100px table minimum, then run full locked-browser suite, frontend checks and native WebKit smoke. Record before/after evidence and limits; do not commit/push/tag.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Before-fix proof: original1024 journey passed locally, but deterministic40px SVG regressions failed2/2 (system-ui and Arial): the Database storage leaf center was not owned by the leaf. D3 with fixed27px group padding leaves a1px-high volume body at40px map height, so pointer rounding/header boundary hit-testing intercepts the leaf. Added adaptive header padding shared between D3 and painted hit area, extracted pure storage layout for unit coverage, and removed zero-area leaf buttons (asset table remains fallback). Unit tests20/20 and production build pass; focused browser validation in progress. No forced clicks, retries or timeout changes.

Focused locked-browser suite passed15/15 (original category journeys at1024/1440/1920, two compact-font regressions, table-scrollbar and splitters). Rebuilt native WebKit passed26 checks including real pointer compact volume inspection and integer-pixel hit ownership. Strengthened new browser coverage also checks >8px leaf body, no zero-area Tiny cache button, draft preservation across drill-down and preserved selection. First full run passed60/61: all layout tests passed, but the pre-existing1000-item inventory5s attachment wait timed out while scan was loading; native build/smoke was concurrent. Running a resource-serial full comparison with unchanged2 browser workers and unchanged timeouts, then rerunning final native harness after alias-compatible selector adjustment. Failure evidence retained in artifacts/treemap-targets-full.

Final verification: resource-serial full locked Chromium159/revision1255 suite61/61 with the same2 browser workers and unchanged timeouts/retries; frontend20/20; Python18/18; production build and Prettier pass. Final alias-compatible native harness rerun passed26/26 with the rebuilt Tauri/WebKit binary. Downloaded/read artifacts/treemap-targets-native/native-report.json and inspected native-compact.png: compact volume leaf is distinct and opens inspector without category navigation. Before-fix2/2 failure traces/screenshots retained in artifacts/treemap-targets-before; focused15/15 in artifacts/treemap-targets-focused-report; finalfull61 in artifacts/treemap-targets-full-serial-resources-report. Earlier concurrent full run60/61 inventory-loading timeout is retained, not hidden by retries. docs/releasing.md records cause, verification, resource-sensitive inventory limit and requirement for new-source hosted CI. No commit, push, tag or publication.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed compact SVG pointer interception by using one adaptive group-header height for D3 padding and painted hit targets, preserving meaningful leaf bodies at40px. Extracted pure geometry with unit tests and omitted zero-area leaf buttons while retaining table fallback. New two-font browser matrix40/50/60/80/120px checks actual hit ownership, ordinary header/leaf clicks, selection/drafts and100px table minimum. Original CI journey unchanged. Final locked-browser61/61, frontend20, Python18, build/format and native WebKit26 pass. An earlier concurrent full run hit the known separate inventory-load timing assertion; clean resource-serial run passed without test relaxations. Hosted verification remains required; changes uncommitted.
<!-- SECTION:FINAL_SUMMARY:END -->
