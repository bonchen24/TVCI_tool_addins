# Technical Analysis: Visual Diff Engine & AI Workspace UI (Milestone 5)

## Executive Summary
Milestone 5 establishes the preview-first AI experience for the TVCI Web Application per Vietnamese administrative standards (Nghị định 30/2020/NĐ-CP). The core principle is **Strict Preview-First**: no AI-generated content enters the editor without user inspection via a word-level visual diff engine with granular Accept/Reject capabilities.

---

## 1. Visual Diff Engine Architecture (`web_app/src/ai/diff.ts`)

### 1.1 Dependency & Library Selection
- **Library**: `diff` (`^7.0.0` with `@types/diff` `^6.0.0` already installed in `web_app/package.json`).
- **Core Function**: `diffWordsWithSpace(originalText, suggestedText)`.
- **Rationale**:
  - `diffWordsWithSpace` preserves all spacing, indentation, and newlines exactly, preventing whitespace corruption in Vietnamese administrative documents.
  - Native standard: zero extra dependencies needed.

### 1.2 Data Structures & Types
```typescript
export type DiffSpanType = 'added' | 'removed' | 'unchanged';
export type DiffGroupType = 'replacement' | 'addition' | 'deletion';
export type DiffDecision = 'pending' | 'accepted' | 'rejected';

export interface DiffWordSpan {
  id: string;
  type: DiffSpanType;
  value: string;
  added?: boolean;      // Matches f22_diff_preview.test.ts contract
  removed?: boolean;    // Matches f22_diff_preview.test.ts contract
  groupId?: string;     // Foreign key linking to DiffChangeGroup
}

export interface DiffChangeGroup {
  id: string;
  type: DiffGroupType;
  originalText: string;
  suggestedText: string;
  status: DiffDecision;
}

export interface DiffAnalysisResult {
  spans: DiffWordSpan[];
  groups: DiffChangeGroup[];
  hasChanges: boolean;
  additionsCount: number;
  deletionsCount: number;
  originalText: string;
  suggestedText: string;
}
```

### 1.3 Change Grouping & Granular Accept/Reject Algorithm
When comparing `originalText` and `suggestedText`:
1. **Raw tokenization**: Call `diffWordsWithSpace(originalText, suggestedText)`.
2. **Consecutive change clustering**:
   - Contiguous removed spans followed by contiguous added spans form a single `replacement` group.
   - Isolated added spans form an `addition` group.
   - Isolated removed spans form a `deletion` group.
   - Unchanged spans remain unassigned (`groupId = undefined`).
3. **Resolution Engine (`resolveAcceptedDiff`)**:
   ```typescript
   export function resolveAcceptedDiff(
     diff: DiffAnalysisResult,
     decisions: Record<string, DiffDecision>
   ): string
   ```
   - For each group `g`:
     - If `decisions[g.id] === 'accepted'`:
       - `replacement` → output `g.suggestedText`
       - `addition` → output `g.suggestedText`
       - `deletion` → output `""` (remove original)
     - If `decisions[g.id] === 'rejected'` (or unaccepted):
       - `replacement` → output `g.originalText`
       - `addition` → output `""` (do not add)
       - `deletion` → output `g.originalText` (preserve original)
   - Unchanged spans are always preserved verbatim.

### 1.4 Visual Theme & Color Tokens (F22 Specification)
| Change Type | Background Token | Text Token | Border / Decoration |
|---|---|---|---|
| **Added** | `#D1FAE5` (Emerald-100) | `#065F46` (Emerald-800) | Border `#10B981` (Emerald-500) |
| **Removed** | `#FEE2E2` (Rose-100) | `#991B1B` (Rose-800) | Line-through (`text-decoration: line-through`) |
| **Unchanged** | `transparent` | `#1E293B` (Slate-800) | None |

---

## 2. AI Workspace UI Component Hierarchy (`web_app/src/components/ai/`)

### 2.1 Component Structure
```
web_app/src/components/ai/
├── AiWorkspacePanel.tsx      # Main panel embedded inside Sidebar AI tab
├── DiffPreviewModal.tsx      # Modal / Expandable overlay for visual diff
├── PromptBar.tsx             # Reusable prompt input with history & action triggers
├── DraftingView.tsx          # Sub-view for Contextual Drafting
├── ProofreadingView.tsx      # Sub-view for 5-Category Proofreading
└── TemplateFillView.tsx      # Sub-view for AI Template Fill
```

### 2.2 `AiWorkspacePanel.tsx` Blueprint
- **Props**:
  ```typescript
  export interface AiWorkspacePanelProps {
    editor?: any;
    onApplyContent?: (text: string) => void;
  }
  ```
- **State Management**:
  - `activeMode`: `'drafting' | 'proofreading' | 'template-fill'`
  - `provider`: `'openai' | 'gemini'`
  - `apiKey`: string (stored in `localStorage.getItem('tvci_ai_api_key')` or `.env`)
  - `isGenerating`: boolean (spinner & disabled buttons)
  - `error`: string | null (sanitized, API keys stripped)
  - `diffModalOpen`: boolean
  - `activeDiff`: `DiffAnalysisResult | null`
  - `groupDecisions`: `Record<string, DiffDecision>`

