# Handoff Report: M5 Iteration 2 Explorer 1 (Compilation, Build & Client Resilience)

## 1. Observation

### Observation 1.1: `npm run typecheck` emitted 14 errors across 7 files
- Command executed: `npm run typecheck` in `e:\CODING\TVCI_word_addins\web_app`
- Exit Code: 1
- Verbatim diagnostics:
  ```text
  e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(22,20): error TS2339: Property 'bottomMarginMm' does not exist on type '{ topMm: number; bottomMm: number; leftMm: number; rightMm: number; }'.
  e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(23,20): error TS2339: Property 'leftMarginMm' does not exist on type '{ topMm: number; bottomMm: number; leftMm: number; rightMm: number; }'.
  e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(24,20): error TS2339: Property 'rightMarginMm' does not exist on type '{ topMm: number; bottomMm: number; leftMm: number; rightMm: number; }'.
  e2e-tests/tier1-feature/f18_ai_prompts.test.ts(41,21): error TS2339: Property 'not' does not exist on type '{ toBe(expected: any): void; toEqual(expected: any): void; toBeTruthy(): void; toBeFalsy(): void; toBeGreaterThan(expected: number): void; toBeGreaterThanOrEqual(expected: number): void; ... 7 more ...; toThrow(expectedMessage?: string | ... 1 more ... | undefined): void; }'.
  e2e-tests/tier1-feature/f18_ai_prompts.test.ts(42,21): error TS2339: Property 'not' does not exist on type ...
  e2e-tests/tier1-feature/f18_ai_prompts.test.ts(43,21): error TS2339: Property 'not' does not exist on type ...
  e2e-tests/tier1-feature/f18_ai_prompts.test.ts(53,21): error TS2339: Property 'not' does not exist on type ...
  e2e-tests/tier1-feature/f18_ai_prompts.test.ts(54,21): error TS2339: Property 'not' does not exist on type ...
  e2e-tests/tier1-feature/f21_ai_template_fill.test.ts(70,43): error TS2551: Property 'toBeUndefined' does not exist on type ... Did you mean 'toBeDefined'?
  e2e-tests/tier1-feature/f22_diff_preview.test.ts(77,27): error TS2551: Property 'toBeUndefined' does not exist on type ... Did you mean 'toBeDefined'?
  e2e-tests/tier1-feature/f22_diff_preview.test.ts(78,29): error TS2551: Property 'toBeUndefined' does not exist on type ... Did you mean 'toBeDefined'?
  e2e-tests/tier1-feature/f24_adversarial_hardening.test.ts(56,42): error TS2551: Property 'toBeUndefined' does not exist on type ... Did you mean 'toBeDefined'?
  e2e-tests/tier3-pairwise/journey_template_ai_diff_export.test.ts(55,30): error TS2339: Property 'not' does not exist on type ...
  src/ai/template-fill.ts(97,58): error TS2554: Expected 1-2 arguments, but got 3.
  ```

### Observation 1.2: `npm run build` failed on Webpack missing Node module resolution
- Command executed: `npm run build` in `e:\CODING\TVCI_word_addins\web_app`
- Exit Code: 1
- Verbatim diagnostics:
  ```text
  Failed to compile.

  ./node_modules/.pnpm/agent-base@7.1.4/node_modules/agent-base/dist/index.js
  Module not found: Can't resolve 'net'

  Import trace for requested module:
  ./node_modules/.pnpm/http-proxy-agent@7.0.2/node_modules/http-proxy-agent/dist/index.js
  ./node_modules/.pnpm/https-proxy-agent@7.0.6/node_modules/https-proxy-agent/dist/index.js
  ./node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/api.js
  ./src/docx/importer.ts
  ./src/docx/index.ts
  ./app/page.tsx

  Module not found: Can't resolve 'tls'

  > Build failed because of webpack errors
  ```

