# Milestone 3 Iteration 2 Reviewer 2 Handoff Report

**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Role**: M3 Iteration 2 Reviewer 2 (`m3_it2_reviewer_2`)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Verdict**: **APPROVE**  
**Handoff Type**: Hard  
**Date**: 2026-09-29  

---

## 1. Observation

Direct code examination via file inspection tools showed:

1. **`web_app/src/rules/models.ts`** (line 111):
   ```ts
   export interface FormattingPatch {
     paragraphIndex?: number;
     fontName?: string;
     ...
     textReplacement?: string;
     pageMargins?: { ... };
   }
   ```
   `textReplacement?: string;` declared in `FormattingPatch`.

2. **`web_app/src/rules/auto-fixer.ts`** (lines 38-49):
   ```ts
   // 0. Text Replacement (Punctuation, Addressee, Recipients, Legal Basis, Signer Role Uppercase)
   if (
     (issue.ruleId.startsWith('text.') ||
       ruleId.startsWith('TEXT.') ||
       ruleId.includes('PUNCTUATION') ||
       ruleId.includes('COLON') ||
       issue.ruleId === 'signer.role.uppercase' ||
       ruleId.includes('SIGNER.ROLE.UPPERCASE')) &&
     (issue.fixValue !== undefined || typeof rawVal === 'string')
   ) {
     patch.textReplacement = String(issue.fixValue ?? rawVal);
     return patch;
   }
   ```
   Lines 180-182 handle fallback `case 'textReplacement': patch.textReplacement = String(rawVal); break;`. `issueToPatch` extracts `patch.textReplacement = String(issue.fixValue ?? rawVal)` for text, punctuation, colon, and uppercase signer issues.

3. **`web_app/src/rules/auto-fixer.ts`** (lines 268-285):
   ```ts
   const schema = editor.state.schema;
   if (patch.textReplacement !== undefined && targetNode.isTextblock) {
     const from = targetPos + 1;
     const to = targetPos + targetNode.nodeSize - 1;
     if (patch.textReplacement.length === 0) {
       if (from < to) tr.delete(from, to);
     } else {
       tr.replaceWith(from, to, schema.text(patch.textReplacement, targetNode.firstChild?.marks));
     }
   }

   // Apply inline text marks if node has content
   const from = targetPos + 1;
   const to =
     patch.textReplacement !== undefined
       ? from + patch.textReplacement.length
       : targetPos + targetNode.nodeSize - 1;
   ```
   `applyFormattingPatch` replaces text with `tr.replaceWith(from, to, schema.text(patch.textReplacement, targetNode.firstChild?.marks))`. Guard for `patch.textReplacement.length === 0` uses `tr.delete(from, to)`, avoiding ProseMirror `RangeError: Empty text nodes are not allowed`. Marks from `targetNode.firstChild?.marks` preserved. Inline mark changes applied to recalculated text span `[from, from + patch.textReplacement.length]`.

4. **`web_app/src/rules/auto-fixer.ts`** (lines 338-340 & 375-389):
   ```ts
   const targetPos = tr.mapping.map(pos);
   const targetNode = tr.doc.nodeAt(targetPos) ?? node;
   ...
   if (patch.textReplacement !== undefined && targetNode.isTextblock) {
     const repFrom = targetPos + 1;
     const repTo = targetPos + targetNode.nodeSize - 1;
     if (patch.textReplacement.length === 0) {
       if (repFrom < repTo) tr.delete(repFrom, repTo);
     } else {
       tr.replaceWith(repFrom, repTo, schema.text(patch.textReplacement, targetNode.firstChild?.marks));
     }
   }
   ```
   `applySafeFixes` traverses `editor.state.doc.descendants`. Mapped position `targetPos = tr.mapping.map(pos)` tracks position drift across preceding text edits in earlier paragraphs. `targetNode` retrieved from `tr.doc.nodeAt(targetPos)`. All mutations batched into single atomic transaction `tr` and dispatched once at line 414: `editor.view.dispatch(tr)`.

