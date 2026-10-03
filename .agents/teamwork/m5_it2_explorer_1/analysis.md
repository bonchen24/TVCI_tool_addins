# Technical Analysis: Milestone 5 Iteration 2 (Compilation, Build & Client Resilience)

## Executive Summary
Milestone 5 Iteration 1 failed the verification gate due to 14 TypeScript compilation errors across production code and E2E test suites, Next.js Webpack module resolution failure for Node built-ins (`net`, `tls`), and runtime crash potential on unconfigured API keys.
This analysis provides the root-cause diagnostics, evidence chains, and exact code changes required to ensure both `npm run typecheck` and `npm run build` pass with 0 errors.

---

## 1. Issue 1: `src/ai/template-fill.ts:97:58` TS2554 & Date Format Corruption

### 1.1 Observation & Diagnostics
- **File**: `web_app/src/ai/template-fill.ts:97`
- **Compiler Diagnostic**:
  ```text
  src/ai/template-fill.ts(97,58): error TS2554: Expected 1-2 arguments, but got 3.
  ```
- **Code at fault**:
  ```typescript
  const d = Number(matchDate[1]);
  const m = Number(matchDate[2]);
  const y = Number(matchDate[3]);
  const dateFormatted = formatAdministrativeDate(d, m, y);
  result.NGAY_BAN_HANH = dateFormatted;
  ```
- **Signature in `web_app/src/templates/form-validation.ts:117-120`**:
  ```typescript
  export function formatAdministrativeDate(
    placeOrDate: string | Date,
    dateInput?: Date | string
  ): string
  ```

### 1.2 Root Cause Analysis
1. Function arity accepts only 1 or 2 arguments `(placeOrDate, dateInput)`. Calling with 3 numeric arguments `(d, m, y)` violates the TypeScript signature.
2. In runtime execution:
   - `placeOrDate` is assigned `d` (e.g. 5).
   - `dateInput` is assigned `m` (e.g. 2).
   - Argument 3 (`y`, e.g. 2026) is completely dropped.
   - `targetDate` becomes `2`. `parseDateParts(2)` converts `2` to string `"2"`, which `new Date("2")` parses in V8 as Feb 1, 2001 (or timestamp epoch year 1970).
   - `place` falls back to `'Hà Nội'`.
   - The output becomes `"Hà Nội, ngày 01 tháng 02 năm 2001"`, completely corrupting the parsed date and losing the year 2026.
3. In addition, in `extractFieldsFromNotesHeuristic` line 62 and `mock-provider.ts` line 167:
   - `notes.match(/(?:kính\s+gửi|gửi\s+cho|gửi\s+đến|gửi)\s+([^,.\n]+)/i)` greedily captures trailing clauses like `"về việc triển khai phần mềm"`, causing unit test failures when punctuation is missing between recipient and subject.

### 1.3 Proposed Fix
In `web_app/src/ai/template-fill.ts`:
```typescript
// Line 62: Use lookahead terminator to prevent greedy capture of following fields
const matchKinhGui =
  notes.match(/(?:kính\s+gửi|gửi\s+cho|gửi\s+đến|gửi)\s+([^,.\n]+?)(?=\s+(?:về\s+việc|người\s+ký|ngày)|[,.\n]|$)/i);
if (matchKinhGui) {
  result.KINH_GUI = matchKinhGui[1].trim();
}

// Line 97: Construct explicit Date object compliant with formatAdministrativeDate signature
const d = Number(matchDate[1]);
const m = Number(matchDate[2]);
const y = Number(matchDate[3]);
const dateFormatted = formatAdministrativeDate('Hà Nội', new Date(y, m - 1, d));
result.NGAY_BAN_HANH = dateFormatted;
```

