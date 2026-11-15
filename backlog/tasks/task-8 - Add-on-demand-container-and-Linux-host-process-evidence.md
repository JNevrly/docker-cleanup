---
id: TASK-8
title: Add on-demand container and Linux host process evidence
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:18:00Z'
labels:
  - backend
  - linux
  - attribution
milestone: m-0
dependencies:
  - TASK-6
priority: medium
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users want to identify containers through the software inside them, owning editor/project processes, and host programs communicating with them. These relationships are useful clues but never proof that an asset is disposable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 On request, running-container process metadata is collected using supported Docker inspection/top interfaces without executing commands inside the container.
- [x] #2 Best-effort Linux process/workspace and network evidence can identify related editors or client programs with PID, source, and observation time where permitted.
- [x] #3 Permission limits, PID/network namespace ambiguity, stopped containers, and unsupported correlation are shown explicitly and do not block the basic scan.
- [x] #4 Collection is opt-in or on-demand, does not escalate privileges, redacts sensitive command/environment data by default, and never treats missing processes as proof of non-use.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Verify Docker top and on-demand local /proc workspace/TCP correlation, redaction and namespace limitations using synthetic sockets, a real local TCP connection, and the live running test container. Confirm inspection never executes a container command.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
On-demand Docker top returns PID/program names without exec or command arguments. Best-effort Linux /proc workspace and loopback TCP socket correlation exposes PID, program, evidence and observation time, with permission/namespace caveats; host correlation is disabled inside the harness namespace. Real local TCP/process tests and live container-top inspection passed; stopped containers remain stopped.
<!-- SECTION:FINAL_SUMMARY:END -->
