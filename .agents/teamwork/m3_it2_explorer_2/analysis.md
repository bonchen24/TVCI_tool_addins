# Milestone 3 Analysis: Title Case Handling & Regex Robustness

**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Explorer**: M3 Iteration 2 Explorer 2 (`m3_it2_explorer_2`)  
**Target Files**:
- `web_app/src/rules/component-classifier.ts`
- `web_app/src/rules/component-validator.ts`
- `web_app/src/rules/document-evaluator.ts`
- `web_app/src/rules/legal-basis-validator.ts`
- `web_app/tests/unit/format-engine.test.ts`

---

## 1. Executive Summary

Adversarial testing from Challenger 1 (`m3_challenger_1_r2/handoff.md`) revealed critical classification barriers in `component-classifier.ts`:
1. **Signer Role Title Case Lockout**: `isSignerRole` strictly gates matching behind `isUppercaseVietnamese(text)`. Common Title Case inputs (e.g. `Giám đốc`, `Phó Giám đốc`, `Chủ tịch`) fail recognition.
2. **Agency Name Title Case Lockout**: `AGENCY_NAME` classification in administrative documents requires `isUppercaseVietnamese(text)`. Mixed-case agency names (e.g. `Trung tâm Thử nghiệm - Kiểm định Công nghiệp`, `Bộ Công Thương`) are rejected.
3. **Cascading False Failures**: Unclassified signer roles and agency names are declared `MISSING` (non-fixable) and fall through into `bodyParagraphs`, triggering spurious body alignment (`Justified` required vs `Centered` actual) and first-line indent (`10-12.7mm` required vs `0mm` actual) errors.
4. **Legal Basis Colon Rejection**: The regex `^CĂN CỨ(?:\s|$)` in `component-classifier.ts` and `legal-basis-validator.ts` rejects common administrative patterns with colons such as `Căn cứ: Luật Doanh nghiệp...`.

This document specifies the exact code modifications and unit test cases to eliminate these failure modes cleanly without regressions.

---

## 2. Root Cause Analysis & Evidence Chain

### 2.1 Issue 1: `isSignerRole` Title Case Gate
- **Location**: `web_app/src/rules/component-classifier.ts:61-66`
- **Code**:
  ```ts
  function isSignerRole(text: string): boolean {
    if (!isUppercaseVietnamese(text) || text.length > 80) return false;
    return /^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|PHÓ GIÁM ĐỐC|CHỦ TỊCH|PHÓ CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|CHÁNH VĂN PHÒNG|TRƯỞNG |PHÓ TRƯỞNG )/i.test(
      text
    );
  }
  ```
- **Mechanism**:
  - `isUppercaseVietnamese(text)` checks `text === text.toLocaleUpperCase('vi-VN')`.
  - When a user inputs `Giám đốc`, `Phó Giám đốc`, or `Chủ tịch`, `isUppercaseVietnamese` returns `false`.
  - The function short-circuits to `false` without testing the prefix regex, even though the regex has the `/i` case-insensitive flag.

### 2.2 Issue 2: `AGENCY_NAME` Title Case Gate
- **Location**: `web_app/src/rules/component-classifier.ts:137-154`
- **Code**:
  ```ts
  if (
    family === 'ADMINISTRATIVE' &&
    index < 6 &&
    isUppercaseVietnamese(text) &&
    !DOCUMENT_TYPES.has(upper)
  ) {
    add(result, index, 'AGENCY_NAME', 0.7);
  }
  ```
- **Mechanism**:
  - Requires `isUppercaseVietnamese(text)`.
  - When the agency is written in Title Case (e.g. `Trung tâm Thử nghiệm - Kiểm định Công nghiệp` or `Công ty Cổ phần TVCI`), `isUppercaseVietnamese` returns `false`.
  - The paragraph is omitted from `result`, even if located at index 0 or 1 in the header zone.

### 2.3 Issue 3: Legal Basis Colon Rejection
- **Locations**:
  - `web_app/src/rules/component-classifier.ts:120`: `if (/^CĂN CỨ(?:\s|$)/i.test(text))`
  - `web_app/src/rules/legal-basis-validator.ts:38`: `if (!/^CĂN CỨ(?:\s|$)/i.test(snapshot.text.trim())) break;`
  - `web_app/src/rules/document-evaluator.ts:118`: `if (!/^Căn cứ\b/i.test(pText)) break;`
