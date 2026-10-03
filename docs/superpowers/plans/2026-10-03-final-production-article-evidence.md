# Final Production and Article Evidence Implementation Plan

> **For agentic workers:** Execute this plan inline with checkpoints. Preserve all pre-existing worktree changes and do not stage or commit.

**Goal:** Complete lint and session-context hardening, run the existing web app in production on port 2350, capture real UI evidence, and record fresh verification results.

**Architecture:** Keep the existing Next.js app, Dockerfile, Compose service, auth database volume, and feature architecture. Make only verified lint fixes and a component lifecycle boundary keyed to the authenticated username; use the established registration/bootstrap paths for local demo access; capture screenshots from the running production app and document any route that cannot be accessed without an external account.

**Tech Stack:** Next.js 15, React 18, TypeScript, Vitest, ESLint, Docker Compose, SQLite named volume, Chromium based browser capture.

**Spec:** User task dated 2026-10-03: “FINAL PRODUCTION + ARTICLE EVIDENCE”; acceptance requirements are reproduced below.

## Global Constraints

- Publish the `web_app` production service on host port `2350`; do not change root Word Add-in configuration.
- Preserve all existing dirty and untracked work; do not reset, checkout, delete user files, stage, commit, push, or deploy to the Internet.
- Keep Drive opt-in as a user-controlled reference/personal resource connection; it is not application runtime storage.
- Keep AI selected context transient, clear it at document/account boundaries, and preserve Diff Preview plus explicit user confirmation before applying edits.
- Never automatically correct proper names or terms during spell checking.
- Do not put credentials, API keys, or sensitive personal content in code, tests, screenshots, or reports.
- For behavior changes, add the regression test first and verify its expected failure before implementation.
- Do not disable lint rules globally or change/downgrade dependencies to hide findings.

---

### Task 1: Reproduce and close the account context boundary

**Files:** `web_app/tests/drive/ai-context-lifecycle.test.tsx`, `web_app/src/components/editor/EditorWorkspace.tsx`.

- [ ] Add a test that selects a Drive reference as user `writer-a`, rerenders the workspace as user `writer-b`, and asserts that neither the selected-context display nor the next AI request contains the first user's reference body.
- [ ] Run `npm test -- tests/drive/ai-context-lifecycle.test.tsx` from `web_app/`; confirm the new assertion fails because state survives the changed user prop.
- [ ] Key the stateful workspace subtree by the unique authenticated username so editor contents, selected AI resources, spell-check state, and AI drafts are discarded when ownership changes.
- [ ] Re-run the lifecycle test and verify the selection is empty for the second user; retain the existing checks for new-document clearing and one-request context consumption.
- [ ] Run the focused Diff Preview and spell-check user-confirmation tests; confirm applying AI suggestions still requires explicit confirmation and spelling only offers user-approved suggestions.

### Task 2: Resolve all project lint findings without suppressing rules

**Files:** Modify only files reported by `npm run lint` under `web_app/app/` and `web_app/src/`, including the AI routes and utilities, auth and Drive services, editor/workspace/sidebar components, DOCX importer/exporter, audit hook, and rule/template modules.

- [ ] Use the already reproduced `npm run lint` exit 1 (86 errors, 27 warnings) as the RED baseline; preserve `no-explicit-any`, `no-html-link-for-pages`, `no-require-imports`, hook dependency, and unused-symbol checks.
- [ ] Replace untyped error/document/editor values with `unknown`, Tiptap JSON/editor types, or small structural types; narrow errors before reading properties.
- [ ] Keep OAuth redirect links as full document navigations; use a narrowly documented local rule exception only if replacing them with a Next client link would change the OAuth redirect flow.
- [ ] Use `next/link` for ordinary page navigation, remove unused imports/locals and stale disable directives, and escape JSX entities.
- [ ] Re-run lint after each coherent module group; run focused tests and typecheck for modules whose types or behavior changed.
- [ ] Finish with `npm run lint` from `web_app/` at exit 0 with zero errors and zero warnings; do not modify dependencies merely to make lint pass.

### Task 3: Validate and run production Compose safely

**Files:** `web_app/docker-compose.yml`, `web_app/Dockerfile`, `web_app/.env.example` only if inspection proves a production configuration gap; otherwise leave them as-is.

- [ ] Confirm Compose still publishes host `2350` to container `3000`, uses the standalone production server, and mounts the existing named auth database volume at `/app/data`.
- [ ] Inspect current Compose/container/volume state before starting; never remove or reset the named volume. Bind the host port to loopback if the Compose production mapping currently exposes it on all interfaces.
- [ ] Add a production health check only if absent, using Node's built-in `fetch` against `/login`; do not add a runtime package for health checks.
- [ ] Validate configuration with `docker compose config --quiet`, then build and start the existing `tvci-web-app` service without volume removal.
- [ ] Confirm Compose health, host port `2350`, `/login` HTTP 200, protected-route redirects, static spell-check data, and a basic page load from the production server.

### Task 4: Capture real production article figures

**Files:** Create PNGs in `docs/article/screenshots/`; create `docs/article/figure-manifest.md`.

- [ ] Use the running production server at `http://127.0.0.1:2350` and a 1440-pixel desktop viewport; capture genuine browser output, never synthetic or hand-composed UI.
- [ ] Use non-sensitive local demo content and existing bootstrap/registration flows. Keep generated passwords in process memory only and omit them from command output, screenshots, tests, and reports.
- [ ] Capture, where reachable: `01-login.png`, `02-editor.png`, `03-templates-forms.png`, `04-format-check.png`, `05-spellcheck.png`, `06-ai-assistant.png`, `07-knowledge-references.png`, and `08-admin.png`.
- [ ] Verify each image is PNG, at least 1440 pixels wide, legible, and free of passwords, API keys, tokens, or sensitive personal data.
- [ ] In the Vietnamese manifest, record each image's caption, demonstrated feature, and `captured` or `not captured` state. For inaccessible external OAuth/Drive screens, record the nearest valid production screen and the specific missing integration/session reason.

### Task 5: Fresh full verification and production report

**Files:** Create `docs/article/production-verification.md`.

- [ ] Run and record fresh exit codes and results for `web_app`: `npm run lint`, `npm test`, `npm run typecheck`, `npm run build`, and production dependency audit.
- [ ] Run and record fresh exit codes and test totals for root: `npm test`, `npm run typecheck`, `npm run build`, and `npm run validate-manifest`.
- [ ] Run `git diff --check` and the production smoke checks after the final code/configuration change.
- [ ] Record Docker image/container/volume/port/health evidence and remaining upstream or environmental warnings with their production impact.
- [ ] Review all touched files and final screenshots; leave all changes unstaged and uncommitted.

