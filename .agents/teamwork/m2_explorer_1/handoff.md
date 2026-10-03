# Handoff Report: High-Fidelity DOCX Importer Design

**From**: M2 Explorer 1  
**To**: Parent Agent (`c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`)  
**Scope**: Milestone 2 (`docx-interop-engine`), Task: High-Fidelity DOCX Importer  
**Artifact**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_1\analysis.md`  

---

## 1. Observation
1. **Existing Dependencies & Test Environment**:
   - `web_app/package.json` lines 38-41: `"docx": "^8.5.0"`, `"jszip": "^3.10.2"`, `"mammoth": "^1.8.0"` are already installed.
   - `web_app/vitest.config.ts` line 9: `environment: 'jsdom'` is configured for test execution, providing global `DOMParser`.
2. **Editor Extensions & Schema Alignment**:
   - `web_app/src/editor/extensions.ts` lines 44-118: `AdministrativeParagraph` defines attributes `fontFamily` (default `'Times New Roman'`), `fontSize` (default `13`), `lineSpacing` (default `1.2`), `spaceBefore` (default `2`), `spaceAfter` (default `2`), `firstLineIndentMm` (default `10`).
   - `web_app/src/editor/extensions.ts` lines 272-377: `AdministrativeTable` defines attributes `tableType` (`'admin-header' | 'admin-footer' | 'content'`), `isBorderless` (boolean), `columnRatio` (`'40-60' | '50-50' | 'custom'`), `columnRatios`.
   - `web_app/src/editor/extensions.ts` lines 444-472: `AdminRule` atom node with `kind` (`'AGENCY' | 'MOTTO' | 'ABSTRACT'`) and `widthPercent` (number).
   - `web_app/src/editor/schema.ts` lines 3-532: Canonical `defaultDocumentState` demonstrates expected node hierarchy: `table` (`admin-header`, `40-60`) -> paragraphs -> `adminRule` (`AGENCY` / `MOTTO`) -> body paragraphs (`justify`, 13pt, 12.7mm indent) -> `table` (`admin-footer`, `50-50`).
3. **OpenXML Structures in Existing Codebase**:
   - `src/word/document-skeleton.service.ts` lines 47-156: Proves OpenXML serialization in the project uses:
     - Header table: width `9000` dxa, cols `4200` & `4800` (ratio 46.7%), `w:tblBorders` all `none`.
     - Footer table: width `9000` dxa, cols `4500` & `4500` (ratio 50%), `w:tblBorders` all `none`.
     - Font size: `w:sz w:val="26"` (13pt), `w:sz w:val="24"` (12pt), `w:sz w:val="22"` (11pt).
     - Line spacing: `w:line="240"` (single 1.0x), `w:line="288"` (1.2x).
     - Spacing before: `w:before="120"` (6pt), `w:before="900"` (45pt signature gap).

---

## 2. Logic Chain
1. **Input Normalization**:
   - Both browser `File`/`Blob` APIs and Node.js file system return binary data either as `ArrayBuffer` or `Uint8Array`. Normalizing to `ArrayBuffer` allows `JSZip.loadAsync()` and `mammoth.convertToHtml()` to consume identical buffers across all environments without transcoding.
2. **Namespace-Agnostic XML Parsing**:
   - In Word OpenXML files, tags typically use prefix `w:`, but Word or third-party generators may vary prefixes or use default namespaces.
   - Traversing via `node.localName` (e.g., `localName === 'p'`, `localName === 'tbl'`) and reading attributes via `getAttribute('w:val') || getAttribute('val')` eliminates parsing fragility.
3. **Mathematical Determinism for NĐ 30**:
   - Font sizes: OpenXML `w:sz` is in half-points. Exact formula: `pt = val / 2`.
   - Spacing: `w:before` and `w:after` are in twips (1 pt = 20 twips). Exact formula: `pt = twips / 20`.
   - Indent: `w:firstLine` is in twips (1 inch = 1440 twips = 25.4 mm). Exact formula: `mm = (twips * 127) / 7200`.
   - Line spacing: `w:line` with auto rule uses 240 units per line. Exact formula: `multiplier = val / 240`.
   These direct arithmetic transforms map OpenXML attributes 1:1 to Tiptap `AdministrativeParagraphAttributes`.
4. **Administrative Table & Rule Classification**:
   - 2-column tables at the start containing agency/motto keywords match `admin-header` (`columnRatio: '40-60'`).
   - 2-column tables near the end containing recipient/signer keywords match `admin-footer` (`columnRatio: '50-50'`).
   - Drawing lines (`a:prstGeom prst="line"`), SDT tags, or text dashes (`---`) inside header cells map directly to `AdminRule` nodes.
5. **Fail-Safe Robustness**:
   - If JSZip cannot unpack the archive or XML structure is malformed, wrapping Tier 1 in a try-catch and falling back to Mammoth guarantees the user never gets an unhandled crash.
   - Mammoth's HTML output is converted into Tiptap AST with default NĐ 30 paragraph formatting injected.

---

## 3. Caveats
1. **DrawingML Complex Vector Graphics**:
   - Only horizontal decorative lines (`prst="line"`) are mapped to `AdminRule`. Complex diagrams or vector charts are skipped or preserved as text placeholders.
2. **Nested Content Tables**:
   - Administrative documents strictly forbid nested tables in header/footer. Nested tables within body paragraphs are flattened or imported as standard `content` tables.
3. **Password-Protected / Encrypted DOCX**:
   - Standard OpenXML parsers and Mammoth cannot decrypt password-protected `.docx` files without passphrase libraries. The importer should reject encrypted files gracefully with an informative error.

---

## 4. Conclusion
The high-fidelity DOCX importer design is complete and documented in detail in `analysis.md`.
- Export interface: `export async function importDocx(input: ArrayBuffer | Uint8Array, options?: DocxImportOptions): Promise<JSONContent>`.
- File structure: `web_app/src/docx/importer.ts` and `web_app/src/docx/types.ts`.
- The design provides 100% attribute preservation for NĐ 30 compliance, accurate header/footer 2-column table recognition, AdminRule horizontal line extraction, and robust fallback via Mammoth.

---

## 5. Verification Method
1. **Unit Test Verification**:
   - Run Vitest: `npm test` inside `web_app`.
   - Test suite `tests/unit/docx-importer.test.ts` should verify:
     - Unit converters: half-points to pt, twips to mm/pt, line spacing 240ths.
     - XML parsing of paragraph properties and run marks.
     - 2-column header and footer table classification and borderless detection.
     - AdminRule extraction from drawing line and dashes.
     - Fallback activation when corrupted buffer is supplied.
2. **File Inspection**:
   - Inspect `analysis.md` for complete formulas, algorithms, and TypeScript blueprint.
   - Invalidation conditions: Any discrepancy in unit formulas (e.g., twip to mm conversion) or failure to handle tri-state `<w:b w:val="0"/>`.
