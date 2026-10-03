# M5 Explorer 2 Analysis: AI Subsystems (Drafting, Proofreading, Template Fill)

## Executive Summary
This document specifies the architecture, data models, prompt templates, response parsing, and testing strategies for the three core AI Subsystems of Milestone 5 (`ai-workspace-diff`):
1. **Contextual Drafting Subsystem** (`web_app/src/ai/drafting.ts`): Generates Vietnamese administrative document sections (Mở đầu, Căn cứ pháp lý, Nội dung chính, Điều khoản thi hành) adhering to Nghị định 30/2020/NĐ-CP.
2. **5-Category Proofreading Subsystem** (`web_app/src/ai/proofreading.ts`): Analyzes document text and provides structured issues across exactly 5 categories: Chính tả (Spelling), Ngữ pháp (Grammar), Viết hoa hành chính (Capitalization), Dấu câu (Punctuation), and Văn phong hành chính (Administrative Tone/Style).
3. **AI Template Fill Assistant** (`web_app/src/ai/template-fill.ts`): Extracts and maps unstructured user notes into canonical M4 form schema fields (`web_app/src/templates/form-schema.ts`), validating tags, formatting administrative dates, and calculating confidence scores.

All subsystems are strictly aligned with `ADMINISTRATIVE_AI_RULES`, zero-external-SDK architecture, and hermetic mocking for 100% test reliability.

---

## 1. Subsystem 1: Contextual Drafting Subsystem (`web_app/src/ai/drafting.ts`)

### 1.1 Objective & Requirements
- Support section-level drafting for 10 document types (`cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bao_cao`, `bien_ban`, `ke_hoach`, `hop_dong`, `thu_moi`, `don_nghi_phep`).
- Generate 5 distinct section types per standard Vietnamese administrative hierarchy:
  - `mo_dau` (Opening): Kính gửi, lý do ban hành, bối cảnh thực hiện.
  - `can_cu` (Legal bases): Dòng căn cứ pháp lý kết thúc bằng `;`, dòng cuối kết thúc bằng `.`.
  - `noi_dung` (Main body): Các đoạn giải trình, yêu cầu công tác, bảng biểu hoặc điều khoản.
  - `dieu_khoan` (Clauses): Điều khoản quyết định ("Điều 1. ...", "Điều 2. ...", "Điều 3. ...").
  - `ket_luan` (Conclusion): Đề nghị phối hợp, tổ chức thi hành, ký hiệu kết thúc `./.`.
  - `toan_bo` (Full body): Toàn bộ phần thân văn bản nghiệp vụ hoàn chỉnh.
- Enforce strict formal vocabulary (`Kính gửi`, `Trân trọng`, `Căn cứ`, `Thực hiện`, `Báo cáo`).
- Output parsed into paragraphs (`string[]`) and sanitized against markdown and emojis.

### 1.2 Interfaces & Data Contracts

```typescript
export type AdministrativeDocType =
  | 'cong_van'
  | 'quyet_dinh'
  | 'thong_bao'
  | 'to_trinh'
  | 'bao_cao'
  | 'bien_ban'
  | 'ke_hoach'
  | 'hop_dong'
  | 'thu_moi'
  | 'don_nghi_phep';

export type DraftingSection =
  | 'mo_dau'
  | 'can_cu'
  | 'noi_dung'
  | 'ket_luan'
  | 'dieu_khoan'
  | 'toan_bo';

export interface DraftingRequest {
  docType: AdministrativeDocType | string;
  section: DraftingSection;
  userPrompt: string;
  context?: string;
  agencyName?: string;
  parentAgencyName?: string;
  profileId?: string; // 'ND30_TVCI' | 'TKV' | 'IEMM' | 'DANG_05_HD_VPTW_2026'
}

export interface DraftingResponse {
  content: string;
  paragraphs: string[];
  section: DraftingSection;
  docType: string;
  tokensUsed: number;
  metadata?: {
    model?: string;
    provider?: string;
    executionTimeMs?: number;
  };
}
```

