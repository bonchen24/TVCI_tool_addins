# Task Dispatch: M5 Iteration 2 Explorer 2 (Sanitizer & Prompt Injection Fixes)

## Identity
- Role: Explorer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_2\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_2\handoff.md

## Iteration 1 Failure Feedback
Challenger 1 and Reviewer 1 identified critical defects in prompt safety and sanitization:
1. `src/ai/sanitizer.ts:19`: `out.replace(/```[\s\S]*?```/g, '')` wipes out all enclosed text inside code fences! If an LLM returns drafted text inside ````markdown ... ```` or ```` ... ````, the entire drafted text is destroyed! It must strip only the fence markers (e.g., `^```[a-z]*\n?` and `\n?```$`), preserving the actual content.
2. `src/ai/sanitizer.ts`: Markdown bullets (`* item`, `- item`), underscore italics (`_italic_`), and emojis (including non-BMP 4-byte emojis like `\u{1F300}-\u{1F9FF}`) were leaking.
3. `src/ai/administrative-rules.ts`: `isInjectionAttempt` was bypassed by common Vietnamese phrases ("Bỏ qua mọi quy tắc", "Bỏ qua các hướng dẫn trước đó") and English "Ignore all instructions". Furthermore, subsystems only checked the primary `userPrompt`, leaving `context`, `text`, and `userNotes` vulnerable to injection.

## Output Requirements
Investigate and write `analysis.md` and `handoff.md` detailing the exact regex and logic fixes for `sanitizer.ts` and `administrative-rules.ts`, ensuring that drafted content inside fences is preserved, markdown/emojis are thoroughly sanitized, and prompt injection attempts across all inputs are rejected.
