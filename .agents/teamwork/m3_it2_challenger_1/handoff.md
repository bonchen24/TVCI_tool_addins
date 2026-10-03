# Milestone 3 Iteration 2 Adversarial Challenge Report: Format Engine Robustness

**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Challenger**: M3 Iteration 2 Challenger 1 (`m3_it2_challenger_1`)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**  
**Date**: 2026-09-29  

---

## 1. Observation

Static code tracing across `web_app/src/rules/` and `web_app/tests/unit/` observed:

### Vulnerability 1 (Nullish snapshot text)
- `web_app/src/rules/auto-detect.service.ts`:
  - Line 13: `removeTones(str: string | null | undefined): string` wraps input with `String(str || '')` before `.normalize('NFD')`.
  - Line 53: `sampleFullText = sample.map((p) => String(p || '')).join('\n')`.
  - Line 100: `removeTones(p)` handles nullish elements cleanly.
- `web_app/src/rules/component-classifier.ts`:
  - Line 45: `normalize(text: string | null | undefined): string` returns `String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim()`.
  - Line 85: `lines = paragraphs.map(normalize)`.
  - Line 90: `if (!text) return;` skips falsy/empty lines early.
- `web_app/src/rules/document-evaluator.ts`:
  - Lines 57-60: `isBlankDocument` guards empty array or all nullish/whitespace elements via `p.every((p) => !p || !p.text || (typeof p.text === 'string' && p.text.trim().length === 0))`.
  - Line 77: `rawTexts = paragraphSnapshots.map((p) => p?.text ?? '')`.
  - Lines 107, 117: `paragraphSnapshots[i]?.text?.trim() ?? ''`.
  - Lines 123-125: `bodyParagraphs` filters with `!componentIndices.has(index) && p?.text && p.text.trim().length > 0`.
  - Line 915: `paragraphSnapshots.slice(signerIndex + 1, signerIndex + 4).find((p) => p?.text && p.text.trim().length > 0)`.
- `web_app/tests/unit/format-engine.test.ts`:
  - Lines 299-338: Tested `malformedDoc` with `text: null`, `text: undefined`, `''`, and whitespace. Evaluates without throwing `TypeError`. Verified `isBlankDocument` and `healthScore > 0`.

### Vulnerability 2 (Unicode NFD decomposed diacritics)
- `web_app/src/rules/component-classifier.ts`:
  - Line 45: `normalize()` calls `String(text || '').normalize('NFC')`. All input text canonicalized to NFC prior to regex matching.
  - Line 50: `isUppercaseVietnamese` canonicalizes to NFC before character counting.
  - Lines 95, 101, 118, 123, 127, 131, 135: Precomposed NFC literals and regexes match incoming text.
- `web_app/tests/unit/format-engine.test.ts`:
  - Lines 340-409: Tested document with all key components in NFD (`"CỘNG HÒA...".normalize('NFD')`, `"Độc lập...".normalize('NFD')`, etc.).
  - Evaluated under `NĐ30_TVCI`. Verified zero false-positive `MISSING` errors for `NATIONAL_EMBLEM`, `MOTTO`, `DOCUMENT_TYPE`, `PLACE_DATE`, `SIGNER_ROLE`, `RECIPIENTS`. Health score >= 90.

### Vulnerability 3 (Title Case signer role & agency name)
- `web_app/src/rules/component-classifier.ts`:
  - Lines 62-68: `isSignerRole` uses case-insensitive regex `/^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ\s+|GIÁM ĐỐC|TỔNG GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ|TRƯỞNG|HIỆU TRƯỞNG|VIỆN TRƯỞNG|CHÁNH VĂN PHÒNG)/i`.
  - Line 135: Matches `"Giám đốc"` and classifies as `SIGNER_ROLE`.
  - Lines 151-161: Title Case agency prefix (`Trung tâm`, `Viện`, `Bộ`, etc.) within first 4 lines (`index < 4 && isAgencyKeyword`) classified as `AGENCY_NAME`.
- `web_app/src/rules/component-validator.ts`:
  - Lines 100-120: Detects non-uppercase signer role: `text !== upper`. Emits `ruleId: 'signer.role.uppercase'` with `status: 'FAIL'`, `severity: 'warning'`, `autoFixable: true`, `fixValue: upper`.
- `web_app/src/rules/document-evaluator.ts`:
  - Lines 97-102: Adds `signerRole.index` through `signerRole.index + 4` to `componentIndices`.
  - Lines 123-125: `bodyParagraphs` explicitly excludes `componentIndices`. `"Giám đốc"` does not leak into body rules.
  - Lines 857-889: Evaluates `signerRole` via `validateComponentParagraph`. Does NOT trigger `signer.role.missing`.
- `web_app/tests/unit/format-engine.test.ts`:
  - Lines 411-459: Tested document with `Giám đốc`. Classified as `SIGNER_ROLE`. `signer.role` not `MISSING`. Emits `signer.role.uppercase`. `body.alignment` and `body.firstLineIndent` pass.

