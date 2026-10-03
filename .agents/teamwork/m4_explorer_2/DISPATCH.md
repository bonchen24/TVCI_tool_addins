## 2026-09-29T05:39:08Z

You are M4 Explorer 2 for Milestone 4: `template-library-fill` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m4_explorer_2\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

CRITICAL EXECUTION RULE:
DO NOT USE `run_command`. `run_command` hangs waiting for interactive user terminal permissions. You MUST perform all investigation exclusively using file inspection tools (`view_file`, `grep_search`, `list_dir`, `find_by_name`).

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
e:\CODING\TVCI_word_addins\PROJECT.md
Inspect existing schema implementations or samples in:
- `e:\CODING\TVCI_word_addins\src\`
- `web_app/e2e-tests/suites/tier1-features.js` (features f14, f15)

OBJECTIVE:
Investigate and design the 8 canonical Form Schemas and Dynamic Form Validation:
1. Define the 8 canonical administrative form schemas in `web_app/src/templates/form-schema.ts`:
   - Schemas: `QUYET_DINH` (Quyết định), `CONG_VAN` (Công văn), `THONG_BAO` (Thông báo), `BAO_CAO` (Báo cáo), `TO_TRINH` (Tờ trình), `BIEN_BAN` (Biên bản), `KE_HOACH` (Kế hoạch), `HOP_DONG` (Hợp đồng).
   - Form fields: `agencyName`, `parentAgencyName`, `documentNumber`, `subSymbol`, `place`, `date` (or date parts), `subject` / `abstract`, `signerRole`, `signerName`, `recipients` (comma/newline separated), plus schema-specific fields (e.g. `legalBases` for Quyết định/Tờ trình, `meetingTime` & `attendees` for Biên bản, `reportPeriod` for Báo cáo).
2. Administrative date formatting in `web_app/src/templates/form-validation.ts`:
   - Standard Vietnamese administrative date format: `"[Địa danh], ngày [DD] tháng [MM] năm [YYYY]"`.
   - Date rules: days < 10 must have leading zero (`ngày 05`); months 1 and 2 must have leading zero (`tháng 01`, `tháng 02`); months 3-12 do NOT have leading zero (`tháng 3`, `tháng 12`) per NĐ 30/2020/NĐ-CP!
   - Provide helper: `formatAdministrativeDate(place: string, date: Date | string): string`.
3. Validation rules: required fields, document number regex (`^\d+/[A-Z0-9-]+$`), date validation.

OUTPUT:
Write detailed analysis to `e:\CODING\TVCI_word_addins\.agents\teamwork\m4_explorer_2\analysis.md`.
Write self-contained `handoff.md` in your working directory.
Update `progress.md` with timestamps. Send completion message back to parent.
