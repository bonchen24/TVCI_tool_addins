# Milestone 3 Adversarial Challenge Report: Administrative Format Engine

**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Challenger**: M3 Challenger 1 Replacement (`m3_challenger_1_r2`)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Verdict**: **CHALLENGE**  
**Overall Risk Assessment**: **HIGH**  
**Date**: 2026-09-29  

---

## 1. Challenge Summary

Static code tracing, logic flow analysis, and test assertion inspection were performed across `web_app/src/rules/` and associated unit tests (`format-engine.test.ts`, `multi-profile.test.ts`, `auto-fixer.test.ts`).

While the core rule structure and multi-profile registry are well architected, **four significant failure modes** were uncovered through adversarial stress-testing:
1. **[HIGH] Unhandled Runtime Exception on Nullish Text**: If any snapshot has `text: null` or `text: undefined` within an array of paragraphs, `evaluateDocumentRules()` crashes with an unhandled `TypeError` in `auto-detect.service.ts` or `component-classifier.ts`.
2. **[HIGH] Total Classifier Failure on Unicode NFD (Decomposed Diacritics)**: Vietnamese text entered via macOS keyboards, UniKey Composite, or imported DOCX XML in NFD format fails regex and literal checks in `component-classifier.ts`, causing 100% false-positive `MISSING` errors for all administrative elements.
3. **[MEDIUM] Auto-Fixer Ineffective on Text Punctuation**: Validation issues for addressee, recipients, and legal basis punctuation (`text.addressee.*`, `text.recipients.*`, `text.legalBasis.*`) are marked `autoFixable: true`, but `auto-fixer.ts` contains zero text replacement logic; it marks them applied without modifying document content, creating an infinite audit error loop.
4. **[MEDIUM] Case Sensitivity Lockout in Signer Role & Agency Name**: Classifier requires uppercase letters (`isUppercaseVietnamese`) for `SIGNER_ROLE` and `AGENCY_NAME`. Title Case inputs (e.g., `Giám đốc`) are not recognized, marked as `MISSING` (non-fixable), and fall through into body rules where they trigger false formatting errors.

---

## 2. Observation

### Observation 1: Unhandled Exception on Nullish Snapshot Text
- In `web_app/src/rules/document-evaluator.ts`, line 60 checks blank document:
  ```ts
  59: paragraphSnapshots.length === 0 ||
  60: paragraphSnapshots.every((p) => !p.text || p.text.trim().length === 0);
  ```
  If at least one snapshot has text, `isBlankDocument` evaluates to `false`.
- In `web_app/src/rules/document-evaluator.ts`, line 77 extracts raw texts:
  ```ts
  77: const rawTexts = paragraphSnapshots.map((p) => p.text);
  78: const detected = detectDocumentContext(rawTexts);
  ```
  If another snapshot in the array has `text: null` or `text: undefined`, `rawTexts` contains `null`/`undefined`.
- In `web_app/src/rules/auto-detect.service.ts`, lines 99-100:
  ```ts
  99:  for (const p of sample) {
  100:   const cleanP = removeTones(p);
  ```
  And in lines 13-16:
  ```ts
  13: export function removeTones(str: string): string {
  14:   return str
  15:     .normalize('NFD')
  ```
  Calling `removeTones(null as any)` causes: `TypeError: Cannot read properties of null (reading 'normalize')`.
- In `web_app/src/rules/component-classifier.ts`, lines 82 and 45-47:
  ```ts
  45: function normalize(text: string): string {
  46:   return text.replace(/\s+/g, ' ').trim();
  47: }
  ...
  82: const lines = paragraphs.map(normalize);
  ```
  Calling `normalize(null as any)` causes: `TypeError: Cannot read properties of null (reading 'replace')`.

### Observation 2: Missing Unicode Normalization (NFC vs NFD)
- In `web_app/src/rules/component-classifier.ts`, lines 45-47:
  ```ts
  function normalize(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
  ```
  `normalize()` does **not** call `text.normalize('NFC')`.
- All string literals and regex patterns in `component-classifier.ts` use NFC precomposed characters:
  - Line 92: `upper.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM')`
  - Line 98: `/^ĐỘC LẬP\s*[-–—]\s*TỰ DO\s*[-–—]\s*HẠNH PHÚC$/i.test(upper)`
  - Line 39-43: `DOCUMENT_TYPES = new Set(['NGHỊ QUYẾT', 'QUYẾT ĐỊNH', ...])`
  - Line 120: `/^CĂN CỨ(?:\s|$)/i.test(text)`
  - Line 128: `/^NƠI NHẬN(?:\s*:\s*.*|\s+.*)?$/i.test(upper)`
  - Line 63: `/^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|...)/i.test(text)`