### Vulnerability 4 (Legal basis with colons)
- `web_app/src/rules/component-classifier.ts`:
  - Line 123: `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i.test(text)`.
  - Tolerates optional colons with arbitrary surrounding spaces.
- `web_app/src/rules/document-evaluator.ts`:
  - Line 118: Multi-line block collector `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i.test(pText)` includes lines with colons in `componentIndices`.
- `web_app/tests/unit/format-engine.test.ts`:
  - Lines 461-471: Tested `Căn cứ: Luật Doanh nghiệp...`. Classified as `LEGAL_BASIS` at paragraphIndex 0.

### Auto-Fixer Text Replacement Hardening
- `web_app/src/rules/models.ts`: Line 111 defines `textReplacement?: string;`.
- `web_app/src/rules/auto-fixer.ts`:
  - Lines 38-49: `issueToPatch` maps `text.*`, punctuation, colon, and `signer.role.uppercase` issues to `patch.textReplacement`.
  - Lines 268-277: `applyFormattingPatch` replaces text block via `tr.replaceWith`, preserving node marks (`firstChild?.marks`).
  - Lines 335-414: `applySafeFixes` tracks positions with `tr.mapping.map(pos)` and executes atomic text replacements.
- `web_app/tests/unit/auto-fixer.test.ts`:
  - Lines 214-304: Unit tests verify single fix for addressee colon, 100% convergence across multi-issue documents, and mark preservation.

---

## 2. Logic Chain

1. **Null Safety**:
   - `removeTones` and `normalize` coerce inputs via `String(str || '')`.
   - `evaluateDocumentRules` maps snapshots with `p?.text ?? ''`.
   - Result: No null/undefined dereference can occur. `TypeError: Cannot read properties of null` impossible.

2. **NFD Canonicalization**:
   - `normalize()` applies `.normalize('NFC')` to all paragraph text.
   - Decomposed characters (macOS Telex / composite Unicode) converted to precomposed NFC before any regex or equality check.
   - Result: Regexes matching `CỘNG HÒA`, `Độc lập`, `QUYẾT ĐỊNH`, etc. succeed unconditionally.

3. **Title Case Handling & Isolation**:
   - Signer role regex matches case-insensitively (`/i`).
   - Signer paragraph index added to `componentIndices`, filtering it out from `bodyParagraphs`.
   - `component-validator.ts` flags uppercase discrepancy as an auto-fixable warning.
   - Result: Component recognized, body rules not polluted, casing flagged cleanly.

4. **Legal Basis Regex**:
   - `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i` matches both `Căn cứ Luật...` and `Căn cứ: Luật...`.
   - Result: Documents with colon notation classified as `LEGAL_BASIS` accurately.

---

## 3. Caveats

- Verification conducted via static code inspection and test assertion tracing in accordance with the rule prohibiting `run_command`.
- Runtime execution of tests deferred to external runner or parent pipeline.

---

## 4. Conclusion

**VERDICT: APPROVE**

All 4 vulnerabilities identified in Gate 1 have been completely resolved and reinforced with comprehensive unit tests:
1. Nullish snapshot text handled defensively across all layers.
2. Unicode NFD text canonicalized to NFC.
3. Title Case signer role and agency classified correctly without leaking to body.
4. Legal basis regex supports colons.
5. Auto-fixer supports atomic text replacement with mark preservation.

---

## 5. Verification Method

To independently verify:
1. Inspect `web_app/src/rules/auto-detect.service.ts`: lines 13-21, 52-55.
2. Inspect `web_app/src/rules/component-classifier.ts`: lines 45-68, 123, 151-161.
3. Inspect `web_app/src/rules/component-validator.ts`: lines 100-120.
4. Inspect `web_app/src/rules/document-evaluator.ts`: lines 57-125, 855-889.
5. Inspect `web_app/src/rules/auto-fixer.ts`: lines 38-49, 268-277, 375-384.
6. Inspect `web_app/tests/unit/format-engine.test.ts`: lines 299-485.
7. Inspect `web_app/tests/unit/auto-fixer.test.ts`: lines 214-304.

### Test Execution:
```bash
npx vitest run web_app/tests/unit/format-engine.test.ts
npx vitest run web_app/tests/unit/auto-fixer.test.ts
```

### Invalidation Conditions:
- If `evaluateDocumentRules([{ id: '1', text: null as any }])` throws `TypeError`.
- If `classifyDocumentComponents(["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM".normalize('NFD')], 'ADMINISTRATIVE')` fails to match `NATIONAL_EMBLEM`.
- If `classifyDocumentComponents(["Giám đốc"], 'ADMINISTRATIVE')` does not match `SIGNER_ROLE`.
- If `classifyDocumentComponents(["Căn cứ: Luật Doanh nghiệp"], 'ADMINISTRATIVE')` does not match `LEGAL_BASIS`.
