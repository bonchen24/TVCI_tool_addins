# BRIEFING — 2026-09-29T05:25:40Z

## Mission
Formulate exact remediation code and test specifications for Auto-Fixer Text Punctuation Replacement in `web_app/src/rules/auto-fixer.ts`.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, spec-writer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_explorer_3\
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: M3 Iteration 2 (Milestone 3: administrative-format-engine)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in source files.
- DO NOT USE `run_command`. File inspection tools only.
- Terse caveman style.
- Lazy senior developer principle.

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: 2026-09-29T05:25:40Z

## Investigation State
- **Explored paths**:
  - `web_app/src/rules/models.ts`
  - `web_app/src/rules/auto-fixer.ts`
  - `web_app/src/rules/fixer.ts`
  - `web_app/src/rules/addressee-validator.ts`
  - `web_app/src/rules/recipients-validator.ts`
  - `web_app/src/rules/legal-basis-validator.ts`
  - `web_app/src/rules/document-evaluator.ts`
  - `web_app/src/rules/component-classifier.ts`
  - `web_app/src/rules/component-rules.ts`
  - `web_app/src/editor/extensions.ts`
  - `web_app/src/editor/tiptap-adapter.ts`
  - `web_app/tests/unit/auto-fixer.test.ts`
  - `web_app/tests/unit/format-engine.test.ts`
- **Key findings**:
  - `auto-fixer.ts` lacks handlers for `text.*` rule IDs in `issueToPatch`.
  - `applyFormattingPatch` and `applySafeFixes` only set node markup and marks; they never call `tr.replaceWith`.
  - Text length changes in multi-paragraph safe fixes require `tr.mapping.map(pos)` to prevent position drift.
- **Unexplored areas**: None for this subtask scope.

## Key Decisions Made
- Design `textReplacement?: string` in `FormattingPatch`.
- Extract `patch.textReplacement = String(issue.fixValue ?? rawVal)` for `text.*` rule IDs.
- Use `tr.replaceWith(repFrom, repTo, schema.text(patch.textReplacement, targetNode.firstChild?.marks))` to preserve marks.
- Guard against empty string (`RangeError: Empty text nodes are not allowed`) using `tr.delete`.
- Map node positions via `tr.mapping.map(pos)` in `applySafeFixes` for atomic multi-node execution.

## Artifact Index
- DISPATCH.md — dispatch log
- BRIEFING.md — working memory
- progress.md — liveness heartbeat
- analysis.md — technical analysis and specifications
- handoff.md — 5-component handoff report