- **Mechanism**:
  - The pattern `^CĂN CỨ(?:\s|$)` requires whitespace or end-of-string immediately after `CĂN CỨ`.
  - Text starting with `Căn cứ:` has a colon `:` at position 6 (0-indexed). `:` is neither `\s` nor `$`.
  - Result: Classification fails, legal basis block parsing aborts, and paragraphs are dumped into body text.
  - Furthermore, `\b` in `/^Căn cứ\b/` (line 118) relies on ASCII word boundary; in JavaScript regex, `ứ` is non-ASCII (`\W`), making `\b` unreliable when followed by non-word characters.

### 2.4 Issue 4: Cascading Failures in `document-evaluator.ts`
- **Locations**:
  - `web_app/src/rules/document-evaluator.ts:94-125`
  - `web_app/src/rules/document-evaluator.ts:857-890`
- **Evidence**:
  ```ts
  const signerRoleComp = componentByType.get('SIGNER_ROLE');
  if (signerRoleComp) {
    for (let i = signerRoleComp.index; i < Math.min(paragraphSnapshots.length, signerRoleComp.index + 5); i++) {
      componentIndices.add(i);
    }
  }

  const bodyParagraphs = paragraphSnapshots.filter(
    (p, index) => !componentIndices.has(index) && p.text && p.text.trim().length > 0
  );
  ```
  - When `SIGNER_ROLE` is not classified, `signerRoleComp` is undefined.
  - Paragraphs at indices 7, 8 (the signer role and signer name) are NOT added to `componentIndices`.
  - They become members of `bodyParagraphs`.
  - Body rules expect `alignment: 'Justified'` and `firstLineIndentMm: 10-12.7mm`.
  - Signer blocks are `Centered` with `firstLineIndentMm: 0mm`, producing 2 to 4 false `FAIL` violations.
  - Concurrently, `signer.role` and `signer.name` are reported as `status: 'MISSING'`.

---

## 3. Remediation Design & Specifications

### 3.1 `isSignerRole` Prefix Matching
1. **Remove `isUppercaseVietnamese(text)` constraint**: Allow Title Case and all-caps text.
2. **Trim & length guard**: `trimmed.length > 0 && trimmed.length <= 80`.
3. **Broadened case-insensitive prefixes and titles**:
   - Prefixes: `T/M`, `TM.`, `KT.`, `TL.`, `TUQ.`, `Q.`
   - Roles: `PHÓ\s+`, `GIÁM ĐỐC`, `TỔNG GIÁM ĐỐC`, `CHỦ TỊCH`, `BÍ THƯ`, `TRƯỞNG`, `HIỆU TRƯỞNG`, `VIỆN TRƯỞNG`, `CHÁNH VĂN PHÒNG`
   - Regex:
     ```ts
     /^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ\s+|GIÁM ĐỐC|TỔNG GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ|TRƯỞNG|HIỆU TRƯỞNG|VIỆN TRƯỞNG|CHÁNH VĂN PHÒNG)/i
     ```

### 3.2 Uppercase Validation for `SIGNER_ROLE` (`ruleId: 'signer.role.uppercase'`)
Instead of refusing classification when signer role is in Title Case:
1. Classify the paragraph as `SIGNER_ROLE`.
2. In `component-validator.ts` (or `document-evaluator.ts`), check whether the text matches uppercase:
   ```ts
   const text = (snapshot.text || '').trim();
   const upper = text.toLocaleUpperCase('vi-VN');
   if (text && text !== upper) {
     issues.push({
       id: `${snapshot.id}-signer-role-uppercase`,
       ruleId: 'signer.role.uppercase',
       targetId: snapshot.id,
       paragraphIndex: snapshot.index,
       category: 'signer',
       componentType: 'SIGNER_ROLE',
       message: '[Quyền hạn / chức vụ người ký] Chức vụ người ký phải viết hoa toàn bộ (ví dụ: GIÁM ĐỐC)',
       severity: 'warning',
       status: 'FAIL',
       autoFixable: true,
       actual: text,
       expected: upper,
       fixValue: upper,
     });
   }
   ```
3. Outcome:
   - Component status is `FAIL` (due to capitalization) rather than `MISSING`.
   - `signer.name` is located and evaluated normally.
   - The signer paragraph is in `componentIndices`, completely preventing leakage into `bodyParagraphs`.

