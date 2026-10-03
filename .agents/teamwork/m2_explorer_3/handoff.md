# Handoff Report: Template Fidelity, Roundtrip Verification Criteria & Test Suite Design

## 1. Observation

1. **Template Files & OpenXML Structure**:
   - `templates/tvci-cong-van-template.docx` (23,853 bytes) and `templates/tvci-thong-bao-template.docx` (26,027 bytes) contain standard OpenXML packages with `word/document.xml`, `word/styles.xml`, and `[Content_Types].xml`.
   - In `tbl.xml` (line 1), the first-page header table is defined as:
     `<w:tbl><w:tblPr><w:tblW w:w="9354" w:type="dxa"/><w:jc w:val="left"/><w:tblLayout w:type="fixed"/><w:tblInd w:w="142" w:type="dxa"/><w:tblDescription w:val="TVCI_HEADER_EXT_R5"/></w:tblPr>`
     with `<w:tblGrid><w:gridCol w:w="5074"/><w:gridCol w:w="4280"/></w:tblGrid>`.
   - In `tbl.xml` (line 1), the cell borders are explicitly stripped using:
     `<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>`.
   - In `tbl.xml` (lines 1-2), the National Motto is `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r></w:p>` followed by SDT `<w:sdt><w:sdtPr><w:tag w:val="TVCI_HRULE:NATIONAL_MOTTO"/></w:sdtPr><w:sdtContent><w:p><w:r><w:drawing>...`.
   - In `scripts/add-template-form-content-controls.py` (lines 137-154), Content Control tags for TVCI templates are:
     `SO_KY_HIEU`, `TRICH_YEU`, `NGAY_BAN_HANH`, `NOI_NHAN_TRUC_TIEP`, `NOI_DUNG`, `NGUOI_KY`, `NOI_NHAN`, `DOI_TUONG_NHAN`.

2. **Web App Dependencies & Tiptap Schema**:
   - `web_app/package.json` (lines 38-41): `docx: "^8.5.0"`, `jszip: "^3.10.2"`, `mammoth: "^1.8.0"`.
   - `web_app/src/editor/schema.ts` (lines 7-12):
     `type: 'table', attrs: { tableType: 'admin-header', isBorderless: true, columnRatio: '40-60' }`.
   - `web_app/src/editor/extensions.ts` (lines 44-118): `AdministrativeParagraph` defines attributes `fontFamily` (default `'Times New Roman'`), `fontSize` (13), `lineSpacing` (1.2), `spaceBefore` (2), `spaceAfter` (2), `firstLineIndentMm` (10).
   - `web_app/src/editor/extensions.ts` (lines 446-506): `AdminRule` atom node with `kind: 'AGENCY' | 'MOTTO'` and `widthPercent`.

3. **E2E Feature Test Runner**:
   - `web_app/e2e-tests/runner.js` (lines 359-448) defines test suites:
     - `F05: High-Fidelity DOCX Import Engine` (w:sz to pt, dxa to mm, 2-column header/footer table extraction, unknown tag fallback).
     - `F06: High-Fidelity DOCX Export Engine` (mm to dxa margins, Times New Roman declaration, paragraph spacing, borderless header table, ZIP structure).
     - `F07: Roundtrip File Interop & Verification` (text integrity, table row/col preservation, A4 margins, Vietnamese Unicode, valid zip header).
     - `F08: Pure TypeScript Rule Engine Port` (Times New Roman requirement, ND30 margin boundaries, national emblem 12-13pt, motto 13-14pt, body indent 10-12.7mm).
   - `web_app/e2e-tests/runner.js` (lines 1107-1110) implements filtering:
     `suitesToRun = suitesToRun.filter((s) => s.name.toLowerCase().includes(fl));`.

## 2. Logic Chain

1. **From Template OpenXML to Editor AST Mapping**:
   - Observation 1 demonstrates TVCI documents use a 2-column borderless table for agency + motto and a 2-column borderless table for recipients + signer.
   - Observation 2 shows the Tiptap editor in `web_app` already supports `admin-header` and `admin-footer` tables with `borderless: true` and `adminRule` atom nodes.
   - Therefore, the DOCX importer (`jszip`) must map `<w:tbl>` with 2 cells in row 1 into Tiptap `table` with `attrs: { isBorderless: true, tableType: 'admin-header' | 'admin-footer' }`, and Motto drawing/SDT into `adminRule` nodes.

