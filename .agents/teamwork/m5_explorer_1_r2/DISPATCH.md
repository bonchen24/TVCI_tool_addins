# Task Dispatch: M5 Explorer 1 (Multi-Provider AI Client & Prompt Guards)

## Identity
- Role: Explorer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_1_r2\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_1_r2\handoff.md

## Context & Objectives
You are investigating Milestone 5 (AI Workspace & Diff Workflow) for the TVCI Web Application:
- Multi-provider AI client supporting OpenAI (gpt-4o-mini) and Google Gemini (gemini-2.0-flash).
- Robust handling of API keys, environment variables, timeout, retry with exponential backoff, and offline fallback/mocking for tests.
- STRICT Vietnamese administrative prompt guards (`ADMINISTRATIVE_AI_RULES`): no hallucinations, no markdown artifacts where plain text or HTML is expected, no emojis, strict formal administrative tone adhering to Nghị định 30/2020/NĐ-CP.
- Next.js App Router API routes under `web_app/app/api/ai/` or unified client in `web_app/src/ai/direct-client.ts`.

## Files to Read & Investigate
1. `e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY)
2. `e:\CODING\TVCI_word_addins\PROJECT.md`
3. `e:\CODING\TVCI_word_addins\web_app\package.json`
4. Existing source in `e:\CODING\TVCI_word_addins\web_app\src\ai\` and `e:\CODING\TVCI_word_addins\web_app\app\api\`

## Output Requirements
Write `analysis.md` and `handoff.md` in your working directory containing:
1. Current status of AI client code and dependencies in `web_app`.
2. Architecture design for dual-provider client (OpenAI + Gemini) with clean interface and mock capability for deterministic tests.
3. Strict prompt guard specifications for Vietnamese administrative documents.
4. Concrete recommendations and file paths for the implementation Worker.
5. Verification commands and unit test strategies.
