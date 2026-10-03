# Handoff Report: Milestone 5 — Complete AI Workspace & Diff Workflow

## 1. Observation
1. **Implemented Modules**:
   - `web_app/src/ai/types.ts`: Defined `AiClientConfig`, `AiErrorCode`, `AiServiceError`, `NormalizedAiError`, `DraftingRequest`, `DraftingResult`, `ProofreadingRequest`, `ProofreadingResult`, `ProofreadIssue`, `TemplateFillRequest`, `TemplateFillResult`, `DiffWordSpan`, `DiffChangeGroup`, `DiffDecision`, and `DiffAnalysisResult`.
   - `web_app/src/ai/administrative-rules.ts`: Implemented 4-element `ADMINISTRATIVE_AI_RULES` array matching Tier 1 F18 specification verbatim:
     - `ADMINISTRATIVE_AI_RULES[0]`: "TUYỆT ĐỐI KHÔNG BỊA ĐẶT (no hallucination)..."
     - `ADMINISTRATIVE_AI_RULES[1]`: "KHÔNG DÙNG ĐỊNH DẠNG MARKDOWN (không dùng #, **, *, -, ```)."
     - `ADMINISTRATIVE_AI_RULES[2]`: "KHÔNG DÙNG BIỂU TƯỢNG CẢM XÚC (emoji)."
     - `ADMINISTRATIVE_AI_RULES[3]`: "NGÔN NGỮ CHUẨN XÁC, TRANG TRỌNG, ĐÚNG THỂ THỨC HÀNH CHÍNH VIỆT NAM (Nghị định 30/2020/NĐ-CP)."
     - `isInjectionAttempt(prompt)`: detects jailbreak patterns in English and Vietnamese.
   - `web_app/src/ai/sanitizer.ts`: `sanitizeAiOutput` stripping markdown bold/italic, headers, code fences, and emojis while preserving Vietnamese diacritics and quotes; `maskApiKey` stripping secret tokens (`sk-***`, `AIzaSy***`).
   - `web_app/src/ai/mock-provider.ts`: Hermetic fixtures matching `templateFixtures.ts` for automated offline test execution.
   - `web_app/src/ai/direct-client.ts`: Dual-provider client for OpenAI (`gpt-4o-mini`) and Google Gemini (`gemini-2.0-flash`) using native `fetch`, `AbortController` 45,000ms timeout, transient retry on 500/502/503/504, and error normalization.
   - `web_app/src/ai/drafting.ts`: Contextual drafting engine with prompt validation, injection rejection, administrative phrasing enforcement, and paragraph splitting.
   - `web_app/src/ai/proofreading.ts`: 5-category proofreader (`spelling`, `grammar`, `capitalization`, `punctuation`, `administrative_style`) with character position tracking and safe JSON parsing.
   - `web_app/src/ai/template-fill.ts`: Field extractor mapping unstructured notes to canonical schemas, enforcing `TRICH_YEU` prefix `V/v `, discarding unknown tags, and formatting dates via `formatAdministrativeDate`.
   - `web_app/src/ai/diff.ts`: Word-level visual diff engine using `diffWordsWithSpace` from `diff` package with Emerald additions, Rose deletions, granular Accept/Reject resolution, and Tiptap editor insertion helpers.
   - `web_app/src/ai/index.ts`: Barrel export of all types and functions.
2. **Next.js App Router API Routes**:
   - `web_app/app/api/ai/draft/route.ts`: POST endpoint returning `DraftingResult` or normalized errors.
   - `web_app/app/api/ai/proofread/route.ts`: POST endpoint returning `ProofreadingResult`.
   - `web_app/app/api/ai/template-fill/route.ts`: POST endpoint returning `TemplateFillResult`.
3. **UI Components & Workspace Integration**:
   - `web_app/src/components/ai/DiffPreviewModal.tsx`: Visual word-level diff modal with Emerald highlights (`#10B981`, `#D1FAE5`), Rose line-through deletions (`#EF4444`, `#FEE2E2`), and granular Accept/Reject per change card.
   - `web_app/src/components/ai/AiWorkspacePanel.tsx`: 3-mode assistant panel (Drafting, Proofreading, Template Fill) with provider selection, prompt bar, and diff preview triggers.
   - `web_app/src/components/layout/Sidebar.tsx`: Mounted `<AiWorkspacePanel editor={editor} />` under Tab 3 (`activeTab === 'ai'`).
   - `web_app/app/page.tsx`: Wired `editor={editor}` prop into `<Sidebar ... />`.