### 1.3 Algorithm & Processing Pipeline
1. **Request Validation**:
   - Check `!req.userPrompt || req.userPrompt.trim().length === 0`: throw `new Error("Yêu cầu soạn thảo không được để trống")`.
   - Check prompt injection using `isInjectionAttempt(req.userPrompt)`: throw `new Error("Yêu cầu chứa từ khóa không hợp lệ hoặc vi phạm quy tắc an toàn")`.
2. **Prompt Construction** (`buildDraftingPrompt`):
   - Injects `ADMINISTRATIVE_AI_RULES_PROMPT`.
   - Injects Document Type display name (`Công văn`, `Quyết định`, etc.).
   - Injects Section Guidelines:
     - `can_cu`: "Mỗi căn cứ một dòng bắt đầu bằng 'Căn cứ...', kết thúc bằng ';', căn cứ cuối cùng kết thúc bằng '.' hoặc ', Xét đề nghị của...'."
     - `dieu_khoan`: "Trình bày theo các Điều: 'Điều 1. ...', 'Điều 2. ...'. Điều cuối cùng quy định trách nhiệm thi hành."
     - `ket_luan`: "Kết luận ngắn gọn, trang trọng. Kết thúc bằng ký hiệu './.'."
   - Injects document context, user requirements, and agency details.
3. **LLM Invocation / Mock Fallback**:
   - In live mode: Calls `direct-client.ts`.
   - In mock mode: Returns deterministic text from `MOCK_AI_RESPONSES.drafting.content` with `tokensUsed: 45`.
4. **Output Sanitization & Paragraph Splitting**:
   - Apply `sanitizeAiOutput` to remove markdown `#`, `**`, `*`, code fences, and emojis.
   - Split output by double or single newlines: `content.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0)`.
   - Return `DraftingResponse`.

### 1.4 Prompt Template: Contextual Drafting

```text
Bạn là chuyên gia soạn thảo văn bản hành chính Việt Nam cho VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP (TVCI).

QUY CHUẨN BẮT BUỘC:
{{ADMINISTRATIVE_AI_RULES}}

THÔNG TIN VĂN BẢN:
- Loại văn bản: {{docType}} ({{docTypeName}})
- Phần cần soạn: {{section}} ({{sectionTitle}})
- Cơ quan ban hành: {{agencyName}}
- Cơ quan chủ quản: {{parentAgencyName}}
- Bối cảnh tài liệu: {{context}}

YÊU CẦU NGƯỜI DÙNG:
{{userPrompt}}

HƯỚNG DẪN CHI TIẾT CHO PHẦN SOẠN THẢO:
{{sectionSpecificInstructions}}

YÊU CẦU ĐẦU RA:
- Trả về DUY NHẤT nội dung văn bản thuần túy (plain text), không dùng markdown (không #, **, *, ```).
- Không thêm lời chào, lời dẫn hoặc giải thích của trợ lý AI.
- Sử dụng câu từ trang trọng, chuẩn mực công vụ, đúng thể thức Nghị định 30/2020/NĐ-CP.
```

---

## 2. Subsystem 2: 5-Category Proofreading Subsystem (`web_app/src/ai/proofreading.ts`)

### 2.1 Objective & Requirements
- Scans arbitrary Vietnamese administrative document text and identifies issues categorized into exactly 5 groups:
  1. `spelling` (Chính tả): Dấu thanh (hỏi/ngã), phụ âm đầu (l/n, s/x, tr/ch, d/gi/r), vần.
  2. `grammar` (Ngữ pháp): Câu què thiếu chủ vị, sai liên từ, trật tự cú pháp.
  3. `capitalization` (Viết hoa hành chính): Theo Phụ lục II NĐ 30/2020/NĐ-CP (tên cơ quan, tổ chức, chức vụ, địa danh, sau dấu chấm).
  4. `punctuation` (Dấu câu): Dấu hai chấm sau Kính gửi/Nơi nhận/Lưu, dấu chấm phẩy giữa các căn cứ và nơi nhận, kết thúc văn bản bằng `./.`, khoảng trắng quanh dấu câu.
  5. `administrative_style` (Văn phong hành chính): Thay thế đại từ thân mật ("chúng tôi", "mình") bằng danh xưng công vụ ("Trung tâm", "Đơn vị"), loại bỏ khẩu ngữ, quảng cáo, văn nói.
- Computes character replacement indices (`position`, `endIndex`) for visual inline highlighting.
- Returns full `revisedText` and structured `issues[]`.
- Handles clean text returning empty issue list (`issues: []`).

### 2.2 Interfaces & Data Contracts

```typescript
export type ProofreadCategory =
  | 'spelling'
  | 'grammar'
  | 'capitalization'
  | 'punctuation'
  | 'administrative_style';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ProofreadIssue {
  id: string;
  category: ProofreadCategory;
  original: string;
  replacement: string;
  explanation: string;
  severity: IssueSeverity;
  position?: number;
  endIndex?: number;
  context?: string;
}

