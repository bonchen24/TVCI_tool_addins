# Adversarial Handoff Report — Milestone 1: `core-platform-editor`

**Agent**: M1 Challenger 2  
**Role**: Empirical Challenger (critic, specialist)  
**Target Parent**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_challenger_2\`  
**Verdict**: **CHALLENGE**

---

## 1. Observation

1. **Table Cell Text Overflow Prevention**:
   - In `web_app/src/styles/a4-canvas.css:19-39`:
     ```css
     .tiptap-table.borderless-table {
       width: 100%;
       border-collapse: collapse;
       margin: 0 0 8px 0;
       table-layout: fixed;
       border: none !important;
     }

     .tiptap-table.borderless-table td {
       padding: 2px 4px;
       vertical-align: top;
       box-sizing: border-box;
       border: 1px dashed rgba(203, 213, 225, 0.7);
       transition: border-color 0.15s ease;
     }
     ```
   - Neither `a4-canvas.css`, `app/globals.css`, nor `extensions.ts` specifies `overflow-wrap: break-word`, `word-break: break-word`, or `overflow: hidden` on `.tiptap-table.borderless-table td` or `.tiptap-table.borderless-table td p`.
   - Grep search for `overflow-wrap`, `break-word`, and `word-break` across `web_app/` yielded **0 matches**.

2. **Table Column Ratio vs Inline `colwidth` Collision**:
   - In `web_app/src/styles/a4-canvas.css:45-61`:
     ```css
     /* Header Table Ratio (40% - 60%) */
     .tiptap-table.admin-header-table td:first-child {
       width: 40%;
     }

     .tiptap-table.admin-header-table td:last-child {
       width: 60%;
     }

     /* Footer Table Ratio (50% - 50%) */
     .tiptap-table.admin-footer-table td:first-child {
       width: 50%;
     }

     .tiptap-table.admin-footer-table td:last-child {
       width: 50%;
     }
     ```
   - In `web_app/src/editor/extensions.ts:338-344`:
     ```ts
     renderHTML: (attributes) => {
       if (!attributes.colwidth) return {};
       return {
         'data-colwidth': attributes.colwidth.join(','),
         style: `width: ${attributes.colwidth[0]}px`,
       };
     },
     ```
   - In `web_app/src/editor/schema.ts:22, 115, 303, 406`:
     Default document cells have explicit pixel widths: `colwidth: [250]`, `colwidth: [374]`, `colwidth: [312]`.
   - Inline styles `style="width: 250px"` override external stylesheet rules `.tiptap-table.admin-header-table td:first-child { width: 40%; }` because no `!important` modifier is present on the CSS width rules.

3. **NĐ 30 Body Preset Reset Limitations**:
   - In `web_app/src/components/editor/EditorToolbar.tsx:273-279`:
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
   - In `web_app/src/editor/extensions.ts:159-170`:
     ```ts
     resetToAdministrativeStandard:
       () =>
       ({ commands }) => {
         return commands.updateAttributes('paragraph', {
           fontFamily: 'Times New Roman',
           fontSize: 13,
           lineSpacing: 1.2,
           spaceBefore: 2,
           spaceAfter: 2,
           firstLineIndentMm: 10,
         });
       },
     ```
   - The command updates attributes on `paragraph` nodes only.
   - It does NOT remove inline text marks (`bold`, `italic`, `underline`, `strike`), so text copied with bold/italic marks retains non-standard styling contrary to NĐ 30 body text requirements.
   - If the current selection is a `heading` (`<h1>`..`<h4>`), `updateAttributes('paragraph')` does not match and fails silently, leaving the node as a Heading without resetting to paragraph.

4. **Schema & Test Runner Attribute Divergence**:
   - In `web_app/src/editor/extensions.ts:286-298`:
     Attribute names are `isBorderless` (`default: false`) and `columnRatio` (`'40-60' | '50-50' | 'custom'`).
   - In `web_app/src/editor/schema.ts:8-11, 289-292`:
     Default document defines `isBorderless: true` and `columnRatio: '40-60'`.
   - In `web_app/e2e-tests/fixtures/documentFixtures.ts:39, 91` and `web_app/e2e-tests/tier1-feature/f03_two_column_tables.test.ts:18` and `web_app/e2e-tests/runner.js:169, 200, 313`:
     Fixtures declare `borderless: true` and `columnRatios: [0.45, 0.55]`.
   - The E2E test runner tests an isolated mock object (`createHeaderTableNode`) that diverges from production Tiptap extensions.
   - In `web_app/e2e-tests/runner.js:819-839`:
     `Tier 2: Extreme Margins & Spacing` tests inline lambdas (e.g. `expect(Math.max(5, 0)).toBe(5)`) rather than importing and verifying production logic.

---

## 2. Logic Chain

1. **From Observation 1 to Challenge 1 (Text Overflow & Layout Bleeding)**:
   - CSS `table-layout: fixed` locks column widths. When unbreakable content (long Vietnamese agency acronyms, file reference symbols e.g. `125/VCNM-TTTN/2026/TB-TKV-KĐAT`, email addresses, or compound words) exceeds the 40% column width (~66mm / 250px) without `overflow-wrap: break-word` or `word-break: break-word`, the browser renders the overflowing text over adjacent cells.
   - In official administrative documents, agency title text will visually bleed into the National Motto ("ĐỘC LẬP - TỰ DO - HẠNH PHÚC"), creating unacceptable visual degradation.

2. **From Observation 2 to Challenge 2 (Specificity Invalidation of Column Ratios)**:
   - In HTML/CSS standard, inline `style="width: 250px"` has specificity (1, 0, 0, 0), overriding class selectors `.tiptap-table.admin-header-table td:first-child` with specificity (0, 0, 2, 1).
   - Because `a4-canvas.css` defines `width: 40%;` without `!important`, the inline pixel style dictates the column width.
   - On different zoom levels, viewport scalings, or customized margins, the table does not scale proportionally to the 40%-60% ratio.

3. **From Observation 3 to Challenge 3 (Incomplete Preset Reset)**:
   - NĐ 30 mandates body text in standard font, upright (not italic), regular weight (not bold), and without underline/strike.
   - When a user selects text previously marked bold/italic and clicks "Chuẩn Thân bài NĐ30", `EditorToolbar.tsx` invokes `resetToAdministrativeStandard()` which only alters `AdministrativeParagraph` node attributes. Text marks remain active.
   - Furthermore, clicking "Chuẩn Thân bài NĐ30" on a heading node fails to convert it into a body paragraph because `.setParagraph()` is not chained.

4. **From Observation 4 to Challenge 4 (Test-Production Schema Divergence)**:
   - Because `f03_two_column_tables.test.ts` and `runner.js` test mock objects with `borderless: true` instead of `isBorderless: true`, if a downstream component (DOCX importer/exporter or template engine) provides an AST using the test fixture schema (`borderless: true`), `AdministrativeTable.renderHTML` will fail to apply the `.borderless-table` class, rendering visible solid borders.

---

## 3. Caveats

1. **Interactive Terminal Restrictions**: Automated test commands executed via terminal prompt for user permissions which may time out. Verification was conducted via exhaustive source code inspection, AST schema analysis, CSS specificity calculation, and fixture tracing.
2. **Screen vs Print CSS**: Screen presentation intentionally uses a dashed border (`1px dashed rgba(203, 213, 225, 0.7)`) to provide visual cues for cell boundaries during editing, while removing borders on print (`@media print`). This design is sound, provided `isBorderless` is consistently mapped.

---

## 4. Conclusion

### Verdict: **CHALLENGE**

Milestone 1 core platform editor displays solid foundational structure, but the following 4 issues must be addressed before signing off:

| # | Severity | Defect | File & Line | Mitigation |
|---|----------|--------|-------------|------------|
| 1 | **High** | Missing text overflow wrapping in fixed administrative table cells | `web_app/src/styles/a4-canvas.css:27` | Add `overflow-wrap: break-word; word-break: break-word; overflow: hidden;` to `.tiptap-table.borderless-table td` |
| 2 | **High** | Inline `colwidth` overrides CSS 40%-60% / 50%-50% ratio | `web_app/src/styles/a4-canvas.css:47,51,56,60` | Add `!important` to table cell ratio width rules in `a4-canvas.css` |
| 3 | **Medium** | Preset "Chuẩn Thân bài NĐ30" leaves marks intact and fails on Heading nodes | `web_app/src/components/editor/EditorToolbar.tsx:273` | Chain `.setParagraph().unsetBold().unsetItalic().unsetUnderline().unsetStrike()` before `resetToAdministrativeStandard()` |
| 4 | **Medium** | Schema attribute divergence (`borderless` vs `isBorderless`, `columnRatios` vs `columnRatio`) | `e2e-tests/fixtures/documentFixtures.ts:39`, `src/editor/extensions.ts:286` | Standardize schema attribute names across `extensions.ts`, `schema.ts`, `documentFixtures.ts`, and `runner.js` |

---

## 5. Verification Method

To verify the reported findings:

1. **Verify Text Overflow Prevention**:
   - Inspect `web_app/src/styles/a4-canvas.css:27-39`.
   - Confirm lack of `overflow-wrap: break-word` and `word-break: break-word`.
2. **Verify CSS Specificity Conflict**:
   - Inspect `web_app/src/styles/a4-canvas.css:47, 51` vs `web_app/src/editor/extensions.ts:342` and `schema.ts:22`.
   - Confirm `td` renders `style="width: 250px"` which overrides `.admin-header-table td:first-child { width: 40%; }` in standard CSS.
3. **Verify Toolbar Preset Reset**:
   - Inspect `web_app/src/components/editor/EditorToolbar.tsx:273-279`.
   - Confirm absence of mark removal commands (`unsetBold`, `unsetItalic`, `unsetUnderline`, `unsetStrike`) and node conversion (`setParagraph`).
4. **Verify Attribute Naming Discrepancy**:
   - Compare `web_app/src/editor/extensions.ts:286` (`isBorderless`) with `web_app/e2e-tests/fixtures/documentFixtures.ts:39` (`borderless`).
