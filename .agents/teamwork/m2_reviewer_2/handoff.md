# Milestone 2 Review & Adversarial Challenge Report: `docx-interop-engine`

**Reviewer**: M2 Reviewer 2 (Roles: Reviewer, Critic)  
**Target Milestone**: M2 (`docx-interop-engine`)  
**Worker**: M2 Worker 1  
**Date**: 2026-09-29  
**Verdict**: **APPROVE**  

---

## 1. Executive Summary

Milestone 2 implementation of the DOCX Interoperability Engine (`web_app/src/docx/`) has undergone independent static code review and adversarial stress-testing. 

Key Findings:
1. **Integrity Check**: PASSED. No dummy implementations, facade classes, or hardcoded test cheats. Real OpenXML generation using `docx` and full zip decompression/parsing via `jszip`.
2. **A4 Geometry & NĐ 30 Margins**: PASSED. Exact twip calculations: width 11906, height 16838, margins top 1134 (20mm), bottom 1134 (20mm), left 1701 (30mm), right 850 (15mm), usable width 9355.
3. **Table & Cell Border Suppression**: PASSED. Dual-level border suppression with `BorderStyle.NONE` at table level and cell level, preventing OpenXML style inheritance leaks in Word.
4. **Column Ratio DXA Widths**: PASSED. Header table [4210, 5145] twips (45/55), Footer table [4677, 4678] twips (50/50), perfectly matching usable width 9355.
5. **Cell Paragraph Guarantee**: PASSED. Every cell enforces at least one `Paragraph` fallback; empty row and empty table fallbacks prevent fatal Word ECMA-376 schema repair errors.
6. **UI Integration**: PASSED. Hidden file input, `importDocx` reader, `exportDocx` downloader with proper cleanup in `web_app/app/page.tsx` and `web_app/src/components/layout/Header.tsx`.
7. **Test Suites**: PASSED. Exhaustive unit test coverage in `docx-export.test.ts`, `docx-roundtrip.test.ts`, and `docx-import.test.ts`.

Two low-severity adversarial edge cases were surfaced (landscape dimension swap, custom margin scaling in header table) and documented as non-blocking improvements.

---

## 2. 5-Component Handoff Report

### 2.1 Observation

1. **A4 Page Geometry & Margins**:
   - `web_app/src/docx/styles.ts:59-69`:
     ```ts
     export const A4_PAGE_GEOMETRY = {
       width: 11906, // 210 mm
       height: 16838, // 297 mm
       margins: {
         top: 1134, // 20 mm
         bottom: 1134, // 20 mm
         left: 1701, // 30 mm
         right: 850, // 15 mm
       },
       usableWidth: 9355, // 11906 - 1701 - 850 = 9355 twips (~165 mm)
     } as const;
     ```
   - `web_app/src/docx/exporter.ts:350-369`:
     Injects `A4_PAGE_GEOMETRY` width, height, and margins into the document section definition.

2. **Table & Cell Border Suppression**:
   - `web_app/src/docx/table-serializer.ts:18-32`:
     Defines `BORDERLESS_TABLE_BORDERS` (all 6 borders set to `BorderStyle.NONE, size: 0, color: 'auto'`) and `BORDERLESS_CELL_BORDERS` (all 4 borders set to `BorderStyle.NONE, size: 0, color: 'auto'`).
   - `web_app/src/docx/table-serializer.ts:187, 240`:
     Applies `BORDERLESS_CELL_BORDERS` to each cell and `BORDERLESS_TABLE_BORDERS` to the table wrapper when `isBorderless` is true.

3. **Column Ratio DXA Widths**:
   - `web_app/src/docx/styles.ts:82-93`:
     Header table widths: left 4210, right 5145 (sum: 9355). Footer table widths: left 4677, right 4678 (sum: 9355).
   - `web_app/src/docx/table-serializer.ts:51-80`:
     `resolveColumnWidths()` returns `[4210, 5145]` for header tables and `[4677, 4678]` for footer tables, supporting dynamic ratio scaling if `columnRatios` array is supplied.

4. **Cell Paragraph Guarantee**:
   - `web_app/src/docx/table-serializer.ts:169-171`:
     ```ts
     if (cellParagraphs.length === 0) {
       cellParagraphs.push(new Paragraph({}));
     }
     ```
   - `web_app/src/docx/table-serializer.ts:201-209, 219-231`:
     Injects fallback cell with empty paragraph if row has no cells, and fallback row if table has no rows.
   - `web_app/src/docx/exporter.ts:131-139, 340-343`:
     Injects fallback run if paragraph is empty, and fallback paragraph if document has no blocks.

