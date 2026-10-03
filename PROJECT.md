# Project: TVCI Web Application

## Architecture
Independent, production-grade Next.js 14 web application for TVCI document processing:
- **Presentation Layer**: Next.js 14 App Router, React 18, Tailwind CSS, Plus Jakarta Sans (UI) + Times New Roman (canvas), Lucide React, Indigo `#6366F1` & Emerald `#10B981` palette.
- **Editor Layer**: Tiptap v2 (ProseMirror) rich text editor engine with A4 page preview, Vietnamese administrative node attributes (alignment, line spacing, margins, indentation, 2-column tables).
- **Interop Layer**: High-fidelity DOCX import (`jszip` XML parser with `mammoth` fallback) and export (`docx` npm library producing valid OpenXML 100% compatible with MS Word).
- **Format Engine**: Pure TypeScript port of TVCI NĐ 30/2020 rules (25+ rules, 7 categories, 4 profiles: NĐ30_TVCI, TKV, IEMM, DANG), AST snapshot adapter, health score calculator, atomic auto-fixer.
- **Template System**: 22-template catalog, 8 canonical form schemas, dynamic form fill UI, administrative date formatting, 2-tier insertion (structured nodes + regex fallback).
- **AI Workspace**: Dual-provider AI client (OpenAI `gpt-4o-mini` & Google Gemini `gemini-2.0-flash`), strict `ADMINISTRATIVE_AI_RULES`, 3 subsystems (Drafting, Template Fill, Proofreading), and preview-first word-level visual diff (`diff` library).
- **Quality & Verification**: Vitest test runner, Next.js production build (`npm run build`, `npm test`), opaque-box E2E test suite (Tiers 1-4) + adversarial coverage hardening (Tier 5).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Web App Scaffold & Design System | Next.js 14 App Router, Tailwind CSS, Plus Jakarta Sans, Lucide icons, Indigo/Emerald palette, collapsible side panels | M1 | survey_3 |
| 2 | A4 Document Canvas & Formatting Toolbar | Rich text editor canvas with A4 proportions, page margins, typography toolbar (bold, italic, font size, align, line spacing) | M1 | survey_3 |
| 3 | 2-Column Administrative Table Nodes | Editor support for header table (Agency + Motto) and footer table (Recipients + Signer) with invisible borders | M1 | survey_1, survey_2 |
| 4 | Base Build & Testing Infra | Vitest & Next.js build configuration, 100% passing baseline tests | M1 | survey_3 |
| 5 | High-Fidelity DOCX Import Engine | Dual-tier DOCX import (`jszip` XML parser + `mammoth` fallback) extracting paragraphs, runs, styles, tables into editor AST | M2 | survey_3 |
| 6 | High-Fidelity DOCX Export Engine | OpenXML serialization via `docx` library matching NĐ 30 page margins, typography, and tables; 100% MS Word compatible | M2 | survey_3 |
| 7 | Roundtrip File Interop & Verification | Import existing sample DOCX files, edit in web canvas, export and verify valid DOCX structure | M2 | ORIGINAL_REQUEST |
| 8 | Pure TypeScript Rule Engine Port | 25+ administrative rules across 7 categories (`page`, `header`, `symbol_date`, `title`, `recipients`, `body`, `signer`) | M3 | survey_1, survey_2 |
| 9 | Multi-Profile Configuration | Support for NĐ30_TVCI, TKV, IEMM, and DANG_05_HD_VPTW_2026 profiles | M3 | survey_1, survey_2 |
| 10 | Editor AST Snapshot Adapter | Transform editor document state into `ParagraphSnapshot[]` and `PageSetupSnapshot` for rule evaluation | M3 | survey_1, survey_3 |
| 11 | Real-time Audit & Health Score | Evaluator reporting `ValidationIssue[]` and `healthScore = (passed / applicable) * 100` | M3 | survey_1 |
| 12 | One-Click Safe Auto-Fix Engine | Transform fixable issues into atomic editor transactions for font, size, line spacing, margins, and alignments | M3 | survey_1 |
| 13 | Template Catalog (22 templates) | Port and organize TVCI, IEMM, TKV, and Party document templates | M4 | survey_1, survey_2 |
| 14 | 8 Canonical Form Schemas | Form models for Công văn, Quyết định, Thông báo, Tờ trình, Báo cáo, Biên bản, Thư mời, Đơn nghỉ phép | M4 | survey_1, survey_2 |
| 15 | Dynamic Form Fill UI & Date Formatter | Interactive field form with administrative date formatting (`formatAdministrativeDate`) and validation | M4 | survey_1, survey_2 |
| 16 | 2-Tier Template Insertion Engine | Direct AST document generation from schema + regex placeholder fallback replacement | M4 | survey_1, survey_2 |
| 17 | Multi-Provider AI Client | OpenAI (`gpt-4o-mini`) and Google Gemini (`gemini-2.0-flash`) with timeout, retry, sanitization | M5 | survey_1, survey_3 |
| 18 | Strict Administrative AI Prompts | Enforcement of `ADMINISTRATIVE_AI_RULES` (no hallucinations, no markdown, no emoji, concise) | M5 | survey_1 |
| 19 | Contextual Drafting Subsystem | AI generation of administrative sections based on prompt, document type, and context | M5 | survey_1 |
| 20 | 5-Category Proofreading Subsystem | Detection and suggestion for spelling, grammar, capitalization, punctuation, and administrative style | M5 | survey_1 |
| 21 | AI Template Fill Assistant | Intelligent field suggestion and extraction from user notes into template schema | M5 | survey_1 |
| 22 | Visual Diff Preview Workflow | Word-level diff (`diffWordsWithSpace`) showing Emerald additions & Rose deletions with Accept/Reject controls | M5 | survey_1, survey_3 |
| 23 | E2E Opaque-Box Test Suite (Tiers 1-4) | Comprehensive test suite covering features, boundaries, pairwise combinations, and real-world administrative documents | M6 | ORIGINAL_REQUEST |
| 24 | Adversarial Coverage Hardening (Tier 5) | White-box stress-testing, edge case hardening, and final verification | M6 | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | `core-platform-editor` | Next.js setup, Tailwind UI/UX system, Tiptap A4 editor with administrative layout & 2-column tables, test runner setup | none | DONE |
| M2 | `docx-interop-engine` | High-fidelity DOCX import (`jszip` + `mammoth`) & export (`docx`), roundtrip verification on sample files | M1 | DONE |
| M3 | `administrative-format-engine` | Port pure TS NĐ30 rules, multi-profile, AST snapshot adapter, health score audit UI, one-click auto-fixer | M1 | DONE |
| M4 | `template-library-fill` | 22-template catalog, 8 form schemas, dynamic form fill UI, date formatter, 2-tier insertion | M1, M2 | DONE |
| M5 | `ai-workspace-diff` | OpenAI + Gemini client, 3 AI modes (Drafting, Template Fill, Proofreading), preview-first visual diff UI | M1 | DONE |
| M6 | `final-e2e-verification-hardening` | Dual track convergence: 100% E2E test suite pass (Tiers 1-4), adversarial hardening (Tier 5), build & verification | M1, M2, M3, M4, M5 | DONE |
| M7 | `auth-security-privacy-drive` | SQLite auth & RBAC, user privacy-first data handling, optional Google Drive (`drive.file`), Vietnamese offline spellchecker | M1-M6 | DONE |
| M8 | `ui-ux-promax-docker-deployment` | Redesign trang Login theo UI/UX Pro Max (Soft UI / Enterprise modern), xóa phụ đề dưới Đăng nhập, Docker container hóa | M7 | DONE |

