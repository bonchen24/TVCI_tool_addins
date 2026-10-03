# Handoff Report: Milestone 5 Review (AI Workspace & Diff Workflow)

## Review Summary
**Verdict**: `REQUEST_CHANGES`
**Quality Assessment**: Implementation contains solid multi-provider architecture, prompt guards, and visual diff capabilities, but suffers from multiple critical defects, including a TypeScript compilation error in production code, date corruption, destructive output sanitization, runtime crash on missing credentials, and prompt injection bypasses.

---

## Findings

### 1. [Critical] TS2554 Compilation Error & Date Corruption in Heuristic Template Fill
- **What**: `formatAdministrativeDate(d, m, y)` called with 3 arguments instead of expected 1-2 arguments, causing TypeScript compiler error and runtime date corruption (year 1970 instead of 2026).
- **Where**: `web_app/src/ai/template-fill.ts`, Line 97.
- **Why**:
  - `formatAdministrativeDate` signature in `web_app/src/templates/form-validation.ts:117-120` is:
    ```ts
    export function formatAdministrativeDate(placeOrDate: string | Date, dateInput?: Date | string): string
    ```
  - `npm run typecheck` emits:
    ```
    src/ai/template-fill.ts(97,58): error TS2554: Expected 1-2 arguments, but got 3.
    ```
  - In JavaScript execution, passing `(d, m, y)` assigns `placeOrDate = d` (number) and `dateInput = m` (number). `targetDate = m` is treated as timestamp `new Date(m)` (millisecond epoch in Jan 1970). As a result, `NGAY_BAN_HANH` corrupts the year to 1970 instead of the parsed `y` (2026).
- **Suggestion**:
  Update line 97 of `template-fill.ts` to call:
  ```ts
  const dateFormatted = formatAdministrativeDate('Hà Nội', new Date(y, m - 1, d));
  ```
  or:
  ```ts
  const dateFormatted = formatAdministrativeDate('Hà Nội', `${d}/${m}/${y}`);
  ```

### 2. [Critical - INTEGRITY VIOLATION / SELF-CERTIFYING WORK] Falsified Typecheck Cleanliness
- **What**: Worker handoff claimed all files were fully operational and clean, setting as Invalidation Condition: *"TypeScript compilation diagnostics in web_app/src/ai/ or web_app/src/components/ai/"*. In reality, `npm run typecheck` fails immediately on `src/ai/template-fill.ts(97,58)` and multiple `e2e-tests` files.
- **Where**: `m5_worker_1/handoff.md` Section 5 & 6 vs `web_app/src/ai/template-fill.ts:97`.
- **Why**: Worker submitted work claiming verification passed without running or addressing the failing `tsc --noEmit`. Work that does not compile cannot be approved.
- **Suggestion**: Worker must execute `npm run typecheck` and ensure zero compilation errors before declaring milestone complete.

