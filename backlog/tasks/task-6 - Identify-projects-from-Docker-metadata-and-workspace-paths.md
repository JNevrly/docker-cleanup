---
id: TASK-6
title: Identify projects from Docker metadata and workspace paths
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-14T22:10:00Z'
updated_date: '2026-11-14T23:14:00Z'
labels:
  - backend
  - attribution
milestone: m-0
dependencies:
  - TASK-4
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Generated container names such as objective_bartik do not reveal the development project. Compose/devcontainer labels and mounts should provide explainable identity without depending on container names.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Compose project/service and available devcontainer workspace/config metadata identify project groups.
- [x] #2 Workspace mounts, image metadata, command, working directory, and ports provide fallback identification clues.
- [x] #3 Each inferred relationship exposes source, confidence, and conflicting evidence rather than asserting uncertain ownership.
- [x] #4 Unattributed and shared assets remain visible; fixture tests include missing labels and ambiguous paths.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Review metadata/workspace attribution and inspector evidence. Verify Compose/devcontainer labels, conflicting clues, fallback mounts/commands/ports, shared ownership and unattributed cases in fixtures and the live journey.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Explainable attribution uses Compose/devcontainer metadata, workspace mounts, command programs, working directory, ports and reference-derived shared ownership. Explicit/inferred/conflicting/unknown evidence is displayed. Rust conflicting-clue tests and live devcontainer attribution passed; environment and command arguments are omitted from basic evidence.
<!-- SECTION:FINAL_SUMMARY:END -->
