# Handoff Report - Spec Miner 2 (Administrative Specifications & Templates)

## 1. Observation
- **Original Request**: `e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 16-24) specifies requirements R2 (TVCI Administrative Format Audit & Auto-Correction per Nghị định 30/2020/NĐ-CP) and R3 (Template Management & Dynamic Fill).
- **Templates Directory**: `e:\CODING\TVCI_word_addins\templates\` contains root template fixtures (`tvci-cong-van-template.docx`, `tvci-thong-bao-template.docx`, `dang-sample.docx`, `sample-template.docx`, `iemm-*.docx`, `tkv-*.docx`) and subfolder `templates\iemm\` containing 14 formal DOCX files (`01-quyet-dinh-ca-biet.docx` through `14-cong-van-dinh-chinh.docx`).
- **Template Catalog & Schemas**: `src/templates/catalog.ts` defines 22 template records (`TEMPLATE_CATALOG`) across TVCI, IEMM, DANG, and TKV. `src/templates/form-schema.ts` (lines 3-181) registers 8 canonical document schemas (`FORM_SCHEMA_REGISTRY`: "Công văn", "Quyết định", "Thông báo", "Tờ trình", "Báo cáo", "Biên bản", "Thư mời", "Đơn nghỉ phép").
- **Administrative Formatting & Rules**:
  - `src/rules/profiles.ts` (lines 13-64): Defines profile `NĐ30_TVCI`, `IEMM`, `TKV`, and `DANG_05_HD_VPTW_2026`. Body font is Times New Roman, alignment `Justified`, `spaceBefore: 2`, `spaceAfter: 2`, `firstLineIndentMm: 10`, `lineSpacingPt: 15.6`, `lineSpacingMultiple: 1.2`. Margins: top 20-25mm, bottom 20-25mm, left 30-35mm, right 15-20mm.
  - `src/rules/component-rules.ts` (lines 16-71): Details exact font sizes and styling for `NATIONAL_EMBLEM` (12-13pt bold centered), `MOTTO` (13-14pt bold centered), `AGENCY_NAME` (12-13pt centered), `NUMBER_SYMBOL` (13pt centered), `PLACE_DATE` (13-14pt italic right), `DOCUMENT_TYPE` (13-14pt bold centered), `ABSTRACT` (13-14pt bold centered), `LEGAL_BASIS` (13pt italic left), `ADDRESSEE` (13-14pt left), `RECIPIENTS` (12pt italic left, items 11pt left), `SIGNER_ROLE` (13-14pt bold centered).
  - `src/rules/horizontal-rules.ts` (lines 9-11): `TITLE_ABSTRACT` ratio rule requires horizontal line width between 1/3 and 1/2 of longest line length (target 0.4).
  - `src/utils/tvci-formatter.ts` (lines 7-232): Encodes 15 TVCI rules, including date padding (days <10 pad 0; months 1, 2 pad 0; months 3-12 do not pad 0; e.g. "Hà Nội, ngày 09 tháng 9 năm 2026"), no colon after V/v and lowercase first letter, single recipient vs 2+ recipients punctuation, and closing phrase `Trân trọng cảm ơn./.`.
  - `src/word/form-content-control.service.ts` (lines 182-315): Implements fallback regex patterns for templates lacking native content controls.
  - `src/taskpane/components/A4DocumentPreview.tsx` (lines 154-502): Implements real-time A4 rendering with a 2-column header table (left: Agency/Symbol/Subject, right: Motto/Date) and a 2-column footer table (left: Recipients, right: Signer block).

## 2. Logic Chain
1. Based on `ORIGINAL_REQUEST.md`, the web application must replicate and modernize both the administrative audit/fixer engine (R2) and template fill library (R3) for standard Vietnamese documents.
2. Direct inspection of `src/rules/` and `src/utils/tvci-formatter.ts` reveals that the repository already contains a thoroughly tested mathematical and regex representation of Nghị định 30/2020/NĐ-CP and TVCI internal rules.
3. Analysis of `src/templates/catalog.ts` and `src/templates/form-schema.ts` confirms that all templates map cleanly into 8 structured form schemas with well-defined dynamic tags (`SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `KINH_GUI`, `CAN_CU`, `DIEU_KHOAN`, `NOI_DUNG`, `NGUOI_KY`, `NOI_NHAN`, etc.).
4. The 2-column layout for headers and footers is codified in `A4DocumentPreview.tsx` and can be directly ported into the Web Application's Next.js / Tailwind CSS document editor as well as the DOCX generation pipeline.
5. Fallback regex patterns from `form-content-control.service.ts` allow the web application to fill and export `.docx` files even when user-imported files lack embedded Word Content Controls.

## 3. Caveats
- Direct binary parsing of the `.docx` zip packages via Node command was avoided due to runner permission prompt timeout; all structural and metadata specifications were verified through TypeScript source code, unit tests, and layout previews.
- Custom organizational profiles exist in the codebase: `DANG_05_HD_VPTW_2026` omits National Emblem/Motto in favor of "ĐẢNG CỘNG SẢN VIỆT NAM", and ends the final legal basis with `,` instead of `.`. The web app must preserve this multi-profile capability.

## 4. Conclusion
The administrative specifications and template structures for TVCI Web Application are fully mined, codified, and documented in:
`e:\CODING\TVCI_word_addins\.agents\teamwork\spec_miner_survey_2\survey_report.md`.
The document provides an exhaustive reference covering:
- 25 discovered features and 12 edge cases.
- Exact dimensional and typographic rules per Nghị định 30/2020/NĐ-CP.
- Complete 22-template inventory and 8 form schemas.
- Exact regex fallback maps for non-content-control DOCX files.
- Architectural blueprint for Next.js / DOCX export implementation.

## 5. Verification Method
- Inspect the produced report:
  `e:\CODING\TVCI_word_addins\.agents\teamwork\spec_miner_survey_2\survey_report.md`
- Compare report data points against source files:
  - `src/rules/component-rules.ts`
  - `src/rules/profiles.ts`
  - `src/templates/form-schema.ts`
  - `src/utils/tvci-formatter.ts`
  - `src/taskpane/components/A4DocumentPreview.tsx`
  - `tests/rules/document-evaluator.test.ts`
- Invalidation conditions: Any discrepancy in font sizes, margin boundaries, date padding rules, or missing schema fields between the report and the reference TypeScript test suite.
