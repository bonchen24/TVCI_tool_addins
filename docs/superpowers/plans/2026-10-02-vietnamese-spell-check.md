# Vietnamese Spell Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add offline Vietnamese spelling and basic presentation checks to the web editor, with explicit user actions, document scan, account dictionary, and non-blocking save/export preflight.

**Architecture:** A spell-check service scans text locally and returns categorized, positioned issues and suggestions. A debounced ProseMirror plugin decorates spelling issues; a dedicated sidebar view provides full-document navigation and explicit apply/ignore/dictionary actions. User-added terms persist per account as dictionary preferences in SQLite. Save-to-Drive and DOCX export run a fresh scan and ask before continuing if spelling issues remain.

**Tech Stack:** TypeScript, React 18, Next.js 14, Tiptap/ProseMirror, Vitest, SQLite (`node:sqlite`), local Hunspell-compatible Vietnamese dictionary and `nspell`.

**Spec:** `design.md` (TVCI Word Add-in / Văn bản và thể chế web app; privacy and data invariants in section 6.13)

## Global Constraints

- Spell checking runs locally and does not transmit document text to an external service.
- The app does not persist document contents on the TVCI server; only terms deliberately added to the user's dictionary may persist as account preferences.
- Spell-check findings are suggestions only; the app never changes document text without an explicit user action.
- Ignore URLs, email addresses, numbers, dates, document/form/reference codes, and distinctive all-uppercase strings.
- Keep spelling and basic presentation findings in separate groups.
- Keep current editor layout and existing document, Drive, import, and export flows working.
- A preflight warning is non-blocking and offers an explicit continue action.

---

### Task 1: Offline spell-check engine and basic presentation rules

**Files:**
- Create: `web_app/src/spellcheck/types.ts`
- Create: `web_app/src/spellcheck/ignore-rules.ts`
- Create: `web_app/src/spellcheck/tvci-dictionary.ts`
- Create: `web_app/src/spellcheck/engine.ts`
- Create: `web_app/src/spellcheck/engine.test.ts`
- Create: `web_app/src/spellcheck/dictionary.ts`, `web_app/src/spellcheck/dictionary.test.ts`, and `web_app/src/types/nspell.d.ts`
- Add local dictionary assets: `web_app/public/spellcheck/vi.aff`, `web_app/public/spellcheck/vi.dic`, and attribution/license notes
- Modify: `web_app/package.json`, `web_app/pnpm-lock.yaml`

**Interfaces:**
- `DictionaryProvider`: `has(word: string): boolean; suggest(word: string): string[]`.
- `SpellcheckIssue`: category (`spelling` or `presentation`), message, original text, `[from, to)` offsets, and suggestions.
- `checkText(text, dictionary, userWords?)`: returns spelling and presentation issues without mutating text.

- [x] **Step 1: Write failing engine tests**

```ts
it('reports a Vietnamese typo and offers dictionary suggestions', () => {
  const dictionary = { has: (word: string) => word === 'văn bản', suggest: () => ['văn bản'] };
  expect(checkText('văn bảnn', dictionary).map((issue) => issue.suggestions)).toContainEqual(['văn bản']);
});

it('ignores codes, dates, links, email, digits, acronyms, and TVCI terms', () => {
  const text = 'https://tvci.vn a@tvci.vn 12/10/2026 123 ABC-01 TVCI IEMM Vinacomin ISO 9001';
  expect(checkText(text, { has: () => false, suggest: () => [] })).toEqual([]);
});

it('reports presentation findings separately and preserves offsets', () => {
  const result = checkText('Hai  từ , tiếp theo.', { has: () => true, suggest: () => [] });
  expect(result.map((issue) => issue.category)).toContain('presentation');
});
```

- [x] **Step 2: Run the test and confirm RED**

Run: `npm test -- --run src/spellcheck/engine.test.ts` from `web_app/`.
Expected: FAIL because the spell-check service does not exist.

- [x] **Step 3: Add a local dictionary adapter and minimal engine**

Add `nspell` and `dictionary-vi` to `web_app/package.json`. The dictionary package uses Node file APIs, so vendor its `.aff` and `.dic` data files and attribution under `public/spellcheck`; load them once from the same-origin app and construct one cached Hunspell checker in the browser. `checkText` tokenizes Unicode Vietnamese syllables, applies ignore rules and TVCI exceptions before dictionary lookup, checks user-added exceptions, and gets ranked suggestions from the local checker. Add independent rules for repeated whitespace, whitespace before/after punctuation, adjacent repeated words, and sentence-initial capitalization. Keep offsets in UTF-16 so they map to ProseMirror positions.

- [x] **Step 4: Run tests and confirm GREEN**

Run: `npm test -- --run src/spellcheck/engine.test.ts` from `web_app/`.
Expected: PASS, including Vietnamese diacritics and ignore-rule cases.

