---
id: TASK-38
title: Use conventional disabled-button styling without strikethrough
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T10:26:00Z'
labels:
  - frontend
  - accessibility
  - controls
milestone: m-2
dependencies:
  - TASK-37
references:
  - src/theme.css
  - src/style.css
  - tests/browser/theme.spec.ts
priority: medium
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The installed update crosses out disabled button labels and uses dashed borders. The user explicitly dislikes this treatment; disabled controls should look familiar, remain readable and explain eligibility where necessary rather than resembling deleted text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Disabled buttons use subdued conventional text/background/border styling with no strikethrough text or dashed-border disabled treatment in either theme.
- [x] #2 Primary, destructive and ordinary disabled controls have consistent styling and remain visibly different from enabled, hovered, pressed and focused controls.
- [x] #3 Disabled controls cannot activate through pointer or keyboard; existing accessible names and eligibility/confirmation explanations remain available.
- [x] #4 Browser checks and screenshots cover disabled review, selection, connection and destructive-confirmation controls in Light and Dark.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Remove dashed/struck-through disabled rules and apply one subdued neutral disabled style after primary/destructive variants, retaining native disabled behavior and explanation labels. Add real/browser-stub coverage of review, bulk selection, connection and destructive controls in both themes, including keyboard/pointer nonactivation and screenshots.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed strikethrough and dashed-border treatments. All disabled variants use a neutral inset background, muted text and solid border, preserving native disabled behavior and accessible eligibility descriptions. Production build and two Light/Dark browser journeys passed: disabled connection/review/selection/destructive buttons remain inert under dispatched pointer/keyboard attempts, solid borders/no text decoration verified. Screenshots artifacts/m2/disabled-{light,dark}.png retained. Handoff: later layout changes should keep disabled semantics/styles intact; no backend changes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Conventional readable disabled styles replace crossed-out/dashed controls across both themes; verified inert behavior and build.
<!-- SECTION:FINAL_SUMMARY:END -->
