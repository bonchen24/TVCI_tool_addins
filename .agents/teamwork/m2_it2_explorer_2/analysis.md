# Analysis: 2-Column Table Classification Remediation in DOCX Importer

## 1. Problem Statement & Root Cause

In `web_app/src/docx/importer.ts`, table classification heuristics inside `parseTable` (lines 420-465 and lines 550-555) suffer from aggressive false positives that incorrectly transform ordinary 2-column data tables into administrative header/footer tables:

### Code In `importer.ts` (Lines 428-465)
```typescript
428:     const firstRowCells = findChildren(rowEls[0], 'tc');
429:     if (firstRowCells.length === 2) {
430:       const leftText = (firstRowCells[0].textContent || '').toLowerCase();
431:       const rightText = (firstRowCells[1].textContent || '').toLowerCase();
432: 
433:       const hasHeaderLeft =
434:         leftText.includes('số:') ||
435:         leftText.includes('viện') ||
436:         leftText.includes('bộ') ||
437:         leftText.includes('tập đoàn') ||
438:         leftText.includes('công ty');
439: 
440:       const hasHeaderRight =
441:         rightText.includes('cộng hòa') ||
442:         rightText.includes('độc lập') ||
443:         rightText.includes('ngày');
444: 
445:       if (hasHeaderRight && (hasHeaderLeft || leftText.length > 0)) {
446:         isHeader = true;
447:       }
448: 
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
464:     }
```

### Table Return In `importer.ts` (Lines 550-555)
```typescript
550:     attrs: {
551:       tableType,
552:       isBorderless: isBorderless || isHeader || isFooter,
553:       borderless: isBorderless || isHeader || isFooter,
554:       columnRatio,
555:       columnRatios: isHeader ? [0.45, 0.55] : isFooter ? [0.5, 0.5] : null,
556:     },
```

### Flaws Breakdown:
1. **Aggressive Header Trigger (`hasHeaderRight` on `'ngày'`)**:
   `hasHeaderRight` matches any right cell containing substring `'ngày'`.
   Condition line 445: `(hasHeaderLeft || leftText.length > 0)` is unconditionally true for any non-empty first column.
   Result: ANY 2-column table with text on left and a date/day on right (e.g. delivery schedule, event log, payment milestones) is misclassified as `admin-header`.
2. **Aggressive Header Trigger (`'độc lập'` and `'cộng hòa'` isolated matching)**:
   Isolated substring `'độc lập'` matches "Báo cáo kiểm toán độc lập".
   Isolated substring `'cộng hòa'` matches "Đường Cộng Hòa" or "Công ty TNHH Cộng Hòa".
3. **Aggressive Footer Trigger (`hasFooterRight` with logical OR `||`)**:
   Condition line 461: `if (hasFooterLeft || (hasFooterRight && !isHeader))` uses logical `OR`.
   Even without `'nơi nhận'` in the left column, ANY right cell containing `'trưởng'` (e.g. `'Tổ trưởng'`, `'Trưởng phòng'`, `'Trưởng nhóm'`) or `'giám đốc'` triggers `isFooter = true`.
   Result: 2-column personnel matrices, organizational charts, or approval tables are misclassified as `admin-footer`.
4. **Unconditional Border Stripping (Lines 552-553)**:
   `isBorderless: isBorderless || isHeader || isFooter` unconditionally overrides table border attributes to `true` whenever `isHeader` or `isFooter` is set, completely stripping visible borders from OpenXML tables (`w:top`, `w:bottom`, `w:left`, `w:right`, `w:insideH`, `w:insideV`).
5. **Forced Column Proportions (Lines 554-555)**:
   Forces ratio `[0.45, 0.55]` or `[0.5, 0.5]` instead of respecting actual column widths or user data layout.

---

## 2. Remediation Design Specifications

### Specification 1: Explicit Visible Border Detector (`hasExplicitVisibleBorders`)
Create a helper function to inspect `tblPr` and cell properties for explicit visible borders (`val !== 'none' && val !== 'nil' && sz !== '0'`). If explicit visible borders exist, the table MUST NOT be classified as administrative header/footer and MUST NOT have its borders stripped.

