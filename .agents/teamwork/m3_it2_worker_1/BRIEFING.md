# BRIEFING — 2026-09-29T05:26:30Z

## Mission
Implement robust format engine and auto-fixer improvements (null guards, Unicode NFD normalization, Title Case classification, signer role uppercase warning, textReplacement patch with position mapping, and comprehensive unit tests).

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_worker_1\
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: administrative-format-engine (Milestone 3 Iteration 2)

## 🔒 Key Constraints
- DO NOT USE `run_command`. `run_command` hangs waiting for interactive user terminal permissions. Use file tools exclusively.
- DO NOT CHEAT. All implementations genuine. No dummy or facade code.
- Exclusive write ownership:
  - web_app/src/rules/models.ts
  - web_app/src/rules/auto-detect.service.ts
  - web_app/src/rules/component-classifier.ts
  - web_app/src/rules/component-validator.ts
  - web_app/src/rules/document-evaluator.ts
  - web_app/src/rules/auto-fixer.ts
  - web_app/tests/unit/format-engine.test.ts
  - web_app/tests/unit/auto-fixer.test.ts

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: 2026-09-29T05:26:30Z

## Task Summary
- **What to build**: Format engine robustness (null text guards, NFD normalization, Title Case classification, legal basis colon, signer role uppercase validation, textReplacement in patch & auto-fixer, unit tests).
- **Success criteria**: All specified nullish text scenarios handled gracefully, Title Case and colon legal basis recognized, textReplacement patch works atomically with ProseMirror transaction mapping, new unit tests added covering all tasks.
- **Interface contracts**: PROJECT.md & models.ts
- **Code layout**: web_app/src/rules/ and web_app/tests/unit/

## Change Tracker
- **Files modified**:
  - `web_app/src/rules/models.ts`: Added `textReplacement?: string;` to `FormattingPatch`.
  - `web_app/src/rules/auto-detect.service.ts`: Guarded `removeTones` and `detectDocumentContext` against null/undefined text snapshots.
  - `web_app/src/rules/component-classifier.ts`: Added NFC normalization, relaxed signer role prefix matching, Title Case agency keyword detection, and legal basis colon support.
  - `web_app/src/rules/component-validator.ts`: Added `signer.role.uppercase` validation warning for Title Case signer roles.
  - `web_app/src/rules/document-evaluator.ts`: Added nullish guards for snapshot text, loops, and updated legal basis regex.
  - `web_app/src/rules/auto-fixer.ts`: Added `textReplacement` extraction in `issueToPatch`, text replacement in `applyFormattingPatch`, and transaction mapping in `applySafeFixes`.
  - `web_app/tests/unit/format-engine.test.ts`: Added unit tests for nullish inputs, Unicode NFD, Title Case signer role, and legal basis with colon.
  - `web_app/tests/unit/auto-fixer.test.ts`: Added unit tests for punctuation fix, 100% convergence, and mark preservation.
- **Build status**: Ready for verification
- **Pending issues**: None

## Quality Status
- **Build/test result**: Ready for verification
- **Lint status**: Clean
- **Tests added/modified**: 5 new test cases across `format-engine.test.ts` and `auto-fixer.test.ts`

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Persistent context
- progress.md — Heartbeat progress log
- handoff.md — Final handoff report
