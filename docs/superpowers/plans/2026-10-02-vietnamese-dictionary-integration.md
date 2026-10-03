# Vietnamese Dictionary Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the supplied UTF-16LE `Vietnamese.dic` into the web editor's local spell-check while retaining TVCI and user terms as independent layers.

**Architecture:** Preserve the supplied bytes under `web_app/data/spellcheck/`. A deterministic Node build step validates the supplied SHA-256, decodes UTF-16LE, normalizes entries to NFC, filters suspicious lines, and emits a UTF-8 runtime asset plus a review report. The browser combines the normalized base word set with the existing Hunspell compatibility dictionary; TVCI/domain and user terms remain separate engine-level exceptions. Contextual phrase rules report the two specified common confusions without changing text.

**Tech Stack:** TypeScript, Node.js built-ins (`zlib`, `crypto`, `fs`), Hunspell `nspell`, Next.js 14, Vitest.

**Spec:** `design.md`, section 2.2 and section 6.2.

## Global Constraints

- Spell checking stays local and sends no document text to a remote service.
- Findings remain suggestions only; document text changes only after an explicit user action.
- The provided dictionary is a base signal, not an absolute authority; suspicious entries are filtered and reported.
- Keep base, TVCI/domain, and user dictionaries separate.
- Ignore URLs, email, numbers, dates, document/standard codes, and suitable abbreviations.
- Preserve the current Hunspell suggestions and editor scan behavior.

---

### Task 1: Preserve and preprocess the supplied dictionary

**Files:**
- Create: `web_app/data/spellcheck/Vietnamese.dic` (original bytes)
- Create: `web_app/src/spellcheck/dictionary-format.mjs` (UTF-16LE decode, optional count-header handling, NFC normalization, suspicious-entry filtering and runtime parsing)
- Create: `web_app/scripts/prepare-vietnamese-dictionary.mjs` (SHA validation and deterministic generated assets)
- Create: `web_app/src/spellcheck/dictionary-source.test.ts`
- Modify: `web_app/src/spellcheck/dictionary.ts`
- Modify: `web_app/src/spellcheck/dictionary.test.ts`
- Modify: `web_app/package.json`
- Generate: `web_app/public/spellcheck/vi-base.txt` and `vi-base.review.json`

**Interfaces:**
- `prepareVietnameseDictionary(bytes: Uint8Array): { words: string[]; rejected: Array<{ line: number; entry: string; reason: string }> }`
- `parseVietnameseDictionary(text: string): Set<string>`
- `createVietnameseDictionary(aff: DictionaryBytes, dic: DictionaryBytes, baseWords: Iterable<string>): DictionaryProvider`
- `loadVietnameseDictionary(fetcher?): Promise<DictionaryProvider>` fetches `vi.aff`, `vi.dic`, and generated `vi-base.txt`.

- [x] **Step 1: Write failing source and loader tests** for the supplied SHA-256, UTF-16LE/BOM decoding, header values that vary, NFC deduplication, malformed-entry reporting, UTF-8 runtime parsing, and base lookup.
- [x] **Step 2: Run the focused tests and confirm RED** because the source parser/loader APIs do not yet exist.
- [ ] **Step 3: Restore the exact Brotli/Base64 payload with Node `zlib.brotliDecompressSync`, verify SHA-256 `1417975f8479f3a4009cf6af120e16ccea190f89b392fb16889d67ed66b6e769`, add the raw asset, and implement the tested preprocessing and layered loader. Do not validate against a fixed word-count header. Record excluded suspicious entries in the review report and reject control, non-word, and duplicate entries with line/reason metadata. Add `predev`/`prebuild` generation hooks.
- [ ] **Step 4: Run the focused tests and confirm GREEN** for byte identity, encoding, NFC, header independence, review metadata, and real dictionary lookup.

### Task 2: Add contextual rules and strengthen false-positive coverage

**Files:**
- Modify: `web_app/src/spellcheck/types.ts`
- Modify: `web_app/src/spellcheck/engine.ts`
- Modify: `web_app/src/spellcheck/ignore-rules.ts`
- Modify: `web_app/src/spellcheck/tvci-dictionary.ts` only if a domain-term boundary needs clarification
- Modify: `web_app/src/spellcheck/engine.test.ts`
- Modify: `web_app/src/spellcheck/ignore-rules.test.ts`

**Interfaces:**
- Contextual findings use rule id `contextual-phrase`, preserve source offsets, and include explicit corrected phrase suggestions.
- The engine continues accepting `DictionaryProvider`, user words, and ignored issue ids; TVCI terms remain their own set.

- [x] **Step 1: Write failing tests** for `sử lý` → `xử lý`, `xát nhận` → `xác nhận`, NFC input, URL/email/date/number/code/standard/abbreviation exemptions, and independent base/domain/user acceptance.
- [x] **Step 2: Run the focused tests and confirm RED** on the absent contextual rule and uncovered ignore cases.
- [x] **Step 3: Implement only the contextual phrase rules and specific ignore patterns needed by the tests.** Keep scanning read-only and avoid duplicate syllable findings inside a contextual phrase where applicable.
- [x] **Step 4: Run the focused tests and confirm GREEN** with exact spans and suggestions.

### Task 3: Document dictionary provenance and runtime behavior

**Files:**
- Modify: `design.md`
- Modify: `web_app/src/spellcheck/README.md`

- [x] **Step 1: Update the existing spell-check design text** to describe the supplied base data, separate TVCI/domain/user layers, suspicious-entry report, contextual phrase rules, and local-only/no-autocorrect behavior.
- [x] **Step 2: Update the spell-check README** with source hash, format/preprocessing behavior, generated review report, and existing Hunspell compatibility/suggestion role.
- [x] **Step 3: Review the diff** to confirm no unrelated pre-existing workspace changes were overwritten.

### Task 4: Verify focused and project commands

**Files:** no additional production files.

- [ ] Run focused web-app tests for `src/spellcheck` and inspect all failures.
- [ ] Run web-app `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Run repository-required `npm run typecheck`, `npm test`, `npm run build`, and `npm run validate-manifest` from the project root.
- [ ] Report command results and any unrelated baseline failures separately.