export interface ProofreadRequest {
  text: string;
  docType?: string;
  categories?: ProofreadCategory[];
}

export interface ProofreadResponse {
  originalText: string;
  revisedText: string;
  issues: ProofreadIssue[];
  stats: {
    total: number;
    byCategory: Record<ProofreadCategory, number>;
  };
  tokensUsed?: number;
}
```

### 2.3 Algorithm & Processing Pipeline
1. **Input Checking**:
   - Check `!text || text.trim().length === 0`: throw `new Error("Chưa có nội dung để kiểm tra.")`.
2. **Prompt Construction** (`buildProofreadingPrompt`):
   - Injects `ADMINISTRATIVE_AI_RULES_PROMPT`.
   - Lists the 5 valid categories with Vietnamese descriptions.
   - Enforces structured JSON output schema.
3. **Execution & Parsing** (`parseProofreadingResult`):
   - Calls `extractJson` to isolate JSON even if the model surrounds it with ````json ... ````.
   - Validates root JSON structure `{ revisedText: string, issues: ProofreadIssue[] }`.
   - Normalizes each issue:
     - `category`: Maps to one of the 5 categories (fallback to `administrative_style`).
     - `original`: Must be a non-empty substring of `sourceText`.
     - `replacement`: Suggested text. If `original === replacement`, ignore issue.
     - `position` & `endIndex`: Calculate `sourceText.indexOf(original)` and `position + original.length`.
     - `severity`: Map to `error` (spelling, grammar), `warning` (capitalization, punctuation), `info` (style).
     - `context`: 30 characters before and after the occurrence in `sourceText`.
   - Summarizes counts by category in `stats`.
4. **Mock Provider Compatibility**:
   - If mock mode or test key: Returns `MOCK_AI_RESPONSES.proofreading.issues` with correct category mapping.

### 2.4 Prompt Template: 5-Category Proofreading

```text
Bạn là chuyên gia kiểm tra và hiệu đính văn bản hành chính tiếng Việt theo quy chuẩn Nghị định 30/2020/NĐ-CP và tiêu chuẩn Viện Cơ khí Năng lượng và Mỏ - Vinacomin / TVCI.

QUY TẮC BẮT BUỘC:
{{ADMINISTRATIVE_AI_RULES}}

