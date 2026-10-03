# BRIEFING — 2026-09-29T02:33:00Z

## Mission
Investigate and design Tiptap v2 rich text editor engine and A4 canvas layout for Vietnamese administrative documents (NĐ 30/2020/NĐ-CP).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_2\
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: core-platform-editor (M1)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Output strictly in working directory (`.agents/teamwork/m1_explorer_2/`)
- Pure technical substance, exact specs, minimal overhead

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: 2026-09-29T02:33:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md` & `PROJECT.md`
  - `src/rules/models.ts`, `src/rules/profiles.ts`, `src/rules/component-rules.ts`, `src/rules/fixer.ts`
  - `explorer_survey_1/` & `explorer_survey_3/`
- **Key findings**:
  - Tiptap v2 with custom `AdministrativeParagraph` and `AdministrativeHeading` handles all NĐ 30 paragraph formatting (`lineSpacing` 1.0–1.5, `spaceBefore` 0–6pt, `spaceAfter` 0–6pt, `firstLineIndentMm` 10–12.7mm, `fontFamily` "Times New Roman", `fontSize` 11–14pt, `textAlign`).
  - A4 canvas layout uses exact physical 210mm x 297mm dimensions with NĐ 30 margins (Top 20mm, Bottom 20mm, Left 30mm, Right 15mm) and print CSS pagination.
  - Toolbar combines standard formatting, typography controls, spacing dropdowns, and a one-click "Chuẩn Thân bài NĐ30" preset.
  - Adapter converts between Tiptap JSON and `ParagraphSnapshot[]` for M3 format evaluation and M2 OpenXML export.
- **Unexplored areas**: None within M1 Explorer 2 scope.

## Key Decisions Made
- Paragraph node attributes provide base styling; inline marks handle character-level styling.
- Tiptap adapter translates JSON directly to `ParagraphSnapshot[]` without DOM dependency.
- Print CSS relies on standard `@page` margins for 1:1 physical printing.

## Artifact Index
- `DISPATCH.md` — record of task dispatch
- `BRIEFING.md` — persistent working memory
- `progress.md` — liveness heartbeat
- `analysis.md` — complete technical specification and implementation plan
- `handoff.md` — 5-component self-contained handoff report