- In JavaScript, string comparison between NFC and NFD is `false`:
  `"CỘNG".normalize('NFD').includes("CỘNG") === false`.
- In `component-classifier.ts` line 50:
  ```ts
  function isUppercaseVietnamese(text: string): boolean {
    const letters = text.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
    return letters.length >= 4 && text === text.toLocaleUpperCase('vi-VN');
  }
  ```
  In NFD, accents are combining marks in range `\u0300-\u036F`. `[^A-Za-zÀ-ỹĐđ]` strips combining marks, corrupting character length checks.

### Observation 3: Auto-Fixer Cannot Fix Text Content Violations
- In `web_app/src/rules/addressee-validator.ts`:
  - Line 21: `autoFixable: true`
  - Line 24: `fixValue`
  - Rule IDs: `text.addressee.colon`, `text.addressee.noTrailingPunctuation`, `text.addressee.partyPunctuation`, `text.addressee.punctuation`, `text.addressee.finalPunctuation`.
- In `web_app/src/rules/recipients-validator.ts`:
  - Line 20: `autoFixable: true`
  - Line 23: `fixValue`
  - Rule IDs: `text.recipients.colon`, `text.recipients.archivePunctuation`, `text.recipients.itemPunctuation`.
- In `web_app/src/rules/legal-basis-validator.ts`:
  - Line 22: `autoFixable: true`
  - Line 25: `fixValue`
  - Rule IDs: `text.legalBasis.punctuation`, `text.legalBasis.finalPunctuation`.
- In `web_app/src/rules/auto-fixer.ts`:
  - Lines 27-171 (`issueToPatch`): No branches exist for `text.*` rule IDs. Returns empty patch `{ paragraphIndex: X }`.
  - Lines 249 & 340: Only updates node attrs (`tr.setNodeMarkup(pos, undefined, updates)`).
  - Lines 256-267 & 345-356: Only applies marks (`tr.addMark(from, to, mark)`).
  - Line 366: `appliedCount = issues.filter((i) => i.autoFixable && i.status !== 'PASS').length;`
  - Text content is **never** replaced in the ProseMirror transaction.
- When `applySafeFixes` is executed on documents with text punctuation errors, it reports `appliedCount > 0`, but the text remains unmodified. Re-evaluating immediately returns the identical failures.

### Observation 4: Case Sensitivity Trap for Signer Role and Agency
- In `web_app/src/rules/component-classifier.ts`:
  - Line 62: `if (!isUppercaseVietnamese(text) || text.length > 80) return false;`
  - Line 149: `if (family === 'ADMINISTRATIVE' && index < 6 && isUppercaseVietnamese(text) && !DOCUMENT_TYPES.has(upper))`
- If user enters `Giám đốc` or `Trung tâm Thử nghiệm...` in Title Case:
  - `isUppercaseVietnamese` returns `false`.
  - Element is not classified.
  - Evaluator marks component as `MISSING` (`autoFixable: false`).
  - Unclassified paragraphs fall into `bodyParagraphs` (`document-evaluator.ts:123`), triggering false violations for body alignment (Justified required vs Centered actual) and indentation (10mm required vs 0mm actual).

### Observation 5: Unit Test Suite Gaps
- `web_app/tests/unit/format-engine.test.ts`:
  - Tests blank document with `[]`, but omits `[{ id: '0', text: '' }]`, `[{ id: '0', text: '   ' }]`, and snapshots with `text: null`.
  - Tests only happy path precomposed NFC strings.
- `web_app/tests/unit/multi-profile.test.ts`:
  - Tests header switching (`header.national_emblem` vs `header.party_title`), but does not assert dynamic punctuation switching in `addressee-validator` or `legal-basis-validator` under full audit.
- `web_app/tests/unit/auto-fixer.test.ts`:
  - Test document (lines 150-162) specifically crafts text with already-correct colons (`Nơi nhận: Như trên`) and no `Kính gửi` or `Căn cứ` items, masking the lack of text modification support in `auto-fixer.ts`.

---

## 3. Logic Chain

1. *Logic Step 1 (Malformed Input Crash)*:
   - In production, documents imported from DOCX or parsed from empty ProseMirror table cells can contain empty, nullish, or spacer nodes.
   - Observation 1 shows that `removeTones` and `normalize` immediately call string methods on array items without null-guarding (`str.normalize`, `text.replace`).
   - If any paragraph has `text: null` or `text: undefined` while other paragraphs exist, `evaluateDocumentRules()` throws an unhandled `TypeError`, crashing the audit panel.

