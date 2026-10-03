## 2026-09-29T12:58:20+07:00
You are M4 Iteration 2 Worker 1 for Milestone 4: `template-library-fill` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m4_it2_worker_1\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

CRITICAL EXECUTION RULE:
DO NOT USE `run_command`. `run_command` hangs the environment waiting for interactive user terminal permissions. You MUST perform all code modifications and verifications exclusively using file tools (`view_file`, `replace_file_content`, `write_to_file`, `grep_search`, `list_dir`).

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
e:\CODING\TVCI_word_addins\PROJECT.md
Review Reviewer 1 handoff:
e:\CODING\TVCI_word_addins\.agents\teamwork\m4_reviewer_1\handoff.md
Review Reviewer 2 handoff:
e:\CODING\TVCI_word_addins\.agents\teamwork\m4_reviewer_2\handoff.md

EXCLUSIVE WRITE OWNERSHIP:
- `e:\CODING\TVCI_word_addins\web_app\src\templates\types.ts`
- `e:\CODING\TVCI_word_addins\web_app\src\templates\engine.ts`
- `e:\CODING\TVCI_word_addins\web_app\tests\unit\template-engine.test.ts`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASKS:
1. Update `web_app/src/templates/types.ts`:
   - Add type aliases:
     ```ts
     export type FormFieldDefinition = TemplateField;
     export type FormFieldOption = TemplateFieldOption;
     ```
   - Verify that `web_app/src/templates/form-schema.ts` imports them without type errors.
2. Update `web_app/src/templates/engine.ts`:
   - In `renderTemplateToTiptapDoc` (line 433):
     Replace:
     ```ts
     template = ADMINISTRATIVE_TEMPLATES[0]; // Fallback to tvci-cv
     ```
     With:
     ```ts
     throw new Error(`Mẫu biểu không tồn tại trong hệ thống: ${templateOrId}`);
     ```
   - In `fillTemplateFieldsInDoc` (lines 649-661):
     Replace:
     ```ts
     if (cellType === 'header-left') {
       if (newDocNumber && node.content) {
     ```
     With:
     ```ts
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
3. Update `web_app/tests/unit/template-engine.test.ts`:
   - Add unit test verifying that `renderTemplateToTiptapDoc('unknown_xyz')` throws `Mẫu biểu không tồn tại trong hệ thống: unknown_xyz`.
   - Add unit test verifying that `fillTemplateFieldsInDoc` updates `TRICH_YEU` independently when `SO_KY_HIEU` is omitted.
4. Output:
   Write self-contained `handoff.md` to `e:\CODING\TVCI_word_addins\.agents\teamwork\m4_it2_worker_1\handoff.md` and notify parent.
