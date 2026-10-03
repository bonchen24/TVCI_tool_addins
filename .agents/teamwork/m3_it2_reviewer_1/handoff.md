# Milestone 3 Review & Adversarial Challenge Report

**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Role**: M3 Iteration 2 Reviewer 1 (`m3_it2_reviewer_1`)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Handoff Type**: Hard  
**Verdict**: **APPROVE**  
**Date**: 2026-09-29  

---

## 1. Observation

File inspections across `web_app/src/rules/` and `web_app/tests/unit/` reveal exact implementations and fixes:

1. **`web_app/src/rules/auto-detect.service.ts`**:
   - Lines 13–21: `removeTones(str: string | null | undefined)` guards against nullish inputs using `String(str || '')` prior to calling `.normalize('NFD')`.
   - Lines 34–36, 52–54: `detectDocumentContext(paragraphs: (string | null | undefined)[])` validates array existence and converts elements via `sample.map((p) => String(p || '')).join('\n')`.
   - Line 100: Iteration loop passes `p` into `removeTones(p)` safely without throwing `TypeError`.

2. **`web_app/src/rules/component-classifier.ts`**:
   - Lines 45–47: `normalize(text: string | null | undefined)` applies `String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim()`.
   - Lines 49–53: `isUppercaseVietnamese(text: string | null | undefined)` composes text to NFC (`String(text || '').normalize('NFC').trim()`), counts letters with `nfc.match(/[A-Za-zÀ-ỹĐđ]/g) || []`, and compares against `nfc.toLocaleUpperCase('vi-VN')`.
   - Lines 62–68: `isSignerRole(text: string | null | undefined)` strips the hard requirement for `isUppercaseVietnamese` and evaluates case-insensitive prefixes `/^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ\s+|GIÁM ĐỐC|TỔNG GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ|TRƯỞNG|HIỆU TRƯỞNG|VIỆN TRƯỞNG|CHÁNH VĂN PHÒNG)/i`, permitting Title Case values like `Giám đốc` or `Phó Giám đốc`.
   - Lines 151–161: Agency recognition checks `index < 4 && isAgencyKeyword` where `isAgencyKeyword` matches `/^(BỘ|TẬP ĐOÀN|TỔNG CÔNG TY|VIỆN|TRUNG TÂM|CÔNG TY|SỞ|BAN|UBND|ỦY BAN NHÂN DÂN|UỶ BAN NHÂN DÂN|HỘI ĐỒNG|CỤC|CHI CỤC|TRƯỜNG)(?:\s+|$|[.,:;/-])/i`, recognizing Title Case agency names (`Trung tâm Thử nghiệm...`) in lines 0 to 3.
   - Line 123: Legal basis classifier uses `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i`, accommodating colons.

3. **`web_app/src/rules/component-validator.ts`**:
   - Lines 100–120: In `validateComponentParagraph`, when `type === 'SIGNER_ROLE'`, checks `text && text !== upper`. If Title Case, emits issue with `ruleId: 'signer.role.uppercase'`, `category: 'signer'`, `componentType: 'SIGNER_ROLE'`, `severity: 'warning'`, `status: 'FAIL'`, `autoFixable: true`, and `fixValue: upper`.

4. **`web_app/src/rules/document-evaluator.ts`**:
   - Lines 57–61: `isBlankDocument` guards all snapshot items: `paragraphSnapshots.every((p) => !p || !p.text || (typeof p.text === 'string' && p.text.trim().length === 0))`.
   - Line 77: `rawTexts = paragraphSnapshots.map((p) => p?.text ?? '')`.
   - Lines 97–102: Multi-line signer block expansion reserves indices `signerRoleComp.index` through `signerRoleComp.index + 4` in `componentIndices`.
   - Lines 107 & 117: Loops defensively extract text with `pText = paragraphSnapshots[i]?.text?.trim() ?? ''`.
   - Line 118: Multi-line legal basis check mirrors regex `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i`.
   - Lines 123–125: `bodyParagraphs` filters out any index present in `componentIndices`, ensuring `SIGNER_ROLE` paragraphs are never evaluated as general body.
   - Lines 857–889: Because `signerRole` is detected, `component.SIGNER_ROLE.missing` is not generated; instead, `validateComponentParagraph` is run, reporting `signer.role.uppercase` as an auto-fixable warning.

