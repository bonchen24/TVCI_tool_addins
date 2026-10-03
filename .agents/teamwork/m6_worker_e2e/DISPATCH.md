# Task Dispatch: Milestone 6 E2E Verification Worker

## Identity
- Role: Worker
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m6_worker_e2e\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m6_worker_e2e\handoff.md

## Scope & Mandate
You are the E2E Verification Worker for Milestone 6 (`final-e2e-verification-hardening`):
1. Execute the full independent E2E test runner:
   ```bash
   node web_app/e2e-tests/runner.js
   ```
   Verify that all 38 test suites and 188 test cases pass 100% across all 4 tiers:
   - Tier 1: Feature Coverage (24 features, 120 tests)
   - Tier 2: Boundary & Corner Cases (5 suites, 25 tests)
   - Tier 3: Cross-Feature Interactions & Pairwise Journeys (4 suites, 20 tests)
   - Tier 4: Real-World Workloads (5 suites, 23 tests)
2. Execute TypeScript type checking:
   ```bash
   npm run typecheck
   ```
   (Must pass with 0 errors).
3. Execute Next.js production build:
   ```bash
   npm run build
   ```
   (Must compile and bundle with exit code 0).
4. If any test failure or compilation issue is encountered, investigate the root cause, apply clean drop-in fixes, and re-run until 100% passing.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Output Requirements
Document all executed commands, exact test counts, pass rates, and build outputs in `handoff.md` and send message to parent.
