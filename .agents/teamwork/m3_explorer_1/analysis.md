# M3 Architecture Analysis: Administrative Format Rule Engine Port

## 1. Executive Summary
- Goal: Port TVCI administrative format rule engine from Word Add-in (`src/rules/`) to standalone Next.js web application (`web_app/src/rules/`).
- Status of existing code: 15 out of 16 files in `src/rules/` are 100% pure TypeScript with zero Office.js or browser DOM dependencies.
- Single Office.js dependency: `document-inspection.ts` (calls `../word/formatting.service` and `../word/page-formatting.service`). In web application, this is replaced cleanly by `tiptapDocToSnapshots()` from `web_app/src/editor/tiptap-adapter.ts`.
- Multi-profile support: Enforces standard NĐ 30/2020 (`ND30_TVCI` / `tvci-default`), enterprise internal profiles (`TKV`, `IEMM`), and Party administrative profile (`DANG_05_HD_VPTW_2026`).
- Adapter Contract: Tiptap JSON AST -> `tiptapDocToSnapshots()` -> `ParagraphSnapshot[]` -> `evaluateDocumentRules(snapshots, profileId?)` -> `DocumentEvaluationSummary` -> `issueToPatch()` -> `applyPatchToEditorNode()`.

---

## 2. Pure TypeScript Conformance Audit

### 2.1 File-by-File Dependency Audit Matrix

| File in `src/rules/` | Size (bytes) | Office.js / DOM Deps | Action for `web_app/src/rules/` | Description |
|----------------------|--------------|----------------------|---------------------------------|-------------|
| `models.ts` | 2,957 | ZERO | Port & Enhance | Data models: `ParagraphSnapshot`, `PageSetupSnapshot`, `ValidationIssue`, `DocumentEvaluationSummary`, `FormattingPatch`. Add backwards-compatibility aliases (`fontSizePt`, `spaceBeforePt`, `context`). |
| `profiles.ts` | 3,273 | ZERO (only type import `TemplateOrganization`) | Port & Decouple | Rule profile definitions: `ND30_TVCI`, `TKV`, `IEMM`, `DANG_05_HD_VPTW_2026`. Decouple `TemplateOrganization` type so `rules/` has zero dependencies on `templates/`. |
| `component-rules.ts` | 5,090 | ZERO | Port | Component formatting rules: `ADMIN_RULES`, `IEMM_RULES`, `PARTY_RULES`, `getComponentRule()`, `resolveAddresseeAlignment()`, `getRecipientsItemRule()`. |
| `component-classifier.ts` | 4,933 | ZERO | Port | Vietnamese regex classifier: identifies 12 administrative components (`NATIONAL_EMBLEM`, `MOTTO`, `AGENCY_NAME`, `NUMBER_SYMBOL`, `PLACE_DATE`, `DOCUMENT_TYPE`, `ABSTRACT`, `LEGAL_BASIS`, `ADDRESSEE`, `RECIPIENTS`, `SIGNER_ROLE`, `PARTY_TITLE`). |
| `component-validator.ts` | 3,509 | ZERO | Port | Component paragraph validator: checks font name, font size, bold, italic, underline, alignment against rules. |
| `page-validator.ts` | 1,516 | ZERO | Port | Page setup validator: checks paperSize (A4), orientation (Portrait), and margins (top, bottom, left, right) with tolerance. |
| `addressee-validator.ts` | 3,547 | ZERO | Port | "Kính gửi" block validator: validates colon, punctuation (comma, semicolon, period), Party vs Administrative conventions. |
| `recipients-validator.ts` | 2,589 | ZERO | Port | "Nơi nhận" block validator: validates colon, bullet items (`- ...;`), archive line (`Lưu: ...;` vs `Lưu: VT.`). |
| `legal-basis-validator.ts` | 1,637 | ZERO | Port | "Căn cứ" block validator: checks punctuation across basis lines (semicolons) and terminal punctuation (period for admin, comma for Party). |
| `auto-detect.service.ts` | 6,151 | ZERO | Port | Auto-detects organization (`TVCI`, `IEMM`, `DANG`, `TKV`) and document type (`Quyết định`, `Công văn`, `Tờ trình`, etc.) from document text. |
| `horizontal-rules.ts` | 4,831 | ZERO | Port | Validates horizontal divider line below document title/abstract. Includes geometric calculations and width ratios (1/3 - 1/2 line width). |
| `validator.ts` | 1,668 | ZERO | Port | Generic paragraph validator: validates body paragraph attributes against `ParagraphRules`. |
| `tvci-default.ts` | 459 | ZERO | Port | Default rule set definition for standard TVCI body text. |
| `document-evaluator.ts` | 35,033 | ZERO | Port & Overload | Evaluates 25+ administrative rules across 7 categories. Generate health score `(passed / applicable) * 100`. Add ergonomic signature `evaluateDocumentRules(snapshots, profileId?)`. |
| `fixer.ts` | 1,460 | ZERO | Port | Maps `ValidationIssue` to `FormattingPatch` for atomic safe fixes. |
| `document-inspection.ts` | 2,485 | **Office.js** (`../word/formatting.service`, `../word/page-formatting.service`) | **DO NOT PORT** (Replaced by `tiptap-adapter.ts`) | Only file with Word Add-in Office.js bindings. In `web_app`, document reading is performed by `tiptapDocToSnapshots()`. |
| `index.ts` | NEW | ZERO | Create Barrel | Clean barrel export of all rules models, profiles, evaluators, classifiers, and fixers. |