```typescript
function hasExplicitVisibleBorders(
  tblPr: Element | null,
  firstRowEl?: Element | null
): boolean {
  if (tblPr) {
    const tblBorders = findChild(tblPr, 'tblBorders');
    if (tblBorders) {
      const borderNames = ['top', 'bottom', 'left', 'right', 'insideH', 'insideV'];
      for (let i = 0; i < tblBorders.children.length; i++) {
        const border = tblBorders.children[i];
        if (borderNames.includes(border.localName)) {
          const val = getAttribute(border, 'val');
          const sz = getAttribute(border, 'sz');
          if (val && val !== 'none' && val !== 'nil' && sz !== '0') {
            return true;
          }
        }
      }
    }
  }

  // Also check first cell tcBorders if present
  if (firstRowEl) {
    const firstCell = findChild(firstRowEl, 'tc');
    if (firstCell) {
      const tcPr = findChild(firstCell, 'tcPr');
      const tcBorders = tcPr ? findChild(tcPr, 'tcBorders') : null;
      if (tcBorders) {
        const borderNames = ['top', 'bottom', 'left', 'right'];
        for (let i = 0; i < tcBorders.children.length; i++) {
          const border = tcBorders.children[i];
          if (borderNames.includes(border.localName)) {
            const val = getAttribute(border, 'val');
            const sz = getAttribute(border, 'sz');
            if (val && val !== 'none' && val !== 'nil' && sz !== '0') {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}
```

### Specification 2: Strict National Motto Heuristics for Header Tables
Header table classification MUST strictly require National Motto keywords and absence of explicit visible borders:
- Condition: `!hasVisibleBorders && ((rightText.includes('độc lập') && rightText.includes('hạnh phúc')) || rightText.includes('cộng hòa xã hội chủ nghĩa'))`
- Do NOT treat `'ngày'` alone as a header trigger.
- Do NOT treat `'độc lập'` without `'hạnh phúc'` as a header trigger.
- Do NOT treat `'cộng hòa'` without `'xã hội chủ nghĩa'` as a header trigger.

### Specification 3: Strict Recipient + Signer Title Heuristics for Footer Tables
Footer table classification MUST require:
- Absence of explicit visible borders: `!hasVisibleBorders`
- Must not already be header: `!isHeader`
- Left column MUST contain `'nơi nhận'`: `hasFooterLeft = leftText.includes('nơi nhận')`
- Right column MUST contain an administrative signer title:
  Keywords: `'giám đốc'`, `'tổng giám đốc'`, `'thủ trưởng'`, `'chủ tịch'`, `'viện trưởng'`, `'bộ trưởng'`, `'thứ trưởng'`, `'hiệu trưởng'`, `'cục trưởng'`, `'vụ trưởng'`, `'trưởng ban'`, `'trưởng phòng'`, `'kt.'`, `'tm.'`, `'tl.'`, `'tuq.'`
- Logical `AND`: `hasFooterLeft && hasFooterRight` (NO standalone `hasFooterRight` triggering).

### Specification 4: Immutable Visible Border Preservation
In the return statement of `parseTable`:
```typescript
  const effectiveBorderless = hasVisibleBorders
    ? false
    : (isBorderless || isHeader || isFooter);

  return {
    type: 'table',
    attrs: {
      tableType,
      isBorderless: effectiveBorderless,
      borderless: effectiveBorderless,
      columnRatio,
      columnRatios: isHeader ? [0.45, 0.55] : isFooter ? [0.5, 0.5] : null,
    },
    content: rowsContent,
  };
```

---

## 3. Concrete Code Diff for `web_app/src/docx/importer.ts`

