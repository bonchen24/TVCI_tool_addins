# Task Dispatch: M5 Explorer 3 (Visual Diff Engine & AI Workspace UI)

## Identity
- Role: Explorer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_3_r2\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_3_r2\handoff.md

## Context & Objectives
You are investigating Milestone 5 Visual Diff Engine & AI Workspace UI for the TVCI Web Application:
1. Visual Diff Engine (`web_app/src/ai/diff.ts`):
   - Word-level diff calculation comparing original text vs AI suggested text (using `diff` package e.g. `diffWordsWithSpace`).
   - Generates structured spans with type: `added` (Emerald `#10B981` highlight), `removed` (Rose/Red `#EF4444` strike-through), `unchanged`.
   - Granular Accept / Reject capabilities: accept all, reject all, or accept individual suggestion segments.
2. AI Workspace UI (`web_app/src/components/ai/`):
   - `AiWorkspacePanel.tsx`: Mode selector (Drafting, Proofreading, Template Fill), prompt bar, model/provider selector (OpenAI / Gemini), action buttons with loading states.
   - `DiffPreviewModal.tsx` or inline diff preview: displays side-by-side or unified word-level diff, accept/reject controls.
3. Sidebar Integration:
   - Connect the AI tab in `web_app/src/components/layout/Sidebar.tsx` to render the AI Workspace panel when active.
4. Editor Integration:
   - Inject accepted changes cleanly into the Tiptap editor instance without breaking document formatting.

## Files to Read & Investigate
1. `e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY)
2. `e:\CODING\TVCI_word_addins\PROJECT.md`
3. `e:\CODING\TVCI_word_addins\web_app\src\components\layout\Sidebar.tsx`
4. `e:\CODING\TVCI_word_addins\web_app\src\components\editor\` and `web_app/src/editor/`
5. `e:\CODING\TVCI_word_addins\web_app\package.json`

## Output Requirements
Write `analysis.md` and `handoff.md` in your working directory containing:
1. Architecture for word-level visual diff with granular Accept/Reject.
2. UI component hierarchy for AI Workspace panel and Diff Preview.
3. Integration plan with Sidebar.tsx and Tiptap editor insertion/replacement.
4. Test strategy covering diff calculations, UI rendering, and editor transactions.

## 2026-09-29T06:50:26Z
<USER_REQUEST>
You are M5 Explorer 3 for Milestone 5 (Visual Diff Engine & AI Workspace UI).
Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_3_r2\
Read your dispatch instructions: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_3_r2\DISPATCH.md
Read the user original request: e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY)
Read project architecture: e:\CODING\TVCI_word_addins\PROJECT.md

Investigate:
1. Visual Diff Engine with word-level diff (using diff library), granular Accept/Reject controls.
2. AI Workspace panel UI and Diff Preview modal/inline display.
3. Sidebar AI tab connection in Sidebar.tsx.
4. Tiptap editor replacement/insertion integration.

Write analysis.md and handoff.md in your working directory. When finished, send a message to your parent with summary and handoff path.
</USER_REQUEST>
