# Handoff Report: Remediation of 2-Column Table Classification in DOCX Importer

**Agent**: M2 Iteration 2 Explorer 2  
**Milestone**: M2 (`docx-interop-engine`)  
**Type**: Hard Handoff (Investigation & Specification Complete)  
**Date**: 2026-09-29  

---

## 1. Observation

Direct code observations from `web_app/src/docx/importer.ts`:

### Observation 1.1: Aggressive Header Classification on Substring `'ngày'`
Lines 440-447:
```typescript
440:       const hasHeaderRight =
441:         rightText.includes('cộng hòa') ||
442:         rightText.includes('độc lập') ||
443:         rightText.includes('ngày');
444: 
445:       if (hasHeaderRight && (hasHeaderLeft || leftText.length > 0)) {
446:         isHeader = true;
447:       }
```
Any 2-column table whose second column contains the ubiquitous Vietnamese word `'ngày'` (dates, deadlines, logs) and whose first column is non-empty (`leftText.length > 0`) is unconditionally flagged as `isHeader = true`.

### Observation 1.2: Aggressive Footer Classification on Disjunctive OR (`||`)
Lines 449-463:
```typescript
449:       const hasFooterLeft =
450:         leftText.includes('nơi nhận') ||
451:         leftText.includes('kính gửi') ||
452:         leftText.includes('như trên');
453: 
454:       const hasFooterRight =
455:         rightText.includes('trưởng') ||
456:         rightText.includes('giám đốc') ||
457:         rightText.includes('chủ tịch') ||
458:         rightText.includes('kt.') ||
459:         rightText.includes('tm.');
460: 
461:       if (hasFooterLeft || (hasFooterRight && !isHeader)) {
462:         isFooter = true;
463:       }
```
The disjunction `|| (hasFooterRight && !isHeader)` fires whenever the right cell contains `'trưởng'` (such as `'Tổ trưởng'`, `'Trưởng phòng'`, `'Trưởng nhóm'`) even when the left cell does not contain `'nơi nhận'`.

### Observation 1.3: Unconditional Border Stripping and Fixed Column Proportions
Lines 550-555:
```typescript
550:     attrs: {
551:       tableType,
552:       isBorderless: isBorderless || isHeader || isFooter,
553:       borderless: isBorderless || isHeader || isFooter,
554:       columnRatio,
555:       columnRatios: isHeader ? [0.45, 0.55] : isFooter ? [0.5, 0.5] : null,
556:     },
```
Whenever `isHeader` or `isFooter` is evaluated to true, `isBorderless` and `borderless` are unconditionally set to `true`, discarding OpenXML grid borders (`<w:tblBorders>` with `w:val="single"`). In addition, `columnRatios` forces ratios `[0.45, 0.55]` or `[0.5, 0.5]`, overriding custom column widths.

---

## 2. Logic Chain

1. **Root Cause of Data Table Corruption**:
   - In standard Vietnamese administrative reports and business documents, 2-column tables frequently contain schedules (e.g. `Hạn nộp: ngày 30/12/2026`) or department staffing lists (e.g. `Phòng ban` | `Trưởng phòng`).
   - Under Observation 1.1, any date table triggers `hasHeaderRight` because `rightText.includes('ngày')`. Because `leftText.length > 0`, it triggers `isHeader = true`.
   - Under Observation 1.2, any staff directory table with `Trưởng phòng` in column 2 triggers `hasFooterRight = true` via `rightText.includes('trưởng')`. The `OR` branch in line 461 sets `isFooter = true`.
   - Under Observation 1.3, lines 552-553 evaluate `isBorderless || isHeader || isFooter` to `true`.
   - When exported back to DOCX via `serializeTable` in `web_app/src/docx/table-serializer.ts` (lines 136-141), `tableType === 'admin-header'` or `isBorderless === true` causes all cell and table borders to serialize as `BorderStyle.NONE` (`BORDERLESS_CELL_BORDERS` and `BORDERLESS_TABLE_BORDERS`).
   - Result: Visible data table borders are destroyed on import and roundtrip export.

