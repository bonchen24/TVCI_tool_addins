## 2026-09-29T04:29:33Z
You are M2 Iteration 2 Explorer 2 for Milestone 2: `docx-interop-engine` of TVCI Web Application.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m2_it2_explorer_2\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
e:\CODING\TVCI_word_addins\PROJECT.md
Review the Challenger 1 failure report:
e:\CODING\TVCI_word_addins\.agents\teamwork\m2_challenger_1\handoff.md

OBJECTIVE:
Formulate exact remediation code and test specifications for 2-column table classification in `web_app/src/docx/importer.ts`:
1. Root cause: In `parseTable` (lines 428-465), table classification heuristics are overly aggressive:
   `hasHeaderRight` matches `'ngày'`, and `hasHeaderLeft || leftText.length > 0` causes ANY 2-column table with text on left and a date/day on right to be classified as `admin-header`, stripping visible borders and forcing a 40/60 ratio! Similarly, `'trưởng'` in right column strips borders from normal 2-column data tables.
2. Design fix:
   - Header table requirement: strictly require National Motto keywords: `(rightText.includes('độc lập') && rightText.includes('hạnh phúc')) || rightText.includes('cộng hòa xã hội chủ nghĩa')`. Do NOT treat `'ngày'` alone as a header trigger.
   - Footer table requirement: require `leftText.includes('nơi nhận')` AND right-side administrative title keywords (`'giám đốc'`, `'thủ trưởng'`, `'chủ tịch'`, `'tổng giám đốc'`), or verify table position and absence of explicit grid borders.
   - Never override borderless if the table in XML has visible borders (`w:top`, `w:bottom`, `w:left`, `w:right` with `val != 'none' && val != 'nil'`).
3. Specify unit test additions in `web_app/tests/unit/docx-import.test.ts` verifying that ordinary 2-column data tables retain `tableType: 'content'` and retain borders.

OUTPUT:
Write detailed remediation specifications to `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_it2_explorer_2\analysis.md` and `handoff.md`.
Update `progress.md` with timestamps. Send completion message back to parent.