```diff
--- a/web_app/src/docx/importer.ts
+++ b/web_app/src/docx/importer.ts
@@ -412,6 +412,47 @@ function isTableBorderless(tblPr: Element | null): boolean {
   });
 }
 
+function hasExplicitVisibleBorders(
+  tblPr: Element | null,
+  firstRowEl?: Element | null
+): boolean {
+  if (tblPr) {
+    const tblBorders = findChild(tblPr, 'tblBorders');
+    if (tblBorders) {
+      const borderNames = ['top', 'bottom', 'left', 'right', 'insideH', 'insideV'];
+      for (let i = 0; i < tblBorders.children.length; i++) {
+        const border = tblBorders.children[i];
+        if (borderNames.includes(border.localName)) {
+          const val = getAttribute(border, 'val');
+          const sz = getAttribute(border, 'sz');
+          if (val && val !== 'none' && val !== 'nil' && sz !== '0') {
+            return true;
+          }
+        }
+      }
+    }
+  }
+
+  if (firstRowEl) {
+    const firstCell = findChild(firstRowEl, 'tc');
+    if (firstCell) {
+      const tcPr = findChild(firstCell, 'tcPr');
+      const tcBorders = tcPr ? findChild(tcPr, 'tcBorders') : null;
+      if (tcBorders) {
+        const borderNames = ['top', 'bottom', 'left', 'right'];
+        for (let i = 0; i < tcBorders.children.length; i++) {
+          const border = tcBorders.children[i];
+          if (borderNames.includes(border.localName)) {
+            const val = getAttribute(border, 'val');
+            const sz = getAttribute(border, 'sz');
+            if (val && val !== 'none' && val !== 'nil' && sz !== '0') {
+              return true;
+            }
+          }
+        }
+      }
+    }
+  }
+
+  return false;
+}
+
 function parseTable(tblEl: Element): JSONContent {
   const tblPr = findChild(tblEl, 'tblPr');
   const tblGrid = findChild(tblEl, 'tblGrid');
@@ -420,47 +461,54 @@ function parseTable(tblEl: Element): JSONContent {
   const rowEls = findChildren(tblEl, 'tr');
   const isBorderless = isTableBorderless(tblPr);
+  const hasVisibleBorders = hasExplicitVisibleBorders(tblPr, rowEls[0]);
 
   // Extract cell texts to classify administrative tables
   let isHeader = false;
   let isFooter = false;
 
-  if (rowEls.length > 0) {
+  if (!hasVisibleBorders && rowEls.length > 0) {
     const firstRowCells = findChildren(rowEls[0], 'tc');
     if (firstRowCells.length === 2) {
-      const leftText = (firstRowCells[0].textContent || '').toLowerCase();
-      const rightText = (firstRowCells[1].textContent || '').toLowerCase();
-
-      const hasHeaderLeft =
-        leftText.includes('số:') ||
-        leftText.includes('viện') ||
-        leftText.includes('bộ') ||
-        leftText.includes('tập đoàn') ||
-        leftText.includes('công ty');
-
+      const leftText = (firstRowCells[0].textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
+      const rightText = (firstRowCells[1].textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
+
+      // Strictly require National Motto keywords
       const hasHeaderRight =
-        rightText.includes('cộng hòa') ||
-        rightText.includes('độc lập') ||
-        rightText.includes('ngày');
+        (rightText.includes('độc lập') && rightText.includes('hạnh phúc')) ||
+        rightText.includes('cộng hòa xã hội chủ nghĩa');
 
-      if (hasHeaderRight && (hasHeaderLeft || leftText.length > 0)) {
+      if (hasHeaderRight) {
         isHeader = true;
       }
 
-      const hasFooterLeft =
-        leftText.includes('nơi nhận') ||
-        leftText.includes('kính gửi') ||
-        leftText.includes('như trên');
+      // Strictly require 'nơi nhận' on left AND administrative title keyword on right
+      const hasFooterLeft = leftText.includes('nơi nhận');
 
       const hasFooterRight =
-        rightText.includes('trưởng') ||
         rightText.includes('giám đốc') ||
+        rightText.includes('tổng giám đốc') ||
+        rightText.includes('thủ trưởng') ||
         rightText.includes('chủ tịch') ||
+        rightText.includes('viện trưởng') ||
+        rightText.includes('bộ trưởng') ||
+        rightText.includes('thứ trưởng') ||
+        rightText.includes('hiệu trưởng') ||
+        rightText.includes('cục trưởng') ||
+        rightText.includes('vụ trưởng') ||
+        rightText.includes('trưởng ban') ||
+        rightText.includes('trưởng phòng') ||
         rightText.includes('kt.') ||
-        rightText.includes('tm.');
+        rightText.includes('tm.') ||
+        rightText.includes('tl.') ||
+        rightText.includes('tuq.');
 
-      if (hasFooterLeft || (hasFooterRight && !isHeader)) {
+      if (!isHeader && hasFooterLeft && hasFooterRight) {
         isFooter = true;
       }
     }
   }
@@ -547,10 +595,14 @@ function parseTable(tblEl: Element): JSONContent {
     }
   });
 
+  const effectiveBorderless = hasVisibleBorders
+    ? false
+    : (isBorderless || isHeader || isFooter);
+
   return {
     type: 'table',
     attrs: {
       tableType,
-      isBorderless: isBorderless || isHeader || isFooter,
-      borderless: isBorderless || isHeader || isFooter,
+      isBorderless: effectiveBorderless,
+      borderless: effectiveBorderless,
       columnRatio,
       columnRatios: isHeader ? [0.45, 0.55] : isFooter ? [0.5, 0.5] : null,
     },
     content: rowsContent,
   };
```