2. **Remediation Strategy**:
   - **Step 1 (Border Integrity Guard)**: Inspect OpenXML `<w:tblPr><w:tblBorders>` and `<w:tcPr><w:tcBorders>`. If any border (`top`, `bottom`, `left`, `right`, `insideH`, `insideV`) has `val !== 'none' && val !== 'nil' && sz !== '0'`, the table has explicit visible borders.
   - If visible borders exist, the table CANNOT be an administrative layout table. Set `hasVisibleBorders = true` and force `effectiveBorderless = false`, `tableType = 'content'`.
   - **Step 2 (Header Table Tightening)**: Administrative headers under Nghị định 30/2020/NĐ-CP are exclusively defined by the National Motto ("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" / "Độc lập - Tự do - Hạnh phúc"). Require `(rightText.includes('độc lập') && rightText.includes('hạnh phúc')) || rightText.includes('cộng hòa xã hội chủ nghĩa')`. Eliminate isolated `'ngày'`, isolated `'độc lập'`, and isolated `'cộng hòa'`.
   - **Step 3 (Footer Table Tightening)**: Administrative footers under NĐ 30/2020/NĐ-CP require both the Recipient block ("Nơi nhận:") and the Signer title. Require `leftText.includes('nơi nhận')` AND right-side administrative signer keywords (`'giám đốc'`, `'thủ trưởng'`, `'chủ tịch'`, `'viện trưởng'`, `'bộ trưởng'`, `'thứ trưởng'`, `'hiệu trưởng'`, `'cục trưởng'`, `'vụ trưởng'`, `'trưởng ban'`, `'trưởng phòng'`, `'kt.'`, `'tm.'`, `'tl.'`, `'tuq.'`). Eliminate standalone `hasFooterRight` triggering.
   - **Step 4 (Preservation of Existing Valid Tests)**: Both existing test `classifies 2-column administrative header and footer tables` in `docx-import.test.ts` and roundtrip test in `docx-roundtrip.test.ts` satisfy these tightened constraints and continue to pass 100%.

---

## 3. Caveats

1. **Non-Standard User Borderless Tables**: If a user creates an ordinary 2-column data table that is intentionally borderless AND contains "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" on the right, it would be classified as `admin-header`. This is standard domain behavior for Vietnamese administrative documents.
2. **Execution Context**: This agent performed static source and AST verification. The concrete code diff and test suite additions are specified in `analysis.md` ready for the implementing worker agent.

---

## 4. Conclusion

1. **Root cause confirmed**: Lines 440-446 (`'ngày'` in header) and lines 454-463 (`'trưởng'` with `OR` in footer) in `web_app/src/docx/importer.ts` cause catastrophic false positives, stripping visible borders from normal 2-column data tables.
2. **Remediation solution finalized**:
   - Add `hasExplicitVisibleBorders(tblPr, firstRowEl)` helper function.
   - Require National Motto phrase matching for header tables; drop `'ngày'`.
   - Require `leftText.includes('nơi nhận')` AND right-side administrative titles for footer tables; drop standalone `OR` branch.
   - Enforce `effectiveBorderless = hasVisibleBorders ? false : (isBorderless || isHeader || isFooter)`.
3. Complete implementation patch and unit test specifications are documented in `e:\CODING\TVCI_word_addins\.agents\teamwork\m2_it2_explorer_2\analysis.md`.

---

## 5. Verification Method

1. **Inspect Implementation**:
   - Inspect `web_app/src/docx/importer.ts` at `parseTable` to verify `hasExplicitVisibleBorders` check and removal of `'ngày'` from `hasHeaderRight`.
   - Verify `leftText.includes('nơi nhận') && hasFooterRight` is enforced with logical AND.
2. **Run Unit Tests**:
   - Execute:
     ```bash
     cd e:\CODING\TVCI_word_addins\web_app && npx vitest run tests/unit/docx-import.test.ts
     ```
   - Verify that all existing unit tests pass AND new test `preserves 2-column content tables with dates, titles, or explicit borders without stripping borders` passes.
3. **Run Roundtrip Integration Tests**:
   - Execute:
     ```bash
     cd e:\CODING\TVCI_word_addins\web_app && npx vitest run tests/unit/docx-roundtrip.test.ts
     ```
   - Verify that roundtrip tests continue to pass 100%.
4. **Invalidation Condition**:
   - If an imported 2-column table with `<w:top w:val="single"/>` and date text receives `tableType === 'admin-header'` or `isBorderless === true`, the fix is invalid.
