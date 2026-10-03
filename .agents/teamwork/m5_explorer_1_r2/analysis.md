# M5 Explorer 1 Analysis: Multi-Provider AI Client & Prompt Guards

## Executive Summary
Milestone 5 (AI Workspace & Diff Workflow) requires an independent, production-grade AI integration supporting dual providers (OpenAI `gpt-4o-mini` and Google Gemini `gemini-2.0-flash`), strict Vietnamese administrative prompt guards (`ADMINISTRATIVE_AI_RULES` per Nghị định 30/2020/NĐ-CP), robust error normalization, exponential retry, API key masking, offline mock fallback for 100% test hermeticity, and Next.js App Router API routes.

This analysis provides the architectural blueprint, contract specifications, and implementation roadmap for the implementation Worker.

---

## 1. Current Codebase & Dependency Audit

### 1.1 Existing Assets in `TVCI_word_addins/src/ai/`
The Word Add-in source contains initial AI modules:
- `src/ai/administrative-rules.ts`: String-based rules for Vietnamese administrative drafting.
- `src/ai/direct-client.ts`: Fetch-based REST client for OpenAI and Gemini with `fetchWithTransientRetry` and `fetchWithTimeout`.
- `src/ai/template-fill.ts`: Field extraction logic with JSON parsing.
- `src/ai/writing-workspace.ts`: Style presets (administrative, formal, concise, etc.).

### 1.2 Status in `web_app`
- `web_app/src/ai/`: **Does not exist yet**. Needs to be created.
- `web_app/app/api/ai/`: **Does not exist yet**. Needs to be created.
- `web_app/package.json`:
  - `diff`: `^7.0.0` and `@types/diff`: `^6.0.0` are **already installed**.
  - No bloated external SDKs (`openai`, `@google/genai`) are installed.
  - **Decision**: Adhere to the "Stdlib and native first" principle. Use native `fetch` with TypeScript typings. This avoids 20MB+ of unused SDK dependencies, eliminates bundler conflicts in Next.js edge/node runtimes, and matches the proven approach in `src/ai/direct-client.ts`.

### 1.3 Pre-existing E2E Test Contracts
The test suites in `web_app/e2e-tests/` define non-negotiable contracts:
- `f17_ai_client.test.ts`:
  - Config: `provider` ("openai" | "gemini"), `apiKey`, `model`, `timeoutMs` (45000ms), `maxRetries` (2).
  - Error normalization: `{ code: "AUTH_ERROR" | "RATE_LIMIT" | "TIMEOUT" | "INVALID_RESPONSE", status: number, message: string }`.
  - Retry logic: Transient errors (408, 500, 502, 503, 504) and 429 retry backoff.
  - Key masking: `sk-***` and `AIzaSy***`.
- `f18_ai_prompts.test.ts`:
  - `ADMINISTRATIVE_AI_RULES`: Exactly 4 elements in an array:
    1. Contains `"KHÔNG BỊA ĐẶT"`
    2. Contains `"KHÔNG DÙNG ĐỊNH DẠNG MARKDOWN"`
    3. Contains `"KHÔNG DÙNG BIỂU TƯỢNG CẢM XÚC"`
    4. Administrative style per Nghị định 30/2020/NĐ-CP.
  - `sanitizeAiOutput`: Strips markdown headers (`#`), bold/italic (`**`, `*`), code blocks, and emojis while preserving Vietnamese diacritics and quotes.
  - `isInjectionAttempt`: Rejects prompt injection patterns.

---

## 2. Multi-Provider AI Client Architecture

### 2.1 Provider Specifications

| Provider | Default Model | Base URL Endpoint | Auth Header | Request Body Format |
|:---|:---|:---|:---|:---|
| **OpenAI** | `gpt-4o-mini` | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer <key>` | `{ model, messages: [{ role: "user", content }] }` |
| **Gemini** | `gemini-2.0-flash` | `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent` | `x-goog-api-key: <key>` | `{ contents: [{ parts: [{ text }] }] }` |
| **Mock** | `mock-model` | In-memory deterministic handler | None | Returns fixture responses immediately |

### 2.2 Core Interfaces (`src/ai/types.ts`)

```typescript
export type AiProviderName = 'openai' | 'gemini' | 'mock';

export interface AiClientConfig {
  provider: AiProviderName;
  apiKey: string;
  model?: string;
  timeoutMs?: number;    // Default: 45_000
  maxRetries?: number;   // Default: 2
  fetchImpl?: typeof fetch;
}

export type AiErrorCode = 'AUTH_ERROR' | 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_RESPONSE';

export interface NormalizedAiError {
  code: AiErrorCode;
  status: number;
  message: string;
  retryDelayMs?: number;
}
```

### 2.3 Resilient Execution Pipeline

```
Caller (UI / Route)
   │
   ▼
[Prompt Guard & Injection Check] ──(fail)──> Throw 400 Bad Request
   │ (pass)
   ▼
[Mock Mode Check] ──────────────────(is mock)──> Return Deterministic Fixture
   │ (real API)
   ▼
[Transient Retry Loop (max 2 retries)]
   ├── Fetch with 45s AbortController Timeout
   ├── Inspect Response:
   │     ├─ 200 OK: Extract text
   │     ├─ 401/403: Normalize AUTH_ERROR (no retry)
   │     ├─ 429: Parse retry-after; if <= 60s, wait & retry; else RATE_LIMIT
   │     ├─ 408/500/502/503/504: Wait exponential backoff [2s, 5s] & retry
   │     └─ Other: Normalize INVALID_RESPONSE
   └── On Failure: Sanitize error message (mask sk-***, AIzaSy***)
   │
   ▼
[Output Sanitizer] (strip markdown, emojis, preambles)
   │
   ▼
