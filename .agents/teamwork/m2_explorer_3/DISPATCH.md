## 2026-09-29T03:44:38Z
You are M2 Explorer 3 for Milestone 2: `docx-interop-engine` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_3\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the master project architecture at:
e:\CODING\TVCI_word_addins\PROJECT.md
Also inspect template files in:
e:\CODING\TVCI_word_addins\templates\
(e.g., `tvci-cong-van-template.docx`, `tvci-thong-bao-template.docx`, `sample-template.docx`)
Also inspect E2E Tier 1 tests in:
e:\CODING\TVCI_word_addins\web_app\e2e-tests\suites\tier1-features.js (features f05, f06, f07, f08)

OBJECTIVE:
Investigate template fidelity, roundtrip verification criteria, and test suite design:
1. Examine real template OpenXML:
   - Inspect internal XML structure of `templates/tvci-cong-van-template.docx` and `templates/tvci-thong-bao-template.docx` (unpack or view relationships, tables, header/footer elements, styles).
   - Document the exact XML elements used in standard TVCI documents for agency name, motto, reference number, body, and signature block.
2. Define Roundtrip Fidelity Criteria:
   - `DOCX (input) -> importDocx -> Tiptap JSON -> exportDocx -> DOCX (output)`
   - What must match exactly (100% text content preservation, paragraph ordering, table row/cell hierarchies).
   - What must match typographically (Times New Roman font, font size within 1pt, alignment match, line spacing within 0.1).
   - Guarantee zero corruption when output is opened by MS Word.
3. Design Unit Test Suites:
   - `web_app/tests/unit/docx-import.test.ts`: test importing XML fixtures with paragraphs, runs, tables, and edge cases.
   - `web_app/tests/unit/docx-export.test.ts`: test exporting Tiptap JSON into valid docx buffers, inspecting output structure.
   - `web_app/tests/unit/docx-roundtrip.test.ts`: test roundtrip conversions and attribute retention.
   - Verification against E2E test runner (`node web_app/e2e-tests/runner.js --filter="f05|f06|f07|f08"`).

OUTPUT:
Write your full analysis to `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_3\analysis.md`
Write a self-contained `handoff.md` in your working directory.
Update `progress.md` with timestamps. Send completion message back to parent.
