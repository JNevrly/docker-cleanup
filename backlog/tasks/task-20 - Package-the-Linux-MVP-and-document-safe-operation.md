---
id: TASK-20
title: Package the Linux MVP and document safe operation
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:38:00Z'
labels:
  - release
  - docs
milestone: m-0
dependencies:
  - TASK-19
documentation:
  - README.md
  - docs/user-guide.md
  - docs/testing.md
  - docs/release-validation.md
priority: medium
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A working source tree is not sufficient for a desktop cleanup tool. Users need a reproducible Linux artifact, clear Docker access prerequisites, and honest limitations around process evidence, cache support, and recoverability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 At least one documented Linux package format builds reproducibly with version metadata and a smoke-tested launch procedure.
- [x] #2 Documentation covers rootful/rootless socket selection, least-privilege implications, optional CLI dependencies, and troubleshooting without insecure socket changes.
- [x] #3 The guide explains timestamp uncertainty, shared-space estimates, irreversible deletion, volume risk, and no host bind-mount deletion.
- [x] #4 Release validation records supported/tested Linux and Docker configurations and any builder/storage-backend limitations; no remote support or universal last-use accuracy is claimed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Validate the final locked, normalized Debian package and exported checksum against two reproducible builds. Run the native journey on the extracted packaged executable, document installation/rootless/socket safety and known limits, and verify all m-0 tasks before closing the milestone.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered artifacts/deb/Docker Cleanup_0.1.0_amd64.deb with locked inputs, Rust 1.100.0 and normalized dpkg timestamps/ownership. Two final builds matched byte-for-byte (SHA-256 ce2693bce830530629d42e830b5aba7493889b853393ee7c22230ac5726e9e3a). The extracted final package passed nine actual Tauri/WebKit UI checks. Documented installation, safe local/rootless socket configuration, irreversible/volume risks, least privilege, usage uncertainty, Engine-only cache scope and tested/unvalidated configurations. Exported artifact metadata and reports were read back and verified.
<!-- SECTION:FINAL_SUMMARY:END -->
