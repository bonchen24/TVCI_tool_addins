# Handoff Report - M2 Explorer 2 (High-Fidelity DOCX Exporter)

**Agent**: M2 Explorer 2  
**Role**: Investigation & Architecture Design  
**Target Milestone**: M2 (`docx-interop-engine`)  
**Scope**: High-Fidelity DOCX Exporter (`web_app/src/docx/exporter.ts`, `table-serializer.ts`, `styles.ts`, `types.ts`)

---

## 1. Observation

1. **`docx` dependency version**:
   `web_app/package.json` line 38 lists:
   ```json
   "docx": "^8.5.0",
   "jszip": "^3.10.2",
   ```
   Both libraries are modern and capable of browser and Node.js OpenXML serialization.

2. **Existing Tiptap schema & paragraph extensions**:
   `web_app/src/editor/extensions.ts` lines 44-118 define `AdministrativeParagraph` with attributes:
   - `fontFamily`: default `'Times New Roman'`
   - `fontSize`: default `13` (pt)
   - `lineSpacing`: default `1.2`
   - `spaceBefore`: default `2` (pt)
   - `spaceAfter`: default `2` (pt)
   - `firstLineIndentMm`: default `10` (mm)
   Lines 272-376 define `AdministrativeTable`:
   - `tableType`: `'admin-header' | 'admin-footer' | 'content'`
   - `isBorderless` / `borderless`: `boolean`
   - `columnRatio`: `'40-60' | '50-50' | 'custom'`
   - `columnRatios`: `[number, number] | number[] | null`
   Lines 444-506 define `AdminRule`:
   - `kind`: `'AGENCY' | 'MOTTO' | 'ABSTRACT'`
   - `widthPercent`: `number` (default 40% for agency/abstract, 95% for motto)

3. **Existing document AST state**:
   `web_app/src/editor/schema.ts` lines 3-532 define `defaultDocumentState` containing:
   - Header table (`tableType: 'admin-header'`, `isBorderless: true`, `columnRatio: '40-60'`)
   - Left cell: Agency name + `adminRule` (`AGENCY`, 40%) + Symbol
   - Right cell: National Motto + `adminRule` (`MOTTO`, 95%) + Location/Date
   - Body paragraphs: Justified text, 13pt Times New Roman, line spacing 1.2, indent 12.7mm
   - Footer table (`tableType: 'admin-footer'`, `isBorderless: true`, `columnRatio: '50-50'`) with Recipients & Signer

