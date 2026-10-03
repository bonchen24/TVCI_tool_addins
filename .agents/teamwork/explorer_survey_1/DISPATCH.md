## 2026-09-29T02:16:16Z
You are Survey Explorer 1 for the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\explorer_survey_1\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md

OBJECTIVE:
Investigate the existing TVCI Word Add-in codebase in `e:\CODING\TVCI_word_addins\src` to enumerate all existing features, format rules, algorithms, data structures, and implementation logic.

SCOPE OF INVESTIGATION:
1. Examine `src/` (and any subdirectories like format engine, audit rules, templates, AI prompts, utilities).
2. Detail all administrative formatting rules under Nghị định 30/2020/NĐ-CP:
   - Font family (Times New Roman), sizes, weights, styles for each element (Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số/Ký hiệu, Địa danh/Ngày tháng, Trích yếu, Nội dung, Chức vụ/Chữ ký, Nơi nhận).
   - Alignment, line spacing (1.0 - 1.5 lines), paragraph spacing (before/after 6pt).
   - Page margins (Top 20-25mm, Bottom 20-25mm, Left 30-35mm, Right 15-20mm).
3. Document how rule auditing and auto-correction are structured: rule definitions, severity, detection logic, auto-fix transformations.
4. Document AI assistant prompts, schema, and diff generation logic.
5. Document template data models, placeholders, dynamic field replacement logic.

BOUNDARIES:
- Read-only investigation. DO NOT write or edit source code.
- Write your findings to your working directory:
  `e:\CODING\TVCI_word_addins\.agents\teamwork\explorer_survey_1\survey_report.md`
- Also write a self-contained `handoff.md` in your working directory.
- Update `e:\CODING\TVCI_word_addins\.agents\teamwork\explorer_survey_1\progress.md` with timestamps as you progress.
- Send a completion message back to parent with summary and artifact path when done.
