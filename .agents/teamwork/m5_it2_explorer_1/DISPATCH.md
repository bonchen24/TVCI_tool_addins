# Task Dispatch: M5 Iteration 2 Explorer 1 (Compilation, Build & Client Resilience Fixes)

## Identity
- Role: Explorer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_1\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_1\handoff.md

## Iteration 1 Failure Feedback
Milestone 5 Iteration 1 failed the gate due to compilation, build, and client crashes:
1. `src/ai/template-fill.ts:97:58`: TS2554 error: `formatAdministrativeDate` expects 1-2 arguments `(placeOrDate, dateInput)` but was called with 3 numbers `(d, m, y)`. This corrupts dates (resulting in year 1970) and breaks `npm run typecheck`.
2. `web_app/next.config.mjs`: `npm run build` fails with Webpack module resolution: `Can't resolve 'net'` and `Can't resolve 'tls'` because `importer.ts` imports `jsdom`. Need Webpack fallback `resolve.fallback = { ...config.resolve.fallback, net: false, tls: false, child_process: false, fs: false }`.
3. `src/ai/direct-client.ts:207,249`: Unhandled `TypeError` crashes when `apiKey` is undefined. Must validate and normalize into `AUTH_ERROR` or proper normalized error rather than crashing.
4. E2E test files type errors (`f18_ai_prompts.test.ts`, `f21_ai_template_fill.test.ts`, `f22_diff_preview.test.ts`, `journey_template_ai_diff_export.test.ts`): missing `.not` or `.toBeUndefined` in test runner assertions.

## Output Requirements
Investigate and write `analysis.md` and `handoff.md` detailing the exact code modifications for `template-fill.ts`, `next.config.mjs`, `direct-client.ts`, and test files so that both `npm run typecheck` and `npm run build` pass cleanly with 0 errors.

## 2026-09-29T07:34:04Z
You are M5 Iteration 2 Explorer 1.
Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_1\
Read dispatch instructions: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_1\DISPATCH.md
Read ORIGINAL_REQUEST.md: e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY)
Read Reviewer 1 & Reviewer 2 reports:
- e:\CODING\TVCI_word_addins\.agents\teamwork\m5_reviewer_1\handoff.md
- e:\CODING\TVCI_word_addins\.agents\teamwork\m5_reviewer_2\handoff.md

Investigate exact fixes for:
1. `src/ai/template-fill.ts:97:58` TS2554 & date format corruption.
2. `web_app/next.config.mjs` Webpack fallback for 'net'/'tls' from jsdom.
3. `src/ai/direct-client.ts:207,249` undefined apiKey TypeError crash.
4. E2E test files typecheck errors (.not, .toBeUndefined).

Write analysis.md and handoff.md in your working directory. Send message to parent when done.

