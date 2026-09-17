# TVCI Word Add-in MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sideloadable Microsoft Word add-in MVP that validates/fixes basic formatting, inserts a `.docx` template, reads/writes tagged Content Controls, and previews/applies an AI rewrite of the current selection through a local gateway.

**Architecture:** The client is an Office.js + TypeScript + React task-pane add-in. Word API access is isolated behind services; pure formatting/rule/AI request logic is unit tested without Word. A small Express AI gateway keeps provider credentials off the client. All document mutation is user initiated.

**Tech Stack:** TypeScript 5.x, React 18+, Office.js, Webpack 5, Jest + ts-jest, Express, Supertest, ESLint, npm.

**Spec:** `docs/superpowers/specs/2026-09-15-tvci-word-addin-design.md`

## Global Constraints

- Add-in name: `TVCI Word Tools`.
- MVP target acceptance environment: Windows desktop Microsoft Word.
- Client must use Office.js and TypeScript.
- AI provider credentials must never be embedded in client/add-in source.
- AI context is selection-only in MVP.
- AI output must be previewed and explicitly applied by the user.
- Approved document templates stay as `.docx`; do not recreate layouts from HTML.
- Formatting rules must be configuration-driven.
- `Fix all` is not the default workflow.
- Word-specific operations remain isolated from UI and pure logic.
- Real Word acceptance testing is required in addition to unit tests.

---

## File Map

- `manifest/manifest.xml` — Word add-in registration, ribbon task-pane command, localhost URLs.
- `package.json` — scripts and dependencies.
- `webpack.config.js` — dev HTTPS bundle for task pane and commands.
- `tsconfig.json` — TypeScript configuration.
- `src/commands/commands.html`, `src/commands/commands.ts` — Office command runtime entry.
- `src/taskpane/index.html`, `src/taskpane/index.tsx`, `src/taskpane/App.tsx`, `src/taskpane/styles.css` — React task pane shell.
- `src/word/selection.service.ts` — read/replace/insert-below selection via Word API.
- `src/word/formatting.service.ts` — inspect/apply supported formatting to selected paragraphs.
- `src/word/template.service.ts` — fetch `.docx`, convert to base64, insert into document.
- `src/word/content-control.service.ts` — list/set tagged content controls.
- `src/rules/models.ts` — rule/issue/domain types.
- `src/rules/tvci-default.ts` — initial TVCI rule config.
- `src/rules/validator.ts` — pure rule evaluation.
- `src/rules/fixer.ts` — map validation issue to supported formatting patch.
- `src/ai/context-builder.ts` — pure selection-only AI request builder.
- `src/ai/ai.service.ts` — browser HTTP client for local gateway.
- `server/ai-gateway/app.ts`, `server/ai-gateway/index.ts` — Express gateway.
- `server/ai-gateway/provider.ts` — provider abstraction and development fallback provider.
- `tests/**` — Jest unit/integration tests for pure logic and gateway.
- `templates/sample-template.docx` — minimal template fixture with at least one tagged content control.
- `test-documents/README.md` — manual acceptance fixture checklist.
- `README.md` — install, run, sideload, test instructions.

---

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `webpack.config.js`, `.gitignore`, `jest.config.cjs`
- Create: `src/taskpane/index.html`, `src/taskpane/index.tsx`, `src/taskpane/App.tsx`, `src/taskpane/styles.css`
- Create: `src/commands/commands.html`, `src/commands/commands.ts`
- Create: `manifest/manifest.xml`
- Test: `tests/smoke/app-config.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: npm scripts `build`, `dev-server`, `test`, `test:watch`, `lint`; add-in URLs `https://localhost:38473/taskpane.html` and `https://localhost:38473/commands.html`.

- [ ] **Step 1: Write the failing smoke test**

```ts
import fs from "node:fs";
import path from "node:path";

test("manifest and task pane entry files exist", () => {
  const root = path.resolve(__dirname, "../..");
  expect(fs.existsSync(path.join(root, "manifest/manifest.xml"))).toBe(true);
  expect(fs.existsSync(path.join(root, "src/taskpane/App.tsx"))).toBe(true);
  expect(fs.existsSync(path.join(root, "src/commands/commands.ts"))).toBe(true);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- --runInBand tests/smoke/app-config.test.ts`
Expected: FAIL because scaffold files do not exist yet.

- [ ] **Step 3: Add minimal scaffold and manifest**

Create a Word task-pane add-in manifest with display name `TVCI Word Tools`, ribbon tab/group/button, and `ShowTaskpane` action pointing to the task pane URL. Add a React task pane that renders headings for `Chuẩn hóa`, `Biểu mẫu`, and `AI trợ lý`.