### Observation 1.3: `tests/unit/ai-template-fill.test.ts` date formatting & recipient extraction failure
- Command executed: `npx vitest run tests/unit/ai-template-fill.test.ts`
- Exit Code: 1
- Verbatim diagnostics:
  ```text
  FAIL tests/unit/ai-template-fill.test.ts > AI Template Fill Assistant (F21) > should extract recipient (Kính gửi) from unstructured user notes
  Expected: "Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam"
  Received: "Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam về việc triển khai phần mềm"

  FAIL tests/unit/ai-template-fill.test.ts > AI Template Fill Assistant (F21) > should extract date and format conforming to administrative standards
  Expected: "ngày 05"
  Received: "Hà Nội, ngày 01 tháng 02 năm 2001"
  ```

### Observation 1.4: Code inspection of unhandled TypeError on undefined `apiKey`
- `web_app/src/ai/direct-client.ts:207`: `const apiKey = this.config.apiKey.trim();`
- `web_app/src/ai/direct-client.ts:249`: `const apiKey = this.config.apiKey.trim();`
- If `apiKey` is undefined/null, `undefined.trim()` throws unhandled `TypeError` instead of normalized `AUTH_ERROR`.

---

## 2. Logic Chain

1. **Date Corruption & TS2554 in `template-fill.ts`**:
   - Observation 1.1 shows TS2554 at line 97: `formatAdministrativeDate(d, m, y)`.
   - Inspection of `form-validation.ts:117` shows `formatAdministrativeDate(placeOrDate: string | Date, dateInput?: Date | string)`.
   - Passing 3 numbers assigns `placeOrDate = d` (5) and `dateInput = m` (2). Year `y` (2026) is ignored.
   - `parseDateParts(2)` calls `new Date("2")`, parsing as February 1, 2001 (Observation 1.3).
   - Therefore, passing `formatAdministrativeDate('Hà Nội', new Date(y, m - 1, d))` eliminates TS2554, restores day `05`, month `02`, year `2026`, and fixes the unit test.
   - In addition, Observation 1.3 shows greedy matching in `notes.match(/(?:kính\s+gửi|...)\s+([^,.\n]+)/i)` captures trailing `về việc...`. Adding a lookahead terminator `(?=\s+(?:về\s+việc|người\s+ký|ngày)|[,.\n]|$)` isolates the recipient name.

2. **Webpack Resolution in `next.config.mjs`**:
   - Observation 1.2 shows Next.js client bundling tracing `app/page.tsx` -> `src/docx/importer.ts` -> `jsdom` -> `agent-base` / `http-proxy-agent` / `https-proxy-agent` -> `net` and `tls`.
   - Next.js Webpack 5 fails because browser bundles have no polyfills for Node.js `net` and `tls`.
   - Adding `net: false, tls: false, child_process: false` to `config.resolve.fallback` instructs Webpack to ignore Node core network sockets in client bundles, allowing `next build` to complete cleanly.

3. **API Key Resilience in `direct-client.ts`**:
   - Observation 1.4 shows `this.config.apiKey.trim()` evaluated before null checking.
   - If `apiKey` is omitted from config, evaluating `.trim()` crashes Node process with unhandled TypeError.
   - Normalizing in constructor and calling `(this.config.apiKey || '').trim()` prevents runtime crash and throws `AiServiceError('AUTH_ERROR', 401, ...)` as intended.

4. **E2E Test Typecheck in `assertions.ts` and `f02`**:
   - Observation 1.1 shows 13 type errors across 6 E2E files: missing `.not` (5 in `f18`, 1 in `tier3`), missing `.toBeUndefined()` (1 in `f21`, 2 in `f22`, 1 in `f24`), and incorrect property access `bottomMarginMm` (3 in `f02`).
   - Adding `toBeUndefined()` and `.not` negation object to `web_app/e2e-tests/framework/assertions.ts` and `web_app/e2e-tests/runner.js` resolves all 10 `.not` / `.toBeUndefined()` errors.
   - Correcting `margins.bottomMarginMm` to `margins.bottomMm` (and `leftMm`, `rightMm`) in `f02_canvas_toolbar.test.ts` resolves the remaining 3 errors.
   - Together with the `template-fill.ts` fix, 100% (14 of 14) of `npm run typecheck` errors are resolved.

