# Workspace Sidebar UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the three-tab task pane to the left on wide screens and make it an accessible drawer on narrow screens while keeping the editor and existing features intact.

**Architecture:** Keep sidebar state and editor behavior in `app/page.tsx`. Render the sidebar before the editor in document order. Make `Sidebar` a 336px left pane at the Tailwind `xl` breakpoint (1280px) and a fixed drawer below it, with backdrop, close control, Escape handling, and independent content scrolling. Keep business logic unchanged.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library.

**Spec:** User-approved UI/UX implementation requirements in the active request.

## Global Constraints

- Only modify files under `web_app/`.
- Do not change business logic for audit, templates, or AI.
- Keep the existing three sidebar features and their labels/actions.
- Do not commit or push.
- Preserve existing workspace data and inspect the final diff.

---

### Task 1: Add layout and interaction acceptance tests

**Files:**
- Create: `tests/unit/workspace-layout.test.tsx`
- Modify: `tests/unit/components.test.tsx`

**Interfaces:** Use the real `AppPage`, `Header`, and `Sidebar` components. Mock editor and service boundaries only so tests observe application layout and UI state without invoking document business logic.

- [x] Write tests for sidebar-before-main DOM order, header collapse/expand state and accessibility, left-pane border and width, independent panel scrolling, the `xl` drawer/backdrop contract, backdrop and Escape close, keyboard navigation, and the three semantic tabs.
- [x] Run the acceptance test file before production changes and record RED (9/9 failed, then 10/10 after keyboard/focus assertions); review follow-up regression tests also showed RED (3 failed of 12) before their fixes.
- [x] Keep existing audit, template, and AI test files unchanged; update only the UI contract query in `components.test.tsx` to expect semantic `tab` role.

### Task 2: Implement desktop-left and narrow-screen drawer behavior

