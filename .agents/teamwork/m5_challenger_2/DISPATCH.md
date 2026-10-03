# Task Dispatch: M5 Challenger 2 (Diff Engine & Boundary Stress Testing)

## Identity
- Role: Challenger
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_challenger_2\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_challenger_2\handoff.md

## Objective
Stress-test and adversarially challenge the Visual Diff Engine (`diff.ts`) and Template Fill Assistant:
1. Diff Boundaries:
   - Identical strings (should yield 1 unchanged span).
   - Completely disjoint strings (1 deletion + 1 addition).
   - Empty original vs non-empty suggested (addition only).
   - Non-empty original vs empty suggested (deletion only).
   - Massive texts (10,000+ words) performance & memory stability.
   - Complex Vietnamese diacritics, compound words, punctuation variations, whitespace preservation.
2. Granular Accept/Reject:
   - Accept subset of change groups and verify resulting text matches exact intended combination.
   - Reject all changes and verify output identical to original.
   - Accept all changes and verify output identical to suggested.
3. Template Fill Extraction:
   - Extreme inputs: prompt injection, missing fields, unknown tags, malformed dates.
   - Verify non-schema tags are discarded, administrative date formatting conforms to NĐ 30.

## Verification
Write independent scratch tests or execute stress tests via vitest / node.
Report all findings and give an explicit verdict: `APPROVE` or `REJECT`.

## 2026-09-29T07:21:06Z
You are M5 Challenger 2 for Milestone 5 (Diff Engine & Boundary Stress Testing).
Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_challenger_2\
Read your dispatch instructions: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_challenger_2\DISPATCH.md
Read the user original request: e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY)
Read project architecture: e:\CODING\TVCI_word_addins\PROJECT.md

Adversarially challenge:
1. Visual diff boundaries: identical strings, disjoint strings, empty vs non-empty, massive texts (10,000+ words), Vietnamese diacritics/whitespace.
2. Granular Accept / Reject permutations (accept all, reject all, partial accept/reject).
3. Template fill edge cases: unknown tags, missing fields, dirty dates.

Empirically verify via scratch tests or test scripts. Document findings in handoff.md with explicit verdict: APPROVE or REJECT. Send message to parent when done.