5. **Times New Roman Typography Mappings**:
   - `web_app/src/docx/styles.ts:99-128`:
     `DEFAULT_FONT_FAMILY = 'Times New Roman'`, default size 13pt (26 half-points), line spacing 1.2 (288 twips), space before 2pt (40 twips), space after 2pt (40 twips).
   - `web_app/src/docx/exporter.ts:59-80`:
     Applies font family, half-point size (`ptToHalfPoints`), bold, italic, underline (`UnderlineType.SINGLE`), and strike marks to `TextRun`.
   - `web_app/src/docx/exporter.ts:141-167`:
     Applies alignment (`JUSTIFIED` default for body, `LEFT` default inside table), line spacing, space before/after, and first line indent (default 10mm = 567 twips).

6. **UI Integration**:
   - `web_app/app/page.tsx:23, 122-128`:
     Hidden `<input type="file" ref={fileInputRef} accept=".docx" onChange={handleFileChange} />`.
   - `web_app/app/page.tsx:79-100`:
     `handleImportDocx` triggers input click; `handleFileChange` reads file as `ArrayBuffer`, calls `importDocx()`, sets editor content via `editor.commands.setContent()`, updates title and stats, and clears `event.target.value`.
   - `web_app/app/page.tsx:102-117`:
     `handleExportDocx` exports editor JSON to blob via `exportDocx(json, { title, outputType: 'blob' })`, calls `downloadDocx(blob, documentTitle)`, and sets `isSaved = true`.
   - `web_app/src/components/layout/Header.tsx:130, 141`:
     Buttons wire to `onImportDocx` and `onExportDocx`.

