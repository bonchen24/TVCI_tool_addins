# Milestone 3 Handoff Report: Auto-Fixer Text Punctuation Replacement

**Agent**: M3 Iteration 2 Explorer 3 (`m3_it2_explorer_3`)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Type**: Hard Handoff (Investigation & Specification Complete)  
**Date**: 2026-09-29  

---

## 1. Observation

Direct code inspections of `web_app/src/rules/` and `web_app/tests/unit/auto-fixer.test.ts` confirmed:

1. **Validators Mark Punctuation Auto-Fixable**:
   - `web_app/src/rules/addressee-validator.ts:21-25`:
     ```ts
     autoFixable: true,
     actual: snapshot.text,
     expected,
     fixValue,
     ```
     Generates `text.addressee.colon`, `text.addressee.noTrailingPunctuation`, `text.addressee.partyPunctuation`, `text.addressee.punctuation`, `text.addressee.finalPunctuation`.
   - `web_app/src/rules/recipients-validator.ts:20-24`:
     ```ts
     autoFixable: true,
     actual: snapshot.text,
     expected,
     fixValue,
     ```
     Generates `text.recipients.colon`, `text.recipients.archivePunctuation`, `text.recipients.itemPunctuation`.
   - `web_app/src/rules/legal-basis-validator.ts:22-26`:
     ```ts
     autoFixable: true,
     actual: snapshot.text,
     expected,
     fixValue,
     ```
     Generates `text.legalBasis.punctuation`, `text.legalBasis.finalPunctuation`.

2. **`issueToPatch` Discards Text Rules**:
   - `web_app/src/rules/auto-fixer.ts:27-171`:
     `issueToPatch` matches only font, size, line spacing, margins, indent, and marks. No branch exists for `text.*` rule IDs or text replacements.
     Calling `issueToPatch` on `text.addressee.colon` yields `{ paragraphIndex: X }` with no action payload.

3. **`applySafeFixes` and `applyFormattingPatch` Never Mutate Text Nodes**:
   - `web_app/src/rules/auto-fixer.ts:249 & 340`: Only calls `tr.setNodeMarkup(pos, undefined, updates)`.
   - `web_app/src/rules/auto-fixer.ts:256-267 & 345-356`: Only calls `tr.addMark` / `tr.removeMark`.
   - Neither function contains any call to `tr.replaceWith` or text node modification.
   - `web_app/src/rules/auto-fixer.ts:366`:
     `appliedCount = issues.filter((i) => i.autoFixable && i.status !== 'PASS').length;`
     Reports all fixable issues as fixed even though text is never updated.

4. **Multi-Node Position Drift in Safe Fix Traversal**:
   - `web_app/src/rules/auto-fixer.ts:304`:
     `editor.state.doc.descendants((node: any, pos: number) => { ... })`
     Iterates over original doc positions without `tr.mapping.map(pos)`. Once any text length changes, subsequent unmapped positions in `tr` become inaccurate.

5. **Unit Test Masking**:
   - `web_app/tests/unit/auto-fixer.test.ts:150-162`:
     The test document handcrafted `Nơi nhận: Như trên` with colons already present and omitted any `Kính gửi` or `Căn cứ` paragraphs, masking the lack of text replacement support.

---

## 2. Logic Chain

1. *Incomplete Patch Translation*:
   Because `issueToPatch` lacks handling for `text.*` and punctuation rules, validation issues with `fixValue` are converted into no-op patches.
2. *ProseMirror Execution Gap*:
   Because `applySafeFixes` and `applyFormattingPatch` only execute `tr.setNodeMarkup` and `tr.addMark`, no text nodes within paragraphs can ever be replaced.
3. *False Audit Resolution Loop*:
   The user clicks "Sửa an toàn", `applySafeFixes` returns `appliedCount > 0`, but the underlying ProseMirror document remains untouched. When re-audit triggers, the text violation reappears, preventing health score convergence.
4. *Remediation Sufficiency*:
   - Adding `textReplacement?: string` to `FormattingPatch` models the content fix.
   - Extracting `patch.textReplacement = issue.fixValue` in `issueToPatch` captures the corrected text.
   - Executing `tr.replaceWith(repFrom, repTo, schema.text(patch.textReplacement, targetNode.firstChild?.marks))` in `applyFormattingPatch` and `applySafeFixes` updates the document text while preserving formatting marks.
   - Using `tr.mapping.map(pos)` in `applySafeFixes` ensures all node positions remain accurate across preceding text mutations within the single atomic transaction.

---

## 3. Caveats

1. Investigation performed via file inspection tools (`view_file`, `grep_search`, `find_by_name`) without terminal command execution (`run_command`), adhering strictly to the execution rule.
2. In ProseMirror, `schema.text("")` throws `RangeError: Empty text nodes are not allowed`. The design specifically includes a guard: if `patch.textReplacement.length === 0`, it calls `tr.delete(repFrom, repTo)` instead of `schema.text("")`.
3. Punctuation rules replace the full text of the paragraph block with `fixValue`. Mixed inline styles within a single paragraph (e.g. half bold, half plain) will inherit `targetNode.firstChild?.marks`. In administrative paragraphs (e.g., `Kính gửi`, `Nơi nhận`), paragraph styling is uniform according to NĐ 30.

---

## 4. Conclusion

The auto-fixer text punctuation replacement requires three synchronized edits:
1. `web_app/src/rules/models.ts`: Add `textReplacement?: string;` to `FormattingPatch`.
2. `web_app/src/rules/auto-fixer.ts`:
   - In `issueToPatch`: Map `issue.ruleId.startsWith('text.')` or punctuation rules with `issue.fixValue` to `patch.textReplacement = String(issue.fixValue)`.
   - In `applyFormattingPatch` and `applySafeFixes`: Replace paragraph text via `tr.replaceWith(from, to, schema.text(patch.textReplacement, targetNode.firstChild?.marks))` and track positions using `tr.mapping.map(pos)`.
3. `web_app/tests/unit/auto-fixer.test.ts`: Add tests for:
   - Single fix of `Kính gửi Ban Giám đốc` -> `Kính gửi: Ban Giám đốc`.
   - Multi-node document with text punctuation errors achieving 100% health score convergence after `applySafeFixes`.
   - Text mark preservation during text replacement.

---

## 5. Verification Method

To verify the proposed implementation once applied:

1. **Static Inspection**:
   - Check `web_app/src/rules/models.ts` contains `textReplacement?: string;` in `FormattingPatch`.
   - Check `web_app/src/rules/auto-fixer.ts` contains `issue.ruleId.startsWith('text.')` branch in `issueToPatch`.
   - Check `applySafeFixes` uses `tr.mapping.map(pos)` and `tr.replaceWith`.

2. **Automated Unit Tests**:
   Execute:
   ```bash
   npm test web_app/tests/unit/auto-fixer.test.ts
   ```
   Assert that:
   - `it('auto-fixes missing colon in Kính gửi addressee block')` passes.
   - `it('applies safe fixes to document with text punctuation errors and achieves 100% convergence')` passes with `healthScore === 100` and `failedRules === 0`.
   - `it('preserves existing text marks when replacing punctuation')` passes.

3. **Invalidation Conditions**:
   - If `issueToPatch` already populates `patch.textReplacement`, this issue is invalid.
   - If `applySafeFixes` already modifies text via `tr.replaceWith`, this issue is invalid.