## Interface Contracts

### M1 Editor ↔ M2 DOCX Interop
- `editorToDocxModel(doc: TiptapJSON): DocxDocumentDefinition`
- `docxModelToEditor(buffer: ArrayBuffer): Promise<TiptapJSON>`
- OpenXML paragraph styles map to Tiptap node attributes (`align`, `lineSpacing`, `spaceBefore`, `spaceAfter`, `indent`).

### M1 Editor ↔ M3 Format Engine
- `extractDocumentSnapshot(doc: TiptapJSON, pageSetup: PageSetupSnapshot): DocumentEvaluationInput`
- `evaluateDocumentRules(input: DocumentEvaluationInput): DocumentEvaluationSummary`
- `applyFormattingPatch(editor: EditorInstance, patch: FormattingPatch): void`
- `applySafeFixes(editor: EditorInstance, issues: ValidationIssue[]): void`

### M1 Editor ↔ M4 Template System
- `renderTemplateToEditor(templateId: string, values: Record<string, any>): TiptapJSON`
- `applyTemplateFieldsToEditor(editor: EditorInstance, values: Record<string, any>): void`

### M1 Editor ↔ M5 AI Workspace
- `generateAiDiff(originalText: string, suggestedText: string): DiffWordSpan[]`
- `applyAiDiffToSelection(editor: EditorInstance, acceptedText: string): void`

## Code Layout
Directory: `e:\CODING\TVCI_word_addins\web_app`
```
web_app/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vitest.config.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       ├── ai/
│       │   ├── draft/route.ts
│       │   ├── proofread/route.ts
│       │   └── template-fill/route.ts
│       └── export-docx/route.ts
├── src/
│   ├── components/
│   │   ├── layout/ (Header, Sidebar, Navigation)
│   │   ├── editor/ (A4Canvas, Toolbar, TwoColumnHeader, TwoColumnFooter)
│   │   ├── audit/ (AuditPanel, HealthScoreBadge, IssueItem, AutoFixButton)
│   │   ├── templates/ (TemplateCatalogModal, TemplateFormFill, FieldInputs)
│   │   └── ai/ (AiWorkspacePanel, DiffPreviewModal, PromptBar)
│   ├── editor/
│   │   ├── schema.ts
│   │   ├── extensions.ts
│   │   └── tiptap-adapter.ts
│   ├── docx/
│   │   ├── importer.ts (jszip + mammoth fallback)
│   │   ├── exporter.ts (docx OpenXML generator)
│   │   └── types.ts
│   ├── rules/
│   │   ├── models.ts (ParagraphSnapshot, ValidationIssue, DocumentRuleSet)
│   │   ├── profiles.ts (ND30_TVCI, TKV, IEMM, DANG)
│   │   ├── component-rules.ts (font sizes, alignments, margins)
│   │   ├── component-classifier.ts (Vietnamese regex classification)
│   │   ├── document-evaluator.ts (25+ rules audit)
│   │   └── fixer.ts (issueToPatch, safe auto-fix)
│   ├── templates/
│   │   ├── catalog.ts (22 templates definition)
│   │   ├── form-schema.ts (8 document types)
│   │   ├── form-validation.ts (date & field checks)
│   │   └── engine.ts (injection & fallback)
│   ├── ai/
│   │   ├── direct-client.ts (OpenAI & Gemini API wrapper)
│   │   ├── administrative-rules.ts (Prompt guards)
│   │   ├── drafting.ts
│   │   ├── proofreading.ts
│   │   └── diff.ts (diffWords visual preview)
│   └── utils/
│       └── tvci-formatter.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── e2e-tests/
    ├── runner.ts
    ├── tier1-feature/
    ├── tier2-boundary/
    ├── tier3-pairwise/
    └── tier4-workloads/
```
