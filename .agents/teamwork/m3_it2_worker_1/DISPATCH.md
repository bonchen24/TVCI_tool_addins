## 2026-09-29T05:26:05Z
You are M3 Iteration 2 Worker 1 for Milestone 3: `administrative-format-engine` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_worker_1\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

CRITICAL EXECUTION RULE:
DO NOT USE `run_command`. `run_command` hangs waiting for interactive user terminal permissions. You MUST perform all code modifications and verifications exclusively using file tools (`view_file`, `replace_file_content`, `write_to_file`, `grep_search`, `list_dir`).

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
e:\CODING\TVCI_word_addins\PROJECT.md

INPUT SPECIFICATIONS (Read all three Explorer handoffs and analysis reports carefully):
1. `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_explorer_1\handoff.md` & `analysis.md` (Nullish snapshot text guards & Unicode NFD normalization)
2. `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_explorer_2\handoff.md` & `analysis.md` (Classifier Title Case support, signer role warning, legal basis colon)
3. `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_explorer_3\handoff.md` & `analysis.md` (Auto-fixer text punctuation replacement, FormattingPatch textReplacement, position mapping)

EXCLUSIVE WRITE OWNERSHIP:
- `e:\CODING\TVCI_word_addins\web_app\src\rules\models.ts`
- `e:\CODING\TVCI_word_addins\web_app\src\rules\auto-detect.service.ts`
- `e:\CODING\TVCI_word_addins\web_app\src\rules\component-classifier.ts`
- `e:\CODING\TVCI_word_addins\web_app\src\rules\component-validator.ts`
- `web_app/src/rules/document-evaluator.ts`
- `web_app/src/rules/auto-fixer.ts`
- `web_app/tests/unit/format-engine.test.ts`
- `web_app/tests/unit/auto-fixer.test.ts`

TASKS:
1. Update `web_app/src/rules/models.ts`:
   - In `FormattingPatch`, add `textReplacement?: string;`.
2. Update `web_app/src/rules/auto-detect.service.ts`:
   - In `removeTones(str: string | null | undefined)`, guard with `String(str || '')` before `.normalize('NFD')`.
   - In `detectDocumentContext`, ensure snapshots with null/undefined text do not crash tone removal.
3. Update `web_app/src/rules/component-classifier.ts`:
   - In `normalize(text: string | null | undefined)`:
     ```ts
     function normalize(text: string | null | undefined): string {
       return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
     }
     ```
   - In `isUppercaseVietnamese`: compose text to NFC first (`text.normalize('NFC')`), extract letters with `/[A-Za-zÀ-ỹĐđ]/g`, and verify length and uppercase.
   - In `isSignerRole`: allow case-insensitive prefix match:
     `/^(T\/M|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ\s+|GIÁM ĐỐC|TỔNG GIÁM ĐỐC|CHỦ TỊCH|BÍ THƯ|TRƯỞNG|HIỆU TRƯỞNG|VIỆN TRƯỞNG|CHÁNH VĂN PHÒNG)/i.test(text.trim())`
     Do NOT require uppercase in classification so Title Case does not get dumped into body text.
   - In `classifyDocumentComponents`: broaden `AGENCY_NAME` in early header lines (`index < 4`) to recognize agency prefixes (`Bộ`, `Tập đoàn`, `Tổng công ty`, `Viện`, `Trung tâm`, `Công ty`, `Sở`, `Ban`, `UBND`) even in Title Case.
   - Broaden legal basis regex to support colon: `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i`.
4. Update `web_app/src/rules/component-validator.ts`:
   - For `SIGNER_ROLE`, add check for uppercase: if `snapshot.text !== snapshot.text.toLocaleUpperCase('vi-VN')`, emit `ruleId: 'signer.role.uppercase'` (or `typography.signer_role.uppercase`) as a formatting warning (`status: 'FAIL'`, `autoFixable: true`, `fixValue: snapshot.text.toLocaleUpperCase('vi-VN')`).
5. Update `web_app/src/rules/document-evaluator.ts`:
   - Guard `rawTexts`: `const rawTexts = paragraphSnapshots.map((p) => p?.text ?? '');`.
   - Guard loop trims at lines 107 and 117 with `p?.text?.trim() ?? ''`.
   - Update `LEGAL_BASIS` check to match `/^CĂN CỨ(?:\s*:\s*|\s+|$)/i`.
6. Update `web_app/src/rules/auto-fixer.ts`:
   - In `issueToPatch`:
     If issue has `fixValue` and (`issue.ruleId.startsWith('text.')` or rule involves punctuation or `signer.role.uppercase`), set `patch.textReplacement = String(issue.fixValue)`.
   - In `applyFormattingPatch`:
     If `patch.textReplacement !== undefined`, replace paragraph text.
   - In `applySafeFixes`:
     Use `tr.mapping.map(pos)` when calculating `from` and `to` so positions stay accurate as preceding text modifications change length within the atomic transaction.
7. Update `web_app/tests/unit/format-engine.test.ts`:
   - Add test for malformed snapshot array with `text: null`, `text: undefined`, empty strings -> evaluates gracefully without throwing.
   - Add test for Vietnamese NFD decomposed diacritics document -> correctly classifies and evaluates components.
   - Add test for Title Case signer role `Giám đốc` -> classified as `SIGNER_ROLE`.
   - Add test for legal basis with colon `Căn cứ: Luật Doanh nghiệp` -> correctly classified.
8. Update `web_app/tests/unit/auto-fixer.test.ts`:
   - Add test for auto-fixing `Kính gửi Ban Giám đốc` (missing colon) -> text becomes `Kính gửi: Ban Giám đốc`.
   - Add test for auto-fixing document with text punctuation errors achieving 100% convergence.
   - Add test verifying text mark preservation during text replacement.
9. Output:
   Write a self-contained `handoff.md` to `e:\CODING\TVCI_word_addins\.agents\teamwork\m3_it2_worker_1\handoff.md` and notify parent.
