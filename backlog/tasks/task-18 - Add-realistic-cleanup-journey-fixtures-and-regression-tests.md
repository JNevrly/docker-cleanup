---
id: TASK-18
title: Add realistic cleanup journey fixtures and regression tests
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:11:00Z'
labels:
  - testing
  - safety
milestone: m-0
dependencies:
  - TASK-2
  - TASK-1
priority: high
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The supplied journey involves old large devcontainers, dangling/tagged images, a shared vscode volume, a database volume attached to a stopped container, and an unreferenced database volume. These cases should anchor safety and usability tests without trusting the pasted size totals as verified facts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Synthetic sanitized fixtures model the supplied journey, shared image layers, shared vscode storage, database volumes, missing timestamps, and unsupported cache accounting.
- [x] #2 Fixtures are clearly synthetic and can drive development/tests without a Docker daemon.
- [x] #3 The test harness can assert non-mutation during scanning/inspection and capture exactly which destructive API calls were attempted.
- [x] #4 Expected results distinguish reported sizes from actual or unknown reclaimability instead of copying unverified conversation totals.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Use explicitly synthetic cleanup-journey data for browser/accounting tests, a stateful fixture Unix API for Rust service tests and native WebKit tests, and uniquely labelled small resources for opt-in live DinD integration. Assert the exact destructive request set and keep default Docker endpoints out of the integration runner.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added explicitly synthetic src/demo.ts cleanup-journey fixtures, Rust Unix-API fixtures with exact request capture, native WebKit fixture API, and opt-in uniquely labelled small live DinD assets. Tests distinguish logical/unique/shared/unknown values and assert no mutation during inspection. Browser tests and 20-check live journey passed without a default endpoint fallback.
<!-- SECTION:FINAL_SUMMARY:END -->
