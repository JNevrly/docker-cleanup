---
id: TASK-53
title: Support pre-3.11 Python in release validation helper
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T14:47:00Z'
updated_date: '2026-11-15T14:52:00Z'
labels:
  - release
  - bug
  - compatibility
dependencies: []
priority: high
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user running python3 scripts/release.py check --tag v0.4.0 hit ModuleNotFoundError for tomllib. Python below 3.11 lacks that standard-library module; the release command should support the maintained tomli backport and explain setup cleanly instead of failing at import time.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Release validation uses stdlib tomllib on Python3.11+ and optional pinned tomli on Python3.8–3.10; missing-parser failure has actionable setup guidance without a traceback.
- [x] #2 Maintainer documentation includes isolated backport installation and the release-check command; existing Python3.11 CI remains dependency-free for TOML parsing.
- [x] #3 Parser selection/missing-dependency regressions and release checks pass, including an actual Python3.10 invocation where available, without publishing or altering tags.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Load TOML parser lazily: stdlib tomllib first, optional tomli fallback, clear venv installation guidance when absent. Pin tomli2.5.0 conditionally for Python<3.11 and document Python3.8+ release-helper support separately from native CI Python3.11. Add import-selection and clean CLI failure regressions, run full Python suite/release tag check, and exercise actual Python3.10 in a disposable labelled container. No application changes, version bump, push or tagging.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Release helper now lazily prefers stdlib tomllib and falls back to tomli; missing both produces venv/setup guidance through the existing clean CLI error handler, while --help/import remain usable. Added conditional pinned tomli2.5.0 requirement for Python<3.11 and ignored .venv-release. docs/releasing.md documents isolated setup and current compatibility evidence; added a read-only Python3.10 CI job and made draft releases wait for it, without adding parser dependencies to normal3.11 checks. Added three parser-selection/error regressions. Full18 Python tests pass on host Python3.11.2 and actual Python3.10.22 in a newly created identity-checked disposable container, including release check output0.4.0 with isolated tomli. Actual3.10 without backport verified clean error/no traceback and --help success. Container removed by exact invocation-owned ID; no host pip install, application/binary/version changes, tag/push/publication. Actionlint and git diff --check pass. New source/requirements/docs read back.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed release-helper compatibility for older Python using optional pinned tomli, with clear isolated-install guidance instead of import traceback. Verified all18 Python tests and release check on real3.10 and3.11; added CI regression coverage. No app/version/tag changes.
<!-- SECTION:FINAL_SUMMARY:END -->