**Files:**
- Modify: `app/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [x] Put `Sidebar` before `main` in the workspace DOM.
- [x] Use a 336px left pane with a right border at `xl`; use a fixed, width-limited drawer and backdrop below `xl`.
- [x] Keep the sidebar content in its own `overflow-y-auto` region.
- [x] Close the drawer from the backdrop, close button, and Escape without adding a focus trap.
- [x] Keep all existing audit, template, and AI content and handlers intact.
- [x] Run the new sidebar and layout tests until green.

### Task 3: Improve navigation and header accessibility

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `app/page.tsx`

- [x] Add tablist/tab/panel semantics, `aria-selected`, stable tab/panel IDs, and visible keyboard focus styles.
- [x] Make the header toggle label and `aria-expanded` reflect the sidebar state, and point `aria-controls` at the sidebar.
- [x] Keep existing tab names and behavior.
- [x] Run component, audit, template, and AI UI tests.

### Task 4: Verify the complete web app

**Files:**
- Review only: `app/globals.css`, `tailwind.config.ts`, `src/components/layout/StatusBar.tsx`, `src/components/ai/AiWorkspacePanel.tsx`, and all changed files.

- [x] Confirm the implementation uses existing Tailwind breakpoints and does not introduce unnecessary app-wide CSS or business-logic changes.
- [x] Run the full Vitest suite, typecheck, production build, and lint script from `web_app/`.
- [x] Inspect `git diff` and `git status` scoped to `web_app/`; report exact command results and any existing failures.
- [x] Do not commit or push.

## Verification Record

- `npm test -- --reporter=basic`: exit 0; 28 test files, 251 passed, 0 failed.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; Next.js reports the existing optional `jsdom` peer `canvas` as unresolved from the Node-only DOCX parsing fallback.
- `npm run lint`: exit 1 because `next lint` prompts for ESLint setup; no ESLint config or top-level ESLint dependency is present.
- `git status --short -- web_app` reports the entire `web_app/` directory as untracked, so `git diff` cannot display its contents. No files outside `web_app/` were changed by this task.

---

## Recovery Continuation: Responsive Chrome Polish

**Goal:** Finish toast, header, and status bar responsive contracts while preserving the already implemented left sidebar and all document workflows.

**Scope:** Only `web_app/`. Keep Chuẩn hóa, Biểu mẫu, AI, DOCX, and SQLite behavior unchanged. Do not stage, commit, or push.

### Task 5: Responsive chrome regression tests and polish

**Files:**
- Modify: `tests/unit/workspace-layout.test.tsx`
- Modify: `tests/unit/responsive-ui.test.tsx`
- Modify: `app/page.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/StatusBar.tsx`

- [x] Add acceptance assertions first for toast z-order, non-scrolling header actions, editable title min-width, and compact profile width. RED: 2 test files failed; 4 assertions failed for the expected current classes; 12 tests passed.
- [x] Lower the toast below the mobile backdrop and drawer layers while keeping it out of the desktop sidebar area.
- [x] Keep all seven header controls available, use icon-only labels at narrow widths, remove horizontal action scrolling, and constrain both display and edit title states.
- [x] Keep audit and profile controls visible in StatusBar; reduce the profile width and hide the secondary score descriptor on narrow screens.
- [x] Re-run focused workspace, responsive, audit, template, and AI UI tests, then run fresh full test, typecheck, build, and lint commands from `web_app/`.
- [x] Inspect `git status --short -- web_app`; do not use a clean diff as evidence because `web_app/` is untracked.

### Recovery Continuation Verification

- Focused UI suite: exit 0; 6 test files, 42 passed, 0 failed.
- `npm test`: exit 0; 29 test files, 255 passed, 0 failed.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; Next.js reports optional `jsdom` peer `canvas` cannot be resolved; prerender also reports Node's `localStorage` experimental warning.
- `npm run lint`: exit 1; `next lint` opened its ESLint setup prompt. `rg --files -g '*eslint*' -g '.eslintrc*'` found no ESLint config, and `npm ls eslint --depth=0` reported an empty top-level dependency.
- Vitest warns that Vite's CJS Node API is deprecated; tests also emitted Node's `localStorage` experimental warning.

---

## Recovery + UI/UX Completion (2026-10-01)

**Scope:** Only `web_app/`. Preserve Chuẩn hóa, Biểu mẫu, AI, DOCX, and SQLite product behavior. Do not stage, commit, or push.

### UI and test changes

- [x] Move mobile toast feedback to the bottom safe area, under drawer/backdrop layers.
- [x] Keep all header actions available, progressively reveal secondary labels, retain the export primary action, truncate the title, and name icon-only controls.
- [x] Keep the 336px sidebar and tab navigation from scrolling horizontally; wrap template filters and long audit/template/AI content.
- [x] Keep status metrics and audit/profile controls compact; preserve semantic sidebar tabs, add semantic AI tabs and roving keyboard navigation, and expose selected filter/settings state.
- [x] Extend workspace, responsive, audit, template, and AI UI tests. The new assertions were observed failing before implementation, then passing.
- [x] Isolate `tests/db/sqlite-repository.test.ts` with `DATABASE_PATH=:memory:`. The existing repository tests otherwise wrote an audit row to the workspace database.

### Final verification from `web_app/`

- `npm test`: exit 0; 29 test files, 264 passed, 0 failed.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0. It passed compilation, static generation, and build trace collection. Warnings: optional `jsdom` peer `canvas` is not installed; Node reports experimental `localStorage` during prerender.
- `npm run lint`: exit 1 because `next lint` opens its first-run ESLint setup prompt. No ESLint config or top-level ESLint package is present.
- Focused UI tests: exit 0; 5 files, 42 passed, 0 failed.
- Vitest also reports the existing Vite CJS Node API deprecation and Node `localStorage` experimental warnings.

### Build and data investigation

- The previous hard timeout has no recorded Next.js phase output, so its exact cause cannot be confirmed. Bounded reproductions reached `Collecting build traces ...`, remained quiet briefly, then emitted the route summary and exited 0. The final build also exited 0; `.next` was not cleared because the build completed.
- Inspected the page import path: the DOCX `jsdom` fallback is lazy, SQLite opens only when repository methods run from API handlers, and those API routes are dynamic. No build-time database access or network call was found as the cause.
- One audit row from the first full test run was identified by its generated ID and run timestamp and removed. The repository test now uses an in-memory path; the final full test run passed with that isolation in place. Other audit rows were left untouched.
- Closing the targeted cleanup connection checkpointed existing committed WAL pages into `data/tvci.db`; the current WAL is empty. This changed the database files physically while retaining committed rows, apart from the single test artifact removed above.
- `ui-ux-pro-max` was unavailable in the local skill catalog and searched skill roots; established responsive and accessibility practices were used.
- `git status --short -- web_app` reports `?? web_app/` because the directory is untracked against HEAD. All edits made for this recovery are under `web_app/`; no staging or commits were performed.
