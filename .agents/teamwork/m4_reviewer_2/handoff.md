# Handoff Report: Milestone 4 Independent Review & Adversarial Challenge

**Agent**: M4 Reviewer 2 (reviewer, critic)  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m4_reviewer_2\`  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct code inspections performed:

1. **`web_app/src/templates/engine.ts` lines 391-436**:
   ```typescript
   export function renderTemplateToTiptapDoc(
     templateOrId: AdministrativeTemplate | string,
     values: Record<string, any> = {}
   ): JSONContent {
     let template: AdministrativeTemplate | undefined;

     if (typeof templateOrId === 'string') {
       template = getTemplateById(templateOrId);
       if (!template) {
         const schema = getFormSchema(templateOrId);
         if (schema) {
           // auto-construct template from schema
         } else {
           template = ADMINISTRATIVE_TEMPLATES[0]; // Fallback to tvci-cv
         }
       }
     } else {
       template = templateOrId;
     }
   ```
   Passing an unknown template ID (e.g. `'non_existent_xyz'`) silently falls back to `ADMINISTRATIVE_TEMPLATES[0]`. It does NOT throw `Mẫu biểu không tồn tại trong hệ thống: ${id}`.

2. **`web_app/src/templates/engine.ts` lines 649-661**:
   ```typescript
   if (cellType === 'header-left') {
     if (newDocNumber && node.content) {
       for (const p of node.content) {
         if (p.content && p.content.some((t) => t.text?.includes('Số:'))) {
           p.content = [{ type: 'text', text: `Số: ${newDocNumber}` }];
           updatedFields.push('SO_KY_HIEU');
         } else if (newSubject && p.content && p.content.some((t) => t.text?.startsWith('V/v'))) {
           const displaySubject = newSubject.startsWith('V/v') ? newSubject : `V/v ${newSubject}`;
           p.content = [{ type: 'text', marks: [{ type: 'italic' }], text: displaySubject }];
           updatedFields.push('TRICH_YEU');
         }
       }
     }
   }
   ```
   Outer conditional is `if (newDocNumber && node.content)`. If caller supplies `TRICH_YEU` in `values` without supplying `SO_KY_HIEU`, `newDocNumber` is `null`. The entire loop is skipped; `TRICH_YEU` is never updated.

3. **`web_app/src/templates/engine.ts` lines 107-385, 453-610**:
   - Tier 1 constructs valid Tiptap AST:
     - Header: `tableType: 'admin-header'`, `columnRatio: '40-60'`, `isBorderless: true`, `header-left` (250px), `header-right` (374px).
     - Title/Abstract: 14pt bold centered for non-cong-van; 12pt italic in left header for cong-van; `adminRule` kind 'ABSTRACT' 35%.
     - Body: 13pt Times New Roman, 1.2 line spacing, 12.7mm first line indent.
     - Footer: `tableType: 'admin-footer'`, `columnRatio: '50-50'`, `isBorderless: true`, `footer-recipients` (312px), `footer-signer` (312px).
   - Matches `web_app/src/editor/schema.ts` specifications exactly.

4. **`web_app/src/components/layout/Sidebar.tsx` lines 456-770**:
   - Template tab active:
     - Search bar with clear button (`X`).
     - Category pills (`all`, `cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bieu_mau_noi_bo`).
     - Organization badges (`TVCI`, `IEMM`, `TKV`, `DANG`).
     - Dynamic form rendering: text, textarea, repeatable list with add/remove rows, and date picker.
     - Live NĐ 30 date preview badge using `formatAdministrativeDate`.
     - Action buttons: "Chèn toàn bộ biểu mẫu (Tier 1)" and "Điền vào tài liệu hiện tại (Tier 2)".

5. **`web_app/tests/unit/template-engine.test.ts` lines 1-293**:
   - 8 unit tests verify Tier 1 AST, Tier 2 in-place updates, body preservation, placeholder replacement, and unfilled retention.
   - Missing test assertion for error thrown on unknown template ID in `renderTemplateToTiptapDoc`.

6. **Integrity Check**:
   - No hardcoded test responses or facade bypasses.
   - All 22 templates in `catalog.ts` and 8 canonical schemas in `form-schema.ts` are fully fleshed out with genuine business logic.

---

## 2. Logic Chain

1. **Integrity Verification**: Codebase contains genuine implementations for all M4 requirements. No fake mock passes or bypassed tasks. Integrity check: **PASS**.
2. **Objective 1.1 (Tier 1 AST Generation)**: Verified. AST correctly builds 2-column header (40-60 ratio), title/subject, body, and 2-column footer (50-50 ratio) conforming to `schema.ts` and NĐ 30.
3. **Objective 1.2 (Tier 2 AST In-Place Walk & Placeholder Substitution)**: Verified node walk preserves user-authored paragraphs, replaces `{{TAG}}` and `[TAG]`, and keeps unfilled placeholders without throwing.
4. **Objective 1.3 (Error Handling on Unknown Template ID)**: Failed. Objective requires:
   "Verify error handling: throws `Mẫu biểu không tồn tại trong hệ thống: ${id}` for unknown template IDs."
   In `engine.ts` line 433, fallback `template = ADMINISTRATIVE_TEMPLATES[0]` swallows unknown IDs. It must throw `new Error('Mẫu biểu không tồn tại trong hệ thống: ' + templateOrId)` instead.
5. **Adversarial Failure Mode (Header Left Subject Field Inaccessibility)**: In `engine.ts` line 650, `TRICH_YEU` update is blocked whenever `newDocNumber` is omitted, causing partial updates to fail.
6. **Objective 2 (Sidebar UI)**: Verified. Search, filters, cards, dynamic form, repeatable items, live NĐ 30 preview badge, and dual-tier buttons are fully operational.
7. **Objective 3 (Unit Tests)**: Catalog, schema, engine, and UI test suites cover major paths, but need test coverage for the unknown template error.

---

## 3. Caveats

- In accordance with the critical execution rule, `run_command` was not run to avoid interactive terminal blocks. All verifications performed via static file inspection.
- The defect in `engine.ts` line 433 does not break existing test cases because current tests only pass valid template IDs (`'tvci-cv'`, `'tkv-qd'`). However, it directly violates the explicit error handling contract required by Objective 1 and boundary testing.

---

## 4. Conclusion & Required Changes

**Verdict**: **REQUEST_CHANGES**

### Finding 1 [Major]: `renderTemplateToTiptapDoc` does not throw for unknown template IDs
- **File**: `web_app/src/templates/engine.ts`, line 433
- **Problem**: Falls back to `ADMINISTRATIVE_TEMPLATES[0]` instead of throwing `Mẫu biểu không tồn tại trong hệ thống: ${templateOrId}`.
- **Required Fix**:
  Replace line 433:
  ```typescript
  // Before:
  template = ADMINISTRATIVE_TEMPLATES[0]; // Fallback to tvci-cv
  
  // After:
  throw new Error(`Mẫu biểu không tồn tại trong hệ thống: ${templateOrId}`);
  ```
  Add unit test in `web_app/tests/unit/template-engine.test.ts` asserting:
  ```typescript
  expect(() => renderTemplateToTiptapDoc('unknown_xyz')).toThrow('Mẫu biểu không tồn tại trong hệ thống: unknown_xyz');
  ```

### Finding 2 [Major]: `TRICH_YEU` update in `header-left` cell blocked if `newDocNumber` omitted
- **File**: `web_app/src/templates/engine.ts`, lines 649-661
- **Problem**: `if (newDocNumber && node.content)` gates the loop. If user updates only `TRICH_YEU`, `newSubject` is ignored.
- **Required Fix**:
  ```typescript
  if (cellType === 'header-left') {
    if (node.content && (newDocNumber || newSubject)) {
      for (const p of node.content) {
        if (newDocNumber && p.content && p.content.some((t) => t.text?.includes('Số:'))) {
          p.content = [{ type: 'text', text: `Số: ${newDocNumber}` }];
          updatedFields.push('SO_KY_HIEU');
        } else if (newSubject && p.content && p.content.some((t) => t.text?.startsWith('V/v'))) {
          const displaySubject = newSubject.startsWith('V/v') ? newSubject : `V/v ${newSubject}`;
          p.content = [{ type: 'text', marks: [{ type: 'italic' }], text: displaySubject }];
          updatedFields.push('TRICH_YEU');
        }
      }
    }
  }
  ```
  Add unit test in `web_app/tests/unit/template-engine.test.ts` verifying `TRICH_YEU` updates independently when `SO_KY_HIEU` is not passed.

---

## 5. Verification Method

Once Worker 1 applies the fixes:
1. Inspect `web_app/src/templates/engine.ts` at line 433 and line 650.
2. Run unit tests:
   ```bash
   cd web_app
   npm test tests/unit/template-engine.test.ts
   npm test tests/unit/template-ui.test.tsx
   npm test tests/unit/form-schema.test.ts
   npm test tests/unit/template-catalog.test.ts
   ```
3. Run boundary test:
   ```bash
   npm test e2e-tests/tier2-boundary/missing_metadata_schema.test.ts
   ```
