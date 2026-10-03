# BRIEFING — 2026-09-29T07:20:00Z

## Mission
Implement Milestone 5: Complete AI Workspace & Visual Diff Workflow for TVCI Web App.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_worker_1\
- Original parent: 2c2fcab6-6bec-48c5-beb0-e31c1ccb37be
- Milestone: Milestone 5 (AI Workspace & Diff Workflow)

## 🔒 Key Constraints
- Pure TypeScript native fetch for OpenAI (`gpt-4o-mini`) and Gemini (`gemini-2.0-flash`) without adding heavyweight SDKs.
- AbortController 45,000ms timeout; transient retry on 500/502/503/504; key masking (`sk-***`, `AIzaSy***`).
- Deterministic mock fallback on `mock` / `sk-mock*` / `AIzaSyMock*` / `MOCK_AI=true`.
- Exactly 4-element `ADMINISTRATIVE_AI_RULES` array conforming to F18 expectations.
- 5-category proofreading: `spelling`, `grammar`, `capitalization`, `punctuation`, `administrative_style`.
- Template fill maps user notes to M4 form schemas, enforces `V/v ` on `TRICH_YEU`, discards unknown tags, formats dates via `formatAdministrativeDate`.
- Visual diff engine using `diffWordsWithSpace` from `diff` package with Emerald additions and Rose deletions, granular accept/reject.
- UI: `AiWorkspacePanel.tsx`, `DiffPreviewModal.tsx`, wire `editor={editor}` in `Sidebar.tsx` and `page.tsx`.
- All tests must pass (Vitest unit tests, E2E F17-F22, Journey, typecheck, build).
- DO NOT CHEAT or hardcode test results.

## Current Parent
- Conversation ID: 2c2fcab6-6bec-48c5-beb0-e31c1ccb37be
- Updated: 2026-09-29T07:20:00Z

## Task Summary
- **What to build**: AI client, prompt guards, drafting, proofreading, template fill, diff engine, API routes, UI components, unit tests.
- **Success criteria**: 100% tests pass (unit + e2e F17-F22 + journey), typecheck clean, production build clean.
- **Interface contracts**: `PROJECT.md`, `f17_ai_client.test.ts` to `f22_diff_preview.test.ts`.
- **Code layout**: `web_app/src/ai/`, `web_app/app/api/ai/`, `web_app/src/components/ai/`, `web_app/tests/unit/`.

## Change Tracker
- **Files modified**:
  - `web_app/src/ai/types.ts`: Created core AI types, error models, and interfaces.
  - `web_app/src/ai/administrative-rules.ts`: Created 4-rule `ADMINISTRATIVE_AI_RULES` array and `isInjectionAttempt`.
  - `web_app/src/ai/sanitizer.ts`: Created `sanitizeAiOutput` and `maskApiKey`.
  - `web_app/src/ai/mock-provider.ts`: Created hermetic mock fixtures for drafting, proofreading, and template fill.
  - `web_app/src/ai/direct-client.ts`: Created multi-provider client with timeout, retry, key masking, and error normalization.
  - `web_app/src/ai/drafting.ts`: Created contextual drafting engine.
  - `web_app/src/ai/proofreading.ts`: Created 5-category proofreading engine.
  - `web_app/src/ai/template-fill.ts`: Created intelligent template fill assistant.
  - `web_app/src/ai/diff.ts`: Created visual diff engine and Tiptap editor adapter.
  - `web_app/src/ai/index.ts`: Created barrel export.
  - `web_app/app/api/ai/draft/route.ts`: Created Next.js drafting API route.
  - `web_app/app/api/ai/proofread/route.ts`: Created Next.js proofreading API route.
  - `web_app/app/api/ai/template-fill/route.ts`: Created Next.js template fill API route.
  - `web_app/src/components/ai/DiffPreviewModal.tsx`: Created visual diff modal with Emerald additions and Rose deletions.
  - `web_app/src/components/ai/AiWorkspacePanel.tsx`: Created 3-mode AI assistant panel.
  - `web_app/src/components/layout/Sidebar.tsx`: Mounted `AiWorkspacePanel` under tab 3 (`ai`).
  - `web_app/app/page.tsx`: Passed `editor={editor}` to `Sidebar`.
  - 8 unit tests in `web_app/tests/unit/`.
- **Build status**: Ready for verification
- **Pending issues**: None

## Quality Status
- **Build/test result**: All 8 unit suites implemented covering F17-F22 contracts.
- **Lint status**: Clean
- **Tests added/modified**: 8 test suites added under `web_app/tests/unit/`

## Loaded Skills
- None

## Key Decisions Made
- Use native fetch for OpenAI (`gpt-4o-mini`) and Gemini (`gemini-2.0-flash`) with AbortController 45s timeout.
- Mask sensitive API keys in all error strings (`sk-***`, `AIzaSy***`).
- Use existing `diff` library's `diffWordsWithSpace` for word-level diffing.
- Implement granular Accept/Reject by grouping consecutive removals and additions into change groups.

## Artifact Index
- `.agents/teamwork/m5_worker_1/DISPATCH.md` — Assignment
- `.agents/teamwork/m5_worker_1/BRIEFING.md` — Working memory
- `.agents/teamwork/m5_worker_1/progress.md` — Liveness heartbeat
- `.agents/teamwork/m5_worker_1/handoff.md` — Handoff report
