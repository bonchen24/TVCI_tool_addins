# Handoff Report — Milestone 1 Iteration 2: Remediation for `EditorToolbar.tsx` and `extensions.ts`

**Agent**: M1 Iteration 2 Explorer 3  
**Target Parent**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_it2_explorer_3\`  
**Date**: 2026-09-29T10:12:45+07:00  

---

## 1. Observation

1. **Preset Command Chain in `EditorToolbar.tsx:272-279`**:
   ```tsx
   onClick={() => {
     editor
       .chain()
       .focus()
       .setTextAlign('justify')
       .resetToAdministrativeStandard()
       .run();
   }}
   ```
   - Observed that `resetToAdministrativeStandard()` only calls `commands.updateAttributes('paragraph', { ... })`.
   - When cursor or selection is on an `AdministrativeHeading` node, `updateAttributes('paragraph')` does not match, failing to convert headings back to body paragraphs.
   - Text marks (`bold`, `italic`, `underline`, `strike`) are not unset, leaving styled/copied text non-compliant with NĐ 30 body text standards.

2. **Single-Node Targeting in `extensions.ts:190-195`**:
   ```ts
   setFontSize:
     (sizePt) =>
     ({ commands }) => {
       return commands.updateAttributes('paragraph', { fontSize: sizePt });
     },
   ```
   - Observed that font size dropdown triggers `setFontSize(size)`, which explicitly updates only `'paragraph'`.
   - Selections on `AdministrativeHeading` nodes (`<h1>`..`<h4>`) ignore the command and retain their previous font size.

3. **Table Attribute Divergence in `extensions.ts:286-298`**:
   - Production extensions define:
     - `isBorderless` (boolean, default `false`, `data-borderless`)
     - `columnRatio` (`'40-60' | '50-50' | 'custom'`, default `'custom'`, `data-column-ratio`)
   - Test fixtures (`e2e-tests/fixtures/documentFixtures.ts:39, 91`) and runner (`e2e-tests/runner.js:169, 200, 313`) declare:
     - `borderless: true`
     - `columnRatios: [0.45, 0.55]` or `[0.5, 0.5]`
   - `AdministrativeTable.renderHTML` (`extensions.ts:303-323`) only checks `node.attrs.isBorderless` and `node.attrs.tableType`:
     ```ts
     const isBorderless = node.attrs.isBorderless as boolean;
     ...
     isBorderless && 'borderless-table'
     ```
     When an AST node initialized with `{ borderless: true, columnRatios: [0.45, 0.55] }` is rendered, `node.attrs.isBorderless` is false/undefined, omitting `.borderless-table` and `.admin-header-table` classes.

---

## 2. Logic Chain

1. **From Observation 1 to Remediation 1**:
   - User expectation for "Chuẩn Thân bài NĐ30" is a clean reset of selected content into canonical NĐ 30 paragraph formatting (Times New Roman 13pt, upright, regular, justify, 1.2 line spacing, 10mm indent).
   - Calling `.setParagraph()` first forces any heading or list item to convert into a paragraph block.
   - Calling `.unsetBold().unsetItalic().unsetUnderline().unsetStrike()` clears all inline text marks.
   - Calling `.setTextAlign('justify').resetToAdministrativeStandard()` sets standard alignment and paragraph node attributes.
   - Chaining these operations in order inside `editor.chain().focus()...run()` ensures an atomic transaction.

2. **From Observation 2 to Remediation 2**:
   - `AdministrativeHeading` contains an explicit `fontSize` attribute (`extensions.ts:212-221`) that maps to inline `font-size: ${node.attrs.fontSize || 14}pt`.
   - Modifying `setFontSize` to execute both `commands.updateAttributes('paragraph', { fontSize: sizePt })` and `commands.updateAttributes('heading', { fontSize: sizePt })` without short-circuiting enables font size changes on both node types, including selections spanning both.

3. **From Observation 3 to Remediation 3**:
   - Tiptap / ProseMirror requires attributes to be declared in `addAttributes()` for them to exist on `node.attrs`.
   - Adding `borderless` alongside `isBorderless` and `columnRatios` alongside `columnRatio` allows AST JSON from downstream modules (importers, templates, fixtures) using either naming convention to be preserved without data loss.
   - Parsing both `data-borderless` / `borderless` attributes and classes (`.borderless-table`) in `parseHTML` ensures round-trip HTML parsing compatibility.
   - Inspecting both `node.attrs.isBorderless || node.attrs.borderless` and checking `columnRatio === '40-60' || (columnRatios && columnRatios[0] <= 0.48)` in `renderHTML` guarantees correct CSS class attachment (`borderless-table`, `admin-header-table`, `admin-footer-table`).

---

## 3. Caveats

1. Direct source code modification was not performed per explorer read-only role; exact replacement specs are detailed in `analysis.md` and this handoff for the implementer agent.
2. In CSS (`web_app/src/styles/a4-canvas.css`), adding `!important` to `.tiptap-table.admin-header-table td` and `.admin-footer-table td` width rules ensures inline `colwidth` pixel styles do not override percentage ratios (noted in challenger report and referenced in analysis).

---

## 4. Conclusion

The remediation plan addresses all three defects identified in review and challenger reports:
1. `EditorToolbar.tsx`: Updated onClick handler with complete `.setParagraph().unsetBold().unsetItalic().unsetUnderline().unsetStrike().setTextAlign('justify').resetToAdministrativeStandard().run()` chain.
2. `extensions.ts` `setFontSize`: Dual-targeted command executing `updateAttributes` on both `'paragraph'` and `'heading'` node types.
3. `extensions.ts` `AdministrativeTable`: Complete attribute alias definitions (`isBorderless` / `borderless` and `columnRatio` / `columnRatios`) across `addAttributes()` and `renderHTML()`.

---

## 5. Verification Method

1. **Static Verification**:
   - Inspect `web_app/src/components/editor/EditorToolbar.tsx:272-282` for mark stripping and node conversion chain.
   - Inspect `web_app/src/editor/extensions.ts:190-195` for multi-node `setFontSize`.
   - Inspect `web_app/src/editor/extensions.ts:273-324` for attribute alias handling.

2. **Automated Vitest Suite**:
   Run in `web_app`:
   ```bash
   npm test tests/unit/editor-extensions.test.ts
   ```
   Verify all unit tests pass, including:
   - Heading font size update via `setFontSize`.
   - HTML parse of `<table borderless="true" column-ratios="0.45,0.55">`.
   - AST hydration of `{ borderless: true, columnRatios: [0.45, 0.55] }` rendering `borderless-table` and `admin-header-table` classes.

3. **E2E Feature Runner**:
   Run:
   ```bash
   node e2e-tests/runner.js
   ```
   Verify Suite F03 (2-Column Administrative Table Nodes) passes all assertions.