NHIỆM VỤ:
Kiểm tra văn bản được cung cấp và phân loại tất cả các lỗi hoặc điểm cần cải tiến vào ĐÚNG 5 NHÓM sau:
1. "spelling": Lỗi chính tả tiếng Việt (dấu hỏi/ngã, âm đầu tr/ch, s/x, d/gi/r, vần, lỗi gõ phím).
2. "grammar": Lỗi ngữ pháp, câu thiếu chủ ngữ/vị ngữ, cấu trúc câu lủng củng.
3. "capitalization": Lỗi viết hoa hành chính theo Phụ lục II Nghị định 30/2020/NĐ-CP (tên cơ quan, tổ chức, chức vụ, địa danh, sau dấu chấm).
4. "punctuation": Lỗi dấu câu (thiếu dấu hai chấm sau Kính gửi/Nơi nhận/Lưu, dấu chấm phẩy giữa các căn cứ và nơi nhận, kết thúc văn bản bằng ./., thừa thiếu khoảng trắng trước/sau dấu câu).
5. "administrative_style": Văn phong hành chính (loại bỏ đại từ 'chúng tôi', 'mình', từ ngữ khẩu ngữ/quảng cáo, diễn đạt khách quan, chuẩn mực công vụ).

QUY ĐỊNH ĐẶC BIỆT:
- Không thay đổi số hiệu, ngày tháng, mã hồ sơ, tên riêng, model thiết bị nếu bản gốc không sai rõ ràng.
- Giữ nguyên cấu trúc phân đoạn của văn bản gốc.

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (DUY NHẤT JSON):
{
  "revisedText": "toàn bộ văn bản sau khi đã sửa toàn diện",
  "issues": [
    {
      "category": "spelling" | "grammar" | "capitalization" | "punctuation" | "administrative_style",
      "original": "từ hoặc cụm từ gốc bị lỗi trong văn bản",
      "replacement": "từ hoặc cụm từ thay thế chuẩn xác",
      "explanation": "giải thích ngắn gọn lý do sửa bằng tiếng Việt",
      "severity": "error" | "warning" | "info"
    }
  ]
}

VĂN BẢN CẦN KIỂM TRA:
{{sourceText}}
```

---

## 3. Subsystem 3: AI Template Fill Assistant (`web_app/src/ai/template-fill.ts`)

### 3.1 Objective & Requirements
- Extract values from unstructured user notes (meeting notes, email requests, outlines) and map them directly into fields of an M4 form schema (`web_app/src/templates/form-schema.ts`).
- Compatible with all 8 canonical schemas + 2 internal schemas in M4:
  - `cong_van`: `SO_KY_HIEU`, `place`, `NGAY_BAN_HANH`, `TRICH_YEU`, `KINH_GUI`, `NOI_DUNG`, `signerRole`, `NGUOI_KY`, `NOI_NHAN`.
  - `quyet_dinh`: `SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `CAN_CU`, `QUYET_DINH_DIEU`, `signerRole`, `NGUOI_KY`.
  - `thong_bao`: `SO_KY_HIEU`, `NGAY_BAN_HANH`, `TRICH_YEU`, `DOI_TUONG_NHAN`, `NOI_DUNG`, `signerRole`, `NGUOI_KY`, `NOI_NHAN`.
  - `to_trinh`: `SO_KY_HIEU`, `TRICH_YEU`, `KINH_GUI`, `SU_CAN_THIET`, `NOI_DUNG_DE_XUAT`, `signerRole`, `NGUOI_KY`.
  - `bao_cao`: `SO_KY_HIEU`, `TRICH_YEU`, `KY_BAO_CAO`, `KINH_GUI`, `KET_QUA`, `KIEN_NGHI`, `signerRole`, `NGUOI_KY`.
  - `bien_ban`: `TEN_BIEN_BAN`, `THOI_GIAN`, `DIA_DIEM`, `CHU_TRI`, `THU_KY`, `THANH_PHAN`, `DIEN_BIEN`, `KET_LUAN`.
  - `ke_hoach`: `SO_KY_HIEU`, `TRICH_YEU`, `MUC_DICH_YEU_CAU`, `NOI_DUNG_KE_HOACH`, `TIEN_DO`, `TO_CHUC_THUC_HIEN`.
  - `hop_dong`: `SO_KY_HIEU`, `TRICH_YEU`, `BEN_A`, `BEN_B`, `DOI_TUONG_HOP_DONG`, `GIA_TRI_HOP_DONG`, `THOI_HAN_THUC_HIEN`.
  - `thu_moi`: `KINH_GUI`, `LY_DO`, `THOI_GIAN_DIA_DIEM`, `NGUOI_KY`.
  - `don_nghi_phep`: `HO_TEN`, `CHUC_VU`, `SO_NGAY_NGHI`, `TU_NGAY`, `DEN_NGAY`, `LY_DO`.