---

## 3. Multi-Profile Enforcement

### 3.1 Profile Registry
The rule engine supports 4 distinct profiles with both ASCII and UTF-8 aliases:

1. **Standard NĐ 30 Profile (`ND30_TVCI` / `NĐ30_TVCI` / `tvci-default`)**:
   - Baseline: Nghị định 30/2020/NĐ-CP.
   - Page margins: Top 20-25mm (target 20mm), Bottom 20-25mm (target 20mm), Left 30-35mm (target 30mm), Right 15-20mm (target 15mm).
   - Body typography: Times New Roman, size 13-14pt (default 13pt), alignment Justified, first line indent 10-12.7mm (default 10mm), line spacing 1.2-1.5 multiple (default 1.2), space before/after 0-6pt (default 2pt).
   - Header: National Emblem (12-13pt bold centered) + Motto (13-14pt bold centered).
   - Signer: Role (13-14pt bold centered uppercase), Name (13-14pt bold centered).
   - Legal basis ending: Period (`.`).

2. **Enterprise Internal Profile: TKV (`TKV`)**:
   - Baseline: Quy định nội bộ Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam.
   - Page margins: Top 20mm, Bottom 20mm, Left 30mm, Right 15mm.
   - Body typography: Times New Roman, 13pt, Justified.
   - Tailored agency heading hierarchy and symbol formats (`.../TKV-...`).

3. **Enterprise Internal Profile: IEMM (`IEMM`)**:
   - Baseline: Quy chế văn thư Viện Cơ khí Năng lượng và Mỏ - Vinacomin (Phụ lục IV).
   - Page margins: Top 20mm, Bottom 20mm, Left 30mm, Right 15mm.
   - Component typography:
     - `PLACE_DATE`: 13-14pt italic right (default 13pt).
     - `DOCUMENT_TYPE`: 13pt bold centered.
     - `ABSTRACT`: 13pt bold centered.
     - `RECIPIENTS`: 12pt bold + italic left.
     - `SIGNER_ROLE`: 13pt bold centered.

4. **Party Administrative Profile (`DANG_05_HD_VPTW_2026`)**:
   - Baseline: Hướng dẫn số 05-HD/VPTW ngày 27/05/2026 của Văn phòng Trung ương Đảng.
   - Header: National Emblem & Motto replaced by Party Title `ĐẢNG CỘNG SẢN VIỆT NAM` (13pt bold centered).
   - Addressee (`Kính gửi`): Centered alignment, each addressee line ends with semicolon (`;`).
   - Legal basis ending: Ends with comma (`,`) instead of period (`.`).
   - Agency Name: 13pt centered, uppercase (Đảng bộ, Tỉnh ủy, Huyện ủy...).

