# Production installer verification plan

## Scope

- Preserve the current working tree; do not reset, revert, or commit.
- Harden only the production installer, local HTTPS host, lifecycle scripts, and installer QA needed for the requested Windows x64 / Office 2024 x86+x64 package.
- Produce `release/TVCI-Word-Tools-Setup-<package-version>.exe` and a matching SHA-256 sidecar.

## Checklist

- [x] Inspect the existing installer, host, verification scripts, package pipeline, and working-tree state.
- [x] Run the required pre-package checks and record their results.
- [x] Add focused regression coverage for the installer hardening changes before implementation.
- [x] Implement the minimum production hardening: install-path consistency, certificate/host readiness, safe lifecycle behavior, Office/WebView2 detection, conflict diagnostics, and explicit failure logging.
- [x] Run the focused regression tests (RED before implementation, GREEN after implementation).
- [x] Re-run all required checks in the requested order.
- [x] Run `npm run installer` and validate the new EXE and SHA-256.
- [x] Perform safe local smoke verification where possible without stopping Word or unrelated processes.
- [x] Report clean-machine limitations explicitly and confirm no commit was made.

## Verification criteria

- The installer uses the package version in its EXE name and writes the matching SHA-256.
- No source workspace, Node/npm/Python/Git/VS Code/Inno Setup dependency is required on a client.
- The installed host binds loopback-only on port 38473, uses a per-user certificate generated on that machine, and returns `READY` only after HTTPS health succeeds.
- Port conflicts fail with a named check and leave unrelated processes untouched.
- Office architecture detection works through 32-bit/64-bit registry views and supported Click-to-Run/App Paths paths.
- WebView2 is detected before host readiness; the bundled bootstrapper is used when missing and failure is logged.
- Manifest and autostart point into the installed production directory.
- Repair preserves user data; uninstall removes only TVCI registration, certificate, host, and installed components; Word is never killed.

---

# Production Readiness Completion Plan (2026-10-02)

> **Execution:** Single end-to-end task, inline in this session. No delegation, staging, commits, or writes outside `web_app/`.

**Goal:** Bring the web app to Next.js 16.3.8 Active LTS, restore selectable text in the A4 editor, enable real ESLint CLI linting, and verify the production build without changing document business behavior or data.

**Architecture:** Keep the approved workspace layout and feature components intact. Apply the `user-select:text` override only to ProseMirror, migrate only Next/React/type/lint dependencies and required route/config compatibility, and preserve Node runtime/dynamic SQLite routes. Let the Next 16 Turbopack build determine whether the old Webpack fallbacks are still needed.

**Tech Stack:** Next.js 16.3.8, React/ReactDOM 19.3.0, TypeScript, pnpm, Vitest, ESLint flat config, Docker Node 22.

**Spec:** User request in the active conversation; approved sidebar-left/A4-right UI design and all constraints in `AGENTS.md`.

## Global Constraints

- Only change files under `web_app/`; do not stage, commit, or push.
- Preserve all business behavior for audit, templates, AI, DOCX, and SQLite.
- Never read/write secrets or modify real `web_app/data` databases.
- Keep the existing pnpm lockfile and do not create a competing lockfile.
- Keep the approved 336px left sidebar, responsive drawer, existing accessibility and visual design.
- Target stable Next.js `16.3.8`; use React/ReactDOM `19.3.0`; Node runtime minimum is `20.9`.

### Single End-to-End Task: Production readiness

**Files expected:**
- Modify: `package.json`, `pnpm-lock.yaml`, `next.config.mjs`, route handlers under `app/api/documents/`, and `src/styles/a4-canvas.css`.
- Create: `eslint.config.mjs`, `tests/unit/editor-text-selection.test.tsx`.
- Modify if lint evidence requires: narrowly-scoped files under `app/`, `src/`, `tests/`, and `e2e-tests/`.
- Review only: `Dockerfile`, `app/layout.tsx`, `app/page.tsx`, layout/editor/AI components, SQLite client/repository/routes, and existing UI tests.

- [x] Audit package, config, Docker, layout/editor, sidebar/header/status/AI, SQLite routes/repository, and existing UI tests. No Obsidian MCP or root `PROJECT_MEMORY.md` exists; use the in-scope plan verification record as the project note.
- [x] Record fresh baseline commands: `npm test` (exit 0, 29 files / 264 tests), `npm run typecheck` (exit 0), `npm run build` (exit 0 with existing jsdom/canvas and Node localStorage warnings), `npm run lint` (exit 1 at interactive Next 14 ESLint setup prompt).
- [ ] Add the editor selection regression test first; confirm it fails because the ProseMirror selector lacks a text-selection override while the chrome remains nonselectable.
- [ ] Add the minimal ProseMirror text-selection override; confirm the focused test passes.
- [ ] Upgrade Next/React/React types to the approved stable versions; migrate `serverComponentsExternalPackages`, remove Webpack fallbacks only if the actual Turbopack build succeeds, and update dynamic route params only if required by Next 16.
- [ ] Add ESLint 10 and `eslint-config-next@16.3.8`, configure flat ESLint without broad disables/ignores, replace `next lint` with a noninteractive CLI script, and fix only lint errors relevant to this app.
- [ ] Preserve the existing workspace/responsive/audit/template/AI test contracts and API route SQLite runtime/dynamic declarations.
- [ ] Run fresh final verification from `web_app/`: tests, typecheck, lint, build, runtime-only npm audit, Docker production build if daemon is available, and `git status --short -- web_app`.
- [ ] Record exact exit codes, test totals, warnings, audit findings, Docker availability/result, and the scoped working-tree status below.

### Baseline notes

- Node on this runner: `v26.5.0`; Dockerfile uses Node `22-alpine`.
- Package manager and sole lockfile: pnpm / `pnpm-lock.yaml`.
- `next@16.3.8` metadata requires Node `>=20.9.0`; peers allow React `^18.2.0 || ^19.0.0`.
- `react@19.3.0` and `react-dom@19.3.0` are stable; matching type packages available: `@types/react@19.2.14`, `@types/react-dom@19.2.3`.
- Next 16.3.8 package metadata is published on npm; Next official upgrade docs document Turbopack defaults, explicit `--webpack` opt-out, renamed `serverExternalPackages`, and ESLint CLI migration.
