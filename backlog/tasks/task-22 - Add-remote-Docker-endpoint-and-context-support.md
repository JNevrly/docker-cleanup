---
id: TASK-22
title: Add remote Docker endpoint and context support
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-15T13:50:00Z'
labels:
  - post-mvp
  - connectivity
dependencies: []
priority: low
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first release intentionally supports one local Linux endpoint. Remote engines require different identity, authentication, path, and process-correlation semantics rather than treating remote paths as local files.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A separately reviewed design covers SSH/TLS/context authentication and endpoint-scoped state without leaking credentials.
- [x] #2 Remote workspace paths and host process evidence are not mistaken for local evidence.
- [x] #3 Cleanup review identifies the remote daemon prominently and prevents cross-endpoint selection or execution.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved design implemented: explicit SSH/verified mutual-TLS Docker contexts using optional CLI, pinned --host/authentication metadata, credential-redacted bounded transport, endpoint/daemon-bound state and cleanup review, and remote evidence isolation. Verify parser/timeouts/redaction, same-daemon and failed-switch service/UI guards, real CLI loopback SSH/mTLS and unchanged local Docker safety. Release 0.4.0 with responsive connection discovery, two identical normalized locked packages and actual extracted-package 0.3.1 upgrade/native verification; export/read reports/checksum and document synthetic/native/live versus external-production limits.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User explicitly approved SSH/verified-TLS existing Docker contexts with optional CLI dependency, remote evidence isolation, endpoint-bound cleanup safety and disposable/automated validation. TASK-21 completed as research; no filesystem scanning added. Remote transport design will be recorded before implementation and validation limits retained.

Implemented reviewed design in docs/remote-context-design.md and native CLI transport: explicit resolved --host and TLS flags, metadata recheck per request, sanitized errors, bounded subprocess groups, remote connection-scoped preferences, disabled local host evidence and explicit review target. UI adds on-demand Contexts discovery and clears cross-endpoint selection/inspection; historical follow-up now checks endpoint as well as daemon. Added parser/timeout/redaction unit tests, same-daemon/failed-switch service tests, UI journeys and real CLI loopback SSH/mTLS integration runner. Integration setup exposed strict SSH key-parent permissions and context-update credential removal; fixture corrected without weakening authentication. Full verification/release evidence in progress.

Verified current backend with 14 Rust unit+22 service tests, desktop all-target Clippy -D warnings/Rustfmt, real Docker CLI29.9.3 over isolated authenticated SSH and verified mutual TLS:22 checks including unknown-host and bad-CA refusal, poisoned defaults, retarget/failed-switch invalidation, replay denial and no stored credential paths/key contents. Exported/read transport report; exact only mutation reviewed non-forced container DELETE. Fresh identity-checked local live Docker suite passed20. Final browser suite passed57, including context discovery/repeated same-daemon switches at1024x720, remote review warning and historical endpoint matching. Small-screen testing found persistent picker height could obstruct table interaction; chooser now wraps safely, closes on selection/toggles, and changed connections reset table scroll. Native screenshot now waits for resize observation before capture. Final frontend14/build/Prettier and Python8 checks pass. Source changes finished; final refreshed package comparison and standalone packaged0.3.1 upgrade run underway before finalization.

Final release0.4.0 complete. Two refreshed locked normalized Debian builds compared byte-identically; final SHA-256 2f1ab272944cc247b3700407ddca11d118a5b27766fdee088d25dd6d804684c5. Exported final artifacts/deb/Docker Cleanup_0.4.0_amd64.deb and sidecar; sha256sum -c OK. Actual final extracted executable passed29 native checks after actual original0.3.1 package seeded history/aliases/projects/protection/Dark/theme/panes. Exported/read final native report/explorer/results under artifacts/remote-contexts/packaged, including exact reviewed-only mutations and a resize-settled screenshot. Final browser57 includes real pointer remote discovery/confirmation/same-daemon and failed switches at1024x720; no horizontal overflow. Frontend14, Rust14unit+22service, Python8, build/format/desktop Clippy warnings-denied pass; real CLI22 and identity-checked live Docker20 pass. README/user-guide/capabilities/testing and docs/remote-context-release.md record setup, checksum, commands, evidence and explicit real-CLI/synthetic-Engine/native/live/external-host limits. No user remote environment or manual testing required. No host installation, commit or push performed; tasks23/24 untouched.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented approved SSH/verified mutual-TLS context support with optional Docker CLI, credential-redacted bounded transport, remote path/process isolation, endpoint-scoped state and prominent connection-bound cleanup review. Real CLI22/browser57/packaged-native29/live-Docker20 plus full unit/backend checks pass. Delivered reproducible0.4.0 package and verified0.3.1 upgrade; external production hosts remain explicitly unvalidated.
<!-- SECTION:FINAL_SUMMARY:END -->
