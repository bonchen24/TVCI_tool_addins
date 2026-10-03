# Handoff Report: M5 Explorer 1 (Multi-Provider AI Client & Prompt Guards)

## 1. Observation
1. **Repository Layout**:
   - `web_app/src/ai/` does not exist (`find_by_name` returned directory does not exist).
   - `web_app/app/api/` does not exist (`find_by_name` returned directory does not exist).
   - `web_app/package.json` contains `diff: "^7.0.0"` and `@types/diff: "^6.0.0"`, but no third-party SDKs (`openai` or `@google/genai`).
2. **Pre-existing Word Add-in AI Implementations**:
   - `src/ai/direct-client.ts` implements fetch-based calls for OpenAI (`https://api.openai.com/v1/chat/completions`) and Gemini (`https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`) with `AI_REQUEST_TIMEOUT_MS = 45_000`, `fetchWithTransientRetry`, error detail extraction, and output sanitization (`sanitizeAiTextOutput`).
   - `src/ai/administrative-rules.ts` defines string rules for Vietnamese administrative drafting.
3. **Pre-existing E2E Test Suite Contracts**:
   - `web_app/e2e-tests/tier1-feature/f17_ai_client.test.ts` lines 9-15 & 44-67: Expects `AiClientConfig` with `provider: "openai" | "gemini"`, `model: "gpt-4o-mini"` / `"gemini-2.0-flash"`, `timeoutMs: 45000`, `maxRetries: 2`. Expects error normalization into `{ code: "AUTH_ERROR" | "RATE_LIMIT" | "TIMEOUT" | "INVALID_RESPONSE", status, message }`, transient retry on 503, and key masking (`sk-[a-zA-Z0-9_-]+` -> `sk-***`).
   - `web_app/e2e-tests/tier1-feature/f18_ai_prompts.test.ts` lines 9-35: Explicitly checks `ADMINISTRATIVE_AI_RULES.length === 4`, `ADMINISTRATIVE_AI_RULES[0].includes("KHÔNG BỊA ĐẶT")`, `ADMINISTRATIVE_AI_RULES[1].includes("KHÔNG DÙNG ĐỊNH DẠNG MARKDOWN")`, `ADMINISTRATIVE_AI_RULES[2].includes("KHÔNG DÙNG BIỂU TƯỢNG CẢM XÚC")`.
   - `web_app/e2e-tests/tier1-feature/f18_ai_prompts.test.ts` lines 16-28 & 58-67: Specifies `sanitizeAiOutput` (markdown headers, bold/italic, code blocks, emojis) and `isInjectionAttempt` (English and Vietnamese jailbreak prompts).
   - `web_app/e2e-tests/fixtures/templateFixtures.ts` lines 129-150: Exports `MOCK_AI_RESPONSES` for drafting and proofreading.

## 2. Logic Chain
1. Based on Observation 1, `web_app` currently has no AI client code or Next.js App Router API routes, so they must be introduced in Milestone 5.
2. Based on Observation 1 and 2, using native `fetch` rather than adding heavyweight npm SDKs (`openai`, `@google/genai`) avoids bloat, eliminates Next.js bundler runtime issues, and follows the project's "Stdlib and native first" engineering guideline.
3. Based on Observation 3 (`f17_ai_client.test.ts`), the client abstraction must normalize HTTP status codes (401/403 -> `AUTH_ERROR`, 429 -> `RATE_LIMIT`, 408/504 -> `TIMEOUT`, 500/502/503 -> transient retry / `INVALID_RESPONSE`), mask secret keys in all error strings (`sk-***`, `AIzaSy***`), and use an `AbortController` timeout of 45s.
4. Based on Observation 3 (`f18_ai_prompts.test.ts`), `ADMINISTRATIVE_AI_RULES` must be an array of exactly 4 strings matching the required keywords, and must also be exportable as a joined string for prompt injection.
5. To guarantee 100% hermetic test execution without network access or live API credentials, the client must feature an automatic mock fallback triggered when `provider: "mock"`, `apiKey: "mock"`, `sk-mock*`, `AIzaSyMock*`, or `process.env.MOCK_AI === "true"`, returning fixtures from `templateFixtures.ts`.
6. To support both direct browser client execution (zero server cost with user-provided API keys) and Next.js backend proxying, create `web_app/app/api/ai/` routes (`draft`, `proofread`, `template-fill`) that delegate to the client logic while providing clean REST endpoints.

## 3. Caveats
- No live external API keys were tested in this environment; live network calls depend on the user providing valid OpenAI or Google Gemini keys.
- E2E test runner currently has some pre-existing UI mock assertion failures in `tests/unit/components.test.tsx` and `tests/unit/template-ui.test.tsx` related to M1/M4 UI state, which should be isolated from M5 AI unit tests.
- Explorer 2 is responsible for deep subsystem logic (Contextual Drafting, Proofreading, Template Fill prompt generation), while Explorer 3 handles Diff and UI panels; M5 Worker must integrate these modules cleanly.

## 4. Conclusion
1. Implement `web_app/src/ai/` containing:
   - `types.ts`: Provider definitions, config interfaces, and normalized error models.
   - `administrative-rules.ts`: 4-item `ADMINISTRATIVE_AI_RULES` array, prompt rules string, and `isInjectionAttempt`.
   - `sanitizer.ts`: `sanitizeAiOutput` stripping markdown, code blocks, emojis, preambles while preserving Vietnamese diacritics and quotes.
   - `mock-provider.ts`: Deterministic fixtures for test hermeticity.
   - `direct-client.ts`: Unified native fetch client supporting OpenAI `gpt-4o-mini`, Gemini `gemini-2.0-flash`, and Mock mode with 45s timeout, transient retry, and key stripping.
   - `index.ts`: Clean barrel export.
2. Implement Next.js App Router API routes under `web_app/app/api/ai/`:
   - `draft/route.ts`
   - `proofread/route.ts`
   - `template-fill/route.ts`
3. Add dedicated unit tests in `web_app/tests/unit/` (`ai-client.test.ts`, `ai-prompts.test.ts`, `ai-api-routes.test.ts`).

## 5. Verification Method
1. **Type Checking**:
   ```bash
   npm run typecheck
   ```
   (Must pass with 0 errors).
2. **Unit Test Verification**:
   ```bash
   npx vitest run tests/unit/ai-client.test.ts tests/unit/ai-prompts.test.ts tests/unit/ai-api-routes.test.ts
   ```
3. **E2E Feature Verification**:
   ```bash
   node web_app/e2e-tests/runner.js --tier=1
   ```
   Verify F17 and F18 test cases pass 100%.
4. **Invalidation Conditions**:
   - `ADMINISTRATIVE_AI_RULES.length !== 4` or missing required Vietnamese phrases.
   - Leaking raw API keys in error messages.
   - Live network dependency during tests when mock keys are supplied.
