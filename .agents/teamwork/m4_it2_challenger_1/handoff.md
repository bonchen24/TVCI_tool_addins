# Adversarial Challenge & Handoff Report: Milestone 4 Iteration 2 Challenger 1

**Agent**: M4 Iteration 2 Challenger 1 (critic, specialist)  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m4_it2_challenger_1\`  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Handoff Type**: Hard (Task Complete)  
**Final Verdict**: **APPROVE**  

---

## Challenge Summary

**Overall risk assessment**: LOW  
The error handling for template resolution in `web_app/src/templates/engine.ts` is robust, eliminates previous silent fallback bugs, strictly matches the contract error string, and handles both template catalog IDs and canonical schema IDs properly.

---

## 1. Observation

1. **Error Throwing Implementation in `web_app/src/templates/engine.ts` (lines 391-435)**:
   ```ts
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
           template = { ... };
         } else {
           throw new Error(`Mẫu biểu không tồn tại trong hệ thống: ${templateOrId}`);
         }
       }
     } else {
       template = templateOrId;
     }
     ...
   ```
   - When `templateOrId` is a string and neither `getTemplateById` nor `getFormSchema` resolves it, line 433 unconditionally throws `new Error('Mẫu biểu không tồn tại trong hệ thống: ' + templateOrId)`.
   - Silent fallback `template = ADMINISTRATIVE_TEMPLATES[0]` has been completely removed.

2. **Resolution Mechanics in `catalog.ts` and `form-schema.ts`**:
   - `getTemplateById` (`catalog.ts:827-831`):
     ```ts
     export function getTemplateById(id: string): AdministrativeTemplate | undefined {
       if (!id) return undefined;
       const targetId = id.trim().toLowerCase();
       return ADMINISTRATIVE_TEMPLATES.find((t) => t.id.toLowerCase() === targetId);
     }
     ```
   - `getFormSchema` (`form-schema.ts:862-872`):
     ```ts
     export function getFormSchema(typeOrId: string): DocumentFormSchema | undefined {
       if (!typeOrId) return undefined;
       const query = typeOrId.trim().toLowerCase();
       return ALL_SCHEMAS.find(
         (s) =>
           s.id.toLowerCase() === query ||
           s.name.toLowerCase() === query ||
           s.aliases?.some((a) => a.toLowerCase() === query)
       );
     }
     ```

3. **Tracing Unknown & Boundary Template IDs**:
   - `'unknown_xyz'`:
     - `getTemplateById('unknown_xyz')` returns `undefined`.
     - `getFormSchema('unknown_xyz')` returns `undefined`.
     - Throws: `Error("Mẫu biểu không tồn tại trong hệ thống: unknown_xyz")`.
   - `'invalid-id'`:
     - `getTemplateById('invalid-id')` returns `undefined`.
     - `getFormSchema('invalid-id')` returns `undefined`.
     - Throws: `Error("Mẫu biểu không tồn tại trong hệ thống: invalid-id")`.
   - `''` (empty string):
     - `getTemplateById('')` returns `undefined` (guard `if (!id) return undefined`).
     - `getFormSchema('')` returns `undefined` (guard `if (!typeOrId) return undefined`).
     - Throws: `Error("Mẫu biểu không tồn tại trong hệ thống: ")`.
   - `'   '` (whitespace string):
     - `getTemplateById('   ')` returns `undefined` (trimmed string `""` matches no template).
     - `getFormSchema('   ')` returns `undefined` (trimmed string `""` matches no schema).
     - Throws: `Error("Mẫu biểu không tồn tại trong hệ thống:    ")`.

4. **Tracing Valid Template IDs & Canonical Schema IDs**:
   - Catalog template ID `'tvci-cv'`:
     - Matched directly in `ADMINISTRATIVE_TEMPLATES[0]`.
     - Category is `'cong_van'`.
     - Renders valid Tiptap AST: 2-column header table (`admin-header`, `40-60`), body paragraphs, 2-column footer table (`admin-footer`, `50-50`). No throw.
   - Catalog template ID `'tkv-qd'`:
     - Matched directly in `ADMINISTRATIVE_TEMPLATES[13]`.
     - Category is `'quyet_dinh'`.
     - Renders valid Tiptap AST with centered bold title `'QUYẾT ĐỊNH'` and structured decision body. No throw.
   - Schema ID `'cong_van'`:
     - `getTemplateById('cong_van')` returns `undefined`.
     - `getFormSchema('cong_van')` returns canonical schema.
     - Synthetic template constructed with default header/footer setups.
     - Renders valid Tiptap AST. No throw.
   - Schema ID `'quyet_dinh'`:
     - `getTemplateById('quyet_dinh')` returns `undefined`.
     - `getFormSchema('quyet_dinh')` returns canonical schema.
     - Synthetic template constructed, title capitalized to `'QUYẾT ĐỊNH'`.
     - Renders valid Tiptap AST. No throw.

5. **Unit Test Coverage in `web_app/tests/unit/template-engine.test.ts`**:
   - Lines 93-97:
     ```ts
     it('throws error when template ID is not found in system', () => {
       expect(() => renderTemplateToTiptapDoc('unknown_xyz')).toThrow(
         'Mẫu biểu không tồn tại trong hệ thống: unknown_xyz'
       );
     });
     ```
   - Lines 27-68: tests valid document generation for `'tvci-cv'`.
   - Lines 70-85: tests title and decision rules for `'tkv-qd'`.
   - Lines 87-91: tests contract alias `renderTemplateToEditor`.
   - Lines 201-254: tests independent update of `TRICH_YEU` when `SO_KY_HIEU` omitted.

---

## 2. Logic Chain

1. **Failure Mode Elimination**:
   - Previously, unrecognized template IDs fell back silently to `tvci-cv`. This masked user errors and violated the contract requiring an explicit exception.
   - In `engine.ts:433`, replacing silent assignment with `throw new Error(...)` ensures any invalid or misspelled template string fails fast and informatively.

2. **Error Message Conformance**:
   - The requirement demands `Mẫu biểu không tồn tại trong hệ thống: ${id}`.
   - The template literal `` `Mẫu biểu không tồn tại trong hệ thống: ${templateOrId}` `` preserves the input verbatim (`'unknown_xyz'`, `'invalid-id'`, `''`).
   - This exact error string is harmonized with `getTemplateFormSchemaByDocumentType` (`form-schema.ts:878`) and handled cleanly by `Sidebar.tsx:197-201`.

3. **Dual Resolution Support**:
   - The engine supports both catalog IDs (e.g. `'tvci-cv'`, `'tkv-qd'`) and schema IDs (e.g. `'cong_van'`, `'quyet_dinh'`).
   - Checking `getTemplateById` first, then falling back to `getFormSchema`, allows both types of identifiers to work seamlessly while strictly rejecting anything that matches neither.

4. **AST Validity**:
   - For valid IDs, the AST structure meets all Tiptap ProseMirror schema constraints (`doc` root, `table` nodes with `cellType` and `colwidth`, `paragraph` nodes with styling marks).

---

## 3. Caveats & Adversarial Findings

1. **Unit Test Scope (Minor)**:
   - `web_app/tests/unit/template-engine.test.ts` specifically asserts `'unknown_xyz'`. It does not explicitly run assertions on `''` or `'invalid-id'`.
   - **Empirical Assessment**: While the deterministic code path `if (!template) { if (schema) ... else throw ... }` guarantees identical execution for `''` and `'invalid-id'`, adding explicit assertions for empty string `''` and non-existent IDs to `template-engine.test.ts` would increase defense-in-depth against future regressions.
   - **Impact**: Zero production risk; test suite passes and verifies the exact throwing logic.

2. **Object Argument Contract**:
   - If a caller passes `null` or a malformed object (`{}` as `any`), `typeof templateOrId === 'string'` is false and it enters the `else` branch, which assumes `AdministrativeTemplate`.
   - In TypeScript, the function signature is strictly typed `templateOrId: AdministrativeTemplate | string`. At runtime within the web application, calls come from typed UI handlers or known strings.

---

## 4. Conclusion & Verdict

**Verdict**: **APPROVE**

All verification criteria are fully met:
1. `renderTemplateToTiptapDoc` throws an Error for all unknown template IDs (`'unknown_xyz'`, `'invalid-id'`) and empty string `''`.
2. Exact error message matches `Mẫu biểu không tồn tại trong hệ thống: ${id}`.
3. Valid template IDs (`'tvci-cv'`, `'tkv-qd'`) and schema IDs (`'cong_van'`, `'quyet_dinh'`) continue to generate valid Tiptap ASTs.
4. Unit tests in `template-engine.test.ts` and `form-schema.test.ts` verify the behavior without regression.

---

## 5. Verification Method

To execute tests independently via Vitest:
```bash
cd web_app
npm test tests/unit/template-engine.test.ts
npm test tests/unit/form-schema.test.ts
npm test e2e-tests/tier2-boundary/missing_metadata_schema.test.ts
```

Static AST Verification:
1. Check `web_app/src/templates/engine.ts` lines 432-435 for `throw new Error(...)`.
2. Check `web_app/tests/unit/template-engine.test.ts` lines 93-97 for rejection test case.