---

## 4. Test Specifications for `web_app/tests/unit/docx-import.test.ts`

Add test suite verifying:
1. 2-column schedule table containing `'ngày'` with explicit visible borders retains `tableType: 'content'`, `isBorderless: false`, and `columnRatio: 'custom'`.
2. 2-column staff directory containing `'trưởng phòng'` with explicit visible borders retains `tableType: 'content'`, `isBorderless: false`, and `columnRatio: 'custom'`.
3. 2-column data table without `<w:tblBorders>` (default grid) containing dates retains `tableType: 'content'` and `isBorderless: false`.
4. 2-column table containing `'độc lập'` without `'hạnh phúc'` retains `tableType: 'content'` and `isBorderless: false`.
5. Legitimate administrative header and footer tables are still correctly recognized and classified as `admin-header` (`40-60`, `borderless: true`) and `admin-footer` (`50-50`, `borderless: true`).

```typescript
    it('preserves 2-column content tables with dates, titles, or explicit borders without stripping borders', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <!-- Table 1: 2-column schedule table containing 'ngày' with explicit borders -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Hạng mục tiến độ</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Thời hạn nộp ngày 30/12/2026</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>

          <!-- Table 2: 2-column staff list containing 'trưởng phòng' with explicit borders -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4"/>
                <w:left w:val="single" w:sz="4"/>
                <w:bottom w:val="single" w:sz="4"/>
                <w:right w:val="single" w:sz="4"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Phòng Ban</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Trưởng phòng kỹ thuật</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>

          <!-- Table 3: 2-column data table without tblBorders tag (default grid) containing dates -->
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Sản phẩm đợt 1</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Ngày bàn giao: 15/10/2026</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>

          <!-- Table 4: 2-column data table with 'độc lập' not part of National Motto -->
          <w:tbl>
            <w:tblPr>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4"/>
                <w:left w:val="single" w:sz="4"/>
                <w:bottom w:val="single" w:sz="4"/>
                <w:right w:val="single" w:sz="4"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>Loại hình đơn vị</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>Công ty kiểm toán độc lập</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(4);

      // Table 1: Schedule with 'ngày' and visible borders
      const scheduleTable = json.content![0];
      expect(scheduleTable.type).toBe('table');
      expect(scheduleTable.attrs?.tableType).toBe('content');
      expect(scheduleTable.attrs?.isBorderless).toBe(false);
      expect(scheduleTable.attrs?.borderless).toBe(false);
      expect(scheduleTable.attrs?.columnRatio).toBe('custom');

      // Table 2: Staff with 'trưởng phòng' and visible borders
      const staffTable = json.content![1];
      expect(staffTable.type).toBe('table');
      expect(staffTable.attrs?.tableType).toBe('content');
      expect(staffTable.attrs?.isBorderless).toBe(false);
      expect(staffTable.attrs?.borderless).toBe(false);
      expect(staffTable.attrs?.columnRatio).toBe('custom');

      // Table 3: Data table without explicit tblBorders
      const defaultTable = json.content![2];
      expect(defaultTable.type).toBe('table');
      expect(defaultTable.attrs?.tableType).toBe('content');
      expect(defaultTable.attrs?.isBorderless).toBe(false);
      expect(defaultTable.attrs?.borderless).toBe(false);
      expect(defaultTable.attrs?.columnRatio).toBe('custom');

      // Table 4: Independent audit table ('độc lập' without 'hạnh phúc')
      const auditTable = json.content![3];
      expect(auditTable.type).toBe('table');
      expect(auditTable.attrs?.tableType).toBe('content');
      expect(auditTable.attrs?.isBorderless).toBe(false);
      expect(auditTable.attrs?.borderless).toBe(false);
    });
```
