---
id: TASK-1
title: Bootstrap the Linux Tauri 2 desktop application
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:04:00Z'
labels:
  - foundation
  - security
milestone: m-0
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
An empty workspace needs a runnable application foundation for the agreed Rust backend and React/TypeScript interface. Keep Docker privileges behind narrowly scoped IPC rather than exposing the socket or a generic shell to the frontend.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A Linux developer can start the Tauri 2 application using documented commands.
- [x] #2 The React/TypeScript frontend can call a typed, allowlisted Rust command and receive progress/error events.
- [x] #3 Tauri capabilities and content security policy restrict unnecessary filesystem, shell, and network access; no arbitrary shell IPC is exposed.
- [x] #4 Frontend checks and Rust tests/build checks can run without a Docker daemon.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Establish a React/TypeScript frontend and a Tauri 2 Rust shell with narrowly scoped commands and events. 2. Provide daemon-independent checks and a Linux build environment using disposable Docker when native dependencies are absent. 3. Verify frontend, Rust, IPC and capability checks, and document startup commands.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bootstrapped React/TypeScript/Vite and Tauri 2 Rust application with a tagged typed request dispatcher, cancellation command, scoped event capability and restrictive CSP; no shell/filesystem plugins. npm build, 5 frontend unit tests, Rust core tests, and a real Tauri/WebKit WebDriver journey succeeded. Native UI loaded, scanned via IPC, rendered inspection data and completed a confirmed synthetic cleanup (7 native checks). Linux dependencies/startup documented in README.md.
<!-- SECTION:FINAL_SUMMARY:END -->
