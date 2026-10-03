# Task Dispatch: M5 Worker (AI Workspace & Diff Workflow Implementation)

## Identity
- Role: Worker
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_worker_1\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_worker_1\handoff.md

## Scope & File Ownership
You exclusively own and are responsible for implementing:
1. `web_app/src/ai/types.ts`
2. `web_app/src/ai/administrative-rules.ts`
3. `web_app/src/ai/sanitizer.ts`
4. `web_app/src/ai/mock-provider.ts`
5. `web_app/src/ai/direct-client.ts`
6. `web_app/src/ai/drafting.ts`
7. `web_app/src/ai/proofreading.ts`
8. `web_app/src/ai/template-fill.ts`
9. `web_app/src/ai/diff.ts`
10. `web_app/src/ai/index.ts`
11. `web_app/app/api/ai/draft/route.ts`
12. `web_app/app/api/ai/proofread/route.ts`
13. `web_app/app/api/ai/template-fill/route.ts`
14. `web_app/src/components/ai/AiWorkspacePanel.tsx`
15. `web_app/src/components/ai/DiffPreviewModal.tsx`
16. Connect AI tab in `web_app/src/components/layout/Sidebar.tsx` and pass `editor={editor}` in `web_app/app/page.tsx`
17. Unit test suites under `web_app/tests/unit/`:
    - `ai-client.test.ts`
    - `ai-prompts.test.ts`
    - `ai-api-routes.test.ts`
    - `ai-drafting.test.ts`
    - `ai-proofreading.test.ts`
    - `ai-template-fill.test.ts`
    - `ai-diff.test.ts`
    - `ai-workspace-ui.test.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements (from Explorers 1, 2, 3)
1. **Multi-Provider AI Client** (`direct-client.ts`):
   - Native fetch calls to OpenAI (`https://api.openai.com/v1/chat/completions`, model `gpt-4o-mini`) and Gemini (`https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`, model `gemini-2.0-flash`).
   - Timeout: 45,000ms using `AbortController`.
   - Retry logic: Transient retry on 500, 502, 503, 504 with exponential backoff (maxRetries: 2).
   - Error normalization: `{ code: "AUTH_ERROR" | "RATE_LIMIT" | "TIMEOUT" | "INVALID_RESPONSE", status, message }`.
   - Security: Mask API keys in all error strings (`sk-***`, `AIzaSy***`).
   - Hermetic mock fallback: If `apiKey: "mock"` or `provider: "mock"` or `sk-mock*` or `AIzaSyMock*` or `process.env.MOCK_AI === "true"`, return deterministic fixtures.
2. **Strict Administrative Prompt Rules** (`administrative-rules.ts` & `sanitizer.ts`):
   - `ADMINISTRATIVE_AI_RULES`: Exactly 4 elements string array matching F18 expectations:
     - 1. KHÔNG BỊA ĐẶT
     - 2. KHÔNG DÙNG ĐỊNH DẠNG MARKDOWN
     - 3. KHÔNG DÙNG BIỂU TƯỢNG CẢM XÚC
     - 4. Phong cách hành chính chuẩn mực theo Nghị định 30/2020/NĐ-CP.
   - `isInjectionAttempt(prompt)`: detects jailbreak patterns in English and Vietnamese.
   - `sanitizeAiOutput(text)`: strips markdown artifacts, bold/italics, code fences, emojis while preserving Vietnamese diacritics.
3. **Contextual Drafting Subsystem** (`drafting.ts`):
   - Validates non-empty prompt; rejects injection attempts.
   - Supports document types and standard administrative sections (`mo_dau`, `can_cu`, `noi_dung`, `dieu_khoan`, `ket_luan`).
   - Splits output into clean paragraphs; calculates token metadata.
4. **5-Category Proofreading Subsystem** (`proofreading.ts`):
   - Exactly 5 categories: `spelling`, `grammar`, `capitalization`, `punctuation`, `administrative_style`.
   - Returns `{ revisedText, issues: [{ category, original, replacement, explanation, severity, position, endIndex }] }`.
   - Safe JSON extraction from LLM response.
5. **AI Template Fill Assistant** (`template-fill.ts`):
   - Maps user notes to M4 form schemas (`FORM_SCHEMAS`, `INTERNAL_SCHEMAS`).
   - Enforces `TRICH_YEU` prefix `V/v `.
   - Discards unknown tags not in schema.
   - Formats dates using `formatAdministrativeDate`.
   - Computes confidence scores (threshold 0.8).
6. **Visual Diff Engine & UI** (`diff.ts`, `AiWorkspacePanel.tsx`, `DiffPreviewModal.tsx`):
   - `diffWordsWithSpace` from `diff` package.
   - Word spans: `added` (Emerald `#10B981`), `removed` (Rose `#EF4444`), `unchanged`.
   - Granular Accept / Reject resolution.
   - `AiWorkspacePanel.tsx` in Sidebar tab 3 (`activeTab === 'ai'`).
   - Pass `editor={editor}` in `app/page.tsx` and integrate Tiptap text replacement.

## Verification Requirements
Run and ensure the following pass:
1. `npm run typecheck` (in `web_app`)
2. `npx vitest run tests/unit/ai-*.test.ts tests/unit/ai-workspace-ui.test.tsx` (in `web_app`)
3. `node e2e-tests/runner.js --tier=1 --filter=ai` (F17, F18, F19, F20, F21)
4. `node e2e-tests/runner.js --tier=1 --filter=diff` (F22)
5. `node e2e-tests/runner.js --tier=3 --filter=draft` (journey test)
6. `npm run build` (in `web_app`)
## 2026-09-29T07:00:39Z

Implement the complete AI Workspace and Diff workflow:
1. Multi-provider AI Client (OpenAI gpt-4o-mini, Gemini gemini-2.0-flash, mock fallback)
2. Administrative prompt rules (4-element ADMINISTRATIVE_AI_RULES), prompt injection detector, output sanitizer
3. 3 AI Subsystems (Drafting, 5-Category Proofreading, Template Fill)
4. Visual Diff Engine using diffWordsWithSpace from diff package
5. Next.js App Router API routes: web_app/app/api/ai/draft/route.ts, proofread/route.ts, template-fill/route.ts
6. UI components: AiWorkspacePanel.tsx, DiffPreviewModal.tsx, connect AI tab in Sidebar.tsx, wire editor={editor} in app/page.tsx
7. Unit test suites under web_app/tests/unit/
8. Verification: typecheck, unit tests, E2E feature tests F17-F22, journey test, build