2. *Logic Step 2 (Unicode Diacritic Incompatibility)*:
   - Vietnamese input methods (macOS Telex, UniKey Composite, mobile keyboards, older Word DOCX XML) frequently emit decomposed Unicode (NFD).
   - In NFD, an accented letter consists of a base letter followed by separate combining mark codepoints.
   - Observation 2 demonstrates that `component-classifier.ts` compares strings against NFC literals and regular expressions without calling `text.normalize('NFC')`.
   - Consequently, NFD input fails all matching logic, causing the evaluator to declare that all mandatory administrative components are missing.

3. *Logic Step 3 (Auto-Fixer Deadlock)*:
   - Validators explicitly label punctuation errors as `autoFixable: true` and provide `fixValue`.
   - Observation 3 shows that `issueToPatch` does not extract `fixValue` for text replacement, and `applySafeFixes` only calls `tr.setNodeMarkup` and `tr.addMark`.
   - As a result, the auto-fixer reports success to the UI while leaving the document unchanged. The user clicks "Sửa an toàn", sees a success notification, but errors persist.

4. *Logic Step 4 (Classification Case Sensitivity)*:
   - Observation 4 shows that `isUppercaseVietnamese` gates recognition of `SIGNER_ROLE` and `AGENCY_NAME`.
   - When authors type standard mixed-case text, the engine misclassifies header/footer components as body text, creating spurious body errors while declaring the actual components missing.

---

## 4. Challenges Detail

### [Critical/High] Challenge 1: Unhandled TypeError on Malformed/Nullish Snapshot Text
- **Assumption challenged**: Assumed `paragraphSnapshots` will always have valid, non-null `text` strings across all elements.
- **Attack scenario**: Calling `evaluateDocumentRules([{ id: '1', text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' }, { id: '2', text: null as any }])`.
- **Blast radius**: Complete crash of the document audit hook (`useDocumentAudit`), freezing the UI or triggering Next.js React Error Boundaries.
- **Mitigation**:
  In `component-classifier.ts`:
  ```ts
  function normalize(text: string | null | undefined): string {
    return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  }
  ```
  In `auto-detect.service.ts`:
  ```ts
  export function removeTones(str: string | null | undefined): string {
    return String(str || '')
      .normalize('NFD')
      ...
  ```
  In `document-evaluator.ts`:
  ```ts
  const rawTexts = paragraphSnapshots.map((p) => p?.text ?? '');
  ```

### [Critical/High] Challenge 2: Total Failure on Unicode NFD (Decomposed Diacritics)
- **Assumption challenged**: Assumed all Vietnamese text in snapshots will be strictly precomposed NFC.
- **Attack scenario**: Feed document containing `"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM".normalize('NFD')` and `"Độc lập - Tự do - Hạnh phúc".normalize('NFD')`.
- **Blast radius**: 100% false-positive MISSING errors on National Emblem, Motto, Document Type, Legal Basis, Addressee, and Recipients for any document created or edited with decomposed diacritics.
- **Mitigation**:
  Normalize all incoming snapshot texts to NFC at the start of `classifyDocumentComponents` and `evaluateDocumentRules`:
  ```ts
  const lines = paragraphs.map((t) => String(t || '').normalize('NFC').replace(/\s+/g, ' ').trim());
  ```

### [Medium] Challenge 3: Auto-Fixer False Success on Punctuation Issues
- **Assumption challenged**: Assumed `applySafeFixes` fixes all issues marked `autoFixable: true`.
- **Attack scenario**: Audit a document with `Kính gửi Ban Giám đốc` (missing colon) and run `applySafeFixes(editor, issues)`.
- **Blast radius**: `appliedCount` returns 1, but text remains unchanged. Re-audit returns the same failure. The user cannot fix punctuation errors via one-click safe fix.
- **Mitigation**:
  Either:
  1. Set `autoFixable: false` on punctuation issues until text slice replacement is implemented in `auto-fixer.ts`.
  2. Implement text replacement in `applySafeFixes` using ProseMirror transaction:
     ```ts
     if (patch.textReplacement && targetNode) {
       tr.replaceWith(from, to, schema.text(patch.textReplacement));
     }
     ```

### [Medium] Challenge 4: Title Case Gate in Signer Role and Agency Name
- **Assumption challenged**: Assumed users will always type signer roles and agency names in ALL CAPS before running audit.
- **Attack scenario**: Audit document where signer role is `Giám đốc` or agency name is `Trung tâm Thử nghiệm - Kiểm định Công nghiệp`.
- **Blast radius**: Elements are marked as `MISSING` (non-fixable) and dumped into body paragraphs, generating 4+ false positive body formatting errors.
- **Mitigation**:
  In `isSignerRole`, allow case-insensitive check and flag a specific `component.SIGNER_ROLE.case` warning instead of outright refusing to classify:
  ```ts
  function isSignerRole(text: string): boolean {
    if (!text || text.length > 80) return false;
    return /^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ|TRƯỞNG)/i.test(text.trim());
  }
  ```

---

## 5. Stress Test Results Matrix