### 3.3 `AGENCY_NAME` Header Zone Matching
1. **Recognize agency keywords in first 4 lines (`index < 4`)**:
   Keywords: `Bộ`, `Tập đoàn`, `Tổng công ty`, `Viện`, `Trung tâm`, `Công ty`, `Sở`, `Ban`, `UBND`, `Ủy ban nhân dân`, `Uỷ ban nhân dân`, `Hội đồng`, `Cục`, `Chi cục`, `Trường`.
2. **Avoid JavaScript Unicode Word Boundary Bug**:
   In JavaScript, `\b` fails on non-ASCII characters like `Bộ` or `Sở` followed by space.
   Use delimiter group `(?:\s+|$|[.,:;/-])` instead of `\b`:
   ```ts
   const isAgencyKeyword =
     /^(BỘ|TẬP ĐOÀN|TỔNG CÔNG TY|VIỆN|TRUNG TÂM|CÔNG TY|SỞ|BAN|UBND|ỦY BAN NHÂN DÂN|UỶ BAN NHÂN DÂN|HỘI ĐỒNG|CỤC|CHI CỤC|TRƯỜNG)(?:\s+|$|[.,:;/-])/i.test(
       text
     );
   ```
3. **Classification Rule**:
   ```ts
   if (
     family === 'ADMINISTRATIVE' &&
     !DOCUMENT_TYPES.has(upper) &&
     ((index < 6 && isUppercaseVietnamese(text)) || (index < 4 && isAgencyKeyword))
   ) {
     add(result, index, 'AGENCY_NAME', isAgencyKeyword ? 0.85 : 0.7);
   }
   ```
4. **Party Family Extension**:
   ```ts
   const isPartyAgencyKeyword =
     /^(ĐẢNG BỘ|ĐẢNG ỦY|ĐẢNG UỶ|CHI BỘ|BAN|VĂN PHÒNG|ỦY BAN|UỶ BAN)(?:\s+|$|[.,:;/-])/i.test(text);
   if (
     family === 'PARTY' &&
     ((index < 6 && isUppercaseVietnamese(text) && isPartyAgencyKeyword) ||
       (index < 4 && isPartyAgencyKeyword))
   ) {
     add(result, index, 'AGENCY_NAME', 0.85);
     return;
   }
   ```

### 3.4 Robust Legal Basis Regex
Update regex to support optional colon with optional spaces:
```ts
/^CĂN CỨ(?:\s*:\s*|\s+|$)/i
```
Apply across:
- `component-classifier.ts:120`
- `legal-basis-validator.ts:38`
- `document-evaluator.ts:118`

---

## 4. Exact Code Diffs

### Target 1: `web_app/src/rules/component-classifier.ts`

```diff
--- a/web_app/src/rules/component-classifier.ts
+++ b/web_app/src/rules/component-classifier.ts
@@ -61,6 +61,7 @@
 function isSignerRole(text: string): boolean {
-  if (!isUppercaseVietnamese(text) || text.length > 80) return false;
-  return /^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|PHÓ GIÁM ĐỐC|CHỦ TỊCH|PHÓ CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|CHÁNH VĂN PHÒNG|TRƯỞNG |PHÓ TRƯỞNG )/i.test(
-    text
+  const trimmed = text.trim();
+  if (!trimmed || trimmed.length > 80) return false;
+  return /^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ\s+|GIÁM ĐỐC|TỔNG GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ|TRƯỞNG|HIỆU TRƯỞNG|VIỆN TRƯỞNG|CHÁNH VĂN PHÒNG)/i.test(
+    trimmed
   );
 }
@@ -120,3 +121,3 @@
-    if (/^CĂN CỨ(?:\s|$)/i.test(text)) {
+    if (/^CĂN CỨ(?:\s*:\s*|\s+|$)/i.test(text)) {
       add(result, index, 'LEGAL_BASIS', 0.99);
       return;
     }
@@ -137,17 +138,24 @@
-    if (
-      family === 'PARTY' &&
-      index < 6 &&
-      isUppercaseVietnamese(text) &&
-      /^(ĐẢNG BỘ|ĐẢNG ỦY|ĐẢNG UỶ|CHI BỘ|BAN |VĂN PHÒNG|ỦY BAN|UỶ BAN)/.test(upper)
-    ) {
-      add(result, index, 'AGENCY_NAME', 0.85);
-      return;
-    }
-    if (
-      family === 'ADMINISTRATIVE' &&
-      index < 6 &&
-      isUppercaseVietnamese(text) &&
-      !DOCUMENT_TYPES.has(upper)
-    ) {
-      add(result, index, 'AGENCY_NAME', 0.7);
-    }
+    const isPartyAgencyKeyword =
+      /^(ĐẢNG BỘ|ĐẢNG ỦY|ĐẢNG UỶ|CHI BỘ|BAN|VĂN PHÒNG|ỦY BAN|UỶ BAN)(?:\s+|$|[.,:;/-])/i.test(text);
+    if (
+      family === 'PARTY' &&
+      ((index < 6 && isUppercaseVietnamese(text) && isPartyAgencyKeyword) ||
+        (index < 4 && isPartyAgencyKeyword))
+    ) {
+      add(result, index, 'AGENCY_NAME', 0.85);
+      return;
+    }
+
+    const isAgencyKeyword =
+      /^(BỘ|TẬP ĐOÀN|TỔNG CÔNG TY|VIỆN|TRUNG TÂM|CÔNG TY|SỞ|BAN|UBND|ỦY BAN NHÂN DÂN|UỶ BAN NHÂN DÂN|HỘI ĐỒNG|CỤC|CHI CỤC|TRƯỜNG)(?:\s+|$|[.,:;/-])/i.test(
+        text
+      );
+    if (
+      family === 'ADMINISTRATIVE' &&
+      !DOCUMENT_TYPES.has(upper) &&
+      ((index < 6 && isUppercaseVietnamese(text)) || (index < 4 && isAgencyKeyword))
+    ) {
+      add(result, index, 'AGENCY_NAME', isAgencyKeyword ? 0.85 : 0.7);
+    }
```