In `web_app/src/ai/mock-provider.ts`:
```typescript
// Line 167: Lookahead terminator in mock provider
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

---

## 2. Issue 2: `web_app/next.config.mjs` Webpack Fallback for 'net'/'tls'

### 2.1 Observation & Diagnostics
- **File**: `web_app/next.config.mjs`
- **Compiler Diagnostic during `npm run build`**:
  ```text
  Module not found: Can't resolve 'net'
  Module not found: Can't resolve 'tls'

  Import trace for requested module:
  ./node_modules/.../http-proxy-agent/dist/index.js
  ./node_modules/.../https-proxy-agent/dist/index.js
  ./node_modules/.../jsdom/lib/api.js
  ./src/docx/importer.ts
  ./src/docx/index.ts
  ./app/page.tsx
  ```

### 2.2 Root Cause Analysis
1. `src/docx/importer.ts` line 41 contains `const { JSDOM } = require('jsdom');` as a Node fallback for XML parsing when `DOMParser` is unavailable.
2. `app/page.tsx` imports `src/docx/index.ts`, pulling `importer.ts` into the client-side Webpack bundle.
3. Webpack 5 statically traces `require('jsdom')` down to `agent-base`, `http-proxy-agent`, and `https-proxy-agent`.
4. These packages depend on Node.js core modules `net` and `tls`.
5. Webpack 5 does not bundle Node core modules for the browser unless explicitly configured in `resolve.fallback`.
6. `next.config.mjs` currently only stubs `fs: false, path: false`, leaving `net`, `tls`, and `child_process` unhandled.

### 2.3 Proposed Fix
Update `web_app/next.config.mjs`:
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

---

## 3. Issue 3: `src/ai/direct-client.ts:207,249` Undefined apiKey TypeError Crash

### 3.1 Observation & Diagnostics
- **File**: `web_app/src/ai/direct-client.ts:207,249`
- **Code at fault**:
  ```typescript
  // Line 207 in callOpenAi
  const model = this.config.model || DEFAULT_OPENAI_MODEL;
  const apiKey = this.config.apiKey.trim();

  // Line 249 in callGemini
  const rawModel = this.config.model || DEFAULT_GEMINI_MODEL;
  const model = rawModel.replace(/^models\//, '');
  const apiKey = this.config.apiKey.trim();
  ```

### 3.2 Root Cause Analysis
1. If `apiKey` is undefined or null (e.g. environment variable unset, or user leaves key blank in settings), `this.config.apiKey.trim()` throws:
   `TypeError: Cannot read properties of undefined (reading 'trim')`
2. This unhandled exception crashes before reaching `if (!apiKey) { ... }`, circumventing `normalizeAiError(401)` and `AiServiceError`.
3. The server or client runtime crashes with an unhandled exception rather than returning a clean `AUTH_ERROR` (HTTP 401).

### 3.3 Proposed Fix
In `web_app/src/ai/direct-client.ts`:
1. Safely normalize in constructor:
   ```typescript
   constructor(config: AiClientConfig, fetchImpl?: typeof fetch) {
     this.config = {
       ...config,
       apiKey: (config?.apiKey || '').trim(),
       timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
       maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
     };
     this.fetchImpl = fetchImpl || fetch;
   }
   ```
2. Defensively extract in `callOpenAi`:
   ```typescript
   const model = this.config.model || DEFAULT_OPENAI_MODEL;
   const apiKey = (this.config.apiKey || '').trim();

   if (!apiKey) {
     const err = normalizeAiError(401, 'Chưa cấu hình OpenAI API key.');
     throw new AiServiceError(err.code, err.status, err.message);
   }
   ```
3. Defensively extract in `callGemini`:
   ```typescript
   const rawModel = this.config.model || DEFAULT_GEMINI_MODEL;
   const model = rawModel.replace(/^models\//, '');
   const apiKey = (this.config.apiKey || '').trim();

   if (!apiKey) {
     const err = normalizeAiError(401, 'Chưa cấu hình Google Gemini API key.');
     throw new AiServiceError(err.code, err.status, err.message);
   }
   ```

### 3.4 Related Finding: Destructive Output Sanitization in `sanitizer.ts:19`
- `web_app/src/ai/sanitizer.ts:19` has `cleaned = cleaned.replace(/```[\s\S]*?```/g, '');`.
- When an LLM wraps output in ```` ```markdown ... ``` ````, all text is erased.
- Fix: Replace code fence markers while preserving inner text:
  ```typescript
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n?([\s\S]*?)```$/gm, '$1');
  cleaned = cleaned.replace(/```[a-zA-Z]*/g, '');
  cleaned = cleaned.replace(/```/g, '');
  cleaned = cleaned.replace(/`+/g, '');
  ```

---

## 4. Issue 4: E2E Test Files Typecheck Errors (.not, .toBeUndefined)

### 4.1 Observation & Diagnostics
The 13 E2E typecheck errors in `npm run typecheck`:
1. `e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(22,20)`: TS2339 Property `'bottomMarginMm'` does not exist on type `{ topMm, bottomMm, leftMm, rightMm }`.
2. `e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(23,20)`: TS2339 Property `'leftMarginMm'` does not exist.
3. `e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts(24,20)`: TS2339 Property `'rightMarginMm'` does not exist.
4. `e2e-tests/tier1-feature/f18_ai_prompts.test.ts(41,42,43,53,54)`: TS2339 Property `'not'` does not exist on type...
5. `e2e-tests/tier1-feature/f21_ai_template_fill.test.ts(70)`: TS2551 Property `'toBeUndefined'` does not exist on type...
6. `e2e-tests/tier1-feature/f22_diff_preview.test.ts(77,78)`: TS2551 Property `'toBeUndefined'` does not exist on type...
7. `e2e-tests/tier1-feature/f24_adversarial_hardening.test.ts(56)`: TS2551 Property `'toBeUndefined'` does not exist on type...
8. `e2e-tests/tier3-pairwise/journey_template_ai_diff_export.test.ts(55)`: TS2339 Property `'not'` does not exist on type...

### 4.2 Root Cause Analysis
1. `web_app/tsconfig.json` includes `"**/*.ts"`, subjecting `e2e-tests/` to strict TypeScript checking during `npm run typecheck`.
2. `web_app/e2e-tests/framework/assertions.ts` is a custom assertion library. Its return type lacks:
   - Method `toBeUndefined()`.
   - Property `not` providing inverted matchers (`not.toContain`, `not.toBe`, `not.toEqual`, etc.).
3. `web_app/e2e-tests/runner.js` contains a duplicate assertion harness that also lacks `toBeUndefined()` and `.not`.
4. `f02_canvas_toolbar.test.ts` incorrectly used `margins.bottomMarginMm` instead of canonical `margins.bottomMm`.

### 4.3 Proposed Fix
1. In `web_app/e2e-tests/framework/assertions.ts`:
   - Implement `toBeUndefined()` on standard matchers.
   - Implement `not` proxy object containing inverted assertions (`toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toContain`, `toMatch`, `toBeDefined`, `toBeUndefined`, `toBeNull`).
2. In `web_app/e2e-tests/runner.js`:
   - Mirror `toBeUndefined()` and `not` implementation into `expect(actual)`.
3. In `web_app/e2e-tests/tier1-feature/f02_canvas_toolbar.test.ts:20-25`:
   - Replace `margins.bottomMarginMm || margins.bottomMm` with `margins.bottomMm`.
   - Replace `margins.leftMarginMm || margins.leftMm` with `margins.leftMm`.
   - Replace `margins.rightMarginMm || margins.rightMm` with `margins.rightMm`.

---

## 5. Verification Assessment
Applying these 4 fixes resolves 100% of all 14 TypeScript diagnostics emitted by `tsc --noEmit` and eliminates the Webpack module resolution failure for `net`/`tls`, allowing both `npm run typecheck` and `npm run build` to pass cleanly with exit code 0.
