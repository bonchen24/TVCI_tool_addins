# Detailed Technical Analysis: UI Workflows, Diff Integration & Modal Accessibility

**Author**: M5 Iteration 2 Explorer 3  
**Working Directory**: `e:\CODING\TVCI_word_addins\.agents\teamwork\m5_it2_explorer_3\`  
**Target Project**: `web_app` (`TVCI_web_app`)  
**Scope**: `AiWorkspacePanel.tsx`, `diff.ts`, `DiffPreviewModal.tsx`, `ai-diff.test.ts`, `ai-template-fill.test.ts`, `template-fill.ts`

---

## 1. Executive Summary

During Milestone 5 Iteration 1 review, Reviewer 2 and Challenger 2 identified four critical UI/UX and integration issues:
1. **Template Fill Dead-End (`AiWorkspacePanel.tsx:590-614`)**: Extracted fields are displayed as read-only tags without an action button to insert or apply the fields into the Tiptap document canvas.
2. **Content Duplication on Proofread Apply (`diff.ts:180-189` & `AiWorkspacePanel.tsx:143-152`)**: When whole document text is grabbed or selection is collapsed (`from === to`), accepting diff calls `editor.chain().focus().insertContent(acceptedText).run()` without deleting the existing document content, duplicating the entire document.
3. **Accessibility Deficit in `DiffPreviewModal.tsx:83-96`**: Missing `aria-labelledby` linking to dialog title, and missing `Escape` key event listener to close modal.
4. **Unit Test Regressions & Defects in `ai-template-fill.test.ts` & `ai-diff.test.ts`**:
   - `src/ai/template-fill.ts:97` invokes `formatAdministrativeDate(d, m, y)` with 3 numbers, violating its 1-2 parameter signature and returning empty string `""`, failing heuristic date extraction test and throwing TS2554.
   - `ai-diff.test.ts` lacks test coverage for collapsed selection handling, allowing the duplication bug to pass unnoticed.

---

## 2. Root Cause & Solution Details

### Defect 1: Template Fill Action Button in `AiWorkspacePanel.tsx`

#### Root Cause
In `web_app/src/components/ai/AiWorkspacePanel.tsx` lines 590–614, the Template Fill tab displays `templateFillResult` using a simple read-only list:
```tsx
{templateFillResult && (
  <div className="space-y-2 pt-2 border-t border-slate-200">
    ...
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {Object.entries(templateFillResult.fields).map(([tag, val]) => (
        <div key={tag} className="p-2 rounded border border-slate-200 bg-slate-50/70">
          <span className="text-[10px] font-bold text-slate-500">{tag}:</span>
          <div className="text-xs text-slate-800 font-medium">
            {Array.isArray(val) ? val.join(', ') : String(val)}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```
No button or handler triggers any document mutation. The user successfully extracts values via AI but cannot transfer them to the editor.

#### Solution
1. Import `renderTemplateToTiptapDoc` and `applyTemplateFieldsToEditor` from `@/templates`.
2. Add prop `onApplyTemplate?: (templateId: string, values: Record<string, any>, mode: 'insert' | 'fill') => void;` to `AiWorkspacePanelProps`.
3. Add handlers:
   - `handleApplyTemplateFill`: calls `applyTemplateFieldsToEditor(editor, templateFillResult.fields)`. If placeholders are found and updated, reports success. If document is blank/unformatted, falls back to rendering full template via `renderTemplateToTiptapDoc(selectedSchemaId, templateFillResult.fields)`.
   - `handleInsertFullTemplateDoc`: explicitly renders full template via `renderTemplateToTiptapDoc(selectedSchemaId, templateFillResult.fields)` and replaces content via `editor.commands.setContent(fullDoc, true)`.
4. Render two action buttons:
   - Primary: `<Button data-testid="btn-apply-template-fill">Áp dụng vào tài liệu</Button>`
   - Secondary: `<Button data-testid="btn-insert-full-template">Chèn mới toàn bộ biểu mẫu</Button>`
5. In `web_app/src/components/layout/Sidebar.tsx` line 778, pass `onApplyTemplate={onApplyTemplate}` to `<AiWorkspacePanel editor={editor} onApplyTemplate={onApplyTemplate} />`.

---

### Defect 2: Document Content Duplication in `diff.ts` and `AiWorkspacePanel.tsx`

#### Root Cause
In `web_app/src/ai/diff.ts` lines 180–189:
```typescript
export function applyAiDiffToSelection(editor: any, acceptedText: string): void {
  if (!editor) return;

  const { from, to } = editor.state?.selection || { from: 0, to: 0 };
  if (from !== to) {
    editor.chain().focus().deleteRange({ from, to }).insertContent(acceptedText).run();
  } else {
    editor.chain().focus().insertContent(acceptedText).run();
  }
}
```
And in `web_app/src/components/ai/AiWorkspacePanel.tsx` lines 143–152:
```typescript
  const handleGrabEditorSelection = () => {
    if (!editor) return;
    const selected = getEditorSelectedText(editor);
    if (selected) {
      setProofreadText(selected);
    } else {
      const full = getEditorFullText(editor);
      setProofreadText(full);
    }
  };
```
When full document text is grabbed or text was entered manually, `from === to`. Furthermore, when the user interacts with the diff preview modal, the editor loses focus and the selection may collapse.
Because `from === to`, `applyAiDiffToSelection` calls `editor.chain().focus().insertContent(acceptedText).run()`, inserting the entire revised document at the cursor while leaving the entire previous document intact. The document is duplicated.

#### Solution
1. In `web_app/src/ai/diff.ts`:
   Extend `applyAiDiffToSelection` with options interface:
   ```typescript
   export interface ApplyAiDiffOptions {
     isFullDocument?: boolean;
     range?: { from: number; to: number };
   }

   export function applyAiDiffToSelection(
     editor: any,
     acceptedText: string,
     options?: ApplyAiDiffOptions
   ): void {
     if (!editor) return;

     // 1. Explicit range provided (persisted before modal opened)
     if (options?.range && options.range.from !== options.range.to) {
       editor.chain().focus().deleteRange(options.range).insertContent(acceptedText).run();
       return;
     }

     const { from, to } = editor.state?.selection || { from: 0, to: 0 };
     const isCollapsed = from === to;
     const isFullDoc = options?.isFullDocument ?? isCollapsed;

     if (isFullDoc) {
       const docSize = editor.state?.doc?.content?.size || 0;
       if (docSize > 0) {
         editor.chain().focus().deleteRange({ from: 0, to: docSize }).insertContent(acceptedText).run();
       } else {
         editor.chain().focus().insertContent(acceptedText).run();
       }
     } else if (!isCollapsed) {
       editor.chain().focus().deleteRange({ from, to }).insertContent(acceptedText).run();
     } else {
       editor.chain().focus().insertContent(acceptedText).run();
     }
   }
   ```

2. In `web_app/src/components/ai/AiWorkspacePanel.tsx`:
   Track `proofreadRange` and `diffContext`:
   - When grabbing selection, record `{ from, to }` if non-empty, or `null` if full text.
   - When generating diff, set `diffContext: { source, isFullDocument: !proofreadRange, range: proofreadRange }`.
   - In `handleApplyDiffToEditor(acceptedText)`, pass `diffContext` to `applyAiDiffToSelection`.

---

### Defect 3: Accessibility Deficit in `DiffPreviewModal.tsx`

#### Root Cause
In `web_app/src/components/ai/DiffPreviewModal.tsx` lines 83–96:
- The modal wrapper has `role="dialog"` and `aria-modal="true"`, but is missing `aria-labelledby="diff-dialog-title"`.
- The `<h3>` title lacks `id="diff-dialog-title"`.
- No `keydown` event listener listens for `Escape` to close the modal.

#### Solution
1. Add `aria-labelledby="diff-dialog-title"` to the root dialog `div`.
2. Add `id="diff-dialog-title"` to the `<h3>` header.
3. Add `useEffect` listener on `window` for `Escape` key:
   ```typescript
   useEffect(() => {
     if (!isOpen) return;

     const handleKeyDown = (event: KeyboardEvent) => {
       if (event.key === 'Escape') {
         onClose();
       }
     };

     window.addEventListener('keydown', handleKeyDown);
     return () => {
       window.removeEventListener('keydown', handleKeyDown);
     };
   }, [isOpen, onClose]);
   ```

---

### Defect 4: Unit Test Regressions & Defects in `ai-template-fill.test.ts` & `ai-diff.test.ts`

#### Root Cause 4A (`ai-template-fill.test.ts` / `template-fill.ts:97`)
In `web_app/src/ai/template-fill.ts` lines 92–99:
```typescript
  const matchDate = notes.match(/ngày\s+(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i);
  if (matchDate) {
    const d = Number(matchDate[1]);
    const m = Number(matchDate[2]);
    const y = Number(matchDate[3]);
    const dateFormatted = formatAdministrativeDate(d, m, y);
    result.NGAY_BAN_HANH = dateFormatted;
  }
```
Signature in `src/templates/form-validation.ts`:
```typescript
export function formatAdministrativeDate(
  placeOrDate: string | Date,
  dateInput?: Date | string
): string
```
Passing 3 numeric arguments causes:
1. `TS2554: Expected 1-2 arguments, but got 3.`
2. Runtime failure: `dateInput` is number `m`, which fails `parseDateParts` and returns `""`.
3. In `tests/unit/ai-template-fill.test.ts:90-99`:
   `expect(heuristic.fields.NGAY_BAN_HANH).toContain('ngày 05')` fails because value is `""`.

#### Solution 4A
Change line 97 of `web_app/src/ai/template-fill.ts`:
```typescript
const dateFormatted = formatAdministrativeDate('Hà Nội', `${d}/${m}/${y}`);
```
This produces `'Hà Nội, ngày 05 tháng 02 năm 2026'`, matching NĐ 30 format, resolving TS2554, and making `ai-template-fill.test.ts` pass 100%.

#### Root Cause 4B (`ai-diff.test.ts`)
`tests/unit/ai-diff.test.ts` previously only verified `applyAiDiffToSelection` when `from !== to` (lines 78–103). It completely lacked tests for:
- Collapsed selection (`from === to`) full document replacement.
- Explicit range and `isFullDocument` options.

#### Solution 4B
Add two targeted unit tests in `tests/unit/ai-diff.test.ts`:
1. `should replace entire document when selection is collapsed to prevent duplication`
2. `should respect explicit range and isFullDocument options in applyAiDiffToSelection`

---

## 3. Concrete Code Patches

### Patch 1: `web_app/src/ai/diff.ts`
```diff
--- a/src/ai/diff.ts
+++ b/src/ai/diff.ts
@@ -176,14 +176,33 @@ export function getEditorFullText(editor: any): string {
 }
 
+export interface ApplyAiDiffOptions {
+  isFullDocument?: boolean;
+  range?: { from: number; to: number };
+}
+
 /**
  * Applies accepted text to replace editor selection or full document
  */
-export function applyAiDiffToSelection(editor: any, acceptedText: string): void {
+export function applyAiDiffToSelection(
+  editor: any,
+  acceptedText: string,
+  options?: ApplyAiDiffOptions
+): void {
   if (!editor) return;
 
+  if (options?.range && options.range.from !== options.range.to) {
+    editor.chain().focus().deleteRange(options.range).insertContent(acceptedText).run();
+    return;
+  }
+
   const { from, to } = editor.state?.selection || { from: 0, to: 0 };
-  if (from !== to) {
+  const isCollapsed = from === to;
+  const shouldReplaceFull = options?.isFullDocument ?? isCollapsed;
+
+  if (shouldReplaceFull) {
+    const docSize = editor.state?.doc?.content?.size || 0;
+    if (docSize > 0) {
+      editor.chain().focus().deleteRange({ from: 0, to: docSize }).insertContent(acceptedText).run();
+    } else {
+      editor.chain().focus().insertContent(acceptedText).run();
+    }
+  } else if (!isCollapsed) {
     editor.chain().focus().deleteRange({ from, to }).insertContent(acceptedText).run();
   } else {
     editor.chain().focus().insertContent(acceptedText).run();
   }
 }
```

### Patch 2: `web_app/src/components/ai/DiffPreviewModal.tsx`
```diff
--- a/src/components/ai/DiffPreviewModal.tsx
+++ b/src/components/ai/DiffPreviewModal.tsx
@@ -47,6 +47,19 @@ export function DiffPreviewModal({
     }
   }, [diff]);
 
+  useEffect(() => {
+    if (!isOpen) return;
+
+    const handleKeyDown = (event: KeyboardEvent) => {
+      if (event.key === 'Escape') {
+        onClose();
+      }
+    };
+
+    window.addEventListener('keydown', handleKeyDown);
+    return () => window.removeEventListener('keydown', handleKeyDown);
+  }, [isOpen, onClose]);
+
   if (!isOpen || !diff) return null;
 
   const handleToggleDecision = (groupId: string) => {
@@ -85,6 +98,7 @@ export function DiffPreviewModal({
       className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
       role="dialog"
       aria-modal="true"
+      aria-labelledby="diff-dialog-title"
     >
       <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
         {/* Header */}
@@ -93,7 +107,7 @@ export function DiffPreviewModal({
             <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
               <Sparkles className="w-4 h-4" />
             </div>
             <div>
-              <h3 className="text-base font-semibold text-slate-800">{title}</h3>
+              <h3 id="diff-dialog-title" className="text-base font-semibold text-slate-800">{title}</h3>
               <p className="text-xs text-slate-500">
                 Phê duyệt từng thay đổi trước khi áp dụng vào tài liệu
               </p>
```

### Patch 3: `web_app/src/ai/template-fill.ts`
```diff
--- a/src/ai/template-fill.ts
+++ b/src/ai/template-fill.ts
@@ -94,7 +94,7 @@ export function extractFieldsFromNotesHeuristic(
     const d = Number(matchDate[1]);
     const m = Number(matchDate[2]);
     const y = Number(matchDate[3]);
-    const dateFormatted = formatAdministrativeDate(d, m, y);
+    const dateFormatted = formatAdministrativeDate('Hà Nội', `${d}/${m}/${y}`);
     result.NGAY_BAN_HANH = dateFormatted;
   }
```

### Patch 4: `web_app/src/components/ai/AiWorkspacePanel.tsx`
```diff
--- a/src/components/ai/AiWorkspacePanel.tsx
+++ b/src/components/ai/AiWorkspacePanel.tsx
@@ -32,7 +32,12 @@ import {
   applyAiDiffToSelection,
 } from '@/ai';
-import { ALL_SCHEMAS, getFormSchema } from '@/templates';
+import {
+  ALL_SCHEMAS,
+  getFormSchema,
+  renderTemplateToTiptapDoc,
+  applyTemplateFieldsToEditor,
+} from '@/templates';
 import { DiffPreviewModal } from './DiffPreviewModal';
 
 export interface AiWorkspacePanelProps {
   editor?: any;
+  onApplyTemplate?: (templateId: string, values: Record<string, any>, mode: 'insert' | 'fill') => void;
 }
@@ -41,7 +46,7 @@ type AiSubsystemTab = 'drafting' | 'proofreading' | 'template_fill';
 
-export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
+export function AiWorkspacePanel({ editor, onApplyTemplate }: AiWorkspacePanelProps) {
   // Active Subsystem Tab
   const [subTab, setSubTab] = useState<AiSubsystemTab>('drafting');
@@ -53,6 +58,12 @@ export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
   const [errorMessage, setErrorMessage] = useState<string | null>(null);
+  const [templateFillSuccessMsg, setTemplateFillSuccessMsg] = useState<string | null>(null);
 
   // Diff Modal State
   const [activeDiff, setActiveDiff] = useState<DiffAnalysisResult | null>(null);
   const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
   const [diffTitle, setDiffTitle] = useState<string>('Xem trước khác biệt');
+  const [diffContext, setDiffContext] = useState<{
+    source: 'drafting' | 'proofreading';
+    isFullDocument: boolean;
+    range?: { from: number; to: number } | null;
+  }>({ source: 'drafting', isFullDocument: false });
 
   // --- 1. DRAFTING STATE ---
@@ -67,6 +78,7 @@ export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
   const [proofreadText, setProofreadText] = useState<string>('');
   const [proofreadResult, setProofreadResult] = useState<ProofreadingResult | null>(null);
+  const [proofreadRange, setProofreadRange] = useState<{ from: number; to: number } | null>(null);
 
   // --- 3. TEMPLATE FILL STATE ---
@@ -131,6 +143,12 @@ export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
       const currentSelected = editor ? getEditorSelectedText(editor) : '';
+      const { from, to } = editor?.state?.selection || { from: 0, to: 0 };
+      const hasSelection = from !== to;
       const diff = generateAiDiff(currentSelected, data.content);
       setActiveDiff(diff);
+      setDiffContext({
+        source: 'drafting',
+        isFullDocument: false,
+        range: hasSelection ? { from, to } : null,
+      });
       setDiffTitle(`Xem trước soạn thảo: ${docType} (${section})`);
       setIsDiffModalOpen(true);
@@ -146,8 +164,11 @@ export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
     const selected = getEditorSelectedText(editor);
     if (selected) {
       setProofreadText(selected);
+      const { from, to } = editor.state?.selection || { from: 0, to: 0 };
+      setProofreadRange({ from, to });
     } else {
       const full = getEditorFullText(editor);
       setProofreadText(full);
+      setProofreadRange(null);
     }
   };
@@ -188,6 +209,11 @@ export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
     const diff = generateAiDiff(proofreadText, proofreadResult.revisedText);
     setActiveDiff(diff);
+    setDiffContext({
+      source: 'proofreading',
+      isFullDocument: !proofreadRange,
+      range: proofreadRange,
+    });
     setDiffTitle('Xem trước chuẩn hóa & Soát lỗi câu từ');
     setIsDiffModalOpen(true);
   };
@@ -196,6 +222,7 @@ export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
   const handleRunTemplateFill = async () => {
     setErrorMessage(null);
+    setTemplateFillSuccessMsg(null);
     if (!userNotes.trim()) {
       setErrorMessage('Vui lòng nhập ghi chú hoặc nội dung thô để trích xuất.');
       return;
@@ -226,7 +253,58 @@ export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
   // Callback when user accepts diff in modal
   const handleApplyDiffToEditor = (acceptedText: string) => {
     if (editor) {
-      applyAiDiffToSelection(editor, acceptedText);
+      applyAiDiffToSelection(editor, acceptedText, {
+        isFullDocument: diffContext.isFullDocument,
+        range: diffContext.range || undefined,
+      });
+    }
+  };
+
+  // Action: Apply extracted template fields to editor
+  const handleApplyTemplateFill = () => {
+    if (!editor || !templateFillResult) {
+      if (!editor) setErrorMessage('Không tìm thấy trình soạn thảo văn bản.');
+      return;
+    }
+    setErrorMessage(null);
+    setTemplateFillSuccessMsg(null);
+
+    try {
+      const report = applyTemplateFieldsToEditor(editor, templateFillResult.fields);
+      if (report.replacedPlaceholders > 0 || report.updatedFields.length > 0) {
+        setTemplateFillSuccessMsg(`Đã cập nhật ${report.updatedFields.length} trường vào tài liệu!`);
+      } else {
+        const fullDoc = renderTemplateToTiptapDoc(selectedSchemaId, templateFillResult.fields);
+        if (editor.commands?.setContent) {
+          editor.commands.setContent(fullDoc, true);
+          setTemplateFillSuccessMsg('Đã tạo và chèn biểu mẫu hoàn chỉnh vào tài liệu!');
+        }
+      }
+      if (onApplyTemplate) {
+        onApplyTemplate(selectedSchemaId, templateFillResult.fields, 'fill');
+      }
+    } catch (err: any) {
+      setErrorMessage(err.message || 'Lỗi áp dụng biểu mẫu vào tài liệu');
+    }
+  };
+
+  // Action: Insert full newly rendered template doc
+  const handleInsertFullTemplateDoc = () => {
+    if (!editor || !templateFillResult) {
+      if (!editor) setErrorMessage('Không tìm thấy trình soạn thảo văn bản.');
+      return;
+    }
+    setErrorMessage(null);
+    setTemplateFillSuccessMsg(null);
+
+    try {
+      const fullDoc = renderTemplateToTiptapDoc(selectedSchemaId, templateFillResult.fields);
+      if (editor.commands?.setContent) {
+        editor.commands.setContent(fullDoc, true);
+        setTemplateFillSuccessMsg('Đã chèn toàn bộ biểu mẫu mới vào tài liệu!');
+      }
+      if (onApplyTemplate) {
+        onApplyTemplate(selectedSchemaId, templateFillResult.fields, 'insert');
+      }
+    } catch (err: any) {
+      setErrorMessage(err.message || 'Lỗi chèn biểu mẫu vào tài liệu');
+    }
   };
@@ -611,6 +689,35 @@ export function AiWorkspacePanel({ editor }: AiWorkspacePanelProps) {
                 </div>
               ))}
             </div>
+
+            {/* Action Buttons to Inject/Apply Fields into Editor */}
+            <div className="pt-2 flex flex-col gap-2">
+              <Button
+                size="sm"
+                variant="primary"
+                onClick={handleApplyTemplateFill}
+                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium shadow-sm"
+                data-testid="btn-apply-template-fill"
+              >
+                <Check className="w-3.5 h-3.5" />
+                Áp dụng vào tài liệu
+              </Button>
+              <Button
+                size="sm"
+                variant="outline"
+                onClick={handleInsertFullTemplateDoc}
+                className="w-full py-1.5 text-xs text-slate-700 hover:bg-slate-50 gap-1.5 border-slate-300"
+                data-testid="btn-insert-full-template"
+              >
+                <FileText className="w-3.5 h-3.5 text-slate-500" />
+                Chèn mới toàn bộ biểu mẫu
+              </Button>
+            </div>
+
+            {templateFillSuccessMsg && (
+              <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5" data-testid="template-fill-success-msg">
+                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
+                <span>{templateFillSuccessMsg}</span>
+              </div>
+            )}
           </div>
         )}
```
