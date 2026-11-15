---
id: TASK-2
title: Validate Docker storage and builder capability coverage
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:00:00Z'
labels:
  - backend
  - spike
milestone: m-0
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Engine storage backends and BuildKit/buildx builders expose different accounting and last-use information. Resolve these limitations before the UI promises unsupported data or exact savings. The first release targets one local Linux Docker endpoint.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A documented capability matrix covers container sizes, image shared/unique accounting, volume sizes, Engine cache, and buildx builder cache.
- [x] #2 An adapter contract distinguishes unsupported, permission-denied, unavailable, and measured-zero values.
- [x] #3 The supported build-cache scope and any Docker CLI/buildx dependency are documented with supported version assumptions.
- [x] #4 Validation uses recorded responses or a real daemon when available and explicitly records unvalidated cases.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Probe the identity-verified disposable Engine version, system df and object endpoints. 2. Document a capability matrix with unsupported external buildx scope and unknown/error semantics. 3. Add transport, accounting and compatibility tests; preserve uncertainty where Engine lacks layer-level attribution.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Documented docs/capabilities.md with API negotiation, per-asset accounting, explicit unknown/error semantics and Engine-only cache scope. Live identity-checked Docker 29.9.3/API 1.56 probes succeeded. Rust transport/accounting tests pass; other storage backends and rootless installations are explicitly unvalidated.
<!-- SECTION:FINAL_SUMMARY:END -->
