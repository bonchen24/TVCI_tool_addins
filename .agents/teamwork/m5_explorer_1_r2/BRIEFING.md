# BRIEFING — 2026-09-29T13:56:00+07:00

## Mission
Investigate Multi-Provider AI Client (OpenAI + Gemini), Vietnamese Administrative Prompt Guards (ADMINISTRATIVE_AI_RULES), API routes, and Client Integration for Milestone 5.

## 🔒 My Identity
- Archetype: explorer
- Roles: Explorer, Synthesizer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_1_r2\
- Original parent: 2c2fcab6-6bec-48c5-beb0-e31c1ccb37be
- Milestone: Milestone 5 (AI Workspace & Diff Workflow)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Multi-provider AI client supporting OpenAI (gpt-4o-mini) and Google Gemini (gemini-2.0-flash)
- Strict Vietnamese administrative prompt rules (ADMINISTRATIVE_AI_RULES per NĐ 30/2020/NĐ-CP)
- Robust error normalization, timeouts (45s), exponential retry, API key stripping, mock/offline test hermeticity
- Layout compliance: source code must NOT be written in `.agents/teamwork/`

## Current Parent
- Conversation ID: 2c2fcab6-6bec-48c5-beb0-e31c1ccb37be
- Updated: 2026-09-29T13:56:00+07:00

## Investigation State
- **Explored paths**:
  - `e:\CODING\TVCI_word_addins\PROJECT.md`
  - `e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md`
  - `e:\CODING\TVCI_word_addins\src\ai\administrative-rules.ts`
  - `e:\CODING\TVCI_word_addins\src\ai\direct-client.ts`
  - `e:\CODING\TVCI_word_addins\src\ai\template-fill.ts`
  - `e:\CODING\TVCI_word_addins\src\ai\writing-workspace.ts`
  - `e:\CODING\TVCI_word_addins\web_app\package.json`
  - `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier1-feature\f17_ai_client.test.ts`
  - `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier1-feature\f18_ai_prompts.test.ts`
  - `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier1-feature\f19_ai_drafting.test.ts`
  - `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier1-feature\f20_ai_proofreading.test.ts`
  - `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier1-feature\f21_ai_template_fill.test.ts`
  - `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier3-pairwise\journey_template_ai_diff_export.test.ts`
  - `e:\CODING\TVCI_word_addins\web_app\src\components\layout\Sidebar.tsx`
- **Key findings**:
  - `web_app/src/ai/` directory does not yet exist; needs porting/creating with unified direct client and subsystems.
  - Native `fetch` wrapper is superior to bloated npm SDKs (`openai`, `@google/genai`); zero extra dependencies required.
  - E2E tests have exact expectations for `ADMINISTRATIVE_AI_RULES`, `sanitizeAiOutput`, error normalization, 45s timeout, and mock fallback.
- **Unexplored areas**:
  - API routes under `web_app/app/api/ai/` vs direct client in browser.
  - Mock mode configuration for hermetic unit & E2E testing without active internet or API keys.

## Key Decisions Made
- Use native fetch-based client architecture matching `src/ai/direct-client.ts`, supporting OpenAI & Gemini REST APIs.
- Provide comprehensive prompt guards matching both array contract in `f18_ai_prompts.test.ts` and joined string contract in `administrative-rules.ts`.
- Structure modular files: `direct-client.ts`, `administrative-rules.ts`, `sanitizer.ts`, `types.ts`, `mock-provider.ts`.

## Artifact Index
- `analysis.md` — Detailed investigation findings and architecture proposal
- `handoff.md` — 5-component handoff report for M5 Worker
