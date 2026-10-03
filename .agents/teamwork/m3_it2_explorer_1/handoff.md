# Handoff Report: Administrative Format Engine Hardening (Nullish & Unicode NFD)

## 1. Observation
- `web_app/src/rules/auto-detect.service.ts`:
  - Line 14: `str.normalize('NFD')` in `removeTones(str: string)`.
  - Line 100: `const cleanP = removeTones(p)`.
  - Calling `removeTones(null as any)` causes: `TypeError: Cannot read properties of null (reading 'normalize')`.
- `web_app/src/rules/component-classifier.ts`:
  - Line 46: `text.replace(/\s+/g, ' ').trim()` in `normalize(text: string)`.
  - Line 82: `const lines = paragraphs.map(normalize)`.
  - Calling `normalize(null as any)` causes: `TypeError: Cannot read properties of null (reading 'replace')`.
  - Lines 92, 98, 102, 107, 115, 120, 124, 128, 141: All matching literals and regexes (`CỘNG HÒA...`, `ĐỘC LẬP...`, `DOCUMENT_TYPES.has(...)`) use NFC.
  - In Node/V8: `"CỘNG".normalize('NFD').includes("CỘNG") === false`.
  - Line 50: `isUppercaseVietnamese` strips non-Vietnamese letters with `/[^A-Za-zÀ-ỹĐđ]/g`. In NFD, combining marks (`\u0300-\u036F`) fall into `[À-ỹ]` range (`0x00C0`-`0x1EF9`), treating diacritic marks as letters.
- `web_app/src/rules/document-evaluator.ts`:
  - Line 77: `const rawTexts = paragraphSnapshots.map((p) => p.text)`. Propagates `null` or `undefined` into `detectDocumentContext` and `classifyDocumentComponents`.
  - Line 107: `const pText = paragraphSnapshots[i]?.text.trim() ?? ''`. If snapshot exists with `text: null`, `paragraphSnapshots[i]?.text` evaluates to `null`. Calling `.trim()` throws: `TypeError: Cannot read properties of null (reading 'trim')`.
  - Line 117: `const pText = paragraphSnapshots[i]?.text.trim() ?? ''`. Same crash.
  - Line 124: `(p, index) => !componentIndices.has(index) && p.text && p.text.trim().length > 0`. Throws if snapshot element `p` nullish.
- `web_app/tests/unit/format-engine.test.ts`:
  - Lacks test coverage for snapshots containing `text: null`, `text: undefined`, or whitespace-only strings.
  - Lacks test coverage for inputs normalized via `str.normalize('NFD')`.

---

## 2. Logic Chain
1. Production documents imported from Word DOCX or empty ProseMirror table cells contain empty, spacer, or nullish text nodes.
2. When `evaluateDocumentRules` executes on array with any nullish `text`, `rawTexts` receives `null`.
3. `removeTones` and `normalize` invoke string methods on `null` without type coercion or fallback, crashing the entire UI audit loop (`TypeError`).
4. In parallel, Vietnamese text from macOS Telex, UniKey Composite, or DOCX XML arrives in decomposed NFD Unicode.
5. In NFD, diacritics are separate combining codepoints (`\u0300-\u036F`). Regexes and `Set.has` in `component-classifier.ts` compare against precomposed NFC strings.
6. The comparisons fail (`false`). The classifier finds 0 administrative components, marking all required components `MISSING` and dumping all paragraphs into body validation, producing false-positive failures and a near-zero health score.
7. Remediation requires:
   - Converting inputs defensively via `String(text || '').normalize('NFC')` inside `normalize()`.
   - Coercing `String(str || '').normalize('NFD')` inside `removeTones()`.
   - Guarding `p?.text ?? ''` in `document-evaluator.ts` line 77, and `(p?.text ?? '').trim()` in loops (lines 107, 117).
   - Normalizing text to NFC before length and case check in `isUppercaseVietnamese`.
   - Adding two unit tests in `format-engine.test.ts` to ensure regression protection.

---

## 3. Caveats
- No code changes executed directly in `src/` or `tests/` in this turn, strictly adhering to read-only explorer role.
- Auto-fixer text replacement for punctuation (`text.*`) and Title Case signer recognition remain addressed separately as noted in Challenger report.
- Investigation conducted via direct file inspection tools (`view_file`, `grep_search`, `find_by_name`) without `run_command`.

---

## 4. Conclusion
Exact remediation code designed:
1. `component-classifier.ts`:
   - `normalize(text: string | null | undefined): string`: returns `String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim()`.
   - `isUppercaseVietnamese(text: string | null | undefined): boolean`: normalizes to NFC before character class and length evaluation.
   - `classifyDocumentComponents`: guards against empty or invalid `paragraphs` array.
2. `auto-detect.service.ts`:
   - `removeTones(str: string | null | undefined): string`: guards with `String(str || '')`.
   - `detectDocumentContext`: guards `paragraphs` and safely maps sample paragraphs.
3. `document-evaluator.ts`:
   - Line 77: `const rawTexts = paragraphSnapshots.map((p) => p?.text ?? '');`.
   - Lines 107, 117: `const pText = (paragraphSnapshots[i]?.text ?? '').trim();`.
   - Lines 60, 124, 915: add nullish snapshot guards (`p?.text`).
4. Unit tests:
   - Specified two test suites in `web_app/tests/unit/format-engine.test.ts` for malformed/nullish snapshot arrays and Unicode NFD input documents.

---

## 5. Verification Method
1. Inspect files:
   - `web_app/src/rules/component-classifier.ts:45-52`
   - `web_app/src/rules/auto-detect.service.ts:13-21`
   - `web_app/src/rules/document-evaluator.ts:77,107,117`
   - `web_app/tests/unit/format-engine.test.ts`
2. Independent Verification Test Commands (when run by developer/implementer):
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm test -- tests/unit/format-engine.test.ts
   npm run typecheck
   ```
3. Invalidation Conditions:
   - If `evaluateDocumentRules` with `[{ id: '1', text: null as any }, { id: '2', text: 'CỘNG HÒA...' }]` throws `TypeError`, fix is invalid.
   - If `classifyDocumentComponents(["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM".normalize('NFD')], 'ADMINISTRATIVE')` fails to match `NATIONAL_EMBLEM`, fix is invalid.
