# Handoff Report: 8 Canonical Form Schemas & Dynamic Form Validation (M4 Explorer 2)

## 1. Observation

1. **E2E Test Specifications**:
   - `web_app/e2e-tests/tier1-feature/f14_form_schemas.test.ts` (lines 9-28, 30-41, 43-52, 54-59):
     - Expects exactly 8 schemas registered in registry: `"cong_van"`, `"quyet_dinh"`, `"thong_bao"`, `"to_trinh"`, `"bao_cao"`, `"bien_ban"`, `"thu_moi"`, `"don_nghi_phep"`.
     - Validates required fields for `cong_van`: `SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `KINH_GUI`, `NOI_DUNG`, `NGUOI_KY`.
     - Validates repeatable fields for `quyet_dinh`: `CAN_CU`, `QUYET_DINH_DIEU`.
     - Validates `defaultProfile` in `["ND30_TVCI", "TKV", "IEMM", "DANG_05_HD_VPTW_2026"]`.
     - Validates field types in `Set(["text", "textarea", "date", "select", "repeatable"])`.
   - `web_app/e2e-tests/tier1-feature/f15_form_fill_date.test.ts` (lines 15-48, 62-78):
     - Date formatting rule per NĐ 30:
       - Single-digit days: `01`..`09` with leading zero (`ngày 05`).
       - Months 1, 2: `tháng 01`, `tháng 02` with leading zero.
       - Months 3..12: `tháng 3`, `tháng 9`, `tháng 12` WITHOUT leading zero.
     - Dynamic field binding and field-level error messages (`Trường ${field} không được để trống`).
   - `web_app/e2e-tests/tier2-boundary/missing_metadata_schema.test.ts` (lines 26-47):
     - Non-existent template ID throws: `Mẫu biểu không tồn tại trong hệ thống: ${id}`.
     - Calendar validation rejects invalid dates (e.g. `31/02/2026`, `31/04/2026`).
2. **User Requirements in Dispatch**:
   - 8 canonical administrative form schemas in `web_app/src/templates/form-schema.ts`: `QUYET_DINH`, `CONG_VAN`, `THONG_BAO`, `BAO_CAO`, `TO_TRINH`, `BIEN_BAN`, `KE_HOACH`, `HOP_DONG`.
   - Form fields: `agencyName`, `parentAgencyName`, `documentNumber`, `subSymbol`, `place`, `date`, `subject` / `abstract`, `signerRole`, `signerName`, `recipients`, plus schema-specific fields (`legalBases`, `meetingTime`, `attendees`, `reportPeriod`, etc.).
   - Administrative date formatting in `web_app/src/templates/form-validation.ts`: `formatAdministrativeDate(place: string, date: Date | string): string`.
   - Validation rules: required fields, document number regex (`^\d+/[A-Z0-9-]+$`), date validation.
3. **Existing Word Add-in Implementations**:
   - `src/templates/form-schema.ts` (lines 106-181): Schemas keyed by Vietnamese names (`Công văn`, `Quyết định`...) with tags `SO_KY_HIEU`, `TRICH_YEU`, etc.
   - `src/templates/form-validation.ts` (lines 89-96): Hardcoded place `Hà Nội` in `formatAdministrativeDate(value: string)`.

---

## 2. Logic Chain

1. **Bridging User Request & E2E Test Harness**:
   - Observation 1 shows E2E tests expect IDs `cong_van`, `quyet_dinh`, etc. with fields `SO_KY_HIEU`, `CAN_CU`, `QUYET_DINH_DIEU`.
   - Observation 2 shows User Request specifies canonical uppercase IDs (`QUYET_DINH`, `CONG_VAN`, `KE_HOACH`, `HOP_DONG`) with camelCase fields (`agencyName`, `documentNumber`, etc.).
   - Therefore, a dual-key and alias mapping architecture is necessary: each schema registers its primary ID, uppercase alias, and Vietnamese title. Each field exposes both its canonical `id` (or tag), and an array of `aliases` (e.g. `aliases: ["documentNumber", "SO_KY_HIEU"]`).
2. **Administrative Date Formatter Implementation**:
   - Observation 1 (`f15_form_fill_date.test.ts`) and Observation 2 define the NĐ 30/2020 rules for Vietnamese administrative dates:
     - `day < 10 ? "0" + day : "" + day`
     - `month < 3 ? "0" + month : "" + month`
     - `place, ngày ${dayStr} tháng ${monthStr} năm ${year}`
   - Observation 3 shows legacy calls passed a single argument (`value: string`), whereas Observation 1 & 2 pass two arguments (`place: string, date: Date | string`).
   - Therefore, `formatAdministrativeDate` is designed with an overloaded signature supporting both 1-arg (`formatAdministrativeDate("2026-01-03")`) and 2-arg (`formatAdministrativeDate("Hà Nội", date)`), handling `Date` objects, ISO strings, slash strings, and administrative text without runtime error.
3. **Validation Engine**:
   - Observation 2 dictates `DOCUMENT_NUMBER_REGEX = /^\d+\/[A-Z0-9-]+$/`.
   - Observation 1 (`missing_metadata_schema.test.ts`) tests invalid calendar date detection (preventing Feb 31, April 31).
   - Therefore, `form-validation.ts` integrates `DOCUMENT_NUMBER_REGEX`, `isValidCalendarDate`, `parseDateParts`, and a schema-driven `validateDocumentForm` returning field-level errors compatible with UI forms and E2E expectations.

---

## 3. Caveats

1. **Work Division Alignment**:
   - Explorer 1 designs `web_app/src/templates/types.ts` and `catalog.ts` (22 templates). The types defined in `form-schema.ts` (`DocumentFormSchema`, `FormFieldDefinition`) must match or re-export from `types.ts`.
   - Explorer 3 designs `engine.ts` (AST injection) and `Sidebar.tsx`. Explorer 3 will import `CANONICAL_SCHEMAS`, `getFormSchema`, `formatAdministrativeDate`, and `validateDocumentForm` from Explorer 2's modules.
2. **Internal Document Types**:
   - `THU_MOI` and `DON_NGHI_PHEP` are internal/informal forms (Phụ lục nội bộ IEMM/TVCI) rather than formal NĐ 30 state decrees, but are preserved in `INTERNAL_SCHEMAS` and registry for 100% backward compatibility with tests.

---

## 4. Conclusion

1. Designed `web_app/src/templates/form-schema.ts` with all 8 canonical administrative schemas:
   - `QUYET_DINH` (`quyet_dinh`)
   - `CONG_VAN` (`cong_van`)
   - `THONG_BAO` (`thong_bao`)
   - `BAO_CAO` (`bao_cao`)
   - `TO_TRINH` (`to_trinh`)
   - `BIEN_BAN` (`bien_ban`)
   - `KE_HOACH` (`ke_hoach`)
   - `HOP_DONG` (`hop_dong`)
   - Plus internal schemas `thu_moi` and `don_nghi_phep`.
2. Designed `web_app/src/templates/form-validation.ts` containing:
   - `formatAdministrativeDate(place: string, date: Date | string): string` strictly conforming to NĐ 30/2020 leading zero rules.
   - `DOCUMENT_NUMBER_REGEX = /^\d+\/[A-Z0-9-]+$/`.
   - `validateDocumentForm` and `validateDocumentNumber` providing field-level error messages.
3. Complete implementation blueprints written to `analysis.md` ready for implementers.

---

## 5. Verification Method

To verify the schemas and validation logic once implemented:
1. **Unit Test Verification**:
   Inspect and run `web_app/tests/unit/form-schema.test.ts` (to be created by M4 implementer):
   - Assert all 8 canonical schemas resolve via `getFormSchema()`.
   - Assert `formatAdministrativeDate("Hà Nội", new Date(2026, 8, 5))` produces `"Hà Nội, ngày 05 tháng 9 năm 2026"`.
   - Assert `formatAdministrativeDate("Hà Nội", new Date(2026, 0, 15))` produces `"Hà Nội, ngày 15 tháng 01 năm 2026"`.
   - Assert `formatAdministrativeDate("Hà Nội", new Date(2026, 2, 10))` produces `"Hà Nội, ngày 10 tháng 3 năm 2026"`.
   - Assert `validateDocumentNumber("123/QĐ-TVCI").valid === true`.
   - Assert `validateDocumentNumber("invalid_num").valid === false`.
2. **E2E Test Harness Verification**:
   Inspect `web_app/e2e-tests/tier1-feature/f14_form_schemas.test.ts` and `f15_form_fill_date.test.ts`.
   Check that schemas exported from `form-schema.ts` satisfy all assertions.
