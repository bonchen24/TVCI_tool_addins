# BRIEFING — 2026-09-29T04:32:00Z

## Mission
Adversarially challenge the DOCX Importer in `web_app/src/docx/importer.ts` across edge cases, Vietnamese Unicode preservation, and 2-column table categorization.

## 🔒 My Identity
- Archetype: Empirical Challenger
- Roles: critic, specialist
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m2_challenger_1
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: M2 (docx-interop-engine)
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Report any failures as findings — do NOT fix them yourself
- EMPIRICAL CHALLENGER: Must run verification code directly, reproduce bugs empirically

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: 2026-09-29T04:25:45Z (Orchestrator instruction received: bypass run_command, verify via file inspection)

## Review Scope
- **Files to review**: `web_app/src/docx/importer.ts`, `web_app/src/docx/types.ts`, `web_app/src/docx/styles.ts`, `web_app/tests/unit/docx-import.test.ts`
- **Interface contracts**: M1 Editor ↔ M2 DOCX Interop in `PROJECT.md`
- **Review criteria**: Graceful fallback on corrupt buffers / missing XML / malformed XML, negative/extreme values handling, Vietnamese UTF-8 preservation with `xml:space="preserve"`, 2-column table categorization logic

## Attack Surface
- **Hypotheses tested**:
  1. Corrupted/non-zip buffer / missing `word/document.xml` triggers graceful fallback: **FAILED** (Throws unhandled promise rejection in `parseDocxWithMammoth`).
  2. Missing `w:pPr` handles gracefully: **PASSED**.
  3. Extreme/negative font size (`w:sz <= 0`): **PASSED** (Guarded with `parsedHalfPoints > 0`).
  4. Vietnamese UTF-8 strings & `xml:space="preserve"`: **PASSED** (DOM textContent preserves raw codepoints and whitespace).
  5. 2-column table classifier avoids false positives: **FAILED** (Aggressive false positives classify content tables with "ngày" or "trưởng" as administrative headers/footers and strip borders).
  6. Run tab characters `<w:tab/>` and hanging indents `<w:ind w:hanging>` preserved: **FAILED** (Silently dropped).
- **Vulnerabilities found**:
  - `CRITICAL`: Uncaught promise rejection on corrupted buffer or missing document part.
  - `CRITICAL`: Over-broad regex/substring matching in 2-column table classifier stripping borders from standard tables.
  - `HIGH`: Omission of `<w:tab/>` and `<w:hanging>`.
- **Untested angles**: Runtime performance under 50MB+ DOCX packages.

## Loaded Skills
- None loaded

## Key Decisions Made
- Verdict: **CHALLENGE**
- Documented step-by-step reproduction traces and exact mitigations.

## Artifact Index
- `handoff.md` — Final adversarial report
- `progress.md` — Liveness heartbeat
- `DISPATCH.md` — Inbound messages log
