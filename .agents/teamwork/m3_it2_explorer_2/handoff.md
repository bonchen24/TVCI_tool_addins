# Milestone 3 Handoff Report: Title Case Handling & Regex Robustness

**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Role**: M3 Iteration 2 Explorer 2 (`m3_it2_explorer_2`)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Handoff Type**: Hard  
**Date**: 2026-09-29  

---

## 1. Observation

1. **Signer Role Locked by Uppercase Guard**:
   In `web_app/src/rules/component-classifier.ts:61-66`:
   ```ts
   function isSignerRole(text: string): boolean {
     if (!isUppercaseVietnamese(text) || text.length > 80) return false;
     return /^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|PHÓ GIÁM ĐỐC|CHỦ TỊCH|PHÓ CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|CHÁNH VĂN PHÒNG|TRƯỞNG |PHÓ TRƯỞNG )/i.test(
       text
     );
   }
   ```
   And in `web_app/src/rules/component-classifier.ts:49-52`:
   ```ts
   function isUppercaseVietnamese(text: string): boolean {
     const letters = text.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
     return letters.length >= 4 && text === text.toLocaleUpperCase('vi-VN');
   }
   ```
   `isUppercaseVietnamese('Giám đốc')` returns `false`. `isSignerRole('Giám đốc')` returns `false`.

2. **Agency Name Locked by Uppercase Guard**:
   In `web_app/src/rules/component-classifier.ts:146-154`:
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
   `isUppercaseVietnamese('Trung tâm Thử nghiệm - Kiểm định Công nghiệp')` returns `false`. `AGENCY_NAME` is not classified.

3. **Cascading Failure into Body Paragraphs**:
   In `web_app/src/rules/document-evaluator.ts:94-125`:
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
   When `SIGNER_ROLE` is unclassified, `signerRoleComp` is `undefined`. The signer paragraph and signer name paragraph are not added to `componentIndices`. They become part of `bodyParagraphs`.
   In `document-evaluator.ts:694-755`:
   `body.alignment` requires `profile.body.alignment` (`'Justified'`), but signer paragraphs are `'Centered'`, triggering `body.alignment` `FAIL`.
   `body.firstLineIndent` requires `10-12.7mm`, but signer paragraphs have `0mm`, triggering `body.firstLineIndent` `FAIL`.
   Simultaneously, `signer.role` and `signer.name` report `status: 'MISSING'` at lines 858 and 892.

4. **Legal Basis Colon Rejection**:
   In `web_app/src/rules/component-classifier.ts:120`:
   ```ts
   if (/^CĂN CỨ(?:\s|$)/i.test(text)) {
     add(result, index, 'LEGAL_BASIS', 0.99);
     return;
   }
   ```
   In `web_app/src/rules/legal-basis-validator.ts:38`:
   ```ts
   if (!/^CĂN CỨ(?:\s|$)/i.test(snapshot.text.trim())) break;
   ```
   In `web_app/src/rules/document-evaluator.ts:118`:
   ```ts
   if (!/^Căn cứ\b/i.test(pText)) break;
   ```
   `'Căn cứ: Nghị định...'` has a colon `:` immediately following `Căn cứ`. `(?:\s|$)` requires whitespace or end of string, rejecting `:`.

---

## 2. Logic Chain

1. **Step 1 (Root Cause Verification)**:
   Observations 1 and 2 establish that Title Case text for signer role (`Giám đốc`) and agency name (`Trung tâm...`) returns `false` from `isUppercaseVietnamese(text)`.
   Because classification functions gate strictly on `isUppercaseVietnamese`, these components are never classified.

2. **Step 2 (Blast Radius & Cascading Failures)**:
   Observation 3 shows that `document-evaluator.ts` partitions snapshots into administrative components and `bodyParagraphs`.
   Any unclassified header or footer paragraph automatically defaults to `bodyParagraphs`.
   Because body paragraphs enforce `Justified` alignment and `10-12.7mm` indentation, header/footer elements trigger false failures for body rules, while their intended rules report `MISSING`.

3. **Step 3 (Punctuation Lockout)**:
   Observation 4 shows that legal basis regex `^CĂN CỨ(?:\s|$)` treats `:` as a mismatch. Real-world documents containing `Căn cứ: ...` are rejected and dumped into body text.

4. **Step 4 (Remediation Design)**:
   - Relax `isSignerRole` to case-insensitive prefix/title matching.
   - Detect non-uppercase signer roles in `component-validator.ts` and flag `ruleId: 'signer.role.uppercase'` with `status: 'FAIL'` and `severity: 'warning'`, preventing `MISSING` status and preventing leakage into body.
   - Allow `AGENCY_NAME` in `index < 4` with agency keywords (`Bộ`, `Tập đoàn`, `Tổng công ty`, `Viện`, `Trung tâm`, `Công ty`, `Sở`, `Ban`, `UBND`, etc.) using `(?:\s+|$|[.,:;/-])` (avoiding the JavaScript non-ASCII `\b` bug).
   - Broaden legal basis regex to `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i`.

---

## 3. Caveats

1. **Decomposed Diacritics Interdependency**:
   If text is encoded in Unicode NFD (decomposed diacritics), regex matching against NFC literals (`GIÁM ĐỐC`, `CĂN CỨ`) can fail unless input is normalized to NFC. Explorer 1 handles `.normalize('NFC')` in `normalize()`.
2. **Punctuation Auto-Fix Interdependency**:
   Capitalization fixes (`upperText`) can be auto-applied if Explorer 3's text replacement mechanism is enabled in `auto-fixer.ts`. The validator properly provides `autoFixable: true` and `fixValue: upperText`.

---

## 4. Conclusion

The format engine's misclassification of Title Case signer roles and agency names is completely resolved by:
1. Updating `isSignerRole` in `component-classifier.ts` to test `/^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ\s+|GIÁM ĐỐC|TỔNG GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ|TRƯỞNG|HIỆU TRƯỞNG|VIỆN TRƯỞNG|CHÁNH VĂN PHÒNG)/i`.
2. Adding `ruleId: 'signer.role.uppercase'` issue in `component-validator.ts` for mixed-case `SIGNER_ROLE`.
3. Broadening `AGENCY_NAME` in `component-classifier.ts` for `index < 4` using agency keyword patterns.
4. Broadening legal basis regex in `component-classifier.ts`, `legal-basis-validator.ts`, and `document-evaluator.ts` to `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i`.

All complete code diffs and test cases are documented in `analysis.md`.

---

## 5. Verification Method

### Independent Inspection:
1. Inspect `web_app/src/rules/component-classifier.ts:61-66`. Verify `isUppercaseVietnamese` is replaced by case-insensitive regex.
2. Inspect `web_app/src/rules/component-validator.ts:98-120`. Verify `ruleId: 'signer.role.uppercase'` is emitted when `snapshot.text !== upper`.
3. Inspect `web_app/src/rules/component-classifier.ts:120` and `legal-basis-validator.ts:38`. Verify `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i`.

### Execution Verification:
Run unit tests once worker applies code changes:
```bash
npm test -- web_app/tests/unit/format-engine.test.ts
```

### Invalidation Conditions:
- If `Giám đốc` is still classified as a body paragraph, invalidates Step 2.
- If `Căn cứ: Nghị định...` is not classified as `LEGAL_BASIS`, invalidates Step 3.