2. **From Typographic Rules to Roundtrip Fidelity**:
   - Observation 1 and Observation 3 establish that OpenXML uses half-points (`w:sz = 26` -> 13pt), dxa for spacing (`w:line="288"` -> 1.2 multiple, `w:spacing w:before="40"` -> 2pt, `w:ind w:firstLine="567"` -> 10mm), and Times New Roman font.
   - In exporting to DOCX (`docx` library), the reverse conversion must be exact: `pt * 2` for `w:sz`, `pt * 20` for dxa spacing, and `mm * 1440 / 25.4` for margins.
   - Because `docx` package generates standard ECMA-376 XML wrapped in JSZip, it produces valid `[Content_Types].xml`, `_rels/.rels`, and `word/document.xml`, preventing Word corruption.

3. **From Requirements to Unit Test Suite Architecture**:
   - Three dedicated unit test files must be created under `web_app/tests/unit/`:
     - `docx-import.test.ts`: isolates OpenXML XML parsing into AST.
     - `docx-export.test.ts`: isolates Tiptap JSON serialization into DOCX buffers.
     - `docx-roundtrip.test.ts`: validates idempotency and zero drift across the entire pipeline.
   - These test suites align directly with the criteria evaluated by `web_app/e2e-tests/runner.js` for features F05, F06, F07, and F08.

## 3. Caveats

1. **Complex Drawings vs Administrative Rules**: Real Word documents may contain complex drawing shapes (`<w:drawing><wp:anchor>...`). The web editor represents administrative lines as `adminRule` atom nodes (`kind: 'AGENCY' | 'MOTTO'`). Complex arbitrary shapes outside administrative rules should be sanitized or preserved as fallback placeholders.
2. **Multiple Section Breaks**: Templates in the repository are single-section A4 portrait documents. Multi-section or landscape documents are outside the scope of Milestone 2 core interop.
3. **Command Execution Restriction**: Background runner commands (`node web_app/e2e-tests/runner.js`) require user terminal confirmation if executed via tool execution. All specifications and code analysis are verified directly from code artifacts and static file inspection.

## 4. Conclusion

1. **OpenXML Element Specification**: TVCI templates rely on fixed OpenXML structures: borderless 2-column tables (`5074` dxa left, `4280` dxa right), Times New Roman font throughout, half-point font sizes (`w:sz`), dxa spacing/indentation, and SDT content controls (`TVCI_HRULE:*`, `SO_KY_HIEU`, etc.).
2. **Roundtrip Fidelity Standard**: Defined 100% exact text and hierarchy preservation, strict typographic tolerances (≤ 0.5pt font size, ≤ 0.05 line spacing, 0 alignment mismatch), and schema-conforming OpenXML packaging guaranteeing zero MS Word corruption.
3. **Unit Test Blueprint**: Complete test suite specifications for `docx-import.test.ts`, `docx-export.test.ts`, and `docx-roundtrip.test.ts` mapped to E2E Tier 1 tests F05-F08.

## 5. Verification Method

1. **Inspect Analysis File**:
   View `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_3\analysis.md`.
2. **Inspect Existing E2E Runner and Tests**:
   - Inspect `web_app/e2e-tests/runner.js` (lines 359-448) for F05-F08 test definitions.
   - Inspect `web_app/e2e-tests/tier1-feature/f05_docx_import.test.ts`, `f06_docx_export.test.ts`, `f07_roundtrip_interop.test.ts`.
3. **Execution Command (Post-Implementation)**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm test tests/unit/docx-import.test.ts tests/unit/docx-export.test.ts tests/unit/docx-roundtrip.test.ts
   node e2e-tests/runner.js --filter="f05"
   node e2e-tests/runner.js --filter="f06"
   node e2e-tests/runner.js --filter="f07"
   node e2e-tests/runner.js --filter="f08"
   ```
4. **Invalidation Conditions**:
   - If exported DOCX buffer fails ZIP header validation (`0x50, 0x4B, 0x03, 0x04`).
   - If MS Word raises schema validation error due to tag sequence violations inside `<w:pPr>`.
   - If Vietnamese diacritic text becomes corrupted across roundtrip.