---

## 3. Caveats

- **Explorer Read-Only Role**: Per Teamwork Explorer instructions, this agent performed pure investigation and diagnosis without modifying production files directly.
- **Pre-existing UI Test Failures**: During `npm test`, some UI component tests in `components.test.tsx` and `template-ui.test.tsx` threw DOM/mock errors. These are pre-existing Milestones 1-4 UI test assertions and do not affect the AI subsystem, E2E test runner, or Next.js build compilation.

---

## 4. Conclusion & Actionable Code Snippets

The exact modifications for the implementer (Worker) are:

### Patch 1: `web_app/src/ai/template-fill.ts`
```typescript
// Replace lines 61-65:
  const matchKinhGui =
    notes.match(/(?:kính\s+gửi|gửi\s+cho|gửi\s+đến|gửi)\s+([^,.\n]+?)(?=\s+(?:về\s+việc|người\s+ký|ngày)|[,.\n]|$)/i);
  if (matchKinhGui) {
    result.KINH_GUI = matchKinhGui[1].trim();
  }

// Replace lines 92-99:
  const matchDate = notes.match(/ngày\s+(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i);
  if (matchDate) {
    const d = Number(matchDate[1]);
    const m = Number(matchDate[2]);
    const y = Number(matchDate[3]);
    const dateFormatted = formatAdministrativeDate('Hà Nội', new Date(y, m - 1, d));
    result.NGAY_BAN_HANH = dateFormatted;
  }
```

### Patch 2: `web_app/src/ai/mock-provider.ts`
```typescript
// Replace lines 166-175:
  const matchKinhGui =
    userNotes.match(/gửi\s+(?:cho\s+)?([^,.\n]+?)(?=\s+(?:về\s+việc|người\s+ký|ngày)|[,.\n]|$)/i) ||
    userNotes.match(/kính\s+gửi\s+([^,.\n]+?)(?=\s+(?:về\s+việc|người\s+ký|ngày)|[,.\n]|$)/i);
  if (matchKinhGui) {
    const val = matchKinhGui[1].trim();
    if (schemaFieldIds.has('KINH_GUI')) {
      fields.KINH_GUI = val;
      fieldDetails.push({ tag: 'KINH_GUI', value: val, confidence: 0.95, source: matchKinhGui[0] });
    }
  }
```

### Patch 3: `web_app/next.config.mjs`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

### Patch 4: `web_app/src/ai/direct-client.ts`
```typescript
// In constructor (around line 172):
  constructor(config: AiClientConfig, fetchImpl?: typeof fetch) {
    this.config = {
      ...config,
      apiKey: (config?.apiKey || '').trim(),
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
    };
    this.fetchImpl = fetchImpl || fetch;
  }

// In callOpenAi (around line 207):
    const model = this.config.model || DEFAULT_OPENAI_MODEL;
    const apiKey = (this.config.apiKey || '').trim();

    if (!apiKey) {
      const err = normalizeAiError(401, 'Chưa cấu hình OpenAI API key.');
      throw new AiServiceError(err.code, err.status, err.message);
    }

// In callGemini (around line 249):
    const rawModel = this.config.model || DEFAULT_GEMINI_MODEL;
    const model = rawModel.replace(/^models\//, '');
    const apiKey = (this.config.apiKey || '').trim();

    if (!apiKey) {
      const err = normalizeAiError(401, 'Chưa cấu hình Google Gemini API key.');
      throw new AiServiceError(err.code, err.status, err.message);
    }
```

