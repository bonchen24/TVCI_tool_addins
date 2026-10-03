# BRIEFING — 2026-09-29T02:37:00Z

## Mission
Investigate and design 2-column administrative table structures for header and footer in Tiptap / ProseMirror under Decree 30/2020/NĐ-CP.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_3\
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: core-platform-editor

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Decree 30/2020/NĐ-CP layout compliance (Header & Footer 2-column table structure)
- Borderless table styling in print/docx/screen
- Exact cell widths / column ratios (40%-60% for Header, 50%-50% for Footer)
- Provide default sample document template state in Tiptap JSON

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`
  - `src/rules/component-rules.ts`, `src/rules/component-classifier.ts`, `src/rules/horizontal-rules.ts`
  - `src/drafting/presets.ts`, `src/taskpane/components/A4DocumentPreview.tsx`
  - Survey reports in `spec_miner_survey_2/` and `explorer_survey_1/`
- **Key findings**:
  - Header table: 2 columns, 1 row. Left 40% (Agency 12-13pt regular/bold + doc# 13pt), Right 60% (National Emblem 12-13pt bold + Motto 13-14pt bold + Date 13-14pt italic).
  - Footer table: 2 columns, 1 row. Left 50% (Recipients: heading 12pt bold/italic + items 11pt regular), Right 50% (Signer: role 13-14pt bold + 35-50mm blank + name 13-14pt bold).
  - Table styling: borderless in print/docx, subtle dotted outline in editor. Vertical-align top, zero cell indent, compact line-height 1.15-1.25.
  - Horizontal rules: under Agency (1/3-1/2 width) and under Motto (100% width).
  - Complete Tiptap JSON document structure designed and ready.
- **Unexplored areas**: none. All requirements covered.

## Key Decisions Made
- Use standard Tiptap Table extension with custom attributes (`tableType`, `isBorderless`, `columnRatio`) for maximum OpenXML/DOCX and ProseMirror compatibility.
- Adopt 40%-60% ratio for Header table to guarantee Motto fits on one single line on A4.
- Adopt 50%-50% ratio for Footer table for balanced recipients and signature block.
- Create lightweight `AdminRule` node for horizontal rule lines.

## Artifact Index
- DISPATCH.md — incoming dispatch log
- BRIEFING.md — persistent state
- progress.md — liveness heartbeat
- analysis.md — technical design & JSON spec
- handoff.md — 5-component handoff
