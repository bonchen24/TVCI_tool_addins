# TVCI Word Add-in + AI Assistant — Design Specification

Date: 2026-09-15
Status: Design approved in principle; pending written-spec review before implementation

## 1. Goal

Build a Microsoft Word add-in named **TVCI Word Tools** that helps TVCI staff:

1. Check and normalize Word documents against configurable document-format rules.
2. Browse and insert approved `.docx` templates.
3. Populate templates through Word Content Controls.
4. Use an AI writing assistant for drafting, rewriting, checking, summarizing, and document-aware assistance.
5. Later connect directly to TVCI_APP to retrieve case/customer/product/standard data and fill documents automatically.

The add-in must be developed incrementally and tested inside real Microsoft Word after each capability is added.

## 2. Scope

### MVP scope

The first usable MVP will provide:

- Ribbon entry: `TVCI Tools`.
- Task pane UI.
- Read current selection.
- Inspect and modify basic formatting of selection/document.
- Validate font, font size, paragraph alignment and paragraph spacing.
- Report validation issues and allow selected fixes.
- Highlight or navigate to detected issues where Word API permits safely.
- Insert one `.docx` template.
- Read/write named Content Controls.
- AI rewrite of current selection through a backend AI gateway.
- Explicit user approval before AI-generated text is inserted or replaces document content.

### Deferred from MVP

- Complete NĐ30/TKV/IEMM rule catalogs.
- Full TVCI_APP integration.
- Digital signature workflows.
- Advanced document comparison.
- Automatic document publication/issuance.
- Autonomous AI editing.
- Full enterprise deployment/admin console.

## 3. Architecture

### 3.1 Client

Use a Microsoft Office Word Add-in based on Office.js and TypeScript.

Primary layers:

- `commands`: Ribbon command entry points.
- `taskpane`: React-based user interface.
- `word`: Word-document operations.
- `rules`: document validation and fix engine.
- `templates`: template catalog and insertion.
- `content-controls`: field discovery and binding.
- `ai`: AI request/context orchestration.
- `tvci`: future TVCI_APP API integration.

The Word-specific API layer must remain isolated from UI components so rule evaluation and application logic can be unit-tested independently where possible.

### 3.2 Backend

AI calls must not be made directly from the add-in with embedded API credentials.

Flow:

`Word Add-in -> TVCI AI Gateway -> OpenAI/Gemini`

The gateway will eventually handle:

- authentication;
- API secrets;
- prompt templates;
- provider/model routing;
- quotas/rate limits;
- audit logging;
- future policy controls for sensitive data.

For the first local MVP, the gateway may be a minimal local Node/Express service with environment variables for provider credentials.

### 3.3 TVCI_APP integration

Deferred until the core Word workflow is stable.

Future flow:

`Word Add-in -> TVCI_APP API -> case data -> Content Control mapping -> Word document`

The Word add-in should depend on a narrow TVCI client interface so the TVCI_APP backend can evolve independently.

## 4. Task Pane UX

The MVP task pane has three primary sections.

### 4.1 Standardize

Controls:

- Rule set selector.
- Scope selector: current selection / whole document.
- `Check` button.
- Validation result list.
- `Fix selected` action.

Results must distinguish:

- pass;
- warning;
- error;
- auto-fixable;
- manual-review-only.

A `Fix all` action must not be the default workflow because blanket formatting can damage tables, signatures, headers/footers, and deliberately formatted regions.

### 4.2 Templates

Controls:

- department/category filters;
- template list;
- insert/open action.

Templates remain `.docx` artifacts. The add-in must not recreate approved document layouts from HTML.

### 4.3 AI Assistant

Initial actions:

- Rewrite selection.
- Shorten selection.
- Expand selection.
- Formal/administrative tone.
- Check selected text.

The UI shows generated output before any Word mutation.

Available actions:

- replace selection;
- insert below;
- copy;
- cancel.

AI never edits document content autonomously.

## 5. Rule Engine

Formatting rules must be configuration-driven rather than scattered constants.

Initial model:

```ts
interface DocumentRuleSet {
  id: string;
  name: string;
  page?: PageRules;
  body?: ParagraphRules;
  headings?: HeadingRule[];
  tables?: TableRules;
}
```

Example rule configuration:

```json
{
  "id": "TVCI_DEFAULT",
  "name": "TVCI Default",
  "body": {
    "fontName": "Times New Roman",
    "fontSize": 13,
    "alignment": "Justified"
  }
}
```

Rule sets planned later:

- TVCI default;
- NĐ30;
- TKV;
- IEMM.

The engine separates:

1. document inspection;
2. rule evaluation;
3. validation result generation;
4. fix application.

A validation result must include enough metadata to identify the rule, document target, human-readable message, severity, and whether it is safely auto-fixable.

## 6. Word Content Controls

Approved templates should use named/tagged Word Content Controls instead of plain text placeholders when practical.