- [ ] **Step 4: Install dependencies and build**

Run: `npm install`
Run: `npm run build`
Expected: webpack build succeeds with no TypeScript errors.

- [ ] **Step 5: Re-run test**

Run: `npm test -- --runInBand tests/smoke/app-config.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json webpack.config.js .gitignore jest.config.cjs manifest src tests/smoke
git commit -m "feat: scaffold TVCI Word add-in"
```

---

### Task 2: Selection read/write service

**Files:**
- Create: `src/word/selection.service.ts`
- Create: `src/word/word-errors.ts`
- Test: `tests/word/selection-contract.test.ts`
- Modify: `src/taskpane/App.tsx`

**Interfaces:**
- Produces:
  - `readSelection(): Promise<string>`
  - `replaceSelection(text: string): Promise<void>`
  - `insertBelowSelection(text: string): Promise<void>`
  - `EmptySelectionError`

- [ ] **Step 1: Write a failing contract test for error semantics**

```ts
import { ensureSelectionText, EmptySelectionError } from "../../src/word/selection.service";

test("empty selection is rejected", () => {
  expect(() => ensureSelectionText("   ")).toThrow(EmptySelectionError);
});

test("non-empty selection is preserved", () => {
  expect(ensureSelectionText("Nội dung")).toBe("Nội dung");
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --runInBand tests/word/selection-contract.test.ts`
Expected: FAIL because `selection.service.ts` does not exist.

- [ ] **Step 3: Implement pure validation and Word API wrappers**

`readSelection()` must use `Word.run`, load `range.text`, sync, then call `ensureSelectionText`. `replaceSelection()` uses `range.insertText(text, Word.InsertLocation.replace)`. `insertBelowSelection()` inserts a paragraph after the selection.

- [ ] **Step 4: Wire a `Đọc đoạn chọn` debug action into the task pane**

Display the selected text or a user-facing error; do not show a stack trace.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- --runInBand tests/word/selection-contract.test.ts`
Run: `npm run build`
Expected: PASS and build success.

- [ ] **Step 6: Commit**

```bash
git add src/word src/taskpane/App.tsx tests/word
git commit -m "feat: add Word selection read and write service"
```

---

### Task 3: Formatting domain model and validator

**Files:**
- Create: `src/rules/models.ts`
- Create: `src/rules/tvci-default.ts`
- Create: `src/rules/validator.ts`
- Test: `tests/rules/validator.test.ts`

**Interfaces:**
- Produces:
  - `ParagraphSnapshot`
  - `ParagraphRules`
  - `ValidationIssue`
  - `validateParagraph(snapshot, rules): ValidationIssue[]`
  - `TVCI_DEFAULT_RULES`

- [ ] **Step 1: Write failing validator tests**

```ts
import { validateParagraph } from "../../src/rules/validator";
import { TVCI_DEFAULT_RULES } from "../../src/rules/tvci-default";

const valid = {
  id: "p1",
  text: "Nội dung",
  fontName: "Times New Roman",
  fontSize: 13,
  alignment: "Justified",
  spaceBefore: 0,
  spaceAfter: 0,
};

test("valid paragraph produces no issues", () => {
  expect(validateParagraph(valid, TVCI_DEFAULT_RULES.body)).toEqual([]);
});

test("wrong font is auto-fixable", () => {
  const issues = validateParagraph({ ...valid, fontName: "Arial" }, TVCI_DEFAULT_RULES.body);
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ ruleId: "body.fontName", severity: "error", autoFixable: true })
  ]));
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand tests/rules/validator.test.ts`
Expected: FAIL because rule modules do not exist.

- [ ] **Step 3: Implement exact types and validator**

Use explicit unions for severity (`pass|warning|error`) and supported alignment. Each issue includes `id`, `ruleId`, `targetId`, `message`, `severity`, `autoFixable`, `actual`, `expected`.

- [ ] **Step 4: Run tests**

Run: `npm test -- --runInBand tests/rules/validator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rules tests/rules
git commit -m "feat: add configurable formatting validator"
```

---

### Task 4: Word formatting inspection and safe fixes

**Files:**
- Create: `src/word/formatting.service.ts`
- Create: `src/rules/fixer.ts`
- Test: `tests/rules/fixer.test.ts`
- Modify: `src/taskpane/App.tsx`

**Interfaces:**
- Consumes: `ParagraphSnapshot`, `ValidationIssue`, `ParagraphRules`.
- Produces:
  - `inspectSelectionParagraphs(): Promise<ParagraphSnapshot[]>`
  - `applyIssueFix(issue: ValidationIssue): Promise<void>`
  - `issueToPatch(issue): FormattingPatch`

- [ ] **Step 1: Write failing fixer mapping tests**

```ts
import { issueToPatch } from "../../src/rules/fixer";

