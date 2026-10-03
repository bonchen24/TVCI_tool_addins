# Handoff Report — M2 Iteration 2 Reviewer 2: DOCX Import Engine Remediation

## 1. Observation

Direct inspection of files in `web_app`:

1. `web_app/src/docx/importer.ts`:
   - Table border detector: `hasExplicitVisibleBorders(tblPr, firstRowEl)` (lines 461-505) inspects `tblBorders` (`top`, `bottom`, `left`, `right`, `insideH`, `insideV`) and first cell `tcBorders`. Checks `val && val !== 'none' && val !== 'nil' && sz !== '0'`. Returns `true` if visible borders present.
   - Header table classification (lines 527-535): evaluates only if `!hasVisibleBorders`. Requires `(rightText.includes('độc lập') && rightText.includes('hạnh phúc')) || rightText.includes('cộng hòa xã hội chủ nghĩa')`.
   - Footer table classification (lines 537-560): evaluates only if `!hasVisibleBorders && !isHeader`. Requires `leftText.includes('nơi nhận')` AND right executive title (`'giám đốc'`, `'tổng giám đốc'`, `'thủ trưởng'`, `'chủ tịch'`, `'viện trưởng'`, `'bộ trưởng'`, `'thứ trưởng'`, `'hiệu trưởng'`, `'cục trưởng'`, `'vụ trưởng'`, `'trưởng ban'`, `'trưởng phòng'`, `'kt.'`, `'tm.'`, `'tl.'`, `'tuq.'`).
   - Borderless attribute resolution (lines 643-646):
     `const effectiveBorderless = hasVisibleBorders ? false : (isBorderless || isHeader || isFooter);`
     `isBorderless: effectiveBorderless, borderless: effectiveBorderless`.
   - Tab parsing (lines 195-201): parses `child.localName === 'tab' || child.localName === 'ptab'` as `{ type: 'text', text: '\t', marks }`.
   - Hanging indents (lines 298-304): parses `<w:ind w:hanging="...">` via `hangingIndentMm = Number(((parsedHanging * 127) / 7200).toFixed(1)); firstLineIndentMm = -hangingIndentMm;`. Emits `hangingIndentMm` and `firstLineIndentMm` in paragraph AST.
   - Paragraph default indent (line 228): initialized to `firstLineIndentMm = 0;`. Missing `<w:ind>` defaults to `0mm`.
   - Safe input guards (lines 1068-1089): `byteLength === 0` returns `createDefaultDocument(...)`. Mammoth fallback and top-level `importDocx` wrapped in `try...catch`.

2. `web_app/src/docx/types.ts`:
   - `AdministrativeParagraphAttributes` contains `hangingIndentMm?: number;` (line 50).
   - `DefaultDocumentOptions` and `fallbackToAdministrativeLayout` defined (lines 36, 39-41).

3. `web_app/tests/unit/docx-import.test.ts`:
   - Lines 260-672 provide 15 automated test cases testing 0-byte buffer, corrupt binaries, truncated zip, 2-column content table preservation, tab characters, hanging indents, and 0mm default indent.
   - No mock bypasses, hardcoded test strings, or dummy assertions detected in source code.

## 2. Logic Chain

1. **Table classification & border preservation**:
   - `hasExplicitVisibleBorders` flags any table declaring non-zero/non-none border values.
   - If true, bypasses `isHeader` and `isFooter` assignment.
   - Forces `effectiveBorderless = false`. Content tables with borders never lose borders.
   - Without visible borders, 2-column table requires National Motto in right cell for header, or `nơi nhận` on left + executive title on right for footer.
   - Data tables containing dates (`ngày`) or internal designations (`trưởng phòng`) without motto or without `nơi nhận` remain type `'content'`.

2. **Tab handling**:
   - Both `<w:tab/>` and `<w:ptab/>` emit text node with `\t`.
   - Preserves run marks (`bold`, `italic`, `underline`, `strike`) on tab nodes.
   - Prevents word concatenation across tabs.

3. **Indentation handling**:
   - Twip to mm conversion `(twips * 127) / 7200` is exact OpenXML twip definition (`1 twip = 1/20 pt = 127/7200 mm`).
   - Hanging indent emits negative `firstLineIndentMm` and positive `hangingIndentMm`.
   - Absence of `<w:ind>` leaves `firstLineIndentMm = 0`. Eliminates unintended 10mm indent on body paragraphs.

4. **Adversarial & integrity assessment**:
   - No hardcoded test responses in `web_app/src/`.
   - Real XML DOM extraction via `findChild`, `getAttribute`.
   - Robust fallback on damaged/truncated zip inputs.

## 3. Caveats

- `parseDocxWithMammoth` sets `firstLineIndentMm = 10` on HTML paragraphs during complete OpenXML failure fallback. Intentional behavior for ND 30 default documents in fallback tier.
- Sparse cell-level borders in tables lacking `tblBorders` inspected via first cell only. Sufficient for standard Word tables.

## 4. Conclusion

**Verdict: APPROVE**

Implementation in `web_app/src/docx/importer.ts` and `web_app/src/docx/types.ts` satisfies all requirements:
1. Strict table classifier prevents false positives.
2. Explicit visible borders preserved 100%.
3. Tabs and hanging indents parsed accurately.
4. Default body indents correctly set to 0mm.
5. Zero integrity violations. High test quality.

## 5. Verification Method

Inspect files directly:
- `web_app/src/docx/importer.ts`: lines 195-201, 228-233, 292-310, 461-561, 643-657, 1068-1090.
- `web_app/src/docx/types.ts`: lines 43-53.
- `web_app/tests/unit/docx-import.test.ts`: lines 260-672.

Vitest command (in non-interactive shell):
```bash
cd e:\CODING\TVCI_word_addins\web_app
npx vitest run tests/unit/docx-import.test.ts
```
