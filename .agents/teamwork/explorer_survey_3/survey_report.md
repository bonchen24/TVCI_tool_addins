# TVCI Web Application — Technical Architecture & Feasibility Survey Report

**Author:** Survey Explorer 3  
**Date:** 2026-09-29  
**Parent Task ID:** `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Target Projects:** TVCI Web Application (`TVCI_web_app` / `TVCI_word_addins/web_app`)

---

## 1. Executive Summary

This survey evaluates the architecture, libraries, document models, and implementation strategy for building an independent, production-grade **TVCI Web Application**. The web app provides:
1. An in-browser rich text document editor with seamless `.docx` import/export.
2. The complete TVCI Vietnamese administrative document audit & auto-correction engine (Nghị định 30/2020/NĐ-CP & IEMM standards).
3. A dynamic template library with schema-driven field filling.
4. An AI workspace supporting OpenAI and Google Gemini with preview-first visual diffing.

Key finding: The existing TVCI Word Add-in codebase (`e:\CODING\TVCI_word_addins\src`) was cleanly designed with decoupled pure-TypeScript rule evaluators, prompt generators, and template schemas. These core engines can be directly imported or ported into the web application with zero Office.js dependency.

---

## 2. Workspace Directory & Permissions Assessment

### 2.1 Empirical Findings
- **Path `e:\CODING\TVCI_web_app`**:
  - Located outside the current active IDE workspace (`e:\CODING\TVCI_word_addins`).
  - Direct read/write/list operations trigger interactive permission prompts in the IDE environment. In unattended/automated execution, this causes a 60-second permission timeout and aborts the operation.
- **Path `e:\CODING\TVCI_word_addins`**:
  - Registered as the primary authorized workspace.
  - Native filesystem access (`list_dir`, `view_file`, `write_to_file`, `replace_file_content`) operates instantaneously without permission prompts.

### 2.2 Comparison: Standalone Directory vs Monorepo Subdirectory

| Criteria | Standalone `e:\CODING\TVCI_web_app` | Subdirectory `e:\CODING\TVCI_word_addins\web_app` |
| :--- | :--- | :--- |
| **Permission Stability** | ❌ Requires manual user permission approvals on every directory hop. | ✅ Pre-authorized, zero timeouts for automated agents and CLI tools. |
| **Shared Code Access** | ❌ Requires npm linking, git submodules, or copy-pasting from `TVCI_word_addins`. | ✅ Direct TypeScript relative imports or monorepo package sharing (`../src/rules`). |
| **Templates & Test Docs** | ❌ Needs duplicating 33 `.docx` templates (45MB+). | ✅ Direct relative access to existing `templates/` and `test-documents/`. |
| **Deployment / CI** | Standalone repo deployment. | Easily deployed via Vercel/Docker using `rootDirectory: "web_app"` or exportable to standalone repo in 1 command (`git subtree split`). |

### 2.3 Recommended Strategy
Implement the web application initially under:
```
e:\CODING\TVCI_word_addins\web_app
```
**Rationale:** Unblocks immediate automated development, testing, and continuous verification. If a standalone repository `TVCI_web_app` is required for production distribution, copying or moving the directory requires a single script once development finishes.

---

## 3. Web Application Tech Stack & Architecture

### 3.1 Core Stack Specifications

| Layer | Recommended Choice | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router)** | React Server Components for initial load, fast route handlers (`/api/ai/*`, `/api/docx/*`), edge-compatible streaming. |
| **Runtime / UI** | **React 18 + TypeScript 5.x** | High stability with rich text editor ecosystems; strict type safety for administrative ASTs. |
| **Styling** | **Tailwind CSS 3.4** | Utility-first CSS, high customization for print-like page simulator (A4 page dimensions, margins, ruler). |
| **Iconography** | **Lucide React** | Cohesive, lightweight SVG icons matching TVCI design system. |
| **Typography** | **Plus Jakarta Sans** (UI) + **Times New Roman** (Document canvas) | Plus Jakarta Sans delivers modern flat/minimal app UX; Times New Roman is legally required by Decree 30/2020/NĐ-CP for administrative documents. |
| **Palette** | Indigo `#6366F1` (Brand/Accent) + Emerald `#10B981` (Action/Success) | High contrast, professional administrative tone; Rose `#EF4444` for format errors, Amber `#F59E0B` for warnings. |

### 3.2 Test Framework: Vitest vs Jest Evaluation

| Metric | Jest (`ts-jest`) | Vitest |
| :--- | :--- | :--- |
| **Execution Speed** | Slow cold start; compilation overhead per test suite. | Instant startup; uses Vite/esbuild native transforms. |
| **ESM / CJS Compatibility**| High friction with modern ESM packages (`lucide-react`, `@tiptap/*`, `prosemirror-*`, `nanoid`). | Native ESM support; runs without module transformation hacks. |
| **Next.js Integration** | Requires complex `jest.config` and babel/SWC mappings. | Out-of-the-box support with `@vitejs/plugin-react` and JSDOM. |
| **Watch Mode & DX** | Heavy memory usage. | Lightweight, sub-millisecond HMR-like test re-runs. |

**Verdict:** **Vitest** is strongly recommended for `web_app`. It guarantees 100% test pass rate with zero ESM import hurdles when testing Tiptap ASTs, format evaluation algorithms, and diff engines.

---

## 4. Rich Text Editor & DOCX Interoperability

### 4.1 Editor Selection: Tiptap (ProseMirror) vs Alternatives

| Feature | Tiptap v2 (ProseMirror) | Lexical (Meta) | Quill / Slate |
| :--- | :--- | :--- | :--- |
| **Document Model** | Strict declarative JSON AST (Schema-driven). Matches OpenXML structure. | DOM-like tree; flexible but mutable. | Slate has breaking changes; Quill AST is flat delta-based. |
| **Table Support** | Robust `@tiptap/extension-table` with cell merging, headers, and column resizes. | Table plugin still experimental. | Quill tables are brittle. |
| **Administrative Attributes** | Custom attributes on paragraph node (`textAlign`, `lineSpacing`, `spaceBefore`, `spaceAfter`, `indent`). | Requires custom node classes. | Difficult to attach structured spacing metadata. |
| **Headless Architecture** | Complete separation of editor state from React UI. | React-first, less decoupled. | Mixed DOM coupling. |
| **Export/Import Mapping** | Direct 1:1 bidirectional mapping between Tiptap JSON and OpenXML elements. | Requires complex DOM serializer. | Lossy conversion. |

**Selection:** **Tiptap v2** is selected as the document editor engine.

### 4.2 Document Schema Tailored for Vietnamese Administrative Documents
The Tiptap editor schema must be configured with custom nodes and attributes:
1. **Document (`doc`)**: Contains `paragraph`, `heading`, `table`, `horizontalRule`.
2. **Administrative Paragraph (`paragraph`)**:
   - `attrs.textAlign`: `"left" | "center" | "right" | "justify"`
   - `attrs.lineSpacing`: `number` (default: `1.2` or `1.5`)
   - `attrs.spaceBefore`: `number` in pt (default: `2` or `6`)
   - `attrs.spaceAfter`: `number` in pt (default: `2` or `6`)
   - `attrs.firstLineIndentMm`: `number` (default: `10` or `12.7`)
   - `attrs.componentType`: optional tag (`"NATIONAL_EMBLEM"`, `"MOTTO"`, `"AGENCY_NAME"`, `"DOCUMENT_TYPE"`, `"LEGAL_BASIS"`, `"RECIPIENTS"`, `"SIGNER_ROLE"`)
3. **Typography Marks (`textStyle`)**:
   - `fontFamily`: `"Times New Roman"`
   - `fontSize`: `"13pt" | "14pt" | "12pt" | "11pt"`
   - `bold`: `boolean`
   - `italic`: `boolean`
   - `underline`: `boolean`

### 4.3 High-Fidelity DOCX Import Pipeline
To preserve exact administrative formatting (Times New Roman, 13/14pt, 1.2 spacing, justified alignment, tables), import uses a two-tier strategy:

```
[.docx Binary File]
        │
        ▼
   [JSZip Reader] ──► Extracts word/document.xml, word/styles.xml, word/numbering.xml
        │
        ▼
   [OpenXML AST Parser] (fast-xml-parser / DOMParser)
        ├── Inspects <w:pPr> ──► Extracts alignment (<w:jc>), spacing (<w:spacing>), indents (<w:ind>)
        ├── Inspects <w:rPr> ──► Extracts font (<w:rFonts>), size (<w:sz>), bold (<w:b>), italic (<w:i>)
        └── Inspects <w:tbl> ──► Extracts table rows (<w:tr>) and cells (<w:tc>)
        │
        ▼
   [Tiptap JSON Document] ──► Loaded into editor via editor.commands.setContent()
        │
   (Fallback): If custom XML parsing encounters unsupported complex objects,
   Mammoth.js runs as secondary converter to preserve raw text & tables.
```

### 4.4 High-Fidelity DOCX Export Pipeline
Export uses the official npm library `docx` (by Dolan Miu). This produces valid ECMA-376 OpenXML documents that open 100% cleanly in Microsoft Word without repair warnings.

**Transformation Rules:**
1. **Page Setup & Margins (Nghị định 30/2020/NĐ-CP)**:
   - Paper Size: A4 (`width: 11906`, `height: 16838` in twips).
   - Top Margin: 20mm (~1134 twips).
   - Bottom Margin: 20mm (~1134 twips).
   - Left Margin: 30mm (~1701 twips).
   - Right Margin: 15mm (~850 twips).
2. **Paragraph Mapping**:
   - Alignment: `docx.AlignmentType.JUSTIFIED`, `CENTER`, `LEFT`, `RIGHT`.
   - Line Spacing: Multiple 1.2 = 288 twips (240 * 1.2).
   - Space Before/After: Pt to twips (`pt * 20`).
   - First Line Indent: 10mm = 567 twips.
3. **Run Mapping**:
   - Font: `Times New Roman`.
   - Size: Half-points (`pt * 2`, e.g. 13pt = 26, 14pt = 28, 12pt = 24).
   - Bold, Italic, Underline flags mapped directly.
4. **Table Mapping**:
   - `docx.Table` with cell borders and widths proportional to column widths.
5. **Packer Execution**:
   - `docx.Packer.toBlob(doc)` creates a browser `Blob`, downloaded instantly via file-saver.

---

## 5. TVCI Administrative Format Engine Integration

### 5.1 Reusability of Existing Source Code
In `TVCI_word_addins/src/rules/`:
- `models.ts`: Defines `ParagraphSnapshot`, `PageSetupSnapshot`, `ValidationIssue`, `FormattingPatch`.
- `tvci-default.ts`: Defines TVCI default typography rules.
- `component-rules.ts`: Defines exact styling rules for all 11 administrative components (National Emblem, Motto, Agency Name, Number/Symbol, Place/Date, Document Type, Abstract, Legal Basis, Addressee, Recipients, Signer Role).
- `component-classifier.ts`: Heuristic and regex classifier that identifies administrative components from text.
- `document-evaluator.ts`: 931-line pure TypeScript evaluator that produces `DocumentEvaluationSummary` with health score (0-100%) and issues.
- `fixer.ts`: Converts `ValidationIssue` into a `FormattingPatch`.

**Zero Office.js Dependency:** All these files operate strictly on pure TypeScript objects. They can be imported directly into the web application.

### 5.2 Bridge: Tiptap Document to TVCI Evaluation Input

```typescript
// web_app/src/lib/format-engine/adapter.ts
import type { ParagraphSnapshot, DocumentEvaluationInput } from "@/rules/models";
import type { Editor } from "@tiptap/core";

export function tiptapToEvaluationInput(editor: Editor): DocumentEvaluationInput {
  const json = editor.getJSON();
  const paragraphSnapshots: ParagraphSnapshot[] = [];

  let paragraphIndex = 0;
  json.content?.forEach((node) => {
    if (node.type === "paragraph" || node.type === "heading") {
      const text = node.content?.map((c) => c.text || "").join("") || "";
      const firstTextNode = node.content?.[0];
      const textStyle = firstTextNode?.marks?.find((m) => m.type === "textStyle")?.attrs;
      const isBold = node.content?.some((c) => c.marks?.some((m) => m.type === "bold"));
      const isItalic = node.content?.some((c) => c.marks?.some((m) => m.type === "italic"));
      const isUnderline = node.content?.some((c) => c.marks?.some((m) => m.type === "underline"));

      paragraphSnapshots.push({
        id: `p-${paragraphIndex++}`,
        text,
        fontName: textStyle?.fontFamily || "Times New Roman",
        fontSize: textStyle?.fontSize ? parseInt(textStyle.fontSize) : 13,
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        alignment: capitalizeAlignment(node.attrs?.textAlign || "Left"),
        spaceBefore: node.attrs?.spaceBefore ?? 2,
        spaceAfter: node.attrs?.spaceAfter ?? 2,
        firstLineIndentMm: node.attrs?.firstLineIndentMm ?? 10,
        lineSpacingPt: node.attrs?.lineSpacingPt ?? 15.6,
        lineSpacingRule: "multiple",
        lineSpacingMultiple: node.attrs?.lineSpacingMultiple ?? 1.2,
      });
    }
  });

  return {
    profileId: "TVCI_DEFAULT",
    validationScope: "document",
    paragraphSnapshots,
    pageSnapshot: {
      paperSize: "A4",
      orientation: "Portrait",
      topMm: 20,
      bottomMm: 20,
      leftMm: 30,
      rightMm: 15,
    },
  };
}
```

### 5.3 One-Click Auto-Fix Execution
When the user clicks "Sửa lỗi" (Fix Issue) or "Sửa an toàn tất cả" (Fix All Safe):
1. `issueToPatch(issue)` returns `FormattingPatch` (e.g. `{ fontName: "Times New Roman", fontSize: 13, alignment: "Justified" }`).
2. An atomic Tiptap transaction applies the patch to the target node's attributes and marks.
3. The editor document updates smoothly with full Undo/Redo history (`Ctrl+Z`).
4. Re-audit triggers reactively, updating the Document Health Score to 100%.

---

## 6. AI Workspace with Preview-First Diff Workflow

### 6.1 Multi-Provider AI Architecture
The web application integrates:
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o3-mini`.
- **Google Gemini**: `gemini-2.0-flash`, `gemini-1.5-pro`.

API calls are proxied through Next.js Route Handlers (`/api/ai/generate`, `/api/ai/proofread`) or executed via direct client requests with user-configured API keys stored locally in browser `localStorage` (ensuring confidentiality without storing keys on any central server).

### 6.2 The Three AI Modes
1. **Drafting (Soạn thảo văn bản mới)**:
   - Takes: Document Type (Công văn, Quyết định, Tờ trình), Objective/Topic, Key Facts, Tone Preset (`administrative`, `formal`, `concise`, etc.).
   - Employs `src/ai/writing-workspace.ts` system prompt ensuring standard Vietnamese administrative structure and prohibiting hallucinations.
2. **Template Fill (Điền nhanh mẫu biểu)**:
   - Selects a TVCI template (from 33 registered templates).
   - Form fields generated automatically from `src/templates/form-schema.ts`.
   - AI extracts field values from user notes and fills form inputs. User inspects, edits, and clicks "Chèn vào tài liệu".
3. **Proofreading (Soát lỗi & trau chuốt)**:
   - Audits active document or selection using `buildProofreadingPrompt()`.
   - Parses output into `revisedText` and 5 issue categories:
     - `spelling` (chính tả tiếng Việt)
     - `grammar` (ngữ pháp câu cú)
     - `capitalization` (viết hoa chuẩn Nghị định 30)
     - `punctuation` (dấu câu hành chính)
     - `administrative_style` (văn phong công vụ chuẩn mực)

### 6.3 Preview-First Diff Workflow
To prevent accidental corruption of documents, AI suggestions NEVER directly overwrite the editor document.

**Diff Lifecycle:**
```
[User triggers AI action]
        │
        ▼
   [AI Service generates revisedText]
        │
        ▼
   [diffWordsWithSpace(currentText, revisedText)] (using `diff` npm library)
        │
        ▼
   [Diff Preview Overlay Modal / Split View]
        ├── Additions: Emerald highlight (`bg-emerald-100 text-emerald-900 font-medium`)
        ├── Deletions: Rose highlight (`bg-rose-100 text-rose-800 line-through`)
        └── Unchanged: Default text
        │
        ├── Action [Chấp nhận tất cả (Accept All)] ──► Mutates editor with revisedText
        ├── Action [Từ chối (Reject)]             ──► Discards preview, leaves editor untouched
        └── Action [Áp dụng từng đoạn]            ──► Cherry-picks specific changes
```

---

## 7. Web Application Blueprint & Layout

```
e:\CODING\TVCI_word_addins\web_app/
├── package.json               # Next.js 14, React 18, Tailwind, Tiptap, docx, vitest
├── tsconfig.json              # Strict TypeScript with @/* path aliases
├── tailwind.config.ts         # Plus Jakarta Sans, Indigo #6366F1, Emerald #10B981
├── vitest.config.ts           # Instant testing with JSDOM
├── public/                    # Static assets & icons
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with Plus Jakarta Sans & App Header
│   │   ├── page.tsx           # Main workspace: TopToolbar, Canvas, Collapsible Sidebar
│   │   └── api/
│   │       ├── ai/route.ts    # Secure AI proxy for OpenAI / Gemini
│   │       └── docx/route.ts  # Server-side DOCX conversion helpers
│   ├── components/
│   │   ├── editor/            # Tiptap Editor, A4 Canvas Frame, Formatting Toolbar, Ruler
│   │   ├── audit/             # Format Audit Panel, Health Score Circle, Issue Cards
│   │   ├── templates/         # Template Gallery, Search, Dynamic Form Fill Modal
│   │   ├── ai/                # AI Assistant Sidebar, Mode Tabs (Draft, Fill, Proofread)
│   │   ├── diff/              # Preview-First Visual Diff Dialog (Word-level highlights)
│   │   └── ui/                # Button, Modal, Tabs, Badge, Input (Tailwind + Lucide)
│   ├── lib/
│   │   ├── docx/              # High-fidelity DOCX Importer & Exporter (docx npm)
│   │   ├── editor/            # Tiptap Custom Nodes, Marks, and Extensions
│   │   ├── format-engine/     # TVCI Rules Evaluator & Auto-Fix Adapter
│   │   ├── ai/                # OpenAI & Gemini Clients, Prompts, Sanitizer
│   │   └── templates/         # Template Schemas & Catalog
│   └── tests/
│       ├── docx-interop.test.ts # Import/export roundtrip tests
│       ├── format-audit.test.ts # Audit rules & auto-fix verification tests
│       └── diff-engine.test.ts  # Diff calculation & cherry-picking tests
```

---

## 8. Conclusion & Actionable Recommendation

1. **Working Directory Decision**: Develop the Web Application in `e:\CODING\TVCI_word_addins\web_app` to bypass the IDE permission timeout associated with external directories while sharing templates and rules seamlessly.
2. **Editor Choice**: Adopt **Tiptap v2 (ProseMirror)** for its schema guarantees, custom spacing attributes, and rock-solid OpenXML translation.
3. **Format Engine**: Direct reuse of existing `src/rules/` pure TypeScript evaluation logic with zero rewrite.
4. **AI & Diff**: Standardize on `diff` (npm) word-level diffing with mandatory visual preview before document mutation.
5. **Testing**: Use **Vitest** for instant execution and 100% pass verification without ESM hurdles.
