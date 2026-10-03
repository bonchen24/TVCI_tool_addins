# Task Dispatch: M5 Iteration 2 Worker (Remediation & Hardening)

## Identity
- Role: Worker
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_worker_1\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_worker_1\handoff.md

## Scope & File Ownership
You exclusively own and will modify:
1. `web_app/src/ai/template-fill.ts`
2. `web_app/src/ai/mock-provider.ts`
3. `web_app/next.config.mjs`
4. `web_app/e2e-tests/framework/assertions.ts` and `web_app/e2e-tests/runner.js`
5. `web_app/e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts`
6. `web_app/src/ai/direct-client.ts`
7. `web_app/src/ai/sanitizer.ts`
8. `web_app/src/ai/administrative-rules.ts`
9. `web_app/src/ai/drafting.ts`
10. `web_app/src/ai/proofreading.ts`
11. `web_app/src/ai/diff.ts`
12. `web_app/src/components/ai/AiWorkspacePanel.tsx`
13. `web_app/src/components/ai/DiffPreviewModal.tsx`
14. `web_app/app/api/ai/proofread/route.ts` & `web_app/app/api/ai/template-fill/route.ts`
15. Unit tests: `web_app/tests/unit/ai-diff.test.ts`, `ai-template-fill.test.ts`, `ai-adversarial-challenger.test.ts`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks (from Iteration 2 Explorers 1, 2, 3)
1. **Compilation & Build Fixes**:
   - `web_app/src/ai/template-fill.ts:97`: Fix signature mismatch to `formatAdministrativeDate('Hà Nội', new Date(y, m - 1, d))`. Bound greedy `TRICH_YEU` regex to avoid over-capturing.
   - `web_app/src/ai/mock-provider.ts:167`: Bound regex for `TRICH_YEU`.
   - `web_app/next.config.mjs`: In Webpack configuration, add `config.resolve.fallback = { ...config.resolve.fallback, net: false, tls: false, child_process: false, fs: false };` so `jsdom` doesn't break Webpack production build.
   - `web_app/e2e-tests/framework/assertions.ts` and `web_app/e2e-tests/runner.js`: Add `toBeUndefined()` and `.not` chaining support to the assertion harness.
   - `web_app/e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts:22-24`: Fix property names (`bottomMm`, `leftMm`, `rightMm`).
2. **Client Error Handling & Prompt Security**:
   - `web_app/src/ai/direct-client.ts:207,249`: Guard `apiKey` with `(this.config.apiKey || '').trim()` and return normalized `AUTH_ERROR` instead of uncaught `TypeError`.
   - `web_app/src/ai/sanitizer.ts`: Fix code fence regex so that it strips fence syntax (`^```[a-z]*` and ```` ``` ````) while PRESERVING text inside `$1`. Strip `_italic_`, `~~strikethrough~~`, list bullets `- `, and all emojis/pictographs (`\p{Extended_Pictographic}`, 🇻🇳, ⏰, ⭐). Strip preambles cleanly.
   - `web_app/src/ai/administrative-rules.ts`: Expand `isInjectionAttempt` to match Vietnamese variations ("bỏ qua mọi quy tắc", "bỏ qua các hướng dẫn", "không cần tuân thủ"), English ("ignore all instructions", "disregard all rules"), and DAN patterns. Add `hasInjectionAttempt`.
   - `web_app/src/ai/drafting.ts`, `proofreading.ts`, `template-fill.ts`: Validate `userPrompt`, `context`, `text`, `userNotes` against injection before making AI calls.
   - `web_app/app/api/ai/proofread/route.ts` & `template-fill/route.ts`: Return 400 Bad Request for validation/injection errors.
3. **UI/UX Workflows, Diff Integration & Accessibility**:
   - `web_app/src/components/ai/AiWorkspacePanel.tsx`:
     - Template Fill: Add "Áp dụng vào tài liệu" (`data-testid="btn-apply-template-fill"`) calling `applyTemplateFieldsToEditor` and "Chèn mới toàn bộ biểu mẫu" (`data-testid="btn-insert-full-template"`) calling `renderTemplateToTiptapDoc`.
     - Proofreading: Track whether checked text was selection vs full doc. When applying diff, pass `isFullDocument: true` if selection is collapsed so document is replaced, NOT duplicated.
   - `web_app/src/ai/diff.ts`: Update `applyAiDiffToSelection` to accept options `{ isFullDocument?: boolean }`. When `isFullDocument` is true or selection is collapsed, delete `{ from: 0, to: docSize }` before inserting `acceptedText`.
   - `web_app/src/components/ai/DiffPreviewModal.tsx`: Add `id="diff-dialog-title"`, `aria-labelledby="diff-dialog-title"`, and an `Escape` key event listener calling `onClose()`.
   - Unit tests: Update `ai-adversarial-challenger.test.ts` to assert the fixed behavior (`expect(detected).toBe(true)`), add tests in `ai-diff.test.ts` for collapsed selection replacement.

## Verification Requirements
Run and ensure the following pass cleanly:
1. `npm run typecheck` in `web_app` (0 errors).
2. `npm run build` in `web_app` (Next.js production build completes with exit code 0).
3. `npx vitest run tests/unit/ai-*.test.ts tests/unit/ai-workspace-ui.test.tsx tests/unit/adversarial-*.test.ts` in `web_app` (100% pass).
4. `node e2e-tests/runner.js --tier=1 --filter=ai` and `node e2e-tests/runner.js --tier=1 --filter=diff` in `web_app`.
5. `node e2e-tests/runner.js --tier=3 --filter=draft` in `web_app`.

Document all verification commands and exact terminal outputs in `handoff.md` and send message to parent.