- Enforce schema validation: Discard any hallucinated/unknown tags not in the target schema.
- Support dual-key naming: camelCase and SCREAMING_SNAKE_CASE (e.g. `TRICH_YEU` and `subject`, `KINH_GUI` and `directRecipients`).
- Date parsing and normalization to administrative date format via `formatAdministrativeDate`.
- Trích yếu prefix: Ensure `V/v ` prefix is present.
- Confidence scoring: Provide confidence per field (`0.0` - `1.0`), overall confidence score, and flag fields below `0.8` for user review.

### 3.2 Interfaces & Data Contracts

```typescript
export interface TemplateFillRequest {
  notes: string;
  schemaId?: string; // Optional: auto-detects from notes if omitted
}

export interface ExtractedFieldResult {
  tag: string;
  fieldId: string;
  label: string;
  value: string | string[] | null;
  confidence: number;
  source: string;
  needsReview: boolean;
}

export interface TemplateFillResponse {
  docType: string;
  schemaName: string;
  confidence: number;
  values: Record<string, any>; // Dual-key populated values dictionary
  fieldResults: ExtractedFieldResult[];
  missingRequiredFields: string[];
  appliedCount: number;
  tokensUsed?: number;
}
```

### 3.3 Algorithm & Processing Pipeline
1. **Schema Resolution**:
   - If `schemaId` given: resolve schema using `getFormSchema(schemaId)` or `getTemplateFormSchemaByDocumentType(schemaId)`.
   - If no `schemaId`: detect likely document type from keywords in `notes` (e.g. `quyết định` -> `quyet_dinh`, `công văn` -> `cong_van`, `tờ trình` -> `to_trinh`, `thông báo` -> `thong_bao`, `nghỉ phép` -> `don_nghi_phep`).
2. **Schema Field Indexing**:
   - Build a tag-to-field lookup map containing field `id`, `tag`, and all `aliases`.
   - Prepare field metadata for prompt (id, label, type, required, aliases).
3. **Prompt Construction** (`buildTemplateFillPrompt`):
   - Injects `ADMINISTRATIVE_AI_RULES_PROMPT`.
   - Injects schema fields as a bulleted list: `- ${field.id}: ${field.label} (kiểu: ${field.type}, bắt buộc: ${field.required})`.
   - Instructs the model:
     - ONLY extract facts from `notes`.
     - DO NOT hallucinate dates, numbers, or recipients. If not found, return `null` and `confidence: 0`.
     - Return JSON array `fields: [{ tag, value, confidence, source }]`.
4. **Response Parsing & Validation**:
   - Extract JSON via `extractJson`.
   - Filter tags: Compare extracted `tag` against valid schema fields and aliases. **Any unknown tag is immediately discarded**.
   - Post-process specific fields:
     - `TRICH_YEU`: Ensure it begins with `"V/v "` (e.g. `notes.match(/về việc\s+([^,.\n]+)/i)` -> `"V/v ..."`).
     - `NGAY_BAN_HANH` / `date`: Parse date parts and format with `formatAdministrativeDate`.
     - Repeatable fields (`CAN_CU`, `QUYET_DINH_DIEU`, `NOI_NHAN`): Normalize into clean `string[]`.
   - Dual-key population: Assign value to `values[field.id]`, `values[field.tag]`, and `values[alias]`.
   - Flag `needsReview = confidence < 0.8`.
   - Calculate `missingRequiredFields` for all required schema fields whose value is null or empty.