- [x] **Step 5: Review package license and generated dictionary attribution**

Record upstream license/attribution in `web_app/src/spellcheck/README.md`; verify the package's actual runtime size and ensure the browser bundle does not load Node-only modules.

### Task 2: Account-scoped user dictionary storage and API

**Files:**
- Create: `web_app/src/spellcheck/dictionary-storage.ts`
- Create: `web_app/src/spellcheck/dictionary-storage.test.ts`
- Create: `web_app/src/spellcheck/api.ts`
- Create: `web_app/src/spellcheck/api.test.ts`
- Create: `web_app/app/api/spellcheck/dictionary/route.ts`
- Modify: `web_app/src/db/schema.ts`

**Interfaces:**
- `listUserWords(userId, db)`, `addUserWord(userId, term, db)`, `removeUserWord(userId, term, db)`.
- Authenticated `GET`, `POST { term }`, and `DELETE { term }` handlers; the API stores dictionary terms only.

- [x] **Step 1: Write failing storage and API tests**

```ts
it('normalizes and deduplicates a deliberately added Vietnamese term', () => {
  const db = createDictionaryTestDatabase();
  addUserWord('user-1', '  Xí nghiệp  ', db);
  addUserWord('user-1', 'xí nghiệp', db);
  expect(listUserWords('user-1', db)).toEqual(['xí nghiệp']);
});

it('rejects unauthenticated dictionary reads and writes', async () => {
  const response = await getUserDictionary(new Request('https://app.test/api/spellcheck/dictionary'), testDb);
  expect(response.status).toBe(401);
});
```

- [x] **Step 2: Run tests and confirm RED**

Run: `npm test -- --run src/spellcheck/dictionary-storage.test.ts src/spellcheck/api.test.ts` from `web_app/`.
Expected: FAIL because persistence and handlers do not exist.

- [x] **Step 3: Implement account-scoped storage and authenticated routes**

Create a `spellcheck_user_dictionary` table with cascading `user_id`, normalized term, original display term, timestamp, and unique `(user_id, normalized_term)`. Validate trimmed terms (1–80 characters, no control characters). Reuse `protectedApiResponse` and `sessionFromRequest`; do not accept or store document text. Expose the route with Node runtime and dynamic response behavior.

- [x] **Step 4: Run tests and confirm GREEN**

Run: `npm test -- --run src/spellcheck/dictionary-storage.test.ts src/spellcheck/api.test.ts` from `web_app/`.
Expected: PASS for user isolation, normalization, validation, authentication, and CRUD.

### Task 3: Debounced editor highlights and explicit correction actions

**Files:**
- Create: `web_app/src/spellcheck/editor-scan.ts`
- Create: `web_app/src/spellcheck/editor-scan.test.ts`
- Create: `web_app/src/editor/spellcheck-extension.ts`
- Create: `web_app/src/editor/spellcheck-extension.test.ts`
- Create: `web_app/src/components/editor/SpellcheckPanel.tsx`
- Create: `web_app/src/components/editor/SpellcheckPanel.test.tsx`
- Modify: `web_app/src/editor/extensions.ts`
- Modify: `web_app/src/components/layout/Sidebar.tsx`
- Modify: `web_app/src/components/editor/EditorWorkspace.tsx`
- Modify: `web_app/src/styles/a4-canvas.css`

**Interfaces:**
- `scanEditorDocument(doc, dictionary, userWords?)`: scans textblocks, returns issues with document positions.
- Tiptap `VietnameseSpellcheck` extension: debounced local scan, inline decorations, and update callback.
- Sidebar actions: jump to issue, apply selected suggestion, ignore once, and add term to user dictionary.

- [x] **Step 1: Write failing position, extension, and UI tests**

```tsx
it('decorates a suspected token after the debounce and does not rewrite it', async () => {
  const editor = makeEditor('văn bảnn');
  await advanceTimersByTime(350);
  expect(editor.view.dom.querySelector('.spellcheck-issue')).not.toBeNull();
  expect(editor.getText()).toBe('văn bảnn');
});

it('shows suggestions and exposes explicit ignore and add-to-dictionary actions', async () => {
  render(<SpellcheckPanel issues={[misspelling]} onIgnore={ignore} onAddWord={addWord} />);
  await user.click(screen.getByRole('button', { name: 'Bỏ qua một lần' }));
  expect(ignore).toHaveBeenCalledWith(misspelling.id);
  expect(screen.getByRole('button', { name: 'Thêm vào từ điển' })).toBeEnabled();
});
```

- [x] **Step 2: Run tests and confirm RED**

Run: `npm test -- --run src/spellcheck/editor-scan.test.ts src/editor/spellcheck-extension.test.ts src/components/editor/SpellcheckPanel.test.tsx` from `web_app/`.
Expected: FAIL because editor scanning and spell-check UI do not exist.

