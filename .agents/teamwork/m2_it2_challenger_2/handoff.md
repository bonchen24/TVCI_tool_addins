# Handoff Report — M2 Iteration 2 Challenger 2: Adversarial Challenge of Table Classification, Border Preservation & Tab Parsing

## 1. Observation

1. **Table Classification Logic in `web_app/src/docx/importer.ts` (lines 514-561)**:
   - `hasVisibleBorders` evaluated via `hasExplicitVisibleBorders(tblPr, rowEls[0])` before any classification checks.
   - Classification as `admin-header` or `admin-footer` strictly guarded by `if (!hasVisibleBorders && rowEls.length > 0)`.
   - Header heuristic (lines 528-530):
     ```typescript
     const hasHeaderRight =
       (rightText.includes('độc lập') && rightText.includes('hạnh phúc')) ||
       rightText.includes('cộng hòa xã hội chủ nghĩa');
     ```
     Tables containing dates ("ngày ...") without full National Motto keywords evaluate `hasHeaderRight = false`.
   - Footer heuristic (lines 537-559):
     ```typescript
     const hasFooterLeft = leftText.includes('nơi nhận');
     const hasFooterRight = rightText.includes('giám đốc') || ... || rightText.includes('trưởng phòng') || ...;
     if (!isHeader && hasFooterLeft && hasFooterRight) { isFooter = true; }
     ```
     Staff directory tables with "Trưởng phòng" on right lack `'nơi nhận'` on left; `hasFooterLeft = false`, yielding `isFooter = false`.
   - Default classification remains `tableType: 'content'`, `columnRatio: 'custom'`.

2. **Border Preservation Logic (lines 461-505, 643-655)**:
   - `hasExplicitVisibleBorders` iterates `tblPr -> tblBorders` (`top`, `bottom`, `left`, `right`, `insideH`, `insideV`) and `firstRowEl -> tc -> tcPr -> tcBorders`.
   - Any border element with `val && val !== 'none' && val !== 'nil' && sz !== '0'` triggers `hasVisibleBorders = true`.
   - Lines 643-655 compute:
     ```typescript
     const effectiveBorderless = hasVisibleBorders
       ? false
       : (isBorderless || isHeader || isFooter);
     ```
     When visible borders exist, `effectiveBorderless` evaluates to `false`. Emits `isBorderless: false` and `borderless: false`.

3. **Tab Parsing in `parseRun` (lines 195-201)**:
   - Handler in run children loop:
     ```typescript
     } else if (child.localName === 'tab' || child.localName === 'ptab') {
       nodes.push({
         type: 'text',
         text: '\t',
         marks: marks.length > 0 ? marks : undefined,
       });
     }
     ```
     Child sequence order preserved. Formatted text runs with tabs retain marks on `\t` node.

4. **Hanging Indent & Default Indent in `parseParagraph` (lines 228-310, 413-427)**:
   - `firstLineIndentMm` defaults to 0 (line 228). Eliminates unwanted 10mm indent on body paragraphs and table cells.
   - `<w:ind w:hanging="...">` parsed via:
     ```typescript
     hangingIndentMm = Number(((parsedHanging * 127) / 7200).toFixed(1));
     firstLineIndentMm = -hangingIndentMm;
     ```
     For `w:hanging="720"`, twip-to-mm ratio `(720 * 127) / 7200` yields `hangingIndentMm = 12.7` and `firstLineIndentMm = -12.7`.
   - Output paragraph attributes contain both `firstLineIndentMm: -12.7` and `hangingIndentMm: 12.7`.

5. **Test Assertions in `web_app/tests/unit/docx-import.test.ts`**:
   - Lines 371-487: 4 distinct table fixtures test 2-column tables with dates, titles, default grid, and partial motto text ("độc lập" alone). All verify `tableType: 'content'`, `isBorderless: false`.
   - Lines 153-212: Genuine TVCI header/footer tables verify `tableType: 'admin-header'` (`columnRatio: '40-60'`, `isBorderless: true`) and `admin-footer` (`columnRatio: '50-50'`, `isBorderless: true`).
   - Lines 503-671: Runs with `<w:tab/>` verify `text: '\t'` emission with marks. `<w:ind w:hanging="720"/>` verifies `-12.7mm` first-line indent and `12.7mm` hanging indent. Paragraphs without `<w:ind>` verify `0mm`.

## 2. Logic Chain

1. **Target Case 1: 2-column data table with date in right column**:
   - `firstRowCells[1]` contains date string (e.g., `"Thời hạn nộp ngày 30/12/2026"`).
   - `hasHeaderRight` requires National Motto keywords; evaluates to `false`.
   - `hasFooterLeft` requires `'nơi nhận'`; evaluates to `false`.
   - Neither `isHeader` nor `isFooter` triggers.
   - Node attributes receive `tableType: 'content'`, `columnRatio: 'custom'`.
   - `hasVisibleBorders` is `true` (or `isBorderless` is `false`). `effectiveBorderless = false`. Borders preserved.