5. **Hybrid Deterministic Fallback** (for hermetic testing and offline mode):
   - Fast regex extraction matching test cases in `f21_ai_template_fill.test.ts`:
     - Recipient (`KINH_GUI`): `notes.match(/gửi cho\s+([^,.\n]+)/i)` or `notes.match(/kính gửi\s+([^,.\n]+)/i)`.
     - Subject (`TRICH_YEU`): `notes.match(/về việc\s+([^,.\n]+)/i)` -> `V/v ${match[1].trim()}`.
     - Signer (`NGUOI_KY`): `notes.match(/người ký\s+([^,.\n]+)/i)`.
     - Days off (`SO_NGAY_NGHI`): `notes.match(/(\d+\s*ngày)/i)`.
   - Provides 100% deterministic test execution without network calls.

### 3.4 Prompt Template: AI Template Fill Assistant

```text
Bạn là trợ lý AI thông minh chuyên trích xuất dữ liệu để điền biểu mẫu hành chính Việt Nam cho VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TVCI.

QUY TẮC BẮT BUỘC:
{{ADMINISTRATIVE_AI_RULES}}

THÔNG TIN BIỂU MẪU MỤC TIÊU:
- Mã mẫu biểu: {{schemaId}}
- Tên văn bản: {{schemaName}}
- Mô tả: {{schemaDescription}}

DANH SÁCH CÁC TRƯỜNG DỮ LIỆU ĐƯỢC PHÉP TRÍCH XUẤT:
{{schemaFieldsList}}

QUY ĐỊNH TRÍCH XUẤT NGHIÊM NGẶT:
1. CHỈ trích xuất dữ liệu có trong 'Ghi chú của người dùng'. Tuyệt đối không tự bịa đặt họ tên, số ký hiệu, ngày tháng hoặc số tiền.
2. CHỈ sử dụng các trường (tag/id) có trong danh sách trên. TUYỆT ĐỐI KHÔNG sinh ra tag mới hoặc tag không nằm trong danh sách.
3. Nếu một trường không có thông tin trong ghi chú, đặt value là null và confidence = 0.
4. Với trường TRICH_YEU (Trích yếu), nếu có nội dung 'về việc...' thì chuẩn hóa bắt đầu bằng 'V/v ...'.
5. Với trường kiểu ngày tháng (date), chuẩn hóa theo định dạng YYYY-MM-DD nếu xác định được ngày cụ thể.
6. Với trường kiểu danh sách lặp (repeatable) như CAN_CU, QUYET_DINH_DIEU, NOI_NHAN, trích xuất thành mảng các chuỗi string.

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (DUY NHẤT JSON):
{
  "docType": "{{schemaId}}",
  "confidence": 0.95,
  "fields": [
    {
      "tag": "TAG_NAME",
      "value": "giá trị trích xuất" | ["giá trị 1", "giá trị 2"] | null,
      "confidence": 0.95,
      "source": "câu hoặc đoạn trích từ ghi chú chứng minh cho giá trị này"
    }
  ]
}

GHI CHÚ CỦA NGƯỜI DÙNG:
{{userNotes}}
```

---

## 4. Integration Strategy with M4 Template Catalog & Form Schemas

### 4.1 Dependency Mapping
The AI subsystems integrate directly with M4 modules without circular dependencies:

```
web_app/src/templates/form-schema.ts  <────┐
web_app/src/templates/form-validation.ts <─┼──── web_app/src/ai/template-fill.ts
web_app/src/templates/catalog.ts <─────────┤
web_app/src/templates/types.ts <───────────┘
                                           ▲
                                           │
web_app/src/ai/drafting.ts ────────────────┤
web_app/src/ai/proofreading.ts ────────────┴──── web_app/src/ai/diff.ts (M5 Explorer 3)
```

