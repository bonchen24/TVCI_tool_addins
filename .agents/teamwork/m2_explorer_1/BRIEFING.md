# BRIEFING — 2026-09-29T03:48:30Z

## Mission
Investigate and design high-fidelity DOCX Importer (`web_app/src/docx/importer.ts`) for OpenXML parsing, NĐ 30 formatting extraction, table mapping, and Mammoth fallback.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, analysis, synthesis
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_1
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: M2 - docx-interop-engine

## 🔒 Key Constraints
- Read-only investigation — do NOT implement production code
- Output analysis to analysis.md and handoff.md
- Adhere to Superpowers Engineering Discipline and Project rules
- Strict verification before claims

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `web_app/package.json` (JSZip 3.10.2, Mammoth 1.8.0, docx 8.5.0 installed; Vitest jsdom env)
  - `web_app/src/editor/extensions.ts` (AdministrativeParagraph, AdministrativeTable, AdministrativeTableCell, AdminRule)
  - `web_app/src/editor/schema.ts` (defaultDocumentState, admin table types and cell types)
  - `web_app/src/editor/tiptap-adapter.ts` (tiptapDocToSnapshots, applyPatchToEditorNode)
  - `src/word/document-skeleton.service.ts` (OpenXML structures: header table, footer table, borders, sizes)
  - `src/rules/component-rules.ts` & `src/rules/horizontal-rules.ts` (NĐ 30 sizes, ratios, horizontal rules)
- **Key findings**:
  - OpenXML units mapped: `w:sz` half-points / 2 -> pt; `w:spacing` twips / 20 -> pt; `w:line` / 240 -> lineSpacing multiple; `w:ind` twips * 127 / 7200 -> mm.
  - Administrative tables identified by 2 columns + borderless + keyword matching (`Số:`, `Cộng hòa` vs `Nơi nhận`, `Giám đốc`).
  - Horizontal rules extracted from DrawingML lines, SDT tags, borders, or dashed runs.
  - Mammoth fallback architecture defined with custom style map and NĐ 30 default injection.
- **Unexplored areas**: None for importer scope. Ready for implementation.

## Key Decisions Made
- Use native `DOMParser` (with jsdom fallback in Node) matching `localName` to be namespace-agnostic.
- Dual-tier fallback: Try OpenXML via JSZip -> catch failure -> Mammoth convertToHtml -> AST normalize.

## Artifact Index
- DISPATCH.md — Task assignment
- BRIEFING.md — Working memory
- progress.md — Liveness heartbeat
- analysis.md — Complete technical specification & architectural blueprint
- handoff.md — 5-component handoff report
