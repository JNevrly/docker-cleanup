---
id: TASK-47
title: >-
  Prioritize descriptive project and repository names over image tags in treemap
  labels
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T11:55:00Z'
updated_date: '2026-11-15T12:04:00Z'
labels:
  - frontend
  - treemap
  - labels
milestone: m-3
dependencies: []
references:
  - src/mapLabels.ts
  - src/mapLabels.test.ts
  - src/Treemap.tsx
  - src-tauri/src/inventory.rs
  - tests/browser/map-labels.spec.ts
priority: high
type: enhancement
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The installed 0.3.0 truncation still wastes scarce label space on reference syntax. User example: gitext.alps.cz:5000/mmwave-radar/idec/idec-ros2-log-replay-ws/idec_ros2_log_replay_ws_devcontainer:v0 becomes something like .../idec...:latest. The user explicitly permits dropping tags to keep the meaningful project name. Source review found that inventory currently joins multiple RepoTags into one asset name, so selecting a suffix from that joined text can emphasize a different reference; this is a hypothesis to verify, not proof that the reported image has multiple tags.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When space is insufficient, image labels drop registry, namespace prefixes and tag/digest detail before shortening the descriptive project/repository name; elision markers such as .../ do not consume space needed for that name.
- [x] #2 A known project association may supply a concise project name when its identity is trustworthy; otherwise use the descriptive repository basename rather than inventing a project association or arbitrarily interpreting an unrelated path segment.
- [x] #3 The supplied gitext.alps.cz:5000/mmwave-radar/idec/idec-ros2-log-replay-ws/idec_ros2_log_replay_ws_devcontainer:v0 case has a regression fixture demonstrating that the descriptive name gets priority over :v0 or :latest; trailing ellipsis is used only when the meaningful name itself cannot fit.
- [x] #4 Multiple image references are handled individually rather than treating a comma-joined display string as one Docker reference; shortening never invents/substitutes a tag, silently changes the underlying asset or loses access to complete references in hover/focus details and the inspector.
- [x] #5 Width-fitting tests cover aliases, single/multiple tags, registry ports, digests, untagged/dangling images, Unicode and one/two-line bounds; tiny labels remain readable or omitted without text overflow or a dense-inventory performance regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Keep full image references for identity/tooltip/inspector but, when fitting is necessary, parse comma-separated references individually and display the first real repository basename without registry/path/tag/digest before applying trailing ellipsis. Preserve aliases/dangling names and path-mode behavior; do not infer project names from unrelated segments. Add exact reported-reference/multi-tag unit and browser fixtures, verify width bounds and dense inventory, then hand off header hit targets separately.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Image fitting now parses actual comma-separated references before deriving the repository basename, dropping registry/path/tag/digest when fitting is needed and using trailing-only ellipsis. Full identity remains unchanged for tooltip, accessible name, inspector, selection and backend. No project association is guessed; repository fallback used. Exact reported reference plus alternate latest tag covered by unit/browser fixtures; aliases/dangling/path labels retained. Verification: 13 unit tests, production build and six browser label/state/dense-inventory journeys passed. Read back artifacts/m3/name-first.png showing full descriptive basename and both full references in inspector. Handoff: TASK-48 owns project header region hit targets/fallback; TASK-49 verifies all category pointer navigation. No backend/schema changes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Name-first image truncation preserves descriptive repository names instead of registry syntax or tags, including the exact multi-tag example. Unit, browser, dense-inventory and build checks pass.
<!-- SECTION:FINAL_SUMMARY:END -->