### 2.3 `DiffPreviewModal.tsx` Blueprint
- **Features**:
  - **View Switcher**: Unified View (inline colored diff) vs Side-by-side View (Original left, Suggested right).
  - **Granular Change Cards**:
    - Displays each change with line/word context.
    - Check icon button (Emerald) to Accept group.
    - X icon button (Rose) to Reject group.
    - Status pill (`Đã chấp nhận`, `Đã từ chối`, `Chờ xử lý`).
  - **Batch Action Toolbar**:
    - `Chấp nhận tất cả` (`action-500` / Emerald).
    - `Từ chối tất cả` (`slate-200` / Outline).
    - `Áp dụng vào tài liệu` (`primary-500` / Indigo).

---

## 3. Sidebar Integration Plan (`web_app/src/components/layout/Sidebar.tsx`)

### 3.1 Observed Deficiencies in Current Code
1. In `web_app/src/components/layout/Sidebar.tsx` (lines 776–791), `activeTab === 'ai'` renders a static informative placeholder without interactive controls.
2. In `web_app/app/page.tsx` (line 190), `<Sidebar ... />` is instantiated **without** the `editor={editor}` prop, preventing sidebar tools from directly modifying the ProseMirror state.

### 3.2 Proposed Modifications
1. **`web_app/src/components/layout/Sidebar.tsx`**:
   - Import `<AiWorkspacePanel />` from `@/components/ai/AiWorkspacePanel`.
   - In Tab 3 container (L776), render:
     ```tsx
     {activeTab === 'ai' && (
       <AiWorkspacePanel
         editor={editor}
         onApplyContent={(text) => {
           if (editor) {
             insertAiTextToEditor(editor, text);
           }
         }}
       />
     )}
     ```
2. **`web_app/app/page.tsx`**:
   - Update line 190 to pass `editor={editor}`:
     ```tsx
     <Sidebar
       isOpen={sidebarOpen}
       activeTab={activeTab}
       onTabChange={setActiveTab}
       onClose={() => setSidebarOpen(false)}
       healthScore={healthScore}
       issueCount={issueCount}
       issues={issues}
       onApplySafeFix={handleApplySafeFix}
       onFixIssue={handleFixIssue}
       editor={editor}
     />
     ```

---

## 4. Tiptap Editor Insertion & Replacement Integration

### 4.1 Target Insertion Scenarios
| Scenario | Selection State | Editor Action | Formatting Guarantee |
|---|---|---|---|
| **Drafting Insert** | Empty / Cursor | `editor.commands.insertContent(text)` | Parsed as `AdministrativeParagraph` (Times New Roman, 13pt, 1.2 line spacing, 10mm indent) |
| **Drafting Replace** | Active Range | `editor.chain().focus().insertContent(text).run()` | Replaces selection range cleanly |
| **Proofreading Fix** | Specific snippet | `replaceTextInEditor(editor, original, replacement)` | Atomic ProseMirror transaction without full document re-render |
| **Template Fill** | Form schema fields | `applyTemplateFieldsToEditor(editor, fields)` | Existing M4 engine handles AST nodes |

### 4.2 Safe Helper Implementations (`web_app/src/ai/diff.ts`)
```typescript
/**
 * Inserts or replaces text in the active Tiptap editor instance.
 */
export function applyAiDiffToSelection(editor: any, acceptedText: string): void {
  if (!editor || !acceptedText) return;

  const { state } = editor;
  if (!state) return;

  // Insert content at current selection or cursor position
  editor.chain().focus().insertContent(acceptedText).run();
}

/**
 * Extracts currently selected text from editor, or returns empty string.
 */
export function getEditorSelectedText(editor: any): string {
  if (!editor || !editor.state) return '';
  const { from, to } = editor.state.selection;
  if (from === to) return '';
  return editor.state.doc.textBetween(from, to, ' ');
}

/**
 * Extracts full document plain text from editor.
 */
export function getEditorFullText(editor: any): string {
  if (!editor || !editor.state) return '';
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n');
}
```

---

## 5. Test Strategy & Verification Plan

### 5.1 Unit Tests (`web_app/tests/unit/`)
1. `tests/unit/ai-diff.test.ts`:
   - Verification of `calculateWordDiff` with identical text (returns 1 unchanged span).
   - Word changes in Vietnamese administrative text (Emerald added, Rose removed).
   - Granular group identification: `replacement`, `addition`, `deletion`.
   - Selective resolution: Accept group 0, Reject group 1.
   - Full Accept (`resolveAcceptedDiff` equals suggested).
   - Full Reject (`resolveAcceptedDiff` equals original).
2. `tests/unit/ai-workspace-ui.test.tsx`:
   - Render `AiWorkspacePanel` across all 3 tabs (`drafting`, `proofreading`, `template-fill`).
   - Mode switching updates UI form fields.
   - Provider selector toggles between OpenAI and Gemini.
   - Triggering "Xem khác biệt" opens `DiffPreviewModal`.
   - Granular Accept/Reject button clicks update visual states.
   - `Sidebar` renders `AiWorkspacePanel` when `activeTab === 'ai'`.
3. `tests/unit/editor-ai-integration.test.ts`:
   - Mock editor execution of `applyAiDiffToSelection`.
   - Selection replacement vs cursor insertion.

### 5.2 End-to-End Suite Alignment
- Run `node web_app/e2e-tests/runner.js --filter="F22"` to guarantee 100% pass on `f22_diff_preview.test.ts`.
- Run full suite `node web_app/e2e-tests/runner.js --tier=1` verifying Features 17–22 all pass.
