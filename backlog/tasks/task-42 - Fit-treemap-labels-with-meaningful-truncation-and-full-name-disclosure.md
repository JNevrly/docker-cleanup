---
id: TASK-42
title: Fit treemap labels with meaningful truncation and full-name disclosure
status: Done
assignee:
  - '@opencode'
created_date: '2026-11-15T10:09:00Z'
updated_date: '2026-11-15T10:37:00Z'
labels:
  - frontend
  - treemap
  - accessibility
milestone: m-2
dependencies: []
references:
  - src/Treemap.tsx
  - src/domain.ts
  - tests/browser/layout.spec.ts
  - tests/browser/states.spec.ts
priority: high
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
With many assets, long image names and project paths become unreadable or visually overflow their boxes. Current group headings lack clipping and tile labels simply lose their right-hand text, often hiding the most descriptive part. Users need recognizable repository/path suffixes rather than arbitrary prefixes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Group headings and tile text stay within their own rectangles under dense inventories, resizing and both grouping modes; labels never overlap adjacent groups or tiles.
- [x] #2 Image labels preferentially retain the repository basename and tag when space permits, for example .../image:tag; project paths preferentially retain their final meaningful segment or segments rather than a generic leading host path.
- [x] #3 Labels fit actual available width using sensible limited wrapping and ellipsis; friendly aliases, ordinary container/volume names, registry ports, digests and untagged image names are handled without misleading identity changes.
- [x] #4 Tiles too small for readable text omit the text instead of shrinking below the agreed readable minimum; names and sizes remain available through inspection and accessible names.
- [x] #5 Truncated group and asset names reveal their complete value on mouse hover and keyboard focus; tests include long image references/project paths, Unicode, narrow tiles and dynamic resizing.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Add measured-width label fitting with meaningful image/project suffix preference, Unicode-safe ellipsis and limited wrapping; clip headings and tile contents with unique IDs. Omit unreadable tiny text and expose complete labels via a shared hover/focus tooltip and full accessible names. Verify pure fitting edge cases, dense SVG bounds, tooltip keyboard/pointer behavior and resized layouts.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added measured-width Unicode-safe label fitting with image basename/tag and project-path suffix preference, up to two lines, size/state fitting and tiny-text omission. Group headings and tiles now have unique clip paths. Complete names/sizes/project appear in a shared hover/focus tooltip and full accessible names. Verification: 12 unit tests including port/tag/digest/alias/Unicode edge cases and size bounds, production build, 11 existing navigation/layout/state browser checks plus targeted long-label hover/focus/SVG-bounds journey passed. Initial fixture used an image tile too small for labels; expanded synthetic size to exercise truncation; bounds test excludes empty glyph nodes. Screenshot artifacts/m2/treemap-labels.png read back. Handoff: TASK-43/44 change available dimensions and should retain fit-on-resize behavior and full tooltip disclosure.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Treemap labels now fit actual space, retain meaningful suffixes, never spill and reveal complete names on hover/focus. Unit, browser bounds/disclosure and build verification passed.
<!-- SECTION:FINAL_SUMMARY:END -->
