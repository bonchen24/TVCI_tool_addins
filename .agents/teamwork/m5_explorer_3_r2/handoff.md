# Handoff Report: Visual Diff Engine & AI Workspace UI (M5 Explorer 3)

## 1. Observation
1. **Dependency Availability**:
   - `web_app/package.json` lines 37 & 51:
     - `"diff": "^7.0.0"`
     - `"@types/diff": "^6.0.0"`
   - `node_modules/@types/diff/index.d.ts` line 232 exports `diffWordsWithSpace(oldStr: string, newStr: string, options?: WordsOptions): Change[]`.
2. **Current Missing Components**:
   - `web_app/src/ai/` directory does not yet exist.
   - `web_app/src/components/ai/` directory does not yet exist.
3. **Sidebar AI Tab Status**:
   - `web_app/src/components/layout/Sidebar.tsx` lines 776–791 contains:
     ```tsx
     {activeTab === 'ai' && (
       <div className="space-y-4">
         <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
           Không gian AI trợ lý văn phòng
         </div>
         ...
       </div>
     )}
     ```
     This is a static placeholder with zero interactive inputs or triggers.
4. **Editor Wiring Omission in `page.tsx`**:
   - `web_app/app/page.tsx` lines 190–201:
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
     />
     ```
     The `editor={editor}` prop is omitted, leaving `editor` undefined inside `Sidebar`.
5. **Contract Specifications in E2E Suite**:
   - `web_app/e2e-tests/tier1-feature/f22_diff_preview.test.ts` lines 41–47:
     - Addition color token: `#10B981` (Emerald-100 `#D1FAE5` bg, Emerald-800 `#065F46` text)
     - Deletion color token: `#EF4444` (Rose-100 `#FEE2E2` bg, Rose-800 `#991B1B` text)
   - Lines 53–69: Accept replaces selection; Reject preserves original.
   - Lines 71–79: Identical text returns 1 unchanged span with `added: undefined` and `removed: undefined`.

---

## 2. Logic Chain
1. From **Observation 1**, `diffWordsWithSpace` from `diff` can be imported directly in pure TypeScript without adding any new npm dependencies.
2. From **Observation 5**, word-level diff output must structure spans matching `{ value, type, added?: boolean, removed?: boolean, groupId?: string }` so `f22_diff_preview.test.ts` passes verbatim while enabling granular Accept/Reject by grouping consecutive removals and additions into `DiffChangeGroup`.
3. From **Observation 3**, replacing lines 776–791 in `Sidebar.tsx` with `<AiWorkspacePanel editor={editor} />` connects the AI assistant workflow directly into the user interface.
4. From **Observation 4**, passing `editor={editor}` in `web_app/app/page.tsx` line 190 enables `<AiWorkspacePanel />` to access `editor.state.selection` for reading selected text and calling `editor.chain().focus().insertContent(acceptedText).run()` to inject accepted diffs.
5. Combining these steps produces a zero-overhead, production-ready, preview-first visual diff engine adhering to Nghị định 30/2020/NĐ-CP.

---

## 3. Caveats
- No LLM network calls are executed inside the diff engine itself; it operates as a deterministic, pure-function transformation of `(originalText, suggestedText) => DiffAnalysisResult`.
- If the editor selection spans multiple table cells or complex nested nodes, plain text insertion replaces the selected range. Rich-text AST diffing is scoped out for Milestone 5 per `PROJECT.md` contracts.

---

## 4. Conclusion
The implementation Worker should execute the following scoped tasks:
1. Create `web_app/src/ai/diff.ts` exporting:
   - `calculateWordDiff(original: string, updated: string): DiffWordSpan[]`
   - `generateAiDiff(original: string, updated: string): DiffAnalysisResult`
   - `resolveAcceptedDiff(diff: DiffAnalysisResult, decisions: Record<string, DiffDecision>): string`
   - `applyAiDiffToSelection(editor: any, acceptedText: string): void`
   - `getEditorSelectedText(editor: any): string`
   - `getEditorFullText(editor: any): string`
2. Create UI components in `web_app/src/components/ai/`:
   - `AiWorkspacePanel.tsx`: 3 modes (Drafting, Proofreading, Template Fill), provider selector (OpenAI / Gemini), prompt bar, and diff trigger.
   - `DiffPreviewModal.tsx`: Visual word-level diff modal with Emerald additions, Rose line-through deletions, and granular Accept/Reject buttons per change card.
3. Update `web_app/src/components/layout/Sidebar.tsx`:
   - Render `<AiWorkspacePanel editor={editor} />` under Tab 3 (`activeTab === 'ai'`).
4. Update `web_app/app/page.tsx`:
   - Pass `editor={editor}` to `<Sidebar ... />` at line 190.
5. Create unit tests in `web_app/tests/unit/ai-diff.test.ts` and `web_app/tests/unit/ai-workspace-ui.test.tsx`.

---

## 5. Verification Method
1. **Unit Tests**:
   - Run Vitest suite:
     ```bash
     cd web_app && npm test tests/unit/ai-diff.test.ts
     cd web_app && npm test tests/unit/ai-workspace-ui.test.tsx
     ```
   - Invalidation condition: Any failing test case or unhandled undefined span.
2. **E2E Feature 22 Test**:
   - Run E2E runner:
     ```bash
     cd web_app && node e2e-tests/runner.js --filter="F22"
     ```
   - Invalidation condition: Any assertion in `f22_diff_preview.test.ts` failing.
3. **Typecheck & Production Build**:
   - Run TypeScript check:
     ```bash
     cd web_app && npm run typecheck
     ```
   - Invalidation condition: Any TypeScript diagnostic errors in `diff.ts`, `AiWorkspacePanel.tsx`, `Sidebar.tsx`, or `page.tsx`.
