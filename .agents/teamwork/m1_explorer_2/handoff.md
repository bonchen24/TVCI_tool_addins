# Handoff Report — M1 Explorer 2

**Agent**: M1 Explorer 2  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_2\`  
**Target Parent**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Handoff Type**: Hard (Task complete)

---

## 1. Observation

1. **Rule Engine & Preset Specifications**:
   - `e:\CODING\TVCI_word_addins\src\rules\models.ts`:
     - Lines 47-62 define `ParagraphSnapshot` with exact formatting fields: `fontName`, `fontSize`, `alignment`, `spaceBefore`, `spaceAfter`, `firstLineIndentMm`, `lineSpacingMultiple`.
     - Lines 76-89 define `FormattingPatch` matching the same attribute set.
   - `e:\CODING\TVCI_word_addins\src\rules\profiles.ts`:
     - Lines 13-22 define `COMMON_BODY`:
       ```typescript
       const COMMON_BODY = {
         fontName: 'Times New Roman',
         alignment: 'Justified' as const,
         spaceBefore: 2,
         spaceAfter: 2,
         firstLineIndentMm: 10,
         lineSpacingPt: 15.6,
         lineSpacingRule: 'multiple' as const,
         lineSpacingMultiple: 1.2,
       };
       ```
     - Lines 31-38 define page margins for NĐ 30:
       `topMm: { min: 20, max: 25, target: 20 }`
       `bottomMm: { min: 20, max: 25, target: 20 }`
       `leftMm: { min: 30, max: 35, target: 30 }`
       `rightMm: { min: 15, max: 20, target: 15 }`
   - `e:\CODING\TVCI_word_addins\src\rules\component-rules.ts`:
     - Lines 16-28 define typography and alignment rules for all document components under NĐ 30: body (13-14pt), header/motto (12-13pt, 13-14pt bold centered), place & date (13-14pt italic right), recipients (12pt italic left, items 11pt).

2. **UI Design System Constraints**:
   - `e:\CODING\TVCI_word_addins\PROJECT.md`:
     - Lines 5-6 specify: "Next.js 14 App Router, React 18, Tailwind CSS, Plus Jakarta Sans (UI) + Times New Roman (canvas), Lucide React, Indigo `#6366F1` & Emerald `#10B981` palette."
     - Lines 53-71 specify Interface Contracts:
       - M1 ↔ M2: `editorToDocxModel` / `docxModelToEditor`
       - M1 ↔ M3: `extractDocumentSnapshot` / `evaluateDocumentRules` / `applyFormattingPatch`
       - M1 ↔ M4: `renderTemplateToEditor`
       - M1 ↔ M5: `generateAiDiff` / `applyAiDiffToSelection`

3. **Workspace Boundary**:
   - `e:\CODING\TVCI_word_addins` is the designated, fully authorized workspace root for project source code and assets.

---

## 2. Logic Chain

1. **Step 1 (Editor Framework)**:
   - Observation 2 mandates a rich text editor supporting custom paragraph attributes, tables, and AST serialization without Office.js runtime dependency.
   - Tiptap v2 (built on ProseMirror) supports declarative node schemas, extensible attributes, transaction dispatch, and bidirectional JSON serialization.
   - Therefore, Tiptap v2 meets all functional and architectural requirements for the web document editor.

2. **Step 2 (Paragraph Schema & Node Attributes)**:
   - Observation 1 establishes that Vietnamese administrative document checking (M3) and DOCX export (M2) evaluate paragraph-level properties: `fontFamily`, `fontSize`, `lineSpacing`, `spaceBefore`, `spaceAfter`, `firstLineIndentMm`, and `textAlign`.
   - Creating `AdministrativeParagraph` extending `@tiptap/extension-paragraph` with these exact attributes allows direct DOM rendering via inline styles and effortless conversion to `ParagraphSnapshot` objects.
   - Therefore, no impedance mismatch exists between the web canvas and the TVCI rule engine.

