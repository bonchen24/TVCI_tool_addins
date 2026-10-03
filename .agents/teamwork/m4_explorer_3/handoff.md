# Handoff Report — M4 Explorer 3: Template Engine, Sidebar UI & Unit Test Suites

**Agent**: M4 Explorer 3  
**Milestone**: 4 (`template-library-fill`)  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m4_explorer_3\`  
**Date**: 2026-09-29  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

1. **Tiptap AST Layout & Extensions**:
   - `web_app/src/editor/schema.ts` defines `defaultDocumentState` using 2-column tables:
     - Header: `tableType: 'admin-header'`, `columnRatio: '40-60'`, `isBorderless: true`, `cellType: 'header-left'` (width 250px) & `cellType: 'header-right'` (width 374px).
     - Body: Times New Roman, 13pt/14pt, line spacing 1.2-1.3, justified alignment, `firstLineIndentMm: 10` or `12.7`.
     - Footer: `tableType: 'admin-footer'`, `columnRatio: '50-50'`, `isBorderless: true`, `cellType: 'footer-recipients'` (width 312px) & `cellType: 'footer-signer'` (width 312px).
   - `web_app/src/editor/extensions.ts` exports `AdministrativeParagraph`, `AdministrativeTable`, `AdministrativeTableCell`, `AdminRule` (kinds: `AGENCY`, `MOTTO`, `ABSTRACT`).

2. **Existing Sidebar Implementation**:
   - `web_app/src/components/layout/Sidebar.tsx`:
     - Line 20: `export type SidebarTab = 'audit' | 'templates' | 'ai';`
     - Lines 290-314: Tab `templates` contains static mock cards ("Công văn hành chính", "Quyết định ban hành"), lacking search, category filtering, schema-driven dynamic inputs, date picker, and insertion controls.

3. **E2E Feature Contracts (Tier 1 Features 13-16)**:
   - `web_app/e2e-tests/tier1-feature/f13_template_catalog.test.ts`: 22 templates catalog (`tvci-cv`, `tvci-tb`, `tkv-qd`, `dang-sample`, `iemm-01` to `iemm-14`, `iemm-tt-nb`, `iemm-don-np`, `iemm-thu-moi`, `tvci-sample`), organizations (`TVCI`, `IEMM`, `TKV`, `DANG`), categories (`cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bieu_mau_noi_bo`).
   - `web_app/e2e-tests/tier1-feature/f14_form_schemas.test.ts`: 8 canonical schemas (`cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bao_cao`, `bien_ban`, `thu_moi`, `don_nghi_phep`).
   - `web_app/e2e-tests/tier1-feature/f15_form_fill_date.test.ts`: NĐ 30/2020 administrative date rules (days 1-9 pad zero; months 1-2 pad zero; months 3-12 NO padding zero).
   - `web_app/e2e-tests/tier1-feature/f16_template_insertion.test.ts`: 2-tier template insertion engine (Tier 1 AST generation + Tier 2 regex placeholder fallback `{{TAG}}` / `[TAG]`, unfilled placeholder retention, multiline sanitization).

---

## 2. Logic Chain

1. **Tier 1 Full AST Insertion**:
   - Based on observation 1 and 3, document generation must produce a compliant Tiptap `doc` object.
   - Using `tableType: 'admin-header'` (40-60 ratio) ensures exact matching with Word Add-in templates and `docx` exporter.
   - Body paragraphs must use `AdministrativeParagraph` attributes (`fontSize: 13`, `lineSpacing: 1.2`, `firstLineIndentMm: 10`, `textAlign: 'justify'`).
   - Using `tableType: 'admin-footer'` (50-50 ratio) ensures recipients and signer signatures sit side-by-side without visible borders.

2. **Tier 2 Dynamic Field Fill**:
   - Users who have drafted or edited paragraphs in the canvas must not lose their custom content when updating header or metadata fields.
   - Traversal via `editor.state.doc.descendants` allows targeting specific nodes (left header symbol, right header date, addressee, footer signer/recipients) by structural role (`cellType`).
   - For imported DOCX files that contain placeholder tokens, regex replacement targeting `{{TAG}}` and `[TAG]` replaces text without re-structuring the document.
   - Preserving unrecognized or missing placeholder tags prevents accidental deletion of document template markers.

3. **Sidebar UI Architecture**:
   - The Sidebar must support two modes under `activeTab === 'templates'`:
     - Catalog Browser: category filter pills + Vietnamese accent-insensitive search input + 22 template card items.
     - Dynamic Form Fill: back button + dynamic fields (text, textarea, date picker with live NĐ 30 formatted preview, select, repeatable) + "Áp dụng biểu mẫu" primary button + "Cập nhật trường dữ liệu" secondary button.
   - Connecting `Sidebar` with `editor` allows one-click document generation and dynamic field filling.

4. **Unit Test Suite Design**:
   - 4 modular test suites in `web_app/tests/unit/` mirror the requirements:
     - `template-catalog.test.ts`: 22 templates, 4 organizations, 5 categories, search, metadata integrity.
     - `form-schema.test.ts`: 8 canonical schemas, required fields, date formatting edge cases (Jan, Feb vs March-Dec, single vs double digit days), validation errors.
     - `template-engine.test.ts`: Tier 1 AST validity, Tier 2 field injection without body loss, placeholder substitution, multiline sanitization.
     - `template-ui.test.tsx`: Sidebar template tab rendering, filtering, form inputs, date live preview, insertion triggers, feedback states.

---

## 3. Caveats

1. **Office.js vs Web App**: Word Add-in uses Word API Content Controls (`Word.ContentControl`), whereas Web App uses Tiptap AST nodes and data attributes (`data-table-type`, `cellType`).
2. **Schema Field Naming Alignment**: Explorer 1 and Explorer 2 may define field tags like `SO_KY_HIEU` vs `documentNumber`, or `QUYET_DINH_DIEU` vs `DIEU_KHOAN`. The Template Engine must support both canonical tags and descriptive camelCase aliases.
3. **Vitest JSDOM Limitations**: In `template-ui.test.tsx`, headless JSDOM does not compute exact pixel/layout dimensions (`colwidth`), but DOM attributes, text contents, input events, and callbacks can be tested 100%.

---

## 4. Conclusion

The Template Engine (`engine.ts`), Sidebar Template UI (`Sidebar.tsx`), and the 4 Unit Test Suites are fully specified with complete contracts, data structures, and test cases:
1. `web_app/src/templates/engine.ts` provides:
   - `renderTemplateToEditor(templateId, values): JSONContent` (Tier 1 Full AST).
   - `applyTemplateFieldsToEditor(editor, values): DynamicFillReport` (Tier 2 Node Walk + Regex Fallback).
   - `replacePlaceholdersInText(text, values): string` & `sanitizeMultilineInput(input): string[]`.
2. `web_app/src/components/layout/Sidebar.tsx` provides full interactive template browsing, live NĐ 30 date preview, dynamic schema form, and Tier 1 / Tier 2 application buttons.
3. 4 Unit Test files are designed and ready for implementation in `web_app/tests/unit/`.

---

## 5. Verification Method

Once implemented by worker agents, independent verification is performed using:
1. **Unit Tests Execution**:
   ```bash
   cd web_app
   npm test tests/unit/template-catalog.test.ts
   npm test tests/unit/form-schema.test.ts
   npm test tests/unit/template-engine.test.ts
   npm test tests/unit/template-ui.test.tsx
   ```
2. **E2E Tier 1 Feature Tests (Features 13-16)**:
   ```bash
   cd web_app
   npm test e2e-tests/tier1-feature/f13_template_catalog.test.ts
   npm test e2e-tests/tier1-feature/f14_form_schemas.test.ts
   npm test e2e-tests/tier1-feature/f15_form_fill_date.test.ts
   npm test e2e-tests/tier1-feature/f16_template_insertion.test.ts
   ```
3. **Type Checking & Build**:
   ```bash
   cd web_app
   npm run typecheck
   npm run build
   ```
4. **Visual & Structural Check**:
   - Inspect `web_app/src/templates/engine.ts` and `web_app/src/components/layout/Sidebar.tsx` to verify clean imports, proper error handling, and zero regression on existing tabs (`audit`, `ai`).
