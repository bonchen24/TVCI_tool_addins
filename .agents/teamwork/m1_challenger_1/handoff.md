# Adversarial Challenge Report — Milestone 1: `core-platform-editor`

**Agent**: M1 Challenger 1  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_challenger_1\`  
**Target Parent**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Target Codebase**: `e:\CODING\TVCI_word_addins\web_app`  
**Verdict**: **CHALLENGE**  
**Overall Risk Assessment**: **HIGH**

---

## 1. Observation

1. **Alignment Patch Translation in `web_app/src/editor/tiptap-adapter.ts:73-76`**:
   ```typescript
   73:         if (patch.alignment) {
   74:           const align = patch.alignment.toLowerCase();
   75:           updates.textAlign = align === 'centered' ? 'center' : align;
   76:         }
   ```
   Tiptap `TextAlign` extension configuration in `web_app/src/editor/extensions.ts:439-443`:
   ```typescript
   439:   TextAlign.configure({
   440:     types: ['paragraph', 'heading'],
   441:     alignments: ['left', 'center', 'right', 'justify'],
   442:     defaultAlignment: 'justify',
   443:   }),
   ```
   `models.ts:1` defines `SupportedAlignment = 'Left' | 'Centered' | 'Right' | 'Justified'`.
   When `patch.alignment === 'Justified'`, `align` becomes `'justified'`.
   Line 75 sets `updates.textAlign = 'justified'`, NOT `'justify'`. `'justified'` is not in `TextAlign`'s allowed alignments list (`['left', 'center', 'right', 'justify']`).
   In the same file (`tiptap-adapter.ts:25`), reading alignment checks `attrs.textAlign === 'justify'`.

2. **Falsy Check on Numeric Attributes in `web_app/src/editor/tiptap-adapter.ts:67-68`**:
   ```typescript
   67:         if (patch.fontSize) updates.fontSize = patch.fontSize;
   68:         if (patch.lineSpacingMultiple) updates.lineSpacing = patch.lineSpacingMultiple;
   ```
   Whereas lines 69-71 use explicit undefined checks:
   ```typescript
   69:         if (patch.spaceBefore !== undefined) updates.spaceBefore = patch.spaceBefore;
   70:         if (patch.spaceAfter !== undefined) updates.spaceAfter = patch.spaceAfter;
   71:         if (patch.firstLineIndentMm !== undefined) updates.firstLineIndentMm = patch.firstLineIndentMm;
   ```
   When `patch.fontSize === 0` or `patch.lineSpacingMultiple === 0`, `if (patch.fontSize)` evaluates to `false`. The update is silently ignored.

3. **Unhandled TypeErrors on Malformed JSON in `web_app/src/editor/tiptap-adapter.ts:10-20, 32, 46`**:
   ```typescript
   10:   function traverse(node: JSONContent, currentContext?: string) {
   ...
   13:     if (node.type === 'tableCell' && node.attrs?.cellType) {
   ...
   18:       const text = node.content?.map((c) => c.text || '').join('') || '';
   ...
   32:         bold: Boolean(node.content?.some((c) => c.marks?.some((m) => m.type === 'bold'))),
   ...
   46:       for (const child of node.content) {
   47:         traverse(child, nextContext);
   48:       }
   ```
   - If `doc` is `null` or `undefined`, `traverse(doc)` throws `TypeError: Cannot read properties of null (reading 'type')`.
   - If `node.content` contains a `null` item (e.g., `[null]`), `c.text` on line 18 throws `TypeError: Cannot read properties of null (reading 'text')`.
   - If `node.content` is not an array (e.g. malformed JSON `{ type: 'paragraph', content: {} }`), line 18 throws `TypeError: node.content.map is not a function`.

4. **Missing Clamping / Normalization against Tier 2 Boundary Specifications in `web_app/e2e-tests/runner.js:827-838`**:
   `runner.js` defines boundary requirements:
   - Line 827-831: Extreme line spacing (0.1x or 10.0x) must clamp to administrative range (1.0x to 2.0x).
   - Line 832-835: Absurd font sizes (< 6pt or > 72pt) must be detected and corrected.
   - Line 836-838: Negative indentations must be normalized to zero (`Math.max(0, -10)`).
   `applyPatchToEditorNode` has no boundary checks, writing raw unbounded numbers (`fontSize: 999`, `firstLineIndentMm: -20`, `spaceBefore: -10`) directly into node markup.

5. **Test Runner Execution Result**:
   `node web_app/e2e-tests/runner.js --filter="f02"` and `boundary` suites in `runner.js` pass feature-level checks in the runner, but white-box stress analysis of `tiptap-adapter.ts` reveals these latent adapter-level defects.

---

## 2. Logic Chain

1. **Step 1 (Alignment Mismatch)**:
   - Observation 1 shows `FormattingPatch` alignment `'Justified'` converts to `'justified'`.
   - Observation 1 shows Tiptap `TextAlign` only accepts `'justify'`.
   - Therefore, applying an auto-fix patch with `alignment: 'Justified'` corrupts the Tiptap node attribute and breaks CSS rendering.

2. **Step 2 (Falsy 0 Drop)**:
   - Observation 2 shows `patch.fontSize` and `patch.lineSpacingMultiple` use truthiness checks.
   - In JavaScript, `0` is falsy.
   - Therefore, a patch attempting to set `fontSize: 0` or `lineSpacingMultiple: 0` is silently dropped, while sibling attributes (`spaceBefore: 0`) succeed because they check `!== undefined`.

3. **Step 3 (Adapter Crash on Malformed Inputs)**:
   - Observation 3 shows `traverse` directly accesses `node.type` and iterates `node.content` without verifying `node` is non-null and `node.content` elements are valid objects.
   - Therefore, malformed ASTs from corrupted imports or unexpected editor plugins will crash the entire application with unhandled TypeErrors.

4. **Step 4 (Boundary Value Pass-Through)**:
   - Observation 4 shows `applyPatchToEditorNode` blindly accepts negative margins and out-of-range font sizes without clamping.
   - This violates the boundary contracts laid out in `runner.js` Tier 2.

---

## 3. Caveats

1. The test runner `runner.js` contains opaque-box assertions that test individual helper functions rather than mounting full headless ProseMirror views.
2. In normal user interactions, Tiptap UI controls prevent entering negative indentation directly from the toolbar; however, the adapter is an open interface contract for Milestone 3 (auto-fixer) and Milestone 5 (AI edits), so the adapter must be defensively hardened.

---

## 4. Conclusion & Verdict

**Verdict**: **CHALLENGE**

The implementation in `web_app/src/editor/tiptap-adapter.ts` has 2 critical/high functional defects and 2 defensive gaps that will cause regression in Milestone 3 auto-fixing and DOCX import:
1. `patch.alignment === 'Justified'` sets `textAlign: 'justified'` instead of `'justify'`.
2. `patch.fontSize === 0` and `patch.lineSpacingMultiple === 0` are silently ignored due to falsy checks.
3. Lack of null checks causes unhandled TypeErrors on malformed JSONContent nodes.
4. Negative indents and extreme font sizes are passed un-sanitized.

### Recommended Fix for Worker:
In `web_app/src/editor/tiptap-adapter.ts`:
1. Fix alignment mapping:
   ```typescript
   if (patch.alignment) {
     const align = patch.alignment.toLowerCase();
     if (align === 'centered' || align === 'center') updates.textAlign = 'center';
     else if (align === 'justified' || align === 'justify') updates.textAlign = 'justify';
     else updates.textAlign = align;
   }
   ```
2. Fix numeric checks and clamp bounds:
   ```typescript
   if (patch.fontSize !== undefined) {
     updates.fontSize = Math.min(72, Math.max(6, patch.fontSize));
   }
   if (patch.lineSpacingMultiple !== undefined) {
     updates.lineSpacing = Math.min(2.5, Math.max(1.0, patch.lineSpacingMultiple));
   }
   if (patch.firstLineIndentMm !== undefined) {
     updates.firstLineIndentMm = Math.max(0, patch.firstLineIndentMm);
   }
   ```
3. Add defensive guards in `tiptapDocToSnapshots`:
   ```typescript
   function traverse(node: JSONContent | null | undefined, currentContext?: string) {
     if (!node || typeof node !== 'object') return;
     ...
     const text = Array.isArray(node.content)
       ? node.content.map((c) => (c && typeof c === 'object' ? c.text || '' : '')).join('')
       : '';
   ```

---

## 5. Verification Method

1. Inspect `web_app/src/editor/tiptap-adapter.ts:67-76`.
2. Run test case verifying alignment `'Justified'` produces `attrs.textAlign === 'justify'`.
3. Run test case verifying `{ fontSize: 0 }` is not dropped by `if (patch.fontSize)`.
4. Invalidate challenge when `tiptapDocToSnapshots` survives `null`/malformed AST and `applyPatchToEditorNode` normalizes alignment and boundary values.