4. **Tier 1 E2E Test Expectations**:
   `web_app/e2e-tests/tier1-feature/f06_docx_export.test.ts` lines 10-66 specify:
   - Margin conversion: `topMm (20mm) -> 1134 dxa`, `leftMm (30mm) -> 1701 dxa`
   - Font family: Times New Roman primary font
   - Spacing conversion: 1 pt = 20 dxa (`spaceBefore 2pt = 40 dxa`)
   - 2-column header table with invisible borders
   - OpenXML zip package entries: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/styles.xml`, `word/_rels/document.xml.rels`

5. **Legacy Word Add-in OpenXML Templates**:
   `src/word/document-skeleton.service.ts` lines 47-156 confirm standard table dimensions:
   - Header table: 9000 dxa total width, columns `4200` dxa (left) and `4800` dxa (right), `w:tblBorders` all `none`.
   - Footer table: 9000 dxa total width, columns `4500` dxa and `4500` dxa, `w:tblBorders` all `none`.

---

## 2. Logic Chain

1. **Unit conversion logic**:
   - From Observation 4 and ECMA-376 OpenXML standard, 1 inch = 72 pt = 25.4 mm = 1440 twips (dxa).
   - Therefore, $mm \times 1440 / 25.4$ converts millimeters to twips (20mm = 1134, 30mm = 1701, 15mm = 850).
   - Paragraph spacing uses $pt \times 20$ twips (2pt = 40 dxa).
   - Font sizes in OpenXML (`w:sz`) are stored in half-points ($pt \times 2$, e.g. 13pt = 26).
   - Line spacing in multiple mode uses $multiple \times 240$ with `lineRule: LineRuleType.MULTIPLE` (1.2 multiple = 288).
   - Indentation uses $mm \times 1440 / 25.4$ or $mm \times 56.7$ (10mm = 567 twips).

2. **Table layout & borderless guarantee**:
   - From Observations 2, 3, and 5, administrative tables must be 100% borderless in Word.
   - Simply setting table-level borders can still show borders if Word style table defaults apply.
   - Therefore, set `BorderStyle.NONE` at both `docx.Table` (`borders`) and every `docx.TableCell` (`borders`).
   - Usable A4 width between 30mm left and 15mm right margins is $11906 - 1701 - 850 = 9355$ twips.
   - For `admin-header` (ratio 45/55): column widths are 4210 twips and 5145 twips.
   - For `admin-footer` (ratio 50/50): column widths are 4677 twips and 4678 twips.
   - These are passed explicitly to `columnWidths` on `docx.Table` and `width: { size, type: WidthType.DXA }` on `docx.TableCell`.

3. **Isomorphic Packer pipeline**:
   - From Observation 1, `docx.Packer.toBlob` generates a browser `Blob` for zero-server client download, while `docx.Packer.toBuffer` returns a Node `Buffer` for testing and Next.js route handlers (`/api/export-docx/route.ts`).
   - Using `typeof window !== 'undefined'` allows automatic environment detection, with optional override via `options.outputType`.

4. **Robust AST parsing**:
   - From Observations 2 and 4, Tiptap JSON may contain standard child `text` nodes with `marks` or simplified AST with direct `text` and `bold` attributes.
   - `serializeRuns` defensively handles both formats and inserts `TextRun({ text: '', break: 1 })` for `hardBreak` nodes.
   - Every `TableCell` is guaranteed to contain at least one `Paragraph` to satisfy OpenXML schema validation.

---

## 3. Caveats

1. **Complex nested tables**: The current design handles 1-level tables (standard administrative 2-column and content tables). Nested tables within cells are not used in administrative formats and are not supported.
2. **Horizontal rule in cell width**: `adminRule` indentation is computed based on its cell width (default 4200 dxa). When used in full-page body context, total width defaults to 9355 dxa.
3. **Images and shapes**: Images (`docx.ImageRun`) and complex DrawingML shapes are out of scope for Milestone 2 administrative text/table serialization.

---

## 4. Conclusion

The DOCX Exporter design is fully specified, verified against NĐ 30/2020 and OpenXML ECMA-376 standards, and ready for clean implementation across 4 files:
- `web_app/src/docx/types.ts`: Shared interfaces and export options.
- `web_app/src/docx/styles.ts`: Conversion math helpers (`mmToTwip`, `ptToTwip`, `ptToHalfPoints`, `spacingMultipleToTwip`) and default document styles.
- `web_app/src/docx/table-serializer.ts`: Column ratio calculation, DXA grid widths, complete border suppression (`BorderStyle.NONE`), cell padding.
- `web_app/src/docx/exporter.ts`: AST serializer for Paragraphs, Headings, Rules, and Tables, plus `exportDocx` and `downloadDocx`.

Full design code and technical specification are recorded in `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_2\analysis.md`.

---

## 5. Verification Method

Once implemented, verify independently using:
1. **Unit tests**:
   Create and execute `web_app/tests/unit/docx-export.test.ts` via Vitest:
   ```bash
   cd web_app && npm test tests/unit/docx-export.test.ts
   ```
2. **Tier 1 E2E tests**:
   Execute feature test F06 and F07:
   ```bash
   node web_app/e2e-tests/runner.js --filter="f06|f07"
   ```
3. **ZIP & OpenXML structure verification**:
   Inspect generated DOCX buffer with `JSZip`:
   - Check `[Content_Types].xml`, `word/document.xml`, `word/styles.xml` exist.
   - Check `w:rFonts w:ascii="Times New Roman"` is present in `word/document.xml`.
   - Check margin values `1134`, `1701`, `850` in `w:sectPr/w:pgMar`.
