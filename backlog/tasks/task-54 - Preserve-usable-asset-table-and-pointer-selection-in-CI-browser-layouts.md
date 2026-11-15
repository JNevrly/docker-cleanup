---
id: TASK-54
title: Preserve usable asset table and pointer selection in CI browser layouts
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T15:07:00Z'
updated_date: '2026-11-15T15:26:00Z'
labels:
  - bug
  - frontend
  - ci
dependencies: []
priority: high
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub Browser Journeys fails in remote context switching when the sticky table header intercepts an asset checkbox, and in the 1024px inspector splitter journey where table height drops to83px instead of100px. Prior validation used a different preinstalled Chromium, so reproduce with the locked Playwright browser and fix actual layout/scroll geometry rather than forcing clicks or relaxing assertions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The 1024x720 map/inspector resize and remote same-daemon/failed-switch journeys pass using actual pointer interactions with the locked CI Chromium, retaining at least100px of usable table viewport.
- [x] #2 Map height budgeting accounts for wrapped controls, legends and short available space; sticky headers cannot obscure targeted row controls after ordinary scrolling, without breaking inspector drafts, selection or cleanup safeguards.
- [x] #3 Regression coverage exercises constrained layouts and scroll hit-testing; complete browser/unit/build/format checks pass and CI diagnostics capture future failures without enabling blanket retries.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Reproduce the two reported failures with Playwright locked Chromium (not harness override), inspect computed pane/control/header dimensions and row hit targets, then fix map budget/layout and sticky-header scrolling while preserving100px table minimum and existing tests. Add constrained/wrapped-control pointer regressions plus failure screenshots/traces, run focused/full CI-browser and harness-browser suites, frontend unit/build/format checks and native smoke if layout changes warrant. Do not force clicks, lower minimum-height assertions, add blanket retries, or push/tag.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed before-fix regression with locked Playwright Chromium159/revision1255 and visible21px classic scrollbars: both font variants failed with exactly83px clientHeight. Baseline hidden-scrollbar focused tests passed7/7, demonstrating the prior blind spot. Implemented measured table scrollbar/border reservation, complete map extras budgeting, minimum100px client viewport, measured sticky-header scroll padding and scrollable explorer fallback. Latest focused locked-browser run passed9/9 including open accounting notes and actual check/uncheck pointer interactions preserving inspector drafts. Unit17, Python18, build, format, release guards and actionlint pass; full browser/native verification pending. No forced clicks, minimum reduction, blanket retries, push or tag.

Full locked Chromium159/revision1255 suite passed59/59 with desktop scrollbars visible. Rebuilt Tauri/WebKit executable passed24 native smoke checks, including >=100px table viewport; downloaded and inspected artifacts/ci-layout-native/native-report.json and native-explorer.png. Added explicit regression assertion that scrollbar/border overhead is >=21px so hidden scrollbars cannot silently bypass the reproduction. docs/releasing.md documents cause, local reproduction, diagnostics and the need for a new-source CI run; earlier release candidate is stale for this fix.

Final checks: locked full suite59/59; strengthened21px-chrome regressions2/2 in a clean sequential run; native WebKit24/24; frontend17/17; Python18/18; Rust14 unit+22 service; production build, Prettier, release guard, actionlint and git diff --check pass. Older harness Chromium revision1254 full comparison passed58/59: the separate1000-item inventory test timed out at its unchanged5s attachment wait while scan remained loading, before table layout existed; its isolated diagnostic rerun passed1/1 in2.8s. All layout and remote-context journeys passed in that comparison. Preserved failure trace/screenshot under artifacts/ci-layout-harness-results; isolated report under artifacts/ci-layout-harness-large-report. One parallel diagnostic invocation raced for Vite port1420; it passed, but was superseded by the clean sequential locked regression run. No test timeouts/retries were changed, and no commit/push/tag/publication was performed. Hosted CI must run on the new reviewed fix commit; rerunning the old workflow cannot include these edits.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the reproduced104px outer minus21px scrollbar equals83px client viewport bug by measuring table chrome, budgeting map extras and enforcing100px client content. Added sticky-header scroll padding, an overflow fallback for constrained wrapped controls, classic-scrollbar/font/draft/pointer regressions and retained failure screenshots/traces. Locked CI-browser59/59, native24, frontend17, Python18 and Rust36 passed; local build/format/workflow/release checks pass. Optional older-browser comparison had one pre-layout inventory-load timeout that passed in isolation; details and evidence retained. Ready for reviewed commit and new-source GitHub CI, not pushed or tagged.
<!-- SECTION:FINAL_SUMMARY:END -->