5. **`web_app/src/rules/auto-fixer.ts`**:
   - Lines 37–49: `issueToPatch` extracts `patch.textReplacement = String(issue.fixValue ?? rawVal)` for `text.*` and `signer.role.uppercase` rules.
   - Lines 268–277: `applyFormattingPatch` applies `tr.replaceWith` while preserving existing marks (`targetNode.firstChild?.marks`).
   - Lines 339, 375–383, 385–390: `applySafeFixes` maps descendant positions with `tr.mapping.map(pos)` across previous text replacements, executes atomic replacements, and updates mark boundaries accordingly.

6. **`web_app/tests/unit/format-engine.test.ts` & `auto-fixer.test.ts`**:
   - Lines 299–338: Tests null, undefined, empty, and whitespace snapshot inputs without throwing.
   - Lines 340–409: Tests Unicode NFD diacritics end-to-end; confirms no missing component errors.
   - Lines 411–459: Tests Title Case signer role `Giám đốc` classification, verifying `signer.role.uppercase` emission and confirming body alignment/indentation rules remain `PASS`.
   - Lines 461–471: Tests legal basis with colon `Căn cứ: ...`.
   - Lines 473–485: Tests Title Case agency name in header lines.
   - `auto-fixer.test.ts` lines 214–304: Tests text replacement, 100% convergence across mixed format/punctuation errors, and mark retention.

---

## 2. Logic Chain

1. **Integrity & Authenticity**:
   - Inspection confirms no hardcoded results, dummy facades, or bypassed logic. All changes implement general, spec-compliant algorithmic checks.
2. **Null Safety & Resilience**:
   - Defensive string coercion (`String(x || '')` and optional chaining `?.`) eliminates runtime unhandled `TypeError` exceptions during snapshot parsing of sparse or malformed ASTs.
3. **Unicode Conformance (NFC vs. NFD)**:
   - Converting all input text to NFC before regex and character evaluation guarantees interoperability with decomposed Unicode generated by macOS Telex or Word DOCX text runs.
4. **Classification Separation & Graceful Validation**:
   - Decoupling `isSignerRole` and header agency identification from strict all-caps requirements allows the classifier to correctly partition Title Case headers and signers into their designated administrative components instead of dumping them into the body text.
   - Emitting `signer.role.uppercase` in `component-validator.ts` flags the style violation as an auto-fixable warning rather than triggering a false `MISSING` component error.
5. **Atomic Auto-Fixer Convergence**:
   - Extending `FormattingPatch` with `textReplacement` and tracking position offsets using ProseMirror's `tr.mapping.map(pos)` ensures safe, conflict-free document updates during multi-issue repairs.

---

## 3. Caveats

- In accordance with the critical execution rule, no terminal commands (`run_command`) were executed. All verifications were completed via source inspection and AST trace analysis.
- Third-party packages (e.g., Tiptap, ProseMirror) are assumed to uphold their standard schema contracts.

---

## 4. Conclusion

The remediated format engine, component classifier, validator, and auto-fixer satisfy all requirements set forth in Milestone 3 Iteration 2. No integrity violations or regressions were found.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To verify independently in an interactive CLI environment:
```bash
npm test web_app/tests/unit/format-engine.test.ts
npm test web_app/tests/unit/auto-fixer.test.ts
npm run typecheck
```

Invalidation conditions:
- `classifyDocumentComponents(["Giám đốc"], 'ADMINISTRATIVE')` returning empty array.
- `evaluateDocumentRules([{ id: '1', text: null as any }])` throwing an unhandled exception.
- `applySafeFixes` drifting paragraph positions or erasing node marks upon text replacement.