### 3.2 Auto-Detection Engine
The auto-detection service (`detectDocumentContext`) analyzes the first 20 paragraphs of the document:
- Checks uppercase phrases: `"ĐẢNG CỘNG SẢN VIỆT NAM"`, `"CHI BỘ"`, `"ĐẢNG BỘ"` -> `DANG_05_HD_VPTW_2026`.
- Checks `"TRUNG TÂM THỬ NGHIỆM"`, `"KIỂM ĐỊNH CÔNG NGHIỆP"`, `"/TVCI"` -> `ND30_TVCI`.
- Checks `"VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ"`, `"/CKNLM"` -> `IEMM`.
- Detects document types: `Quyết định`, `Công văn`, `Thông báo`, `Tờ trình`, `Báo cáo`, `Kế hoạch`, `Biên bản`, `Giấy giới thiệu`.
- Returns detected profile ID with confidence score (0.40 - 0.98) and human-readable rationale.

---

## 4. Adapter Interface Contract & Data Flow

### 4.1 Flow Diagram

```
+-------------------------------------------------------------------+
|                        Tiptap ProseMirror Doc                     |
|                           (editor.getJSON())                      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                 tiptapDocToSnapshots(doc: JSONContent)             |
|                  (web_app/src/editor/tiptap-adapter.ts)           |
|                                                                   |
| Extracts: text, fontName, fontSize, bold, italic, alignment,      |
|           indent, spaceBefore, spaceAfter, lineSpacing, context   |
+-------------------------------------------------------------------+
                                  |
                                  v ParagraphSnapshot[]
+-------------------------------------------------------------------+
|     evaluateDocumentRules(snapshots, profileId = 'ND30_TVCI')     |
|                  (web_app/src/rules/document-evaluator.ts)        |
|                                                                   |
| 1. Classifies components via classifyDocumentComponents()         |
| 2. Evaluates 25+ rules across 7 categories:                       |
|    - page (paperSize, orientation, margins)                       |
|    - header (national_emblem, motto, party_title, agency_name)    |
|    - symbol_date (number_symbol, place_date)                      |
|    - title (document_type, abstract, horizontal_rule)             |
|    - recipients (addressee, recipients block & items)             |
|    - body (fontName, fontSize, alignment, indent, spacing)        |
|    - signer (role, name)                                          |
| 3. Computes healthScore = round((passed / applicable) * 100)      |
+-------------------------------------------------------------------+
                                  |
                                  v DocumentEvaluationSummary
+-------------------------------------------------------------------+
|                         UI Presentation                           |
|       - AuditPanel: displays 7 category groups & rule results     |
|       - HealthScoreBadge: displays health score percentage (0-100)|
|       - IssueItem: displays message, actual vs expected           |
+-------------------------------------------------------------------+
                                  |
                  User clicks "Sửa lỗi tự động" (Auto-Fix)
                                  |
                                  v
+-------------------------------------------------------------------+
|                     Auto-Fix Execution Pipeline                   |
| 1. Filter: issues.filter(i => i.autoFixable && i.status === "FAIL")|
| 2. For each issue:                                                |
|    - patch = issueToPatch(issue)                                  |
|    - targetNodeIndex = parseIndex(issue.targetId)                 |
|    - applyPatchToEditorNode(editor, targetNodeIndex, patch)       |
+-------------------------------------------------------------------+
```

### 4.2 Function Signatures & Types

```typescript
// 1. Snapshot generation
export function tiptapDocToSnapshots(doc: JSONContent): ParagraphSnapshot[];

// 2. Evaluator signatures (overloaded for both ergonomics & rich input)
export function evaluateDocumentRules(
  snapshots: ParagraphSnapshot[],
  profileId?: RuleProfileId | string
): DocumentEvaluationSummary;

export function evaluateDocumentRules(
  input: DocumentEvaluationInput
): DocumentEvaluationSummary;

// 3. Auto-fix signatures
export function issueToPatch(issue: ValidationIssue): FormattingPatch;

export function applyPatchToEditorNode(
  editor: Editor,
  nodeIndex: number,
  patch: FormattingPatch
): void;

export function applySafeFixes(
  editor: Editor,
  issues: ValidationIssue[]
): void;
```

