# BRIEFING — 2026-09-29T04:35:00Z

## Mission
Remediation specs for 2-column table classification in docx importer (prevent false positives for admin-header/admin-footer, preserve content table borders).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m2_it2_explorer_2
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: m2-docx-interop-engine

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in source files directly
- Propose exact remediation code and test specs in analysis.md and handoff.md

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: 2026-09-29T04:35:00Z

## Investigation State
- **Explored paths**: `web_app/src/docx/importer.ts`, `web_app/src/docx/table-serializer.ts`, `web_app/src/editor/extensions.ts`, `web_app/tests/unit/docx-import.test.ts`, `web_app/tests/unit/docx-roundtrip.test.ts`.
- **Key findings**:
  1. `hasHeaderRight` on substring `'ngày'` + `leftText.length > 0` triggered `admin-header` on ordinary date tables.
  2. Standalone `hasFooterRight` on substring `'trưởng'` triggered `admin-footer` on ordinary staff tables without `nơi nhận`.
  3. `isBorderless: isBorderless || isHeader || isFooter` unconditionally stripped OpenXML visible borders.
- **Unexplored areas**: None. Remediation code diff and unit test specs completed.

## Key Decisions Made
- Added `hasExplicitVisibleBorders(tblPr, firstRowEl)` to protect XML visible borders from being stripped.
- Restrict header table detection strictly to National Motto phrase matching; remove `'ngày'`.
- Restrict footer table detection to `leftText.includes('nơi nhận')` AND administrative signer titles (`giám đốc`, `thủ trưởng`, `chủ tịch`, `viện trưởng`, etc.).
- Preserved existing valid header/footer tests and roundtrip tests intact.

## Artifact Index
- DISPATCH.md — incoming dispatch log
- BRIEFING.md — persistent state index
- progress.md — liveness heartbeat
- analysis.md — detailed remediation specifications and code diff
- handoff.md — 5-component formal handoff report
