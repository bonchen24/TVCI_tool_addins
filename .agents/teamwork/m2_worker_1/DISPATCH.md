## 2026-09-29T04:05:52Z
You are M2 Worker 1 for Milestone 2: `docx-interop-engine` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m2_worker_1\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the master project architecture at:
e:\CODING\TVCI_word_addins\PROJECT.md

INPUT SPECIFICATIONS (Read all three Explorer handoffs and analysis files carefully):
1. `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_1\handoff.md` & `analysis.md` (DOCX Importer architecture, jszip XML parsing, unit math, mammoth fallback)
2. `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_2\handoff.md` & `analysis.md` (DOCX Exporter architecture, table serializer, styles, A4 OpenXML geometry)
3. `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_explorer_3\handoff.md` & `analysis.md` (Template fidelity, roundtrip verification criteria, unit test suite design)

EXCLUSIVE WRITE OWNERSHIP:
- `e:\CODING\TVCI_word_addins\web_app\src\docx\` (`types.ts`, `styles.ts`, `table-serializer.ts`, `importer.ts`, `exporter.ts`, `index.ts`)
- `e:\CODING\TVCI_word_addins\web_app\tests\unit\docx-import.test.ts`
- `e:\CODING\TVCI_word_addins\web_app\tests\unit\docx-export.test.ts`
- `e:\CODING\TVCI_word_addins\web_app\tests\unit\docx-roundtrip.test.ts`
- `e:\CODING\TVCI_word_addins\web_app\app\page.tsx` (wire Import & Export handlers)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASKS:
1. Create `web_app/src/docx/types.ts`:
   Define `DocxImportOptions`, `DocxExportOptions`, `PageSetupOptions`, and AST mapping types.
2. Create `web_app/src/docx/styles.ts`:
   Implement exact conversion helper functions:
   - `mmToTwip(mm: number): number` (mm * 1440 / 25.4)
   - `ptToTwip(pt: number): number` (pt * 20)
   - `twipToMm(twip: number): number` ((twip * 127) / 7200)
   - `twipToPt(twip: number): number` (twip / 20)
   - `ptToHalfPoints(pt: number): number` (pt * 2)
   - `halfPointsToPt(hp: number): number` (hp / 2)
   - `spacingMultipleToTwip(mult: number): number` (mult * 240)
   - `twipToSpacingMultiple(twip: number): number` (Number((twip / 240).toFixed(2)))
   - Default A4 geometry constants: width 11906, height 16838, margins top 1134 (20mm), bottom 1134 (20mm), left 1701 (30mm), right 850 (15mm).
3. Create `web_app/src/docx/table-serializer.ts`:
   Map Tiptap `AdministrativeTable` to `docx.Table`:
   - Enforce borderless tables using `BorderStyle.NONE` on both table and every cell.
   - Calculate exact column DXA widths: Header table [4210, 5145] twips, Footer table [4677, 4678] twips.
   - Guarantee every TableCell contains at least one Paragraph.
4. Create `web_app/src/docx/exporter.ts`:
   Implement `exportDocx(doc: JSONContent, options?: DocxExportOptions): Promise<Blob | Buffer>`
   - Build section with A4 portrait size and NĐ 30 margins.
   - Serialize Paragraphs (with Times New Roman, sizes in half-points, line spacing, space before/after, indents, and text marks bold/italic/underline/strike).
   - Serialize Headings, AdminRules, and Tables.
   - Support both browser `Packer.toBlob` and Node `Packer.toBuffer`.
   - Implement `downloadDocx(blob: Blob, filename: string): void`.
5. Create `web_app/src/docx/importer.ts`:
   Implement `importDocx(input: ArrayBuffer | Uint8Array, options?: DocxImportOptions): Promise<JSONContent>`
   - Unpack archive using `jszip.loadAsync()`.
   - Parse `word/document.xml` using DOMParser / regex XML traversal.
   - Extract paragraphs, runs, text, formatting (bold, italic, underline, font size, line spacing, margins, indents).
   - Extract tables, identify 2-column header and footer tables, detect borderless properties.
   - Extract horizontal rules / SDT motto rules as `adminRule` nodes.
   - Integrate `mammoth` as robust secondary fallback when raw XML parsing fails or file is non-standard.
6. Create `web_app/src/docx/index.ts`:
   Barrel exports for `importDocx`, `exportDocx`, `downloadDocx`, and types.
7. Wire Import & Export in `web_app/app/page.tsx`:
   - Connect `onImportDocx` to trigger hidden file input, read `.docx` via `importDocx()`, and set content in editor.
   - Connect `onExportDocx` to call `exportDocx(editor.getJSON())` and trigger `downloadDocx(blob, documentTitle)`.
8. Implement comprehensive unit tests in `web_app/tests/unit/`:
   - `docx-import.test.ts`: test XML parsing of paragraphs, runs, half-point font sizes, line spacing, 2-column tables, AdminRules, and fallback.
   - `docx-export.test.ts`: test OpenXML generation, verifying A4 size, margins, font family, spacing, borderless tables, and zip package validity.
   - `docx-roundtrip.test.ts`: test roundtrip consistency (AST -> DOCX -> AST), ensuring text, paragraph hierarchy, and table structures are preserved.
9. Output:
   Write a self-contained `handoff.md` to `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_worker_1\handoff.md` with files created, test outputs, and verification details.
   Send a completion message back to parent when done.