---

### Target 2: `web_app/src/rules/component-validator.ts`

```diff
--- a/web_app/src/rules/component-validator.ts
+++ b/web_app/src/rules/component-validator.ts
@@ -98,3 +98,22 @@
   if (rule.alignment !== undefined && snapshot.alignment !== rule.alignment) {
     issues.push(issue(snapshot, type, 'alignment', snapshot.alignment, rule.alignment, rule.alignment));
   }
+
+  if (type === 'SIGNER_ROLE') {
+    const text = (snapshot.text || '').trim();
+    const upper = text.toLocaleUpperCase('vi-VN');
+    if (text && text !== upper) {
+      issues.push({
+        id: `${snapshot.id}-signer-role-uppercase`,
+        ruleId: 'signer.role.uppercase',
+        targetId: snapshot.id,
+        paragraphIndex: snapshot.index,
+        category: 'signer',
+        componentType: 'SIGNER_ROLE',
+        message: '[Quyền hạn / chức vụ người ký] Chức vụ người ký phải viết hoa toàn bộ (ví dụ: GIÁM ĐỐC)',
+        severity: 'warning',
+        status: 'FAIL',
+        autoFixable: true,
+        actual: text,
+        expected: upper,
+        fixValue: upper,
+      });
+    }
+  }
   return issues;
 }
```

---

### Target 3: `web_app/src/rules/legal-basis-validator.ts`

```diff
--- a/web_app/src/rules/legal-basis-validator.ts
+++ b/web_app/src/rules/legal-basis-validator.ts
@@ -38,1 +38,1 @@
-    if (!/^CĂN CỨ(?:\s|$)/i.test(snapshot.text.trim())) break;
+    if (!/^CĂN CỨ(?:\s*:\s*|\s+|$)/i.test(snapshot.text.trim())) break;
```

---

### Target 4: `web_app/src/rules/document-evaluator.ts`

```diff
--- a/web_app/src/rules/document-evaluator.ts
+++ b/web_app/src/rules/document-evaluator.ts
@@ -118,1 +118,1 @@
-      if (!/^Căn cứ\b/i.test(pText)) break;
+      if (!/^CĂN CỨ(?:\s*:\s*|\s+|$)/i.test(pText)) break;
```

---

## 5. Unit Test Additions Specification

Target file: `web_app/tests/unit/format-engine.test.ts`

Add the following three test suites under the main `describe('Format Engine: NĐ 30/2020 Administrative Format Evaluation', ...)` block:

