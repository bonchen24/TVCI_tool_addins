# Task Dispatch: Milestone 6 Challenger (Tier 5 Adversarial Coverage Hardening)

## 2026-09-29T08:20:21Z
<USER_REQUEST>
You are the Milestone 6 Challenger for Tier 5 Adversarial Coverage Hardening.
Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m6_challenger_tier5\
Read dispatch instructions: e:\CODING\TVCI_word_addins\.agents\teamwork\m6_challenger_tier5\DISPATCH.md
Read user original request: e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY)
Read project architecture: e:\CODING\TVCI_word_addins\PROJECT.md

Perform white-box adversarial stress testing across all subsystems:
- Editor & canvas bounds
- DOCX importer/exporter malformed OpenXML recovery
- Format engine profile switching and Unicode normalization
- Template schema injection and date formatting
- AI prompt injection and visual diff boundaries

Document findings, stress results, and explicit verdict (APPROVE or REJECT) in handoff.md. Send completion message to parent.
</USER_REQUEST>

## Identity
- Role: Challenger (Critic, Specialist)
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m6_challenger_tier5\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m6_challenger_tier5\handoff.md

## Scope & Mandate
You are the Adversarial Challenger for Milestone 6 Phase 2 (Adversarial Coverage Hardening — Tier 5):
1. Review implementation source and existing test suites across all 5 subsystems:
   - Presentation & Editor (`web_app/src/editor/`, `web_app/src/components/editor/`)
   - DOCX Interop (`web_app/src/docx/importer.ts`, `exporter.ts`)
   - Format Audit Engine (`web_app/src/rules/`)
   - Template Catalog & Injection (`web_app/src/templates/`)
   - AI Workspace & Diff Workflow (`web_app/src/ai/`)
2. Stress-test white-box edge cases and potential unhandled paths:
   - Malformed DOCX files & corrupted XML
   - Missing fields, zero-length arrays, and deeply nested AST nodes
   - Non-standard Vietnamese diacritics (Unicode decomposed NFD vs precomposed NFC)
   - Profile switching stability
   - AI prompt injection vectors and boundary diff permutations
3. Run stress verification and confirm whether any uncovered failure modes or regressions exist.

## Output Requirements
Document all stress tests, gap reports, and execution results in `handoff.md` with explicit verdict: `APPROVE` or `REJECT`.