Example tags:

- `SO_VAN_BAN`
- `SO_HO_SO`
- `TEN_KHACH_HANG`
- `DIA_CHI`
- `SAN_PHAM`
- `MODEL`
- `TIEU_CHUAN`
- `NGAY_BAN_HANH`
- `NGUOI_KY`

The add-in must expose a service with operations such as:

- list tagged Content Controls;
- find control by tag;
- set text;
- set rich content where needed;
- report required controls that are missing.

## 7. AI Context Model

Three future context levels are anticipated:

1. Selection.
2. Current section.
3. Whole document.

MVP uses **Selection only** to minimize complexity, token usage, and accidental data exposure.

Each AI request includes:

- requested action;
- selected text;
- optional rule/document style context;
- optional instruction from the user.

AI output must remain a proposal until the user explicitly applies it.

## 8. Error Handling

The add-in must handle at least:

- Word API unsupported operation;
- empty selection where selection is required;
- protected/read-only content;
- missing Content Control;
- template load/insert failure;
- backend unavailable;
- AI timeout/provider error;
- malformed AI response.

Errors should be surfaced in the task pane with a clear action or recovery path. Raw stack traces must not be shown to normal users.

## 9. Testing Strategy

### 9.1 Unit tests

Unit test pure logic for:

- rule evaluation;
- issue grouping;
- configuration parsing;
- Content Control field mapping;
- AI request building.

### 9.2 Word integration tests

Use a curated set of real `.docx` fixtures:

- `01-normal.docx`
- `02-wrong-font.docx`
- `03-wrong-margin.docx`
- `04-wrong-paragraph.docx`
- `05-tables.docx`
- `06-header-footer.docx`
- `07-template-content-control.docx`
- `08-long-document.docx`

Real Microsoft Word is the acceptance environment because layout/OOXML/Office.js behavior cannot be fully validated through unit tests alone.

### 9.3 Incremental acceptance gates

Implementation is accepted in small vertical slices:

1. Add-in sideloads in Word.
2. Selection can be read.
3. Selection formatting can be changed.
4. Validation detects known formatting errors.
5. A selected error can be fixed safely.
6. Template insertion works.
7. Content Controls can be filled.
8. AI can rewrite selection and only applies content after explicit user action.

## 10. Project Structure

```text
tvci-word-addin/
├── manifest/
├── src/
│   ├── commands/
│   ├── taskpane/
│   ├── components/
│   ├── word/
│   │   ├── document.service.ts
│   │   ├── selection.service.ts
│   │   ├── formatting.service.ts
│   │   ├── content-control.service.ts
│   │   └── template.service.ts
│   ├── rules/
│   │   ├── models.ts
│   │   ├── rule-engine.ts
│   │   ├── validator.ts
│   │   └── fixer.ts
│   ├── ai/
│   │   ├── ai.service.ts
│   │   ├── prompts.ts
│   │   └── context-builder.ts
│   └── tvci/
│       └── tvci-api.service.ts
├── server/
│   └── ai-gateway/
├── templates/
├── test-documents/
├── tests/
└── docs/
```

## 11. Development Order

Implementation order is fixed to reduce risk:

1. Office.js project + manifest + task pane + ribbon.
2. Word selection read/write.
3. Basic formatting inspection/change.
4. Rule data model and validator.
5. Validation results UI and safe fix flow.
6. `.docx` template insertion.
7. Content Control binding.
8. Local AI gateway.
9. AI selection rewrite workflow.
10. Broader rule catalogs.
11. TVCI_APP integration.

## 12. Security and Governance Principles

- Never ship provider API keys in frontend/add-in source.
- AI never modifies documents without explicit user action.
- Add-in operations should be auditable when connected to TVCI_APP.
- Template and rule versioning will be introduced before organization-wide rollout.
- Do not send whole-document content to AI by default.

## 13. MVP Definition of Done

The MVP is done when, on a Windows desktop Word installation used for testing, a tester can:

1. Sideload TVCI Word Tools.
2. Open its task pane from the Ribbon.
3. Select text and inspect its content/formatting.
4. Run a basic TVCI formatting check.
5. See validation issues.
6. Apply a safe formatting correction.
7. Insert a prepared `.docx` template.
8. Populate at least one tagged Content Control.
9. Send selected text to the local AI gateway.
10. Preview the rewritten text and explicitly replace the selection.

No TVCI_APP dependency is required for MVP acceptance.

## 2026-09-15 Architecture decision: Direct AI API for MVP

For the current internal MVP, the user explicitly chose direct API mode instead of the previously proposed TVCI AI Gateway. The Word task pane stores the selected provider, model, and user-entered API key in local storage and calls OpenAI Responses API or Gemini `generateContent` directly. No provider secret is committed into source code. This is an MVP convenience decision, not the recommended architecture for broad multi-user deployment; a backend gateway remains the preferred future hardening path.
