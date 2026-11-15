---
id: TASK-19
title: Verify the end-to-end cleanup journey and adversarial safety cases
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:37:00Z'
labels:
  - testing
  - safety
milestone: m-0
dependencies:
  - TASK-17
  - TASK-11
  - TASK-18
documentation:
  - docs/testing.md
  - docs/release-validation.md
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The release must demonstrate that users can identify and remove the intended old containers while retaining workspaces and persistent data. Dangerous races and partial failures matter as much as the happy path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Automated journey tests cover scan, project/process evidence, writable-layer inspection, selection, review, execution, newly eligible images, and before/after results.
- [x] #2 Tests cover shared-layer estimates, protected resources during prune, stale plans, new volume references, permission denial, cancellation, and partial daemon failures.
- [x] #3 Tests assert that running containers, unselected volumes, database fixtures, and bind-mounted host paths are not removed by default workflows.
- [x] #4 A documented opt-in disposable-daemon integration suite never targets the developer default endpoint implicitly; unrun real-daemon tests are reported honestly.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Run the final Rust, frontend, browser, helper, native packaged-WebKit and explicit live-DinD suites. Retain structured reports and screenshots. Check stale/new references, protections, shared accounting, cancellation, permission failure, skipped dependencies and retained persistent data; document real versus simulated coverage honestly.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Current evidence: 30 Rust tests passed, all-target desktop Clippy passed with warnings denied, 5 frontend tests passed, 8 browser journeys passed, and 8 Python helper/repack tests passed. The live 20-check DinD journey and 9-check packaged WebKit journey passed on prior verified builds. Final source/normalized package/native rerun is underway; do not mark complete until the final rerun and artifact export succeed.

Final rerun succeeded: 30 Rust tests, all-target desktop Clippy, 5 frontend tests, 8 browser journeys, 8 helper/repack tests, 20 live DinD checks and 9 checks against the executable extracted from the final Debian package. Two complete normalized builds were byte-for-byte identical; exported package SHA-256 matches ce2693bce830530629d42e830b5aba7493889b853393ee7c22230ac5726e9e3a.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the automated cleanup journey and adversarial safety coverage across fixture, browser, actual native WebKit and actual disposable Docker layers. Verified references/protection, shared accounting, queued cancellation, permission/persistence failures, skipped dependencies and retained data. Final structured reports/screenshots and explicit unvalidated scenarios are retained under artifacts/ and docs/release-validation.md.
<!-- SECTION:FINAL_SUMMARY:END -->
