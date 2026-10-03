# Milestone 3 Handoff Report: One-Click Safe Auto-Fixer & Unit Test Suites

## 1. Observation

- **Existing Fixer**:
  - `src/rules/fixer.ts` lines 7-29: `issueToPatch(issue: ValidationIssue)` maps single fields based on `issue.ruleId`. Throws error if rule ID doesn't match standard prefixes (`default: throw new Error(...)`).
  - Lacks composite multi-issue grouping, doesn't handle text marks (`bold`, `italic`, `underline`) on nodes, and only supports singular properties.
- **Tiptap Adapter**:
  - `web_app/src/editor/tiptap-adapter.ts` lines 74-142: `applyPatchToEditorNode(editor, nodeIndex, patch)` mutates node attributes via `tr.setNodeMarkup(targetPos, undefined, updates)`.
  - Lines 105-138: Does NOT apply marks (`bold`, `italic`, `underline`) to inline text within the paragraph node.
  - Traverses `editor.state.doc.descendants()` per patch call; multiple calls create multiple separate transactions and undo steps.
- **E2E Auto-Fixer Specs**:
  - `web_app/e2e-tests/tier1-feature/f12_autofix_engine.test.ts` lines 22-43: Tests `issueToPatch` mapping for `FONT_NAME`, `BODY_ALIGNMENT`, `BODY_INDENT`, `PAGE_MARGINS`, `BODY_LINE_SPACING`.
  - Lines 80-105: Verifies filtering of non-autoFixable issues (e.g. `MISSING_SIGNER_NAME` with `autoFixable: false`).
  - Lines 123-135: Verifies batching multiple patches for atomic single-transaction execution.
- **Rule Evaluator Issues**:
  - `src/rules/document-evaluator.ts` lines 558-749: Generates issues with `ruleId` format `body.<field>` (e.g. `body.fontName`, `body.fontSize`, `body.alignment`, `body.firstLineIndentMm`, `body.lineSpacingMultiple`, `body.spaceBefore`, `body.spaceAfter`).
  - Lines 824-862: Generates `signer.name.font`, `signer.name.size`, `signer.name.bold`.
  - `src/rules/component-validator.ts` lines 48-59: Generates `component.<TYPE>.<field>`.
- **Existing Test Execution in `web_app`**:
  - Running `npm test` in `web_app`:
    - 7 test files (63 tests) pass cleanly.
    - `tests/unit/editor-extensions.test.ts` fails with `SyntaxError: No node type or group 'tableHeader' found` because `TableHeader` extension was omitted from test editor instances.
    - `tests/unit/components.test.tsx` throws an unhandled error: `TypeError: editor.chain(...).focus(...).setParagraph is not a function` at `EditorToolbar.tsx:276` because `AdministrativeParagraph` overrides commands without defining `setParagraph`.

---

## 2. Logic Chain

1. **Mapping and Deduplication**:
   - `ValidationIssue` objects arrive from `evaluateDocumentRules()`.
   - Issues are filtered for `autoFixable: true`.
   - `resolveIssueNodeIndex(issue)` maps `issue.targetId` (`"node-X"`) or `issue.paragraphIndex` to an integer `nodeIndex`.
   - Multiple issues targeting the same `nodeIndex` (e.g., font + size + alignment) are grouped into a single merged `FormattingPatch` in `groupFixableIssues(issues)`. This avoids conflicting or overwriting mutations on the same node.
2. **ProseMirror Transaction Atomicity**:
   - Sequential calls to `applyPatchToEditorNode` dispatch individual transactions, causing $N$ renders and $N$ history entries.
   - Batching all node patches in a single transaction via `applySafeFixes(editor, issues)` traverses `editor.state.doc.descendants()` once, updates node attributes with `setNodeMarkup`, updates inline marks (`bold`, `italic`, `underline`) with `addMark`/`removeMark`, and dispatches once.
3. **Typography Standard Convergence**:
   - Standard NĐ 30 parameters are applied:
     - Font family: `'Times New Roman'`.
     - Font size: Standard per component (Quốc hiệu 12pt, Tiêu ngữ 13pt bold, Thân bài 13pt, Nơi nhận 11pt, Người ký 13pt bold).
     - Alignment: Quốc hiệu/Tiêu ngữ/Chức vụ centered, Thân bài justified, Nơi nhận left.
     - Indent: 10mm.
     - Line spacing: 1.2x.
   - Re-extracting snapshots via `tiptapDocToSnapshots(editor.getJSON())` after `applySafeFixes` produces fully compliant snapshots.
   - Re-running `evaluateDocumentRules` produces `healthScore === 100` and `issueCount === 0`.
4. **Test Suite Completeness**:
   - 4 independent test suites verify the complete lifecycle:
     - `format-engine.test.ts`: Evaluation logic, margin checks, component validation.
     - `multi-profile.test.ts`: Multi-profile switching and profile-specific rules.
     - `auto-fixer.test.ts`: Issue mapping, filtering, merging, atomic execution, and 100% convergence.
     - `audit-panel.test.tsx`: Sidebar UI interactions, health score badge, issue cards, fix buttons, empty state.

---

## 3. Caveats

- **Missing Text Non-Fixable**: Issues where required text is entirely missing (`MISSING_SIGNER_NAME`, `missing:national_emblem`) have `autoFixable: false` and are intentionally skipped by formatting auto-fixer. 100% health score convergence applies to documents containing necessary structural elements with non-compliant formatting.
- **Page Margin Target**: Page margin issues (`targetId: "page"`) affect the document page setup (`PageSetupSnapshot`) rather than individual paragraph nodes. They are handled via page setup configuration.

---

## 4. Conclusion

The One-Click Safe Auto-Fixer (`web_app/src/rules/auto-fixer.ts`) must implement:
1. `issueToPatch(issue: ValidationIssue): FormattingPatch | null`
2. `resolveIssueNodeIndex(issue: ValidationIssue): number | null`
3. `groupFixableIssues(issues: ValidationIssue[]): Map<number, FormattingPatch>`
4. `applySafeFixes(editor: Editor, issues: ValidationIssue[]): { appliedCount: number; fixedNodeCount: number }`
5. `applyFormattingPatch(editor: Editor, nodeIndex: number, patch: FormattingPatch): void`

The 4 unit test suites are fully specified in `analysis.md` and ready for implementation.

---

## 5. Verification Method

1. **Verify Files**:
   - Inspect `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_explorer_3\analysis.md` for full technical specifications.
2. **Execute Existing Test Suite**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm test
   ```
3. **Execution of M3 Test Suites (once implemented by worker)**:
   ```bash
   npm test tests/unit/format-engine.test.ts
   npm test tests/unit/multi-profile.test.ts
   npm test tests/unit/auto-fixer.test.ts
   npm test tests/unit/audit-panel.test.tsx
   ```
4. **Invalidation Conditions**:
   - Auto-fixer dispatches multiple transactions instead of single atomic transaction.
   - Non-autoFixable issues are incorrectly patched.
   - Bold/italic text marks are ignored by auto-fixer.
   - Re-running audit after applying fixes to an unstandardized document does not reach 100% health score.
