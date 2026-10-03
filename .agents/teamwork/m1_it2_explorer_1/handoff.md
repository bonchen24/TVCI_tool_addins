# Handoff Report: Remediation & Test Specifications for `tiptap-adapter.ts`

**Agent**: M1 Iteration 2 Explorer 1  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_it2_explorer_1\`  
**Target Recipient**: Parent Agent (`c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`)  
**Type**: Hard Handoff  
**Timestamp**: 2026-09-29T03:13:00Z  

---

## 1. Observation

1. **Target File**: `web_app/src/editor/tiptap-adapter.ts:56-86`
   ```typescript
   export function applyPatchToEditorNode(
     editor: Editor,
     nodeIndex: number,
     patch: FormattingPatch
   ): void {
     let currentIndex = 0;
     editor.state.doc.descendants((node, pos) => {
       if (node.type.name === 'paragraph' || node.type.name === 'heading') {
         if (currentIndex === nodeIndex) {
           const updates: Record<string, any> = { ...node.attrs };
           if (patch.fontName) updates.fontFamily = patch.fontName;
           if (patch.fontSize) updates.fontSize = patch.fontSize;
           if (patch.lineSpacingMultiple) updates.lineSpacing = patch.lineSpacingMultiple;
           if (patch.spaceBefore !== undefined) updates.spaceBefore = patch.spaceBefore;
           if (patch.spaceAfter !== undefined) updates.spaceAfter = patch.spaceAfter;
           if (patch.firstLineIndentMm !== undefined) updates.firstLineIndentMm = patch.firstLineIndentMm;

           if (patch.alignment) {
             const align = patch.alignment.toLowerCase();
             updates.textAlign = align === 'centered' ? 'center' : align;
           }

           const tr = editor.state.tr.setNodeMarkup(pos, undefined, updates);
           editor.view.dispatch(tr);
           return false;
         }
         currentIndex++;
       }
       return true;
     });
   }
   ```
   - In ProseMirror, `doc.descendants` returning `false` only halts subtree descent for `node`. Sibling traversal continues.
   - When `currentIndex === nodeIndex`, `return false` halts execution before `currentIndex++` (line 82) is evaluated.
   - For all subsequent sibling paragraphs and headings, `currentIndex === nodeIndex` remains `true`.
   - Every subsequent paragraph and heading is mutated with `patch` and an individual transaction is dispatched during traversal.

2. **Alignment Mapping Defect**: `web_app/src/editor/tiptap-adapter.ts:73-76`
   - `models.ts:1` defines `SupportedAlignment = 'Left' | 'Centered' | 'Right' | 'Justified'`.
   - `patch.alignment === 'Justified'` produces `updates.textAlign = 'justified'`.
   - `web_app/src/editor/extensions.ts:439-443` configures `TextAlign` with `alignments: ['left', 'center', 'right', 'justify']`.
   - `'justified'` is not in `TextAlign` schema.

3. **Falsy & Boundary Defects**: `web_app/src/editor/tiptap-adapter.ts:67-68`
   - `if (patch.fontSize)` and `if (patch.lineSpacingMultiple)` drop `0` because `0` is falsy in JavaScript.
   - Extreme boundary values (`fontSize: 999`, `lineSpacingMultiple: 10.0`, `firstLineIndentMm: -20`) are written directly without sanitization, violating `web_app/e2e-tests/runner.js:819-838`.

4. **Malformed AST Crash**: `web_app/src/editor/tiptap-adapter.ts:6-54`
   - `tiptapDocToSnapshots` lacks null/type guard on `doc` and assumes `node.content` is always a valid array of objects.

5. **Existing Unit Test Coverage**: `web_app/tests/unit/tiptap-adapter.test.ts:111-136`
   - Tests only a single paragraph, failing to catch cascade mutations across siblings.

---

## 2. Logic Chain

1. **Cascade Elimination**:
   - By recording `targetPos` and `targetAttrs` during `doc.descendants` traversal and guarding with `if (targetPos !== null) return false;`, the traversal stops checking following paragraphs.
   - By hoisting `editor.view.dispatch(tr)` outside of `doc.descendants`, only one transaction is dispatched, targeting precisely `targetPos`.
2. **Alignment Normalization**:
   - Normalizing `toLowerCase()` and mapping `'justified' | 'justify'` -> `'justify'`, and `'centered' | 'center'` -> `'center'`, aligns directly with Tiptap's `TextAlign` extension and `attrs.textAlign === 'justify'` in `tiptapDocToSnapshots`.
3. **Falsy Checks & Boundary Clamping**:
   - Replacing `if (patch.fontSize)` with `if (patch.fontSize !== undefined)` ensures zero values are preserved.
   - Clamping `fontSize` to `[6, 72]`, `lineSpacing` to `[1.0, 2.0]`, and indent/margins to `>= 0` satisfies Tier 2 boundary specifications in `web_app/e2e-tests/runner.js:827-838`.
4. **Defensive AST Ingestion**:
   - Guarding `!doc || typeof doc !== 'object'` and validating `Array.isArray(node.content)` prevents unhandled TypeErrors when processing corrupted DOCX imports or malformed editor state.
5. **Multi-Paragraph Test Specification**:
   - Testing 3 paragraphs and asserting that patching paragraph 1 leaves paragraph 0 and paragraph 2 strictly untouched guarantees non-regression.

---

## 3. Caveats

1. `applyPatchToEditorNode` targets block node attributes (`paragraph` and `heading`). Inline formatting marks (`bold`, `italic`, `underline`) are applied to text nodes, which are managed at the selection/range level in ProseMirror, not block markup.
2. Clamping for `lineSpacingMultiple` is set to `Math.min(2.0, Math.max(1.0, patch.lineSpacingMultiple))` per `web_app/e2e-tests/runner.js:827-831`. If future custom templates require line spacing up to `2.5x`, the upper clamp can be adjusted to `2.5`.
3. This report provides exact remediation code and test specifications without directly modifying files in `src/` or `tests/`, strictly adhering to the read-only explorer constraint.

---

## 4. Conclusion

The exact remediation for `web_app/src/editor/tiptap-adapter.ts` and test specifications for `web_app/tests/unit/tiptap-adapter.test.ts` are fully formulated and detailed in `analysis.md`.

Summary of code remediations:
- **`applyPatchToEditorNode`**:
  - Implements target pos guard pattern `targetPos !== null` to prevent traversal cascade.
  - Normalizes alignment: `'Justified'`/`'justify'` -> `'justify'`, `'Centered'`/`'center'` -> `'center'`.
  - Replaces falsy checks with `!== undefined`.
  - Clamps `fontSize` to `[6, 72]`, `lineSpacing` to `[1.0, 2.0]`, `firstLineIndentMm` to `>= 0`, `spaceBefore`/`spaceAfter` to `>= 0`.
  - Executes single transaction dispatch outside traversal.
- **`tiptapDocToSnapshots`**:
  - Adds `!doc || typeof doc !== 'object'` early exit returning `[]`.
  - Uses `Array.isArray(node.content)` and safe property extraction for texts and marks.
- **`tiptap-adapter.test.ts`**:
  - Adds 3-paragraph isolation test verifying that paragraph 0 and 2 are untouched when patching paragraph 1.
  - Adds alignment normalization test.
  - Adds boundary value clamping test.
  - Adds malformed JSONContent defensive test.

---

## 5. Verification Method

1. **File Inspection**:
   - Review proposed code in `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_it2_explorer_1\analysis.md`.
2. **Execution Commands**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm test
   npx vitest run tests/unit/tiptap-adapter.test.ts
   npm run typecheck
   node e2e-tests/runner.js
   ```
3. **Invalidation Conditions**:
   - If calling `applyPatchToEditorNode(editor, 1, patch)` in a 3-paragraph document alters attributes of paragraph 0 or 2.
   - If `patch.alignment = 'Justified'` results in `attrs.textAlign === 'justified'` instead of `'justify'`.
   - If `patch.fontSize = 0` is ignored rather than clamped to `6`.
   - If `tiptapDocToSnapshots(null as any)` throws an unhandled exception.