4. **Unit Test Coverage (`web_app/tests/unit/`)**:
   - `ai-client.test.ts`: Client config, error normalization, retry logic, key masking, mock mode.
   - `ai-prompts.test.ts`: 4-element `ADMINISTRATIVE_AI_RULES`, `sanitizeAiOutput`, `isInjectionAttempt`.
   - `ai-api-routes.test.ts`: Next.js App Router API routes for draft, proofread, and template-fill.
   - `ai-drafting.test.ts`: Prompt builder, paragraph parsing, token tracking, validation.
   - `ai-proofreading.test.ts`: 5 categories, spelling typo detection, style replacement, character indices.
   - `ai-template-fill.test.ts`: Recipient extraction, prefixing `V/v `, tag discarding, confidence scoring.
   - `ai-diff.test.ts`: Word diff calculation, Emerald/Rose color tokens, Accept/Reject resolution, editor insertion.
   - `ai-workspace-ui.test.tsx`: Component rendering, tab switching, input validation, DiffPreviewModal toggling, Sidebar mounting.

## 2. Logic Chain
1. The requirements for Milestone 5 specified building a complete AI Workspace with preview-first diff workflow, dual API providers (OpenAI `gpt-4o-mini`, Gemini `gemini-2.0-flash`), strict prompt guards, 3 AI subsystems, Next.js API routes, UI components, and unit tests.
2. We strictly implemented native fetch rather than third-party SDKs to preserve minimal dependencies and fast startup.
3. For prompt safety, `ADMINISTRATIVE_AI_RULES` contains exactly 4 elements matching F18 expectations, and `isInjectionAttempt` guards against adversarial system overrides.
4. For visual diffing, `diffWordsWithSpace` from the existing `diff` dependency provides word-level additions and deletions conforming to `#10B981` (Emerald) and `#EF4444` (Rose) color tokens.
5. All 3 subsystems (`drafting.ts`, `proofreading.ts`, `template-fill.ts`) incorporate mock fallbacks so automated unit and E2E tests run hermetically without requiring live network calls.
6. The UI components connect cleanly to the central desk: `Sidebar.tsx` mounts `AiWorkspacePanel` under Tab 3, which accesses `editor` passed from `page.tsx` to read selections and insert accepted diffs.

## 3. Caveats
- Production deployment with live OpenAI or Google Gemini API calls requires users or deployment environments to provide valid API keys via the UI settings panel or environment variables.
- When no API keys or mock keys are provided, the system defaults to deterministic fixtures to ensure hermetic testing.

## 4. Conclusion
Milestone 5 implementation is complete. All 17 assigned files and modules have been implemented cleanly with zero dummy facades or shortcuts. The AI Workspace, visual diff workflow, prompt guards, API routes, and comprehensive unit tests are fully operational.

## 5. Verification Method
1. **Type Checking**:
   ```bash
   cd web_app && npm run typecheck
   ```
2. **Unit Tests (Vitest)**:
   ```bash
   cd web_app && npx vitest run tests/unit/ai-*.test.ts tests/unit/ai-workspace-ui.test.tsx
   ```
3. **E2E Feature Tests (F17–F22)**:
   ```bash
   node web_app/e2e-tests/runner.js --tier=1 --filter=ai
   node web_app/e2e-tests/runner.js --tier=1 --filter=diff
   ```
4. **E2E Journey Test (Tier 3)**:
   ```bash
   node web_app/e2e-tests/runner.js --tier=3 --filter=draft
   ```
5. **Production Build**:
   ```bash
   cd web_app && npm run build
   ```
6. **Invalidation Conditions**:
   - Any failure in F17–F22 test cases.
   - Any raw API key leaked in error messages.
   - `ADMINISTRATIVE_AI_RULES.length !== 4`.
   - Proofreading categories count is not exactly 5.
   - TypeScript compilation diagnostics in `web_app/src/ai/` or `web_app/src/components/ai/`.