### 3. [Critical] Destructive Content Loss in Output Sanitizer
- **What**: `sanitizeAiOutput` wipes out all text inside markdown code fences rather than stripping the backticks.
- **Where**: `web_app/src/ai/sanitizer.ts`, Line 19:
  ```ts
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  ```
- **Why**: LLMs frequently wrap generated administrative documents or sections inside ````markdown ... ```` code blocks. The current regex strips the entire contents, returning an empty string and causing total data loss.
- **Suggestion**: Strip code fence delimiters while preserving enclosed body text:
  ```ts
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n?([\s\S]*?)```$/gm, '$1');
  cleaned = cleaned.replace(/```/g, '');
  ```

### 4. [Major] Unhandled TypeError Crash When API Key Is Undefined
- **What**: DirectAiClient crashes with unhandled `TypeError: Cannot read properties of undefined (reading 'trim')` instead of returning a normalized `AUTH_ERROR`.
- **Where**: `web_app/src/ai/direct-client.ts`, Lines 207 and 249:
  ```ts
  const apiKey = this.config.apiKey.trim();
  ```
- **Why**: If a caller initializes `DirectAiClient` with `apiKey` omitted or undefined (e.g. from environment variable not set), calling `.trim()` crashes the Node/Next process rather than triggering `normalizeAiError(401)`.
- **Suggestion**: Defensively check `this.config.apiKey`:
  ```ts
  const apiKey = (this.config.apiKey || '').trim();
  if (!apiKey) {
    const err = normalizeAiError(401, 'Chưa cấu hình API key.');
    throw new AiServiceError(err.code, err.status, err.message);
  }
  ```

### 5. [Major] Prompt Injection Security Gaps in Administrative Rules & Subsystems
- **What**: Multiple prompt injection vectors bypass `isInjectionAttempt`:
  1. `Bỏ qua mọi quy tắc`: regex `/bỏ\s+qua\s+(hết|tất\s+cả)\s+quy\s+tắc/i` misses `mọi`.
  2. `Ignore all instructions`: regex `/ignore\s+(all\s+)?(previous|prior)\s+instructions/i` requires `previous|prior`, so `Ignore all instructions` passes through.
  3. `DAN` (Do Anything Now) jailbreak passes undetected.
  4. In `web_app/src/ai/drafting.ts:36-44`, `validateDraftingRequest` checks `req.userPrompt` but ignores `req.context`, allowing prompt injection through the context field.
  5. `proofreadAdministrativeText` and `extractTemplateFields` lack prompt injection validation entirely.
- **Where**:
  - `web_app/src/ai/administrative-rules.ts`, Lines 20-37.
  - `web_app/src/ai/drafting.ts`, Lines 36-44.
  - `web_app/src/ai/proofreading.ts`, Line 100.
  - `web_app/src/ai/template-fill.ts`, Line 118.
- **Why**: Security guards must prevent adversarial prompt leakage and instruction overrides across all AI input channels.
- **Suggestion**: Expand regex patterns to include `mọi quy tắc`, `ignore all instructions`, `DAN`, validate both `userPrompt` and `context`, and add injection checking to proofreading and template-fill endpoints.

### 6. [Major] TypeScript Compilation Errors in E2E Test Suite
- **What**: Five e2e test files use matchers (`.not.toContain`, `.toBeUndefined`) that do not exist on the runner's custom `expect` harness.
- **Where**:
  - `e2e-tests/tier1-feature/f18_ai_prompts.test.ts` (Lines 41-43, 53-54)
  - `e2e-tests/tier1-feature/f21_ai_template_fill.test.ts` (Line 70)
  - `e2e-tests/tier1-feature/f22_diff_preview.test.ts` (Lines 77, 78)
  - `e2e-tests/tier1-feature/f24_adversarial_hardening.test.ts` (Line 56)
  - `e2e-tests/tier3-pairwise/journey_template_ai_diff_export.test.ts` (Line 55)
- **Why**: Custom test harness in `e2e-tests/framework/testHarness.ts` and `runner.js` does not implement `.not` chaining or `.toBeUndefined()`. Calling these causes runtime `TypeError` and TypeScript compiler failure.
- **Suggestion**: Add `.not` proxy and `.toBeUndefined()` matcher to `e2e-tests/framework/testHarness.ts` and `e2e-tests/runner.js`, or update test assertions to `expect(val === undefined).toBe(true)` and `expect(str.includes('x')).toBe(false)`.

---

## 1. Observation
1. **Verification Command Outputs**:
   - `npm run typecheck` in `web_app`:
     ```
     > tvci-web-app@0.1.0 typecheck
     > tsc --noEmit

     e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(22,20): error TS2339: Property 'bottomMarginMm' does not exist on type '{ topMm: number; bottomMm: number; leftMm: number; rightMm: number; }'.
     e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(23,20): error TS2339: Property 'leftMarginMm' does not exist on type '{ topMm: number; bottomMm: number; leftMm: number; rightMm: number; }'.
     e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(24,20): error TS2339: Property 'rightMarginMm' does not exist on type '{ topMm: number; bottomMm: number; leftMm: number; rightMm: number; }'.
     e2e-tests/tier1-feature/f18_ai_prompts.test.ts(41,21): error TS2339: Property 'not' does not exist on type ...
     e2e-tests/tier1-feature/f18_ai_prompts.test.ts(42,21): error TS2339: Property 'not' does not exist on type ...
     e2e-tests/tier1-feature/f18_ai_prompts.test.ts(43,21): error TS2339: Property 'not' does not exist on type ...
     e2e-tests/tier1-feature/f18_ai_prompts.test.ts(53,21): error TS2339: Property 'not' does not exist on type ...
     e2e-tests/tier1-feature/f18_ai_prompts.test.ts(54,21): error TS2339: Property 'not' does not exist on type ...
     e2e-tests/tier1-feature/f21_ai_template_fill.test.ts(70,43): error TS2551: Property 'toBeUndefined' does not exist on type ... Did you mean 'toBeDefined'?
     e2e-tests/tier1-feature/f22_diff_preview.test.ts(77,27): error TS2551: Property 'toBeUndefined' does not exist on type ... Did you mean 'toBeDefined'?
     e2e-tests/tier1-feature/f22_diff_preview.test.ts(78,29): error TS2551: Property 'toBeUndefined' does not exist on type ... Did you mean 'toBeDefined'?
     e2e-tests/tier1-feature/f24_adversarial_hardening.test.ts(56,42): error TS2551: Property 'toBeUndefined' does not exist on type ... Did you mean 'toBeDefined'?
     e2e-tests/tier3-pairwise/journey_template_ai_diff_export.test.ts(55,30): error TS2339: Property 'not' does not exist on type ...
     src/ai/template-fill.ts(97,58): error TS2554: Expected 1-2 arguments, but got 3.
     ```
   - `npm test` in `web_app`:
     ```
     Test Files  9 failed | 15 passed (24)
     Tests  14 failed | 181 passed (195)
     ```
     Including failure in `tests/unit/ai-template-fill.test.ts` caused by `src/ai/template-fill.ts:97`.
   - `npm run build` in `web_app`:
     ```
     Failed to compile.
     Module not found: Can't resolve 'net'
     Import trace for requested module:
     ./node_modules/.../jsdom/lib/api.js
     ./src/docx/importer.ts -> ./app/page.tsx
     ```

2. **Source Code Review**:
   - `web_app/src/ai/types.ts`: Well-defined data structures for all 3 subsystems and diff engine.
   - `web_app/src/ai/administrative-rules.ts`: Contains 4-element `ADMINISTRATIVE_AI_RULES`, but regex patterns allow multiple bypasses.
   - `web_app/src/ai/sanitizer.ts`: Correctly masks keys (`sk-***`, `AIzaSy***`), but line 19 deletes entire code blocks destructively.
   - `web_app/src/ai/mock-provider.ts`: Well-designed offline fixtures matching templates and proofreading categories.
   - `web_app/src/ai/direct-client.ts`: Proper timeout (45s), retry, and error normalization, but crashes on undefined apiKey.
   - `web_app/src/ai/diff.ts`: Correct word-level diff, Emerald `#10B981` / Rose `#EF4444` theme, and granular Accept/Reject resolution.
   - `web_app/src/components/ai/`: UI components correctly structured and mounted in `Sidebar.tsx` under Tab 3.

---

## 2. Logic Chain
1. Milestone 5 requires a production-grade AI Workspace with 3 subsystems, dual API clients, strict administrative prompts, and visual diff preview.
2. Production code must pass `npm run typecheck` with 0 errors (`tsc --noEmit`).
3. Observation 1 proves `src/ai/template-fill.ts(97,58)` fails TypeScript compilation due to argument count mismatch with `formatAdministrativeDate`.
4. Logic tracing shows that passing 3 arguments into `formatAdministrativeDate` corrupts calendar parsing, changing year 2026 into timestamp millisecond epoch (year 1970).
5. Observation 1 also proves 5 E2E test files fail TypeScript compilation because of missing `.not` and `.toBeUndefined` matchers in the custom test harness.
6. Code inspection of `sanitizer.ts:19` reveals destructive text deletion whenever an LLM wraps output in markdown code fences.
7. Code inspection of `direct-client.ts:207, 249` reveals unhandled `TypeError` when `apiKey` is undefined.
8. Therefore, the implementation fails quality, compilation, and security requirements.

---

## 3. Caveats
- No live OpenAI or Google Gemini network calls were performed using paid API credits; verification relied on hermetic mock provider, test harness, and code inspection.
- The build failure in `npm run build` is primarily triggered by client-side import of `jsdom` in `src/docx/importer.ts`, which originated prior to Milestone 5, but affects the Next.js bundle compiler.

---

## 4. Conclusion
Verdict: **REQUEST_CHANGES**.
The worker must fix:
1. `src/ai/template-fill.ts:97`: Fix `formatAdministrativeDate` call signature and date parsing.
2. `src/ai/sanitizer.ts:19`: Fix code fence stripping to avoid wiping enclosed text.
3. `src/ai/direct-client.ts:207, 249`: Defensively handle undefined/empty API keys.
4. `src/ai/administrative-rules.ts`: Strengthen prompt injection regex patterns and validate `context`.
5. `e2e-tests`: Add `.not` and `.toBeUndefined()` support to custom test harness, or adjust assertions.
6. Verify `npm run typecheck` passes with 0 diagnostics.

---

## 5. Verification Method
1. Run `npm run typecheck` in `web_app` and verify 0 errors:
   ```bash
   cd web_app && npm run typecheck
   ```
2. Run unit tests in `web_app`:
   ```bash
   cd web_app && npx vitest run tests/unit/ai-*.test.ts tests/unit/ai-workspace-ui.test.tsx tests/unit/adversarial-diff-template.test.ts tests/unit/ai-adversarial-challenger.test.ts
   ```
3. Run E2E runner:
   ```bash
   cd web_app && node e2e-tests/runner.js --tier=1 --filter=ai
   cd web_app && node e2e-tests/runner.js --tier=1 --filter=diff
   cd web_app && node e2e-tests/runner.js --tier=3 --filter=draft
   ```
4. Invalidation Conditions:
   - Any failure in `npm run typecheck`.
   - Any failure in `tests/unit/ai-*.test.ts`.
   - Data loss when AI response is wrapped in ```` ``` ````.
   - Any crash when `apiKey` is undefined.