```ts
  it('classifies Title Case signer role and prevents dumping into body paragraphs', () => {
    const paragraphs = [
      'TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP',
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh phúc',
      'Số: 12/QĐ-TTTN',
      'Hà Nội, ngày 29 tháng 9 năm 2026',
      'QUYẾT ĐỊNH',
      'Về việc ban hành nội quy làm việc',
      'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ;',
      'Ban hành kèm theo Quyết định này Quy chế làm việc của Trung tâm.',
      'Giám đốc',
      'Nguyễn Văn A',
      'Nơi nhận:\n- Như Điều 3;\n- Lưu: VT.',
    ];

    const components = classifyDocumentComponents(paragraphs, 'ADMINISTRATIVE');
    const signerRole = components.find((c) => c.type === 'SIGNER_ROLE');
    expect(signerRole).toBeDefined();
    expect(signerRole?.paragraphIndex).toBe(9);

    const snapshots: ParagraphSnapshot[] = paragraphs.map((text, index) => ({
      id: `p-${index}`,
      index,
      text,
      fontName: 'Times New Roman',
      fontSize: index === 5 ? 14 : index === 9 ? 13 : 13,
      bold: index === 1 || index === 2 || index === 5 || index === 9 || index === 10,
      alignment: index === 8 ? 'Justified' : index === 9 || index === 10 ? 'Centered' : 'Centered',
      firstLineIndentMm: index === 8 ? 10 : 0,
      lineSpacingMultiple: 1.2,
      spaceBefore: 0,
      spaceAfter: 0,
    }));

    const summary = evaluateDocumentRules(snapshots, 'NĐ30_TVCI');
    // Signer role should be classified as SIGNER_ROLE, not MISSING
    const signerResult = summary.results.find((r) => r.ruleId === 'signer.role');
    expect(signerResult?.status).not.toBe('MISSING');

    // Title Case Giám đốc triggers specific uppercase warning/failure, not missing
    const uppercaseIssue = summary.issues.find((i) => i.ruleId === 'signer.role.uppercase');
    expect(uppercaseIssue).toBeDefined();
    expect(uppercaseIssue?.actual).toBe('Giám đốc');
    expect(uppercaseIssue?.expected).toBe('GIÁM ĐỐC');

    // Body paragraphs must NOT include Giám đốc or Nguyễn Văn A, so body.alignment PASSES
    const bodyAlignResult = summary.results.find((r) => r.ruleId === 'body.alignment');
    expect(bodyAlignResult?.status).toBe('PASS');
    const bodyIndentResult = summary.results.find((r) => r.ruleId === 'body.firstLineIndent');
    expect(bodyIndentResult?.status).toBe('PASS');
  });

  it('correctly classifies legal basis with colon (Căn cứ: ...)', () => {
    const paragraphs = [
      'Căn cứ: Luật Doanh nghiệp số 59/2020/QH14 ngày 17 tháng 6 năm 2020;',
      'Căn cứ: Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ;',
    ];

    const components = classifyDocumentComponents(paragraphs, 'ADMINISTRATIVE');
    expect(components.length).toBeGreaterThanOrEqual(1);
    expect(components[0].type).toBe('LEGAL_BASIS');
    expect(components[0].paragraphIndex).toBe(0);
  });

  it('classifies Title Case Agency Name in header zone (first 4 lines)', () => {
    const paragraphs = [
      'Trung tâm Thử nghiệm - Kiểm định Công nghiệp',
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh phúc',
      'Số: 01/TB-TTTN',
    ];

    const components = classifyDocumentComponents(paragraphs, 'ADMINISTRATIVE');
    const agencyComp = components.find((c) => c.type === 'AGENCY_NAME');
    expect(agencyComp).toBeDefined();
    expect(agencyComp?.paragraphIndex).toBe(0);
  });
```

---

## 6. Edge Cases & Risk Assessment

| # | Edge Case | Potential Risk | Mitigation in Design |
|---|-----------|----------------|----------------------|
| 1 | Body sentence starts with `Giám đốc...` | False positive `SIGNER_ROLE` in body | Document evaluator uses `Map.has()` picking the first signer role; `isSignerRole` checks length <= 80; typical body sentences have terminal punctuation and greater length |
| 2 | Multiple agency name lines in header (e.g. Ministry + Department) | Only one classified | `component-classifier.ts` classifies both; both indices added to `componentIndices`, neither leaks into body |
| 3 | Decomposed Unicode in `Giám đốc` (`Gia\u0301m \u0111\u00f4\u0301c`) | Regex fails if not normalized | Explorer 1 adds `.normalize('NFC')` to `lines = paragraphs.map(normalize)` |
| 4 | Legal basis with spaces around colon (`Căn cứ  :  ...`) | Regex fails | Pattern uses `\s*:\s*` to tolerate variable whitespace |
| 5 | Non-ASCII boundary on `Bộ` | `\b` fails in JS regex | Use `(?:\s+|$|[.,:;/-])` instead of `\b` |