### 4.2 Seamless Data Flow: Notes -> Template Fill -> Drafting -> Proofreading -> Diff -> Tiptap
1. **User enters rough notes** in AI Workspace.
2. **Template Fill Assistant** maps notes into M4 `TemplateFormValues`.
3. **Template Engine** (`engine.ts`) renders AST document or fills template fields.
4. **Contextual Drafting** drafts missing body paragraphs or clauses.
5. **5-Category Proofreading** audits text for spelling, capitalization (NĐ 30), punctuation, and style.
6. **Visual Diff** (`diff.ts`) computes word-level additions (Emerald `#10B981`) and deletions (Rose `#EF4444`).
7. **User Clicks Accept** -> cleanly applied to Tiptap editor canvas.

---

## 5. Unit Testing Plan with Mocked LLM Responses

Three dedicated test suites in `web_app/tests/unit/`:

### 5.1 Test Suite 1: `web_app/tests/unit/ai-drafting.test.ts`
- `should construct prompt incorporating document type, section, and context` (covers E2E F19).
- `should parse generated drafting response into paragraphs` (covers E2E F19).
- `should enforce formal administrative phrasing ('Kính gửi', 'Trân trọng', 'Căn cứ')` (covers E2E F19).
- `should track token consumption metadata from drafting responses` (covers E2E F19).
- `should handle empty prompt input with validation error` (covers E2E F19).
- `should reject prompt injection attempts with security error`.
- `should format legal basis clauses correctly with semicolons and trailing period`.
- `should format decision clauses with Điều 1, Điều 2 structure`.

### 5.2 Test Suite 2: `web_app/tests/unit/ai-proofreading.test.ts`
- `should categorize suggestions into exactly 5 defined categories` (covers E2E F20).
- `should detect spelling mistakes with Vietnamese diacritic errors (kiễm tra -> kiểm tra)` (covers E2E F20).
- `should detect inappropriate administrative style phrasing (chúng tôi -> Đơn vị/Trung tâm)` (covers E2E F20).
- `should detect NĐ 30 capitalization errors (bộ công thương -> Bộ Công Thương)`.
- `should detect punctuation errors (missing colon after Kính gửi, missing semicolon in recipients)`.
- `should calculate replacement range indices (position and endIndex) within source text` (covers E2E F20).
- `should handle clean text without issues returning empty issue list` (covers E2E F20).
- `should extract JSON cleanly from markdown fenced code blocks (```json ... ```)`.

### 5.3 Test Suite 3: `web_app/tests/unit/ai-template-fill.test.ts`
- `should extract recipient (Kính gửi) from unstructured user notes` (covers E2E F21).
- `should extract subject summary (Trích yếu) and prefix with 'V/v'` (covers E2E F21).
- `should extract signer name (Người ký) accurately` (covers E2E F21).
- `should validate extracted fields against canonical schema field list and discard unknown tags` (covers E2E F21).
- `should return confidence score alongside extracted fields` (covers E2E F21).
- `should flag fields with confidence < 0.8 as needsReview`.
- `should populate dual keys (camelCase and UPPER_SNAKE_CASE) for template engine compatibility`.
- `should identify missing required fields when notes omit required information`.
- `should format extracted date values according to NĐ 30 administrative rules`.

---

## 6. Implementation File Layout Recommendation for Worker

When Milestone 5 Worker executes implementation:
- `web_app/src/ai/drafting.ts`: Subsystem 1 implementation.
- `web_app/src/ai/proofreading.ts`: Subsystem 2 implementation.
- `web_app/src/ai/template-fill.ts`: Subsystem 3 implementation.
- `web_app/src/ai/index.ts`: Export all subsystems.
- `web_app/tests/unit/ai-drafting.test.ts`: Unit tests for drafting.
- `web_app/tests/unit/ai-proofreading.test.ts`: Unit tests for proofreading.
- `web_app/tests/unit/ai-template-fill.test.ts`: Unit tests for template fill.