Clean Administrative Text
```

### 2.4 Hermetic Mock Fallback Design
To guarantee test hermeticity and offline development:
1. When `config.apiKey === 'mock'` or `config.provider === 'mock'` or `config.apiKey.startsWith('sk-mock')` or `config.apiKey.startsWith('AIzaSyMock')` or `process.env.MOCK_AI === 'true'`:
   - Divert directly to `src/ai/mock-provider.ts`.
   - Return structured fixtures:
     - For drafting: `MOCK_AI_RESPONSES.drafting.content`
     - For proofreading: `MOCK_AI_RESPONSES.proofreading.issues`
     - For template fill: Extracted key-values matching schema.
2. In unit and integration tests, never make live network calls.

---

## 3. Strict Vietnamese Administrative Prompt Rules

### 3.1 Prompt Contract (`src/ai/administrative-rules.ts`)
Must export both array format (satisfying `f18_ai_prompts.test.ts`) and joined string for prompt injection:

```typescript
export const ADMINISTRATIVE_AI_RULES: string[] = [
  "TUYỆT ĐỐI KHÔNG BỊA ĐẶT (no hallucination) số hiệu, ngày tháng, thông tin không có trong tài liệu.",
  "KHÔNG DÙNG ĐỊNH DẠNG MARKDOWN (không dùng #, **, *, -, ```).",
  "KHÔNG DÙNG BIỂU TƯỢNG CẢM XÚC (emoji).",
  "NGÔN NGỮ CHUẨN XÁC, TRANG TRỌNG, ĐÚNG THỂ THỨC HÀNH CHÍNH VIỆT NAM (Nghị định 30/2020/NĐ-CP).",
];

export const ADMINISTRATIVE_AI_RULES_PROMPT: string = ADMINISTRATIVE_AI_RULES.join("\n");
```

### 3.2 Output Sanitization Rules (`src/ai/sanitizer.ts`)
The sanitizer executes multi-stage cleaning:
1. **Markdown Stripping**:
   - Headers: `replace(/^#{1,6}\s+/gm, "")`
   - Bold/Italic: `replace(/\*\*([^*]+)\*\*/g, "$1")`, `replace(/\*([^*]+)\*/g, "$1")`
   - Code blocks: `replace(/```[\s\S]*?```/g, "")`, `replace(/`+([^`]+)`+/g, "$1")`
2. **Emoji Stripping**:
   - Regex matching Unicode emoji planes (`\u{1F600}-\u{1F64F}`, `\u{1F300}-\u{1F5FF}`, etc.)
3. **Conversational Preamble Stripping**:
   - Removes introductory/closing filler (`Dưới đây là...`, `Sau đây là bản chỉnh sửa:`, `Theo yêu cầu của bạn,...`).
4. **Diacritic & Quote Preservation**:
   - Standard Vietnamese characters (`à, á, ả, ã, ạ, ă, ắ, ằ, ẵ, ặ, â, ấ, ầ, ẩ, ẫ, ậ, đ, è, é...`) and punctuation marks are 100% preserved.

### 3.3 Prompt Injection Defense (`isInjectionAttempt`)
Rejects harmful prompts before passing to providers:
- English patterns: `/ignore all previous instructions/i`, `/system prompt/i`, `/act as an unrestricted/i`, `/jailbreak/i`.
- Vietnamese patterns: `/bỏ qua mọi chỉ dẫn trước/i`, `/bỏ qua quy định/i`, `/hãy quên các quy tắc/i`.

---

## 4. API Routes & Client Integration (`web_app/app/api/ai/`)

Create standard Next.js 14 App Router routes:

### 4.1 `POST /api/ai/draft`
- **Request Body**:
  ```json
  {
    "docType": "cong_van | quyet_dinh | to_trinh | thong_bao",
    "section": "mo_dau | noi_dung | ket_luan | dieu_khoan",
    "userPrompt": "string",
    "context": "string",
    "provider": "openai | gemini",
    "apiKey": "string",
    "model": "string"
  }
  ```
- **Validation**: Check non-empty `userPrompt`, verify no prompt injection.
- **Response**: `{ success: true, text: string, paragraphs: string[], tokensUsed: number }`.

### 4.2 `POST /api/ai/proofread`
- **Request Body**:
  ```json
  {
    "text": "string",
    "provider": "openai | gemini",
    "apiKey": "string",
    "model": "string"
  }
  ```
- **Response**: `{ success: true, issues: ProofreadIssue[] }`.

### 4.3 `POST /api/ai/template-fill`
- **Request Body**:
  ```json
  {
    "notes": "string",
    "schemaId": "string",
    "provider": "openai | gemini",
    "apiKey": "string",
    "model": "string"
  }
  ```
- **Response**: `{ success: true, fields: Record<string, string>, confidence: number }`.

---

## 5. File Layout & Deliverables Plan

The implementation Worker should create/update the following files:

```
web_app/
├── src/ai/
│   ├── types.ts                    # Interfaces, configs, error models
│   ├── administrative-rules.ts     # ADMINISTRATIVE_AI_RULES & injection guard
│   ├── sanitizer.ts                # sanitizeAiOutput & text cleanup
│   ├── mock-provider.ts            # Deterministic fixtures for offline & tests
│   ├── direct-client.ts            # Multi-provider client (OpenAI + Gemini + Mock)
│   └── index.ts                    # Barrel export
├── app/api/ai/
│   ├── draft/route.ts              # Drafting API route
│   ├── proofread/route.ts          # Proofreading API route
│   └── template-fill/route.ts      # Template Fill API route
└── tests/unit/
    ├── ai-client.test.ts           # F17 unit tests
    ├── ai-prompts.test.ts          # F18 unit tests
    └── ai-api-routes.test.ts       # API routes integration tests
```
