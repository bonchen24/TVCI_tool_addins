## 2026-09-29T02:16:16Z
You are Spec Miner 2 for the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\spec_miner_survey_2\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md

OBJECTIVE:
Mine precise administrative specifications, template structures, and sample document characteristics from existing assets and Vietnamese administrative law (Nghị định 30/2020/NĐ-CP).

SCOPE OF INVESTIGATION:
1. Inspect templates in `e:\CODING\TVCI_word_addins\templates` (and any template metadata or definitions).
2. Inspect sample documents in `e:\CODING\TVCI_word_addins\test-documents`.
3. Extract exact structure, layout, tables, signature blocks, and dynamic placeholders for:
   - Công văn (Official Dispatch)
   - Thông báo (Notice / Announcement)
   - Quyết định (Decision)
   - Tờ trình (Proposal / Submission)
   - Other templates present.
4. Extract precise formatting specifications per Nghị định 30/2020/NĐ-CP for:
   - Table layouts (e.g. 2-column header: Cơ quan ban hành on left, Quốc hiệu/Tiêu ngữ on right; 2-column footer: Nơi nhận on left, Quyền hạn/Chức vụ/Chữ ký on right).
   - Paragraph styling, indentation (1.27cm / 0.5in), line spacing, font sizes.
5. Enumerate all dynamic fields needed for template fill (e.g., organ_name, doc_number, date_place, subject, signer_name, signer_title, recipients...).

BOUNDARIES:
- Read-only investigation. DO NOT write or edit source code.
- Write your findings to:
  `e:\CODING\TVCI_word_addins\.agents\teamwork\spec_miner_survey_2\survey_report.md`
- Also write a self-contained `handoff.md` in your working directory.
- Update `e:\CODING\TVCI_word_addins\.agents\teamwork\spec_miner_survey_2\progress.md` with timestamps.
- Send a completion message back to parent with summary and artifact path when done.