7. **Unit Test Suites**:
   - `web_app/tests/unit/docx-export.test.ts`: 7 tests verifying conversions, PK zip header, mandatory parts (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/styles.xml`), A4 geometry, margins, typography, and borderless tables.
   - `web_app/tests/unit/docx-roundtrip.test.ts`: 3 tests verifying text integrity, paragraph hierarchy, Vietnamese diacritics, and edit-reimport cycles.
   - `web_app/tests/unit/docx-import.test.ts`: 7 tests verifying conversions, normalization, OpenXML XML parsing, tri-state toggles, table classification, and fallback.

### 2.2 Logic Chain

1. **Geometry Conformance**:
   - OpenXML twips standard: 1 inch = 72 pt = 25.4 mm = 1440 twips.
   - Top/Bottom 20mm $\rightarrow$ $20 \times 1440 / 25.4 \approx 1133.858 \rightarrow 1134$ twips.
   - Left 30mm $\rightarrow$ $30 \times 1440 / 25.4 \approx 1700.787 \rightarrow 1701$ twips.
   - Right 15mm $\rightarrow$ $15 \times 1440 / 25.4 \approx 850.393 \rightarrow 850$ twips.
   - Usable width: $11906 - 1701 - 850 = 9355$ twips.
   - Observation 1 directly proves mathematical compliance with NĐ 30/2020/NĐ-CP.

2. **OpenXML Schema Immunity**:
   - Word corrupt document errors occur when `<w:tc>` contains no `<w:p>` or `<w:tbl>`.
   - Observations 4 directly prove that every cell, row, and table is guaranteed to produce valid OpenXML block children.

3. **Rendering Isolation**:
   - Word renders borders when parent table or cell borders default to style borders.
   - Observation 2 proves that `BorderStyle.NONE` is explicitly emitted at both table `<w:tblBorders>` and cell `<w:tcBorders>` levels, ensuring complete border suppression.

4. **UI Interactivity**:
   - Observation 6 proves end-to-end integration: user selects file $\rightarrow$ DOM event triggers $\rightarrow$ buffer parsed $\rightarrow$ editor hydrated $\rightarrow$ user edits $\rightarrow$ export serializes to OpenXML $\rightarrow$ browser downloads `.docx`.

### 2.3 Caveats

1. **DrawingML Floating Objects**:
   - Milestone 2 exporter handles administrative rule dividers (`adminRule`) as styled paragraph borders. Arbitrary floating graphics/vector shapes are not supported. This is fully within the defined scope of M2.
2. **Table Nesting**:
   - Multi-level nested tables inside table cells are flattened to 1 level. NĐ 30 administrative headers and footers never require nested tables.

### 2.4 Conclusion

The Milestone 2 implementation satisfies all technical, architectural, and quality criteria defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`. There are zero integrity violations. Final verdict is **APPROVE**.

### 2.5 Verification Method

Independent verification can be executed via:
```bash
cd web_app
npm test tests/unit/docx-export.test.ts tests/unit/docx-roundtrip.test.ts tests/unit/docx-import.test.ts
npm run typecheck
```

---

## 3. Review Report

### Review Summary
**Verdict**: **APPROVE**

### Findings

#### [Minor] Finding 1: Landscape Orientation Page Dimensions Inversion
- **Where**: `web_app/src/docx/exporter.ts:325-359`
- **What**: When `options.pageSetup.orientation === 'landscape'` is passed, section `page.size` specifies `width: A4_PAGE_GEOMETRY.width` (11906) and `height: A4_PAGE_GEOMETRY.height` (16838).
- **Why**: In OpenXML specification, a landscape section must have `w:w > w:h` (i.e. width 16838, height 11906). While TVCI administrative documents are portrait, passing landscape could cause Word rendering discrepancies.
- **Suggestion**: In `buildDocxDocument`, swap width and height when `orientation === PageOrientation.LANDSCAPE`:
  ```ts
  const isLandscape = options.pageSetup?.orientation === 'landscape';
  const pageWidth = isLandscape ? A4_PAGE_GEOMETRY.height : A4_PAGE_GEOMETRY.width;
  const pageHeight = isLandscape ? A4_PAGE_GEOMETRY.width : A4_PAGE_GEOMETRY.height;
  ```

#### [Minor] Finding 2: Fixed Header/Footer Table DXA Widths on Custom Margins
- **Where**: `web_app/src/docx/table-serializer.ts:70, 79`
- **What**: If custom margins are passed (e.g. left margin 40mm), `totalWidthDxa` is smaller than 9355. `resolveColumnWidths()` returns hardcoded `[4210, 5145]` when `columnRatios` is undefined, which sum to 9355 and will overflow the right margin.
- **Why**: Hardcoded constants assume default 30mm/15mm margins.
- **Suggestion**: Scale dynamically based on `totalWidthDxa`:
  ```ts
  const leftWidth = Math.round(totalWidthDxa * 0.45);
  return [leftWidth, totalWidthDxa - leftWidth];
  ```

### Verified Claims
- A4 Geometry: 11906 x 16838 twips $\rightarrow$ verified via `styles.ts:60` and `docx-export.test.ts:163` $\rightarrow$ PASS
- Margins: 1134 top/bottom, 1701 left, 850 right $\rightarrow$ verified via `styles.ts:63` and `docx-export.test.ts:167` $\rightarrow$ PASS
- Borderless table & cell suppression $\rightarrow$ verified via `table-serializer.ts:18-32` and `docx-export.test.ts:203` $\rightarrow$ PASS
- Column DXA allocations [4210, 5145] and [4677, 4678] $\rightarrow$ verified via `styles.ts:82` and `docx-export.test.ts:206` $\rightarrow$ PASS
- Cell paragraph guarantee $\rightarrow$ verified via `table-serializer.ts:169` $\rightarrow$ PASS
- UI Integration in page.tsx $\rightarrow$ verified via `page.tsx:23, 79, 102` $\rightarrow$ PASS
- Vietnamese Unicode Diacritics integrity $\rightarrow$ verified via `docx-roundtrip.test.ts:226` $\rightarrow$ PASS

### Coverage Gaps
- Native Word desktop visual rendering (requires manual execution in Windows Word 2016/2019/365). Risk level: Low (OpenXML structure matches ECMA-376 schema standards).

---

## 4. Adversarial Challenge Report

### Challenge Summary
**Overall Risk Assessment**: **LOW**

### Challenges

#### [Low] Challenge 1: Border Leaks via Default Word Table Styles
- **Assumption Challenged**: Word respects table-level borderless properties.
- **Attack Scenario**: Word applies default "Table Grid" style which injects borders on all internal cells if cell borders are not explicitly set to none.
- **Mitigation Checked**: Both `BORDERLESS_TABLE_BORDERS` and `BORDERLESS_CELL_BORDERS` set `BorderStyle.NONE` explicitly on table and cells. Attack mitigated.

#### [Low] Challenge 2: Word Schema Crash on Empty Administrative Cells
- **Assumption Challenged**: Template fill or editor empty cells produce valid OpenXML.
- **Attack Scenario**: User clears text in header cell; cell has 0 paragraph children. Word displays "Word experienced an error trying to open the file".
- **Mitigation Checked**: `table-serializer.ts:169` guarantees `cellParagraphs.push(new Paragraph({}))`. Attack mitigated.

#### [Low] Challenge 3: File Input Repeated Selection
- **Assumption Challenged**: Selecting the same file twice triggers import.
- **Attack Scenario**: User imports file A, alters document, then re-imports file A. Without clearing `event.target.value`, `onChange` does not fire.
- **Mitigation Checked**: `page.tsx:98` executes `event.target.value = ''` in a `finally` block. Attack mitigated.

### Stress Test Results
- Schema validation with empty cells $\rightarrow$ Expected: valid XML $\rightarrow$ Result: PASS
- Vietnamese complex diacritics roundtrip $\rightarrow$ Expected: exact character match $\rightarrow$ Result: PASS
- Boundary condition: corrupted zip input $\rightarrow$ Expected: graceful fallback without crash $\rightarrow$ Result: PASS

---

## 5. Integrity Assessment
- Hardcoded test results: NONE.
- Facade implementations: NONE. Real OpenXML serializer and real zip archive generator.
- Bypassed tasks: NONE. Full feature set implemented.
- Self-certifying / fabricated outputs: NONE. All tests independently checked against actual code.
- Finding: **ZERO INTEGRITY VIOLATIONS**.
