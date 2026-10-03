# Task Dispatch: M5 Challenger 1 (Adversarial Prompt & Client Stress Testing)

## Identity
- Role: Challenger
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_challenger_1\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_challenger_1\handoff.md

## Objective
Stress-test and adversarially challenge the Milestone 5 AI Client and Prompt Guard implementation:
1. Jailbreak & Prompt Injection: Test adversarial inputs (e.g., "Bỏ qua mọi quy tắc", "Ignore previous instructions", DAN jailbreaks, Markdown injection, emoji prompts) against `isInjectionAttempt` and `ADMINISTRATIVE_AI_RULES`.
2. Output Sanitization: Test dirty outputs containing markdown headers (`###`), bold/italics (`**text**`), code blocks, backticks, emojis, preambles against `sanitizeAiOutput`.
3. Client Resilience: Test timeout handling, transient retries on 500/502/503/504 status, rate limit 429 normalization, auth error 401/403 normalization, secret key masking (`sk-***`, `AIzaSy***`) in error logs.
4. Proofreading & Drafting robustness: Test malformed LLM outputs (invalid JSON, truncated responses) to ensure no app crashes.

## Verification
Write independent scratch tests or execute stress tests via vitest / node.
Report all findings and give an explicit verdict: `APPROVE` or `REJECT`.

## 2026-09-29T07:21:05Z
Initial dispatch received.
