---
id: TASK-3
title: Connect safely to a local Linux Docker daemon
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:07:00Z'
labels:
  - backend
  - security
milestone: m-0
dependencies:
  - TASK-1
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users may have rootful or rootless Docker installations and may lack socket access. Connection failures must be actionable without running the whole desktop app as root or weakening socket permissions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A user can select or configure one local Unix-socket endpoint, including rootless Docker.
- [x] #2 Connectivity, daemon identity, and negotiated API compatibility are visible; unavailable and permission-denied states have actionable guidance.
- [x] #3 Remote endpoints are rejected with a clear out-of-scope message.
- [x] #4 No permission repair, socket chmod, automatic privilege escalation, or daemon mutation occurs during connection.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify the Unix-socket adapter and endpoint configuration against temporary fixture sockets and the identity-checked DinD daemon; validate API negotiation, identity display, remote rejection, and actionable non-escalating failures. Keep Docker access entirely in Rust.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Unix-only Rust adapter negotiates API 1.44–1.56 and verifies daemon identity. Native connection UI displays daemon/API and accepts rootless socket paths; unsupported remote endpoints and socket/group errors are actionable without escalation. Fixture scanning/inspection asserts GET-only calls. Live DinD identity and inventory scan passed; rootless daemon behavior remains explicitly unvalidated.
<!-- SECTION:FINAL_SUMMARY:END -->