test("font issue maps to only fontName patch", () => {
  expect(issueToPatch({
    id: "p1-font", ruleId: "body.fontName", targetId: "p1", message: "Sai font",
    severity: "error", autoFixable: true, actual: "Arial", expected: "Times New Roman"
  })).toEqual({ fontName: "Times New Roman" });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand tests/rules/fixer.test.ts`
Expected: FAIL because fixer does not exist.

- [ ] **Step 3: Implement safe patch mapping and Word paragraph inspection**

Inspect only supported fields: paragraph text, font name, font size, alignment, space before, space after. Use stable paragraph indices as target IDs within the current inspection result. Do not touch tables/header/footer automatically.

- [ ] **Step 4: Add `Kiểm tra` UI and per-issue `Sửa` buttons**

Task pane displays issue message, actual/expected, severity, and only renders the fix button when `autoFixable === true`.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- --runInBand tests/rules/fixer.test.ts tests/rules/validator.test.ts`
Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/word/formatting.service.ts src/rules/fixer.ts src/taskpane/App.tsx tests/rules/fixer.test.ts
git commit -m "feat: inspect and safely fix Word formatting"
```

---

### Task 5: Template insertion

**Files:**
- Create: `src/word/template.service.ts`
- Create: `src/templates/catalog.ts`
- Test: `tests/templates/catalog.test.ts`
- Create: `templates/README.md`
- Modify: `src/taskpane/App.tsx`

**Interfaces:**
- Produces:
  - `TemplateDefinition { id, name, department, path }`
  - `TEMPLATE_CATALOG`
  - `insertTemplate(template: TemplateDefinition): Promise<void>`

- [ ] **Step 1: Write failing catalog test**

```ts
import { TEMPLATE_CATALOG } from "../../src/templates/catalog";

test("MVP exposes exactly one sample template entry", () => {
  expect(TEMPLATE_CATALOG).toHaveLength(1);
  expect(TEMPLATE_CATALOG[0]).toEqual(expect.objectContaining({ id: "sample-tvci", department: "TVCI" }));
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand tests/templates/catalog.test.ts`
Expected: FAIL because catalog does not exist.

- [ ] **Step 3: Implement catalog and browser file-to-base64 insertion**

Fetch template path, read `ArrayBuffer`, convert bytes to base64, and call `context.document.body.insertFileFromBase64(base64, Word.InsertLocation.end)`.

- [ ] **Step 4: Add template section to task pane**

Render catalog entry and `Chèn biểu mẫu` button. Surface fetch/insert failures as concise user messages.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- --runInBand tests/templates/catalog.test.ts`
Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/word/template.service.ts src/templates templates src/taskpane/App.tsx tests/templates
git commit -m "feat: add DOCX template insertion flow"
```

---

### Task 6: Content Control binding

**Files:**
- Create: `src/word/content-control.service.ts`
- Create: `src/content-controls/field-map.ts`
- Test: `tests/content-controls/field-map.test.ts`
- Modify: `src/taskpane/App.tsx`

**Interfaces:**
- Produces:
  - `CONTENT_CONTROL_FIELDS`
  - `normalizeControlTag(tag: string): string`
  - `listTaggedContentControls(): Promise<Array<{id:number; tag:string; title:string}>>`
  - `setContentControlText(tag: string, value: string): Promise<void>`

- [ ] **Step 1: Write failing field map tests**

```ts
import { normalizeControlTag } from "../../src/content-controls/field-map";

test("control tags normalize to uppercase trimmed keys", () => {
  expect(normalizeControlTag(" ten_khach_hang ")).toBe("TEN_KHACH_HANG");
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand tests/content-controls/field-map.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Content Control service**

Load content controls, their `tag` and `title`; find by normalized tag; replace control text. Throw a typed `MissingContentControlError` when no matching tag exists.

- [ ] **Step 4: Add a minimal test UI**

Provide one field input for `TEN_KHACH_HANG` and button `Điền vào biểu mẫu` so the Word acceptance test can verify binding.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- --runInBand tests/content-controls/field-map.test.ts`
Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/word/content-control.service.ts src/content-controls src/taskpane/App.tsx tests/content-controls
git commit -m "feat: bind tagged Word content controls"
```

---

### Task 7: Local AI gateway and provider abstraction

**Files:**
- Create: `server/ai-gateway/provider.ts`
- Create: `server/ai-gateway/app.ts`
- Create: `server/ai-gateway/index.ts`
- Test: `tests/server/ai-gateway.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces HTTP endpoint `POST /api/ai/rewrite`.
- Request: `{ action: "rewrite"|"shorten"|"expand"|"formal"|"check", text: string, instruction?: string }`
- Response: `{ output: string }` or `{ error: string }`.
- Provider interface: `generate(request: AiGatewayRequest): Promise<string>`.

- [ ] **Step 1: Write failing Supertest tests**

```ts
import request from "supertest";
import { createApp } from "../../server/ai-gateway/app";

test("rejects empty AI text", async () => {
  const app = createApp({ generate: async () => "unused" });
  await request(app).post("/api/ai/rewrite").send({ action: "rewrite", text: "" }).expect(400);
});

test("returns provider output", async () => {
  const app = createApp({ generate: async () => "Đã viết lại" });
  const res = await request(app).post("/api/ai/rewrite").send({ action: "rewrite", text: "Gốc" }).expect(200);
  expect(res.body).toEqual({ output: "Đã viết lại" });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand tests/server/ai-gateway.test.ts`
Expected: FAIL because gateway does not exist.

- [ ] **Step 3: Implement Express app and safe development provider**

The default local provider must not pretend to be AI. If no provider credential/config is present, return a clear `503` message telling the user to configure a provider. Do not embed API keys in source.

- [ ] **Step 4: Add gateway dev script**

Add `npm run ai-gateway` and `npm run dev` to run webpack dev server and gateway concurrently.

- [ ] **Step 5: Run tests**

Run: `npm test -- --runInBand tests/server/ai-gateway.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server package.json package-lock.json tests/server
git commit -m "feat: add local AI gateway"
```

---

### Task 8: Selection-only AI client workflow

**Files:**
- Create: `src/ai/context-builder.ts`
- Create: `src/ai/ai.service.ts`
- Test: `tests/ai/context-builder.test.ts`
- Modify: `src/taskpane/App.tsx`

**Interfaces:**
- Produces:
  - `buildAiRequest(action, selectedText, instruction?)`
  - `requestAiRewrite(request): Promise<string>`
- Consumes selection service and gateway endpoint.

- [ ] **Step 1: Write failing request-builder tests**

```ts
import { buildAiRequest } from "../../src/ai/context-builder";

test("AI request contains only the current selection", () => {
  expect(buildAiRequest("rewrite", "Đoạn được chọn", "Trang trọng hơn")).toEqual({
    action: "rewrite",
    text: "Đoạn được chọn",
    instruction: "Trang trọng hơn"
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand tests/ai/context-builder.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement request builder and HTTP client**

POST to `/api/ai/rewrite`, parse `{output}`, and convert backend/network failures to user-safe errors.

- [ ] **Step 4: Implement preview-first AI UI**

Flow: read selection -> send request -> render output preview -> enable `Thay đoạn chọn` and `Chèn bên dưới`. Do not mutate Word before either apply button is clicked.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- --runInBand tests/ai/context-builder.test.ts tests/server/ai-gateway.test.ts`
Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ai src/taskpane/App.tsx tests/ai
git commit -m "feat: add preview-first AI rewrite workflow"
```

---

### Task 9: Documentation and manual Word acceptance checklist

**Files:**
- Create: `README.md`
- Create: `test-documents/README.md`
- Create: `docs/acceptance/mvp-word-checklist.md`
- Modify: `manifest/manifest.xml` if final localhost paths differ.

**Interfaces:**
- Consumes all MVP capabilities.
- Produces reproducible setup/sideload/manual acceptance procedure.

- [ ] **Step 1: Write documentation checks**

Document exact commands:

```bash
npm install
npm test
npm run build
npm run dev
```

Document Windows Word sideload using the generated manifest and the Microsoft-supported development flow. Note that Office Add-ins use HTTPS in development and that real Word acceptance remains manual.

- [ ] **Step 2: Add acceptance checklist**

Checklist must verify all ten MVP Definition-of-Done items from the spec, including explicit confirmation that AI preview does not mutate the document before user action.

- [ ] **Step 3: Run full verification**

Run: `npm test -- --runInBand`
Run: `npm run build`
Expected: all tests PASS and production build succeeds.

- [ ] **Step 4: Commit**

```bash
git add README.md test-documents docs/acceptance manifest/manifest.xml
git commit -m "docs: add Word add-in setup and acceptance guide"
```

---

## Self-Review Result

- Spec coverage: all MVP Definition-of-Done capabilities map to Tasks 1–9.
- Deferred items remain deferred: full NĐ30/TKV/IEMM catalogs, TVCI_APP API, signing, autonomous editing, enterprise admin.
- No task embeds provider credentials or sends whole-document content to AI.
- Rule types and AI request shapes are reused consistently across tasks.
- Real Word behavior is explicitly treated as a manual acceptance gate, not falsely covered by unit tests.