### 4.3 Data Model Compatibility
To guarantee seamless interop between `tiptap-adapter.ts`, `document-evaluator.ts`, and `web_app/e2e-tests/`:

```typescript
export interface ParagraphSnapshot {
  id: string;
  index?: number;
  text: string;
  fontName: string;
  fontSize: number;
  fontSizePt?: number;       // alias for fontSize
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment: SupportedAlignment;
  spaceBefore: number;
  spaceBeforePt?: number;     // alias for spaceBefore
  spaceAfter: number;
  spaceAfterPt?: number;      // alias for spaceAfter
  firstLineIndentMm?: number;
  lineSpacingPt?: number;
  lineSpacingRule?: LineSpacingRule;
  lineSpacingMultiple?: number;
  context?: string;          // cellType (e.g., 'header-left', 'header-right')
  componentType?: string;    // classified component tag
}

export interface ValidationIssue {
  id: string;
  ruleId: string;
  targetId: string;
  paragraphIndex?: number;
  category?: RuleCategory;
  componentType?: string;
  message: string;
  severity: IssueSeverity;    // 'pass' | 'warning' | 'error'
  status?: RuleEvaluationStatus; // 'PASS' | 'FAIL' | 'MISSING' | 'NOT_APPLICABLE'
  autoFixable: boolean;
  actual: string | number | boolean;
  expected: string | number | boolean;
  fixValue?: string | number | boolean;
}
```

---

## 5. Porting Plan for Implementation Agent

1. **Step 1: Update `web_app/src/rules/models.ts`**
   - Incorporate all missing types: `ParagraphRules`, `MeasurementRule`, `PageRules`, `DocumentRuleSet`, `RuleCategory`, `RuleEvaluationStatus`, `RuleEvaluationResult`, `DocumentEvaluationSummary`, `DocumentEvaluationInput`.
   - Maintain compatibility aliases for `fontSizePt`, `spaceBeforePt`, `spaceAfterPt`, and `context`.

2. **Step 2: Copy & Adapt Pure Modules into `web_app/src/rules/`**
   - `profiles.ts`: Decouple `TemplateOrganization` from templates; add `ND30_TVCI` alias alongside `NĐ30_TVCI` and `tvci-default`.
   - `component-rules.ts`: Port directly (100% pure TS).
   - `component-classifier.ts`: Port directly (100% pure TS).
   - `component-validator.ts`: Port directly (100% pure TS).
   - `page-validator.ts`: Port directly (100% pure TS).
   - `addressee-validator.ts`: Port directly (100% pure TS).
   - `recipients-validator.ts`: Port directly (100% pure TS).
   - `legal-basis-validator.ts`: Port directly (100% pure TS).
   - `auto-detect.service.ts`: Port directly (100% pure TS).
   - `horizontal-rules.ts`: Port directly (100% pure TS).
   - `validator.ts`: Port directly (100% pure TS).
   - `tvci-default.ts`: Port directly (100% pure TS).
   - `fixer.ts`: Port directly with robust property mapping.

3. **Step 3: Port and Overload `document-evaluator.ts`**
   - Provide dual overload: `(snapshots: ParagraphSnapshot[], profileId?: string)` and `(input: DocumentEvaluationInput)`.
   - Maintain 27 rules across 7 categories.
   - Calculate `healthScore = (passed / applicable) * 100` (excluding `NOT_APPLICABLE`).

4. **Step 4: Create `web_app/src/rules/index.ts`**
   - Export all public types, rules, evaluators, profiles, and fixers.

5. **Step 5: Verify against Vitest & E2E Test Suite**
   - Verify unit tests for rule evaluation, multi-profile switching, and auto-fix transformations.