3. **Step 3 (A4 Physical Canvas & Print Output)**:
   - Observation 1 defines A4 margins: Top 20mm, Bottom 20mm, Left 30mm, Right 15mm.
   - CSS millimeters (`mm`) are natively supported by modern browsers and map to 96 DPI pixel equivalents (210mm = 793.7px, 297mm = 1122.5px).
   - Setting `width: 210mm; min-height: 297mm; padding: 20mm 15mm 20mm 30mm;` in a centered container with drop shadow replicates the physical paper layout.
   - Using `@page { size: A4 portrait; margin: 20mm 15mm 20mm 30mm; }` guarantees 1:1 fidelity when printing or exporting to PDF via the browser.

4. **Step 4 (Toolbar Design)**:
   - Administrative drafting requires frequent adjustments to line spacing, first line indent, and standard body formatting.
   - Providing dedicated dropdowns (1.0 to 1.5 line spacing, 0 to 12.7mm indent) and a one-click "Chuẩn Thân bài NĐ30" preset button minimizes repetitive user actions.
   - Reactive active state indicators (`editor.isActive(...)`) ensure immediate visual feedback.

---

## 3. Caveats

1. **Multi-page DOM Flow vs. Single Canvas**:
   ProseMirror operates on a single contiguous document DOM tree. Standard web editors simulate A4 canvas as a continuous paper column or single sheet. Dynamic DOM splitting across physical page divs in real-time editing introduces selection boundary complexities; browser print layout (`@page` and `break-inside: avoid`) handles physical page breaks seamlessly.
2. **Font Availability**:
   Times New Roman is standard on Windows and macOS. On Linux/Android environments without local Times New Roman, CSS fallback `Times, serif` or a bundled webfont (e.g., Tinos or Liberation Serif) should be included in `globals.css` if pixel-perfect Linux parity is required.

---

## 4. Conclusion

1. **Engine Architecture**: Tiptap v2 core with `AdministrativeParagraph` and `AdministrativeHeading` providing custom node attributes (`lineSpacing`, `spaceBefore`, `spaceAfter`, `firstLineIndentMm`, `fontFamily`, `fontSize`, `textAlign`).
2. **Canvas Specification**: 210mm x 297mm A4 sheet container with NĐ 30 padding (Top 20mm, Bottom 20mm, Left 30mm, Right 15mm) and print styles.
3. **Toolbar Component**: Modular toolbar featuring typography, styling, alignment, spacing selectors, and a one-click NĐ 30 standard body preset.
4. **Adapter Contracts**: Direct conversion between Tiptap JSON and `ParagraphSnapshot[]` for M3 format evaluation, and clean property mapping for M2 DOCX OpenXML serialization.
5. **Specification Delivery**: Full architecture, code specifications, CSS rules, and test plan written to `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_2\analysis.md`.

---

## 5. Verification Method

To independently verify this specification:

1. **Inspect Analysis Specification**:
   Read the complete specification file at:
   `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_2\analysis.md`
   Confirm all code snippets (`AdministrativeParagraph`, `A4Canvas`, `EditorToolbar`, `tiptap-adapter`) are syntactically valid TypeScript and meet NĐ 30 constraints.

2. **Verify NĐ 30 Rule Compatibility**:
   Compare the attribute defaults in `AdministrativeParagraph` against:
   `e:\CODING\TVCI_word_addins\src\rules\profiles.ts` (lines 13-22 and 31-38).
   Verify that `fontFamily === "Times New Roman"`, `fontSize === 13`, `lineSpacing === 1.2`, `spaceBefore === 2`, `spaceAfter === 2`, `firstLineIndentMm === 10`, and margins are 20mm / 20mm / 30mm / 15mm.

3. **Verify Adapter Contract Mapping**:
   Compare `tiptapDocToSnapshots` in `analysis.md` Section 6.2 with `ParagraphSnapshot` in `e:\CODING\TVCI_word_addins\src\rules\models.ts` (lines 47-62).
   Verify that every field required by `ParagraphSnapshot` is produced by the adapter.
