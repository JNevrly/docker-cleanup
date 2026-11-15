---
id: TASK-32
title: Explain storage categories at the point of exploration
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T07:51:00Z'
updated_date: '2026-11-15T08:39:00Z'
labels:
  - frontend
  - help
milestone: m-1
dependencies:
  - TASK-26
priority: medium
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users unfamiliar with Docker internals need to understand what each category owns and what deletion means. A category name and byte count alone do not explain writable layers, persistent data or shared image accounting.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Selecting any storage category through navigation or treemap drill-down shows a concise explanation near the main category content.
- [x] #2 Container help distinguishes writable layers from images and mounted data; image help explains templates, shared layers and reclaim uncertainty.
- [x] #3 Volume help warns that unreferenced data may contain databases; cache help explains eligible Engine cache and later rebuild cost.
- [x] #4 Shared-image storage help explains why it cannot be deleted independently and how removing image references can make it reclaimable.
- [x] #5 Help text is readable at the agreed font sizes, keyboard accessible where interactive, and does not introduce another mandatory modal or large decorative card.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Add concise, non-modal category explanations beside the currently explored category, whether selected through navigation or treemap drill-down. Keep all five category meanings, persistent-data risk, shared accounting and Engine-only cache/rebuild scope explicit. Make treemap category headings keyboard actionable and test all category help plus preserved readable sizing without changing cleanup behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added concise categoryHelp copy in src/domain.ts and a 14px inline note in the explorer for sidebar category selection or category treemap drill-down. All five meanings include the relevant ownership/loss/shared/rebuild constraints; no help modal or large card was introduced. Treemap category headings now expose keyboard-actionable button semantics. Verification: all 23 browser journeys passed, including every category explanation, >=14px help text and Enter-key drill-down; 8 unit tests, TypeScript/Vite build and formatting checks passed. Handoff: core backend and data schemas are unchanged. TASK-29 still owns inspector dialogs/related-asset links; TASK-30/31 own select-all/cache actions; TASK-33/34 own typed/item-level progress. Source changes are not yet packaged as an update.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Category selection now explains containers, images, volumes, Engine build cache and shared storage beside the explored assets, including deletion risk and accounting uncertainty. Help is readable, non-modal and available through keyboard treemap drill-down. Verified 23 browser journeys, 8 unit tests, production build and formatting checks.
<!-- SECTION:FINAL_SUMMARY:END -->
