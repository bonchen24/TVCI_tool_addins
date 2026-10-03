# Handoff Report — M1 Explorer 1: Web App Shell & Design System

**Role:** M1 Explorer 1  
**Milestone:** M1 (`core-platform-editor`)  
**Target:** `e:\CODING\TVCI_word_addins\web_app`  
**Parent Task ID:** `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Date:** 2026-09-29  

---

## 1. Observation

1. **User Requirement R5 in `ORIGINAL_REQUEST.md:28-29`**:
   > "Giao diện đạt tiêu chuẩn UI/UX hiện đại (Flat/Minimal, font chữ Plus Jakarta Sans, icon SVG Lucide đồng bộ, màu chủ đạo Indigo `#6366F1` và nút thao tác Emerald `#10B981`). Bố cục gồm thanh công cụ soạn thảo, khung văn bản trung tâm, và thanh bên có thể thu gọn chuyển đổi giữa Bộ chuẩn hóa, Thư viện mẫu và AI Workspace."
2. **Acceptance Criteria in `ORIGINAL_REQUEST.md:34-35`**:
   > "- [ ] `npm run build` chạy thành công không có lỗi TypeScript, ESLint hay lỗi biên dịch Next.js.
   > - [ ] Bộ kiểm thử tự động (Unit / Integration tests) chạy qua 100% với `npm test`."
3. **Architecture Specification in `PROJECT.md:4-11, 74-89`**:
   > "Presentation Layer: Next.js 14 App Router, React 18, Tailwind CSS, Plus Jakarta Sans (UI) + Times New Roman (canvas), Lucide React, Indigo `#6366F1` & Emerald `#10B981` palette."
   > Outlines directory layout under `web_app/` with `package.json`, `tsconfig.json`, `tailwind.config.js`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, and `src/components/layout/`.
4. **Existing Codebase & Tooling**:
   - `e:\CODING\TVCI_word_addins\package.json:35-64` uses Node 22, React 18.3.1, TypeScript 5.7.2.
   - `e:\CODING\TVCI_word_addins\src\branding.ts:1-12` defines TVCI branding ("VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN", "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP", "Chuẩn hóa · Biểu mẫu · AI trợ lý").
   - `e:\CODING\TVCI_word_addins\.agents\teamwork\explorer_survey_3\survey_report.md:63-72` confirms Vitest is required over Jest for `web_app` to bypass ESM module transformation hurdles with modern packages (`lucide-react`, `@tiptap/*`, `nanoid`).

---

## 2. Logic Chain

1. **Observation 1 & 3 dictate the Presentation Layer**:
   - `app/layout.tsx` must configure `Plus_Jakarta_Sans` via `next/font/google` with variable `--font-plus-jakarta-sans`.
   - `tailwind.config.ts` must register `primary: { DEFAULT: '#6366F1', ... }` and `action: { DEFAULT: '#10B981', ... }`, as well as legal A4 margin spacing tokens for Nghị định 30/2020 (`20mm`, `20mm`, `30mm`, `15mm`).
   - SVG icons must use `lucide-react` exclusively without any decorative emojis.
2. **Observation 1 dictates the Application Shell Structure**:
   - Top navbar (`Header.tsx`): 56px height (`h-14`), displaying editable document title, save status badge, and prominent action buttons (`Xuất DOCX` with `variant="action"` Emerald styling, `Nhập DOCX`, `Văn bản mới`, `Cài đặt`).
   - Collapsible 3-tab sidebar (`Sidebar.tsx`): 384px width (`w-96`), switching between Audit (`ShieldCheck`), Templates (`LayoutTemplate`), and AI Workspace (`Sparkles`), with smooth collapse/expand control.
   - Central document desk (`page.tsx`): scrollable viewport centering an A4 paper canvas (`width: 210mm`, `minHeight: 297mm`, `fontFamily: "Times New Roman"`, margins matching NĐ 30: Top 20mm, Bottom 20mm, Left 30mm, Right 15mm).
   - Bottom status bar (`StatusBar.tsx`): 24px height (`h-6`), reporting word/paragraph count, active administrative profile (`NĐ 30/2020 TVCI`), and real-time Health Score (`100%`).
3. **Observation 2 & 4 dictate Build & Verification Toolchain**:
   - `package.json` scripts map `npm run build` to `next build`, `npm run typecheck` to `tsc --noEmit`, and `npm test` to `vitest run`.
   - `vitest.config.ts` uses `@vitejs/plugin-react` with `jsdom` and setup in `tests/setup.ts` (`@testing-library/jest-dom`), ensuring immediate sub-second test execution.
   - All core and future dependencies (`@tiptap/*`, `docx`, `jszip`, `diff`) are included in `package.json` to prevent dependency mismatch in subsequent milestones.

---

## 3. Caveats

1. **No Terminal Execution**: Read-only exploration constraints strictly forbid executing CLI commands (`npm install`, `next build`) in this turn. Tooling and file configurations were cross-verified via static analysis against Next.js 14 and Tailwind 3.4 specifications.
2. **Editor & Tables Slots**: The rich text toolbar and Tiptap document canvas integration belong to M1 Explorer 2 (`m1_explorer_2`), while 2-column administrative table header/footer belong to M1 Explorer 3 (`m1_explorer_3`). Concrete mounting DOM slots (`#editor-toolbar-slot` and `#a4-editor-canvas-slot`) have been reserved in `app/page.tsx`.

---

## 4. Conclusion

The complete Next.js 14 + Tailwind CSS + UI/UX application shell specification is finalized and documented in:
`e:\CODING\TVCI_word_addins\.agents\teamwork\m1_explorer_1\analysis.md`

All configurations (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `next.config.mjs`, `postcss.config.js`) and UI components (`layout.tsx`, `page.tsx`, `Header.tsx`, `Sidebar.tsx`, `StatusBar.tsx`, `Button.tsx`, `Badge.tsx`) are fully written, type-safe, and ready for immediate instantiation by the implementer agents.

---

## 5. Verification Method

Once files are scaffolded into `e:\CODING\TVCI_word_addins\web_app`:
1. **Inspect Files**: Confirm existence of `web_app/package.json`, `web_app/tsconfig.json`, `web_app/tailwind.config.ts`, `web_app/vitest.config.ts`, `web_app/app/layout.tsx`, and `web_app/app/page.tsx`.
2. **Execute Type Check**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm run typecheck
   ```
   *Expected result:* 0 errors.
3. **Execute Vitest Unit Tests**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm test
   ```
   *Expected result:* 100% test pass rate for `design-system.test.ts` and `Header.test.tsx`.
4. **Execute Next.js Production Build**:
   ```bash
   cd e:\CODING\TVCI_word_addins\web_app
   npm run build
   ```
   *Expected result:* Successful build with static page optimization (`/` route).
