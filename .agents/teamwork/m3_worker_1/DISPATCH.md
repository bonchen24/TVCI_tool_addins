## 2026-09-29T05:01:18Z

You are M3 Worker 1 for Milestone 3: `administrative-format-engine` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m3_worker_1\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the master project architecture at:
e:\CODING\TVCI_word_addins\PROJECT.md

INPUT SPECIFICATIONS (Read all three Explorer handoffs and analysis reports carefully):
1. `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_explorer_1\handoff.md` & `analysis.md` (Pure TS rule engine port, 15 files, profiles, evaluator)
2. `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_explorer_2\handoff.md` & `analysis.md` (useDocumentAudit hook, Sidebar Audit Panel, StatusBar badge & profile selector)
3. `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_explorer_3\handoff.md` & `analysis.md` (One-Click Safe Auto-Fixer, batch patch execution, 4 unit test suites)

EXCLUSIVE WRITE OWNERSHIP:
- `e:\CODING\TVCI_word_addins\web_app\src\rules\` (`models.ts`, `profiles.ts`, `component-rules.ts`, `component-classifier.ts`, `component-validator.ts`, `page-validator.ts`, `addressee-validator.ts`, `recipients-validator.ts`, `legal-basis-validator.ts`, `auto-detect.service.ts`, `horizontal-rules.ts`, `validator.ts`, `tvci-default.ts`, `document-evaluator.ts`, `fixer.ts`, `auto-fixer.ts`, `index.ts`)
- `e:\CODING\TVCI_word_addins\web_app\src\hooks\useDocumentAudit.ts`
- `e:\CODING\TVCI_word_addins\web_app\src\components\layout\Sidebar.tsx`
- `e:\CODING\TVCI_word_addins\web_app\src\components\layout\StatusBar.tsx`
- `e:\CODING\TVCI_word_addins\web_app\app\page.tsx`
- `e:\CODING\TVCI_word_addins\web_app\tests\unit\format-engine.test.ts`
- `e:\CODING\TVCI_word_addins\web_app\tests\unit\multi-profile.test.ts`
- `e:\CODING\TVCI_word_addins\web_app\tests\unit\auto-fixer.test.ts`
- `e:\CODING\TVCI_word_addins\web_app\tests\unit\audit-panel.test.tsx`

TASKS:
1. Port rule engine from `e:\CODING\TVCI_word_addins\src\rules\` to `web_app/src/rules/`:
   - Port all 15 pure TypeScript files: `models.ts`, `profiles.ts`, `component-rules.ts`, `component-classifier.ts`, `component-validator.ts`, `page-validator.ts`, `addressee-validator.ts`, `recipients-validator.ts`, `legal-basis-validator.ts`, `auto-detect.service.ts`, `horizontal-rules.ts`, `validator.ts`, `tvci-default.ts`, `document-evaluator.ts`, `fixer.ts`.
   - Create `web_app/src/rules/index.ts` with clean public API exports.
2. Implement One-Click Safe Auto-Fixer (`web_app/src/rules/auto-fixer.ts`):
   - Map `ValidationIssue[]` into formatting patches.
   - Implement `applySafeFixes(editor: Editor, issues: ValidationIssue[])` using ProseMirror transactions.
   - Implement `applySingleFix(editor: Editor, issue: ValidationIssue)` for individual issue fixes.
   - Verify that running auto-fix brings health score to 100%.
3. Implement `web_app/src/hooks/useDocumentAudit.ts`:
   - Reactive hook that extracts `tiptapDocToSnapshots(editor.getJSON())`, invokes `evaluateDocumentRules()`, and provides `{ healthScore, issueCount, issues, summary, activeProfile, setProfile, isAuditing, reevaluate }`.
4. Update UI Components:
   - `web_app/src/components/layout/Sidebar.tsx`: Render real issue cards in Audit tab with severity badge, component tag, rule explanation, and "Sửa mục này" button. Display empty state with Green Shield when health score is 100%.
   - `web_app/src/components/layout/StatusBar.tsx`: Display real-time health score badge (emerald >=90, amber 70-89, rose <70) and profile selector ("NĐ 30/2020 TVCI", "Tập đoàn TKV", "Viện IEMM", "Văn bản Đảng").
   - `web_app/app/page.tsx`: Connect `useDocumentAudit()`, wire `onApplySafeFix` to call `applySafeFixes()`.
5. Implement Comprehensive Unit Test Suites in `web_app/tests/unit/`:
   - `format-engine.test.ts`: test rule evaluation across NĐ 30 components (Quốc hiệu, Tiêu ngữ, Số ký hiệu, Thân bài, Nơi nhận, Người ký).
   - `multi-profile.test.ts`: test profile switching (NĐ 30 vs TKV vs IEMM vs Đảng).
   - `auto-fixer.test.ts`: test applying safe fixes to an unstandardized document and verifying health score reaches 100.
   - `audit-panel.test.tsx`: test Sidebar audit tab rendering, issue cards, and fix callbacks.
6. Verification:
   Inspect code and ensure zero TypeScript errors. NOTE: Avoid `run_command` to prevent interactive timeouts; verify via file inspection.
7. Output:
   Write a self-contained `handoff.md` to `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_worker_1\handoff.md` and notify parent.