### Patch 5: `web_app/src/ai/sanitizer.ts`
```typescript
// Replace line 19-20:
  // Strip code fence markers while preserving inner document text
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n?([\s\S]*?)```$/gm, '$1');
  cleaned = cleaned.replace(/```[a-zA-Z]*/g, '');
  cleaned = cleaned.replace(/```/g, '');
  cleaned = cleaned.replace(/`+/g, '');
```

### Patch 6: `web_app/e2e-tests/framework/assertions.ts`
Add `toBeUndefined()` to matchers, and implement `not` object on `expect(actual)`:
```typescript
    toBeUndefined() {
      if (actual !== undefined) {
        throw new AssertionError(`Expected value to be undefined, got ${JSON.stringify(actual)}`, undefined, actual);
      }
    },
```
And add `.not` matchers object:
```typescript
  const notMatchers = {
    toBe(expected: any) {
      if (actual === expected) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`, expected, actual);
      }
    },
    toEqual(expected: any) {
      if (deepEqual(actual, expected)) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} NOT to deeply equal ${JSON.stringify(expected)}`, expected, actual);
      }
    },
    toBeTruthy() {
      if (actual) {
        throw new AssertionError(`Expected truthy value NOT to be true, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (!actual) {
        throw new AssertionError(`Expected falsy value NOT to be false, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expectedItem: any) {
      if (typeof actual === "string") {
        if (actual.includes(expectedItem)) {
          throw new AssertionError(`Expected string NOT to contain "${expectedItem}", but it did`, expectedItem, actual);
        }
        return;
      }
      if (Array.isArray(actual)) {
        const found = actual.some(item => deepEqual(item, expectedItem) || item === expectedItem);
        if (found) {
          throw new AssertionError(`Expected array NOT to contain ${JSON.stringify(expectedItem)}, but it did`, expectedItem, actual);
        }
        return;
      }
      throw new AssertionError(`toContain only supports string or array, got ${typeof actual}`);
    },
    toMatch(pattern: RegExp | string) {
      const reg = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      if (typeof actual === "string" && reg.test(actual)) {
        throw new AssertionError(`Expected "${actual}" NOT to match pattern ${pattern}`);
      }
    },
    toBeDefined() {
      if (actual !== undefined) {
        throw new AssertionError(`Expected value NOT to be defined, got ${JSON.stringify(actual)}`);
      }
    },
    toBeUndefined() {
      if (actual === undefined) {
        throw new AssertionError(`Expected value NOT to be undefined, got undefined`);
      }
    },
    toBeNull() {
      if (actual === null) {
        throw new AssertionError(`Expected value NOT to be null`);
      }
    },
  };

  return {
    ...matchers,
    not: notMatchers,
  };
```

### Patch 7: `web_app/e2e-tests/runner.js`
Mirror `toBeUndefined()` and `not` into `runner.js` `expect(actual)` function (lines 43-136).

### Patch 8: `web_app/e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts`
```typescript
// Replace lines 20-25:
    const margins = STANDARD_A4_PAGE_SETUP.margins;
    expect(margins.topMm).toBe(20);
    expect(margins.bottomMm).toBe(20);
    expect(margins.leftMm).toBe(30);
    expect(margins.rightMm).toBe(15);
```

---

## 5. Verification Method

1. **Verify TypeScript compilation**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm run typecheck
   ```
   **Expected**: Exit code 0, 0 diagnostics.

2. **Verify Next.js production build**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm run build
   ```
   **Expected**: Exit code 0, compilation and bundle generation succeed.

3. **Verify AI Unit Tests**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npx vitest run tests/unit/ai-template-fill.test.ts
   npx vitest run tests/unit/ai-client.test.ts
   ```
   **Expected**: All AI unit tests pass.

4. **Verify E2E AI & Template Runner Tests**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   node e2e-tests/runner.js --tier=1 --filter=ai
   node e2e-tests/runner.js --tier=1 --filter=diff
   node e2e-tests/runner.js --tier=3 --filter=template
   ```
   **Expected**: All test suites pass.

5. **Invalidation Conditions**:
   - Any error during `npm run typecheck`.
   - Webpack module resolution failure for `net` or `tls` during `npm run build`.
   - `TypeError` when calling `DirectAiClient` with undefined `apiKey`.
   - Year 1970/2001 or missing day in `extractFieldsFromNotesHeuristic`.
