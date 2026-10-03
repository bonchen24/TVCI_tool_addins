## 2026-09-29T02:38:06Z
You are M1 Worker 1 for Milestone 1: `core-platform-editor` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m1_worker_1\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the master project architecture at:
e:\CODING\TVCI_word_addins\PROJECT.md

INPUT SPECIFICATIONS:
Read the 3 Explorer handoffs and analysis reports:
1. `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_1\analysis.md` & `handoff.md` (Next.js 14 shell, layout, design tokens, vitest)
2. `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_2\analysis.md` & `handoff.md` (Tiptap v2, AdministrativeParagraph, A4 canvas, formatting toolbar)
3. `e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_3\analysis.md` & `handoff.md` (2-column header/footer tables, AdminRule, default document JSON)

EXCLUSIVE WRITE OWNERSHIP:
You own `e:\CODING\TVCI_word_addins\web_app` and its subdirectories:
- `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.mjs`, `vitest.config.ts`, `tests/setup.ts`
- `app/` (`layout.tsx`, `page.tsx`, `globals.css`)
- `src/components/` (`layout/`, `editor/`)
- `src/editor/` (`extensions.ts`, `schema.ts`, `tiptap-adapter.ts`)
- `tests/` (`unit/`, `setup.ts`)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASKS:
1. Initialize the project files in `e:\CODING\TVCI_word_addins\web_app`:
   - Create `package.json` with dependencies (`next`, `react`, `react-dom`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `lucide-react`, `tailwindcss`, `vitest`, etc.)
   - Create `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.mjs`, `vitest.config.ts`
2. Implement Tiptap extensions & schema:
   - `src/editor/extensions.ts`: `AdministrativeParagraph`, `AdministrativeHeading`, `AdministrativeTable`, `AdministrativeTableCell`, `AdminRule` with custom attributes (`lineSpacing`, `spaceBefore`, `spaceAfter`, `firstLineIndentMm`, `fontFamily`, `fontSize`, `textAlign`).
   - `src/editor/schema.ts`: default administrative document state (TVCI Công văn sample with header 40%-60% table and footer 50%-50% table).
   - `src/editor/tiptap-adapter.ts`: function `tiptapDocToSnapshots` mapping editor nodes to `ParagraphSnapshot[]`.
3. Implement UI components:
   - `app/globals.css`: Plus Jakarta Sans variable, Times New Roman canvas font, A4 print styles.
   - `app/layout.tsx`: Root layout with font and metadata.
   - `app/page.tsx`: Complete web application page.
   - `src/components/layout/Header.tsx`, `Sidebar.tsx`, `StatusBar.tsx`, `Button.tsx`, `Badge.tsx`.
   - `src/components/editor/A4Canvas.tsx`: 210mm x 297mm A4 proportions, margins 20/20/30/15mm.
   - `src/components/editor/EditorToolbar.tsx`: rich text toolbar with font size, line spacing, align, indent, and "Chuẩn Thân bài NĐ30" preset button.
4. Implement comprehensive unit tests in `web_app/tests/unit/`:
   - `tests/unit/editor-extensions.test.ts`
   - `tests/unit/tiptap-adapter.test.ts`
   - `tests/unit/default-document.test.ts`
   - `tests/unit/components.test.tsx`
5. Verification commands:
   - Install dependencies if needed or verify node_modules.
   - Run `npm run typecheck`
   - Run `npm test`
   - Run `npm run build`
6. Output:
   Write a self-contained `handoff.md` in your working directory with all commands, terminal outputs, and files created. Send completion message back to parent.