- [x] **Step 3: Implement scanning, decorations, and panel actions**

Map textblock offsets to ProseMirror positions, preserve decorations across document transactions, and schedule a fresh local scan after 350 ms. A marked token click or context-menu action opens the dedicated `spellcheck` sidebar tab and selects that finding. The panel shows separate “Chính tả” and “Trình bày/ngữ pháp cơ bản” groups. Suggestion, ignore-once, and add-to-dictionary buttons are user-triggered. Applying a suggestion replaces only that issue's current range and does not run on scan.

- [x] **Step 4: Run tests and confirm GREEN**

Run the same three test files from `web_app/`.
Expected: PASS for highlight, unchanged source text, click navigation, suggestions, ignore-once, and dictionary action.

### Task 4: Full-document scan and non-blocking preflight

**Files:**
- Modify: `web_app/src/components/editor/EditorToolbar.tsx`
- Modify: `web_app/src/components/editor/EditorWorkspace.tsx`
- Modify: `web_app/src/components/editor/SpellcheckPanel.tsx`
- Create: `web_app/src/components/editor/EditorWorkspace.spellcheck.test.tsx`
- Modify: `web_app/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Toolbar action “Kiểm tra chính tả” runs a fresh whole-document scan and opens the spell-check tab.
- `runSpellcheckPreflight(action, scan, confirm)`: allows immediately with no spelling issues; otherwise warns with a continue/cancel choice.

- [x] **Step 1: Write failing full-scan and preflight integration tests**

```tsx
it('runs a full scan and opens the spell-check findings tab', async () => {
  renderWorkspace({ content: 'văn bảnn' });
  await user.click(screen.getByRole('button', { name: /Kiểm tra chính tả/ }));
  expect(await screen.findByText('văn bảnn')).toBeVisible();
  expect(screen.getByRole('tab', { name: 'Chính tả' })).toHaveAttribute('aria-selected', 'true');
});

it('warns on remaining spelling findings and only proceeds after explicit continue', () => {
  expect(confirmSpellcheckPreflight([misspelling], () => true)).toBe(true);
  expect(confirmSpellcheckPreflight([misspelling], () => false)).toBe(false);
});
```

- [x] **Step 2: Run tests and confirm RED**

Run: `npm test -- --run src/components/editor/EditorWorkspace.test.tsx` from `web_app/`.
Expected: FAIL because no full scan action or preflight exists.

- [x] **Step 3: Wire scan and preflight into current flows**

The toolbar scan recomputes every textblock, updates highlights, opens the new sidebar tab, and lists issues with jump/apply/ignore actions. Before DOCX export or Drive save/Save As, run a fresh scan. If spelling findings remain, show a Vietnamese warning with the count and offer “Tiếp tục” / “Quay lại kiểm tra”; do not block if the user continues. Basic presentation findings remain separate and do not trigger spelling preflight.

- [x] **Step 4: Run tests and confirm GREEN**

Run: `npm test -- --run src/components/editor/EditorWorkspace.test.tsx` from `web_app/`.
Expected: PASS for scan coverage, save and export warning, cancel, and continue paths.

### Task 5: Document the default capability and verify the complete change

**Files:**
- Modify: `design.md`
- Create or update: `PROJECT_MEMORY.md`
- Modify if needed: `web_app/src/spellcheck/README.md`

- [x] **Step 1: Add documentation assertions**

Verify `design.md` records Vietnamese spell checking as a default editor capability, describes local processing, non-automatic correction, dictionary controls, and preflight behavior. Record the implementation and remaining dictionary limitations in `PROJECT_MEMORY.md` because no Obsidian MCP is available and the repository does not currently contain that fallback file.

- [x] **Step 2: Run focused regressions**

Run: `npm test -- --run src/spellcheck src/editor/spellcheck-extension.test.ts src/components/editor/SpellcheckPanel.test.tsx src/components/editor/EditorWorkspace.test.tsx` from `web_app/`.
Expected: PASS.

- [x] **Step 3: Run project and web-app verification**

Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run validate-manifest` from repository root. Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run lint` from `web_app/`.
Expected: all relevant commands pass; report any pre-existing failure separately from regressions. Results: root typecheck, tests (56 suites / 305 tests), production build, and manifest validation passed. Web app typecheck, tests (63 files / 353 tests), and production build passed. `npm run lint` was attempted but Next.js opened its first-run ESLint setup prompt and exited because this workspace has no ESLint config or ESLint dependency; lint could not run without adding unrelated lint infrastructure.

- [x] **Step 4: Review changed files and privacy behavior**

Confirm document text is not posted by spell-check requests, spell checking does not mutate document state, dictionary API requests carry only the explicitly selected term, save/export continue after confirmation, and all pre-existing dirty files remain untouched outside the necessary editor and design files.