5. **`web_app/tests/unit/auto-fixer.test.ts`** (lines 214-304):
   - Lines 214-237: `converts text punctuation issue to textReplacement patch and applies fix` verifies `applySingleFix` on `text.addressee.colon` updates text to `Kính gửi: Ban Giám đốc` and resolves issue on re-audit.
   - Lines 239-277: `applies safe fixes to document with text punctuation errors and achieves 100% convergence` tests document with 12 paragraphs, multiple styling errors, plus `text.addressee.colon` (paragraph 7) and `text.recipients.colon` (paragraph 11). `applySafeFixes` resolves all errors, handles position shift (+1 char drift), and reaches 100% health score.
   - Lines 279-304: `preserves existing text marks when replacing punctuation` tests `<p><b>Kính gửi Ban Giám đốc</b></p>` -> `<p><b>Kính gửi: Ban Giám đốc</b></p>`, verifying `snapshots[0].bold === true`.

6. **Integrity & Anti-Cheat Check**:
   Grep query for test strings (`Kính gửi Ban Giám đốc`) across `web_app/src/` returned zero matches. No hardcoded test outputs, dummy implementations, or fake mocks detected. Logic uses dynamic properties `issue.fixValue ?? rawVal` and ProseMirror primitives.

---

## 2. Logic Chain

1. **Step 1 (Interface Contract)**: Observation 1 confirms `FormattingPatch` in `models.ts` defines `textReplacement?: string;`. Auto-fixer patches can carry text mutations alongside paragraph formatting attributes.
2. **Step 2 (Patch Extraction)**: Observation 2 confirms `issueToPatch` intercepts rule IDs starting with `text.`, containing `PUNCTUATION` / `COLON`, or `signer.role.uppercase`, populating `patch.textReplacement = String(issue.fixValue ?? rawVal)`. Punctuation and casing fixes convert to text mutations.
3. **Step 3 (Mark Preservation & Empty Safety)**: Observation 3 confirms `applyFormattingPatch` applies `schema.text(patch.textReplacement, targetNode.firstChild?.marks)`. Existing bold/italic formatting preserved. Empty string deletion bypasses ProseMirror empty text node restriction. Target range recalculation prevents mark clipping.
4. **Step 4 (Position Drift Tracking in Atomic Transactions)**: Observation 4 confirms `applySafeFixes` uses `tr.mapping.map(pos)` during document traversal. Edits in earlier nodes shift document positions; subsequent nodes map accurately to their shifted offsets in `tr.doc`. Single atomic transaction dispatched at end.
5. **Step 5 (Verification Coverage)**: Observation 5 confirms comprehensive Vitest test coverage for single fix, multi-node drift fix, and mark preservation. Observation 6 confirms zero integrity violations.

---

## 3. Caveats

- Terminal execution (`run_command`) prohibited by execution constraint; all verification performed via static code inspection and AST analysis.
- Minor defensive suggestion: in `auto-fixer.ts` line 39, `issue.ruleId.startsWith('text.')` assumes `issue.ruleId` is non-null. `ValidationIssue.ruleId` is required in TypeScript, but using `(issue.ruleId || '').startsWith('text.')` is marginally safer.

---

## 4. Conclusion

Remediated Auto-Fixer text mutation logic satisfies all specification requirements:
- `models.ts`: `textReplacement` field present.
- `auto-fixer.ts`: `issueToPatch` extracts fix values for text/punctuation/casing rules.
- `auto-fixer.ts`: `applyFormattingPatch` replaces text and preserves node marks.
- `auto-fixer.ts`: `applySafeFixes` maps position drift across atomic transaction.
- `auto-fixer.test.ts`: test suite covers edge cases and verifies 100% convergence.
- Integrity: 100% clean.

Verdict: **APPROVE**.

---

## 5. Verification Method

### File Inspection Targets:
- `web_app/src/rules/models.ts`: line 111
- `web_app/src/rules/auto-fixer.ts`: lines 38-49, 180-182, 268-285, 338-340, 375-389
- `web_app/tests/unit/auto-fixer.test.ts`: lines 214-304

### Verification Command (when run in runner environment):
```bash
npm test web_app/tests/unit/auto-fixer.test.ts
npm run typecheck
```

### Invalidation Conditions:
- If `applySingleFix` on `text.addressee.colon` drops bold mark on `<p><b>Kính gửi Ban Giám đốc</b></p>`, implementation invalid.
- If `applySafeFixes` corrupts node positions when fixing multiple text errors in single document, implementation invalid.
- If empty string replacement throws ProseMirror `RangeError`, implementation invalid.