| # | Stress Scenario | Expected Behavior | Actual / Predicted Behavior | Verdict |
|---|-----------------|-------------------|-----------------------------|---------|
| 1 | Empty array `[]` input | Returns `isBlankDocument: true`, `healthScore: 0`, 0 issues | Handled correctly via `isBlankDocument` guard | **PASS** |
| 2 | Document with missing header, motto, recipients, signer | Flags all missing components as `MISSING`, no crash | Handled gracefully, proper diagnostic messages | **PASS** |
| 3 | Negative font sizes (`fontSize: -5`) | Flags `FAIL`, auto-fix clamps to minimum 6pt | Clamped in `auto-fixer.ts` (`Math.max(6, size)`) | **PASS** |
| 4 | Non-standard alignment (`alignment: 'JustifyAll'`) | Flags `FAIL`, auto-fix adjusts to standard | Handled, defaults to Justified | **PASS** |
| 5 | Snapshot with `text: null` in array | Graceful fallback to empty string, no crash | Throws `TypeError: Cannot read properties of null` | **FAIL (CRASH)** |
| 6 | Vietnamese NFD diacritics in National Emblem & Motto | Classified as `NATIONAL_EMBLEM` & `MOTTO` | Fails equality and regex; marked `MISSING` | **FAIL** |
| 7 | Legal basis with colon: `Căn cứ: Nghị định...` | Classified as `LEGAL_BASIS` | Regex `^CĂN CỨ(?:\s|$)` rejects `:` | **FAIL** |
| 8 | Multi-profile switching (NĐ 30 vs Party) | Header & Title rules switch dynamically | Verified in `multi-profile.test.ts` | **PASS** |
| 9 | Multi-profile Kính gửi punctuation (Party `;` vs NĐ 30 `.`) | Validated per profile rules | Logic exists in validator, but unasserted in unit test | **PASS (Code) / GAP (Test)** |
| 10 | Auto-fix on punctuation issue (`text.addressee.colon`) | Document text updated to include `:` | Text untouched, issue reported as fixed | **FAIL** |

---

## 6. Unchallenged Areas

- **Office.js Decoupling**: Verified that `web_app/src/rules/` contains zero Office.js imports (100% pure TypeScript).
- **ProseMirror Atomic Transactions**: Verified that `applySafeFixes` performs single-pass traversal and dispatches a single transaction for formatting attributes.
- **Page Margin Tolerance**: Verified that `validatePageSetup` properly accommodates 0.5mm tolerance for standard A4 margins.

---

## 7. Caveats

- Tests were analyzed via static code inspection and tracing without running commands, in strict adherence to the critical execution rule.
- Code snippets and line numbers were verified against actual repository files as of 2026-09-29.

---

## 8. Conclusion & Final Verdict

**VERDICT: CHALLENGE**

The administrative format engine is a faithful and high-quality port of the TVCI rule logic, but requires **four targeted defensive fixes** before proceeding to production:
1. Guard `normalize()` and `removeTones()` against `null`/`undefined` text values to prevent runtime crashes.
2. Add `.normalize('NFC')` to input text processing in `component-classifier.ts` to ensure compatibility with decomposed Vietnamese diacritics.
3. Update `auto-fixer.ts` to either support text node replacement for `text.*` rules, or adjust issue metadata to `autoFixable: false` so users are not misled.
4. Broaden `isSignerRole` and `AGENCY_NAME` classification to recognize Title Case and flag capitalization warnings rather than dropping classification.

---

## 9. Verification Method

To independently reproduce and verify these findings:

1. **Verify Nullish Text Crash**:
   Inspect `web_app/src/rules/auto-detect.service.ts:14` and `component-classifier.ts:46`. Notice `str.normalize` and `text.replace` are called directly without `String(str || '')` or `p?.text ?? ''` guards.
2. **Verify NFD Unicode Failure**:
   Inspect `web_app/src/rules/component-classifier.ts:45-47`. Notice `normalize` does not call `.normalize('NFC')`. Compare against NFC literals on lines 92, 98, 120. In Node REPL:
   `"CỘNG HÒA".normalize('NFD').includes("CỘNG HÒA") === false`.
3. **Verify Auto-Fixer Punctuation Omission**:
   Inspect `web_app/src/rules/auto-fixer.ts:27-171`. Notice `issueToPatch` lacks handlers for `text.*` rule IDs. Inspect lines 340-357 and notice only node attributes and marks are set; `tr.replaceWith` or text changes are completely absent.
4. **Invalidation Conditions**:
   - If `normalize()` in `component-classifier.ts` already calls `.normalize('NFC')`, Challenge 2 is invalidated.
   - If `issueToPatch` and `applySafeFixes` already perform text replacements, Challenge 3 is invalidated.
