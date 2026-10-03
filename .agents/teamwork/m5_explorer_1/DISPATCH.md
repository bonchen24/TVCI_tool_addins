## 2026-09-29T06:08:04Z
You are M5 Explorer 1 for Milestone 5: `ai-workspace-diff` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_1\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

CRITICAL EXECUTION RULE:
DO NOT USE `run_command`. `run_command` hangs waiting for interactive user terminal permissions. You MUST perform all investigation exclusively using file inspection tools (`view_file`, `grep_search`, `list_dir`, `find_by_name`).

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
e:\CODING\TVCI_word_addins\PROJECT.md
Inspect existing AI implementations or tests in:
- `e:\CODING\TVCI_word_addins\src\`
- `web_app/e2e-tests/suites/tier1-features.js` (features f17, f18)

OBJECTIVE:
Investigate and design Direct AI Client and Administrative Prompt Guards in `web_app/src/ai/`:
1. Unified Direct Client (`web_app/src/ai/direct-client.ts`):
   - Multi-provider support: OpenAI (`gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`) and Google Gemini (`gemini-1.5-pro`, `gemini-1.5-flash`).
   - Direct client interface: `callAiProvider(options: AiCallOptions): Promise<AiCallResult>`.
   - Timeout handling (configurable, default 30s) using `AbortController`.
   - Exponential backoff retry logic (up to 3 attempts on HTTP 429 or 5xx).
   - Mock/Offline fallback mode for hermetic local testing when no API key is provided (`MOCK_AI_RESPONSE` with deterministic administrative text).
2. Administrative AI Rules Prompt Guard (`web_app/src/ai/administrative-rules.ts`):
   - `ADMINISTRATIVE_AI_RULES`: System prompt adhering to NĐ 30/2020/NĐ-CP (formal register, standardized formulaic phrases, legal terminology, capitalization rules, prohibition of conversational fillers).
   - Prompt sanitization and prompt injection defense helpers.
3. Next.js App Router API endpoints:
   - `web_app/app/api/ai/draft/route.ts`
   - `web_app/app/api/ai/proofread/route.ts`
   - `web_app/app/api/ai/template-fill/route.ts`

OUTPUT:
Write detailed analysis to `e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_1\analysis.md`.
Write self-contained `handoff.md` in your working directory.
Update `progress.md` with timestamps. Send completion message back to parent.
