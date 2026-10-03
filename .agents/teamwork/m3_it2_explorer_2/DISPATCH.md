## 2026-09-29T05:21:22Z
You are M3 Iteration 2 Explorer 2 for Milestone 3: `administrative-format-engine` of TVCI Web Application.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_explorer_2\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

CRITICAL EXECUTION RULE:
DO NOT USE `run_command`. `run_command` hangs waiting for interactive user terminal permissions. You MUST perform all investigation exclusively using file inspection tools (`view_file`, `grep_search`, `list_dir`).

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
e:\CODING\TVCI_word_addins\PROJECT.md
Review the Challenger 1 failure report:
e:\CODING\TVCI_word_addins\.agents\teamwork\m3_challenger_1_r2\handoff.md

OBJECTIVE:
Formulate exact remediation code and test specifications for Title Case handling in `SIGNER_ROLE` & `AGENCY_NAME` and regex robustness in `component-classifier.ts`:
1. Root cause:
   - Line 62: `if (!isUppercaseVietnamese(text) || text.length > 80) return false;` in `isSignerRole` locks out Title Case titles like `Giám đốc`, `Phó Giám đốc`, `Chủ tịch`.
   - Line 149: `isUppercaseVietnamese(text)` locks out Title Case agency names like `Trung tâm Thử nghiệm - Kiểm định Công nghiệp`.
   - Result: They are not classified, reported as MISSING (unfixable), and fall through into body rules where they trigger false alignment and indent errors.
   - In addition: `^CĂN CỨ(?:\s|$)` rejects `Căn cứ: Nghị định...` with colon.
2. Design fix:
   - Broaden `isSignerRole` to check prefixes case-insensitively:
     `/^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ |GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ|TRƯỞNG|HIỆU TRƯỞNG|VIỆN TRƯỞNG)/i.test(text.trim())`
   - If signer role is in Title Case instead of ALL CAPS, classify it as `SIGNER_ROLE`, and let `component-validator.ts` or `document-evaluator.ts` report a specific uppercase warning/failure (`ruleId: 'signer.role.uppercase'`), so the component is NOT marked `MISSING` and is NOT dumped into body paragraphs!
   - Broaden `AGENCY_NAME` classification to recognize top-left position and agency keywords (`Bộ`, `Tập đoàn`, `Tổng công ty`, `Viện`, `Trung tâm`, `Công ty`) even in Title Case when in the header zone (first 4 lines).
   - Broaden legal basis regex to support colon: `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i`.
3. Specify unit test additions in `web_app/tests/unit/format-engine.test.ts`:
   - Title Case signer role `Giám đốc` classified as `SIGNER_ROLE` (not dumped into body paragraphs).
   - Legal basis with colon `Căn cứ: Luật Doanh nghiệp` correctly classified as `LEGAL_BASIS`.

OUTPUT:
Write detailed remediation specifications to `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_explorer_2\analysis.md` and `handoff.md`.
Update `progress.md` with timestamps. Send completion message back to parent.