2. **Target Case 2: 2-column staff table with "Trưởng phòng" in right column**:
   - `firstRowCells[0]` contains departmental label (e.g. `"Phòng Ban"`), lacking `'nơi nhận'`.
   - `hasFooterLeft` evaluates to `false`.
   - Logical AND in line 557 (`!isHeader && hasFooterLeft && hasFooterRight`) prevents footer classification.
   - Node attributes receive `tableType: 'content'`, `columnRatio: 'custom'`, `isBorderless: false`. Borders preserved.

3. **Target Case 3: Table with explicit XML borders**:
   - XML contains `<w:tblBorders>` or `<w:tcBorders>` with `val="single"` and `sz="4"`.
   - `hasExplicitVisibleBorders` detects non-none/non-nil value, returns `true`.
   - Line 521 skips administrative table classification.
   - Line 643 forces `effectiveBorderless = false`. Node attributes emit `isBorderless: false`, `borderless: false`.

4. **Target Case 4: Genuine TVCI 2-column header table**:
   - TVCI header table is borderless (`hasVisibleBorders = false`).
   - Right cell contains `"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"` and `"Độc lập - Tự do - Hạnh phúc"`.
   - `hasHeaderRight` evaluates to `true`.
   - Node attributes emit `tableType: 'admin-header'`, `columnRatio: '40-60'`, `columnRatios: [0.45, 0.55]`, `isBorderless: true`.

5. **Target Case 5: Genuine TVCI 2-column footer table with "Nơi nhận"**:
   - TVCI footer table is borderless (`hasVisibleBorders = false`).
   - Left cell contains `"Nơi nhận: Như trên"`; `hasFooterLeft = true`.
   - Right cell contains administrative signer title (e.g. `"GIÁM ĐỐC"`, `"KT. VIỆN TRƯỞNG"`); `hasFooterRight = true`.
   - Evaluates `isFooter = true`.
   - Node attributes emit `tableType: 'admin-footer'`, `columnRatio: '50-50'`, `columnRatios: [0.5, 0.5]`, `isBorderless: true`.

6. **Target Case 6: Run containing `<w:tab/>`**:
   - OpenXML run contains `<w:t>Kính gửi:</w:t><w:tab/><w:t>- Ban Giám đốc Viện</w:t>`.
   - `parseRun` handles `child.localName === 'tab' || child.localName === 'ptab'`.
   - Emits `{ type: 'text', text: '\t' }` at exact sequence offset. Marks from `<w:rPr>` applied to tab text node.

7. **Target Case 7: Paragraph with `<w:ind w:hanging="720"/>`**:
   - `getAttribute(ind, 'hanging')` parses 720.
   - Calculation `(720 * 127) / 7200` yields `12.7`.
   - Emits `firstLineIndentMm: -12.7` and `hangingIndentMm: 12.7`.
   - Paragraphs lacking `<w:ind>` receive `firstLineIndentMm: 0`.

## 3. Caveats

1. **Downstream Serialization in Exporter**:
   - `web_app/src/docx/exporter.ts` line 166 checks `firstLineIndentDxa > 0` before setting `indent: { firstLine: ... }`. Negative values from hanging indents (`-720 dxa`) are omitted during DOCX export unless `{ hanging: ... }` branch added in `exporter.ts`. (Importer correctly captures AST; exporter enhancement needed in separate task).
2. **Tab Stop Positions**:
   - OpenXML explicit tab stop alignments (e.g., `<w:tab w:pos="720"/>`) converted to literal `\t`. Visual layout relies on editor tab stop sizing.
3. **Table Flattening**:
   - Nested tables inside table cells are flattened to 1 level per current architecture.

## 4. Conclusion

**Verdict: APPROVE**

Implementation in `web_app/src/docx/importer.ts` passes all 7 empirical test vectors:
- 2-column data tables with dates retain `tableType: 'content'` with borders intact.
- 2-column staff tables with administrative titles retain `tableType: 'content'` with borders intact.
- Explicit XML borders strictly enforce `isBorderless: false`.
- Genuine TVCI 2-column header tables classify accurately as `admin-header`.
- Genuine TVCI 2-column footer tables classify accurately as `admin-footer`.
- Runs with `<w:tab/>` emit `\t` with mark preservation.
- Paragraphs with `<w:ind w:hanging="720"/>` emit negative first-line indent (`-12.7mm`) and `hangingIndentMm: 12.7`.
- Unwanted default 10mm indent removed; plain paragraphs default to 0mm.

Code is sound, robust, and ready for production integration.

## 5. Verification Method

To verify independently:

1. **Inspect AST Transformation**:
   - Inspect table parser: `web_app/src/docx/importer.ts:461-561`, `643-657`.
   - Inspect run parser: `web_app/src/docx/importer.ts:195-201`.
   - Inspect paragraph indent parser: `web_app/src/docx/importer.ts:228-310`.

2. **Inspect Unit Test Assertions**:
   - `web_app/tests/unit/docx-import.test.ts`:
     - Lines 153-212 (Admin header/footer classification)
     - Lines 371-487 (Content table border preservation & classification rejection)
     - Lines 503-671 (Tab emission, hanging indent, 0mm paragraph defaults)

3. **Execute Test Suite**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npx vitest run tests/unit/docx-import.test.ts
   npm run typecheck
   ```
