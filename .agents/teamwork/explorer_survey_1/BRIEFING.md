# BRIEFING — 2026-09-29T02:28:00Z

## Mission
Investigate TVCI Word Add-in codebase in `src/` to enumerate existing features, Nghị định 30/2020/NĐ-CP formatting rules, auditing/auto-correction logic, AI prompts/schemas/diffs, and template data models.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\explorer_survey_1\
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: codebase survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code.
- Report output to `survey_report.md` and `handoff.md`.
- Heartbeat in `progress.md`.
- Send completion message to parent.

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: 2026-09-29T02:28:00Z

## Investigation State
- **Explored paths**: `src/rules/`, `src/ai/`, `src/templates/`, `src/word/`, `src/models/`, `src/utils/`, `src/taskpane/`, `src/commands/`, `src/knowledge/`
- **Key findings**:
  - Detailed administrative formatting rules under NĐ30/2020/NĐ-CP, IEMM, DANG, TKV mapped in `component-rules.ts` and `profiles.ts`.
  - Auditing & Auto-fix engine evaluates 25+ rules across 7 categories; computes healthScore; filters safe issues.
  - AI Assistant covers Drafting (7 styles + RAG-lite), Proofreading (5 issue types), Template Fill (JSON schema + confidence threshold); Diff engine (`apply-plan.ts`) guarantees Preview-First.
  - Template catalog has 18+ items; 8 core document schemas; 2-tier replacement (Content Controls + regex fallback).
- **Unexplored areas**: None within the requested scope.

## Key Decisions Made
- Fully documented all rules, tables, schemas, diff logic and file references in `survey_report.md`.
- Produced 5-component `handoff.md`.

## Artifact Index
- `DISPATCH.md` — Record of dispatch instructions
- `BRIEFING.md` — Persistent agent memory
- `progress.md` — Heartbeat and task tracking
- `survey_report.md` — Detailed survey findings report
- `handoff.md` — 5-component handoff report
