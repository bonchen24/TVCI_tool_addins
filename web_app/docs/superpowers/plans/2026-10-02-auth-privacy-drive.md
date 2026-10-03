# TVCI Authentication, Privacy Storage, and Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the editor behind minimal TVCI accounts while keeping document, Library, Knowledge, and Reference content out of the TVCI database and making Google Drive the optional user-controlled persistent store.

**Architecture:** Keep Next 14.2.15, React 18, TypeScript, and Node runtime APIs. Replace content tables and repositories with a minimal account schema, build auth/session helpers around Node crypto and `node:sqlite`, protect server-rendered route groups and APIs, and add a Drive REST service that encrypts token material at rest and scopes queries to app-managed categories. The browser editor remains session-only unless a user explicitly saves to Drive or exports a file.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Node `crypto` (`scrypt`, AES-256-GCM), built-in `node:sqlite`, Vitest, React Testing Library, Google OAuth/Drive REST APIs.

**Spec:** Root [`design.md`](../../../../design.md), especially sections 6.1–6.13. This plan follows the implementation task's explicit Drive-only long-term Knowledge behavior where the older section 3.2 describes browser persistence.

## Global Constraints

- Preserve the installed Next `14.2.15` and React `18.3.1` versions; use npm in `web_app/`.
- The TVCI database stores account/security state and minimal Drive connection state only; never persist document, template, Knowledge, Reference, prompt, AI response, or audit body content.
- User registration collects only username, password, password confirmation, and required current terms acceptance.
- TVCI login is independent of Google OAuth; request only `https://www.googleapis.com/auth/drive.file`.
- Never commit secrets; `.env.example` contains placeholders only.
- No commits or pushes; preserve unrelated root worktree changes.
- TDD for each logical unit: observe an expected failing test before adding its production behavior.

## Review Focus

- Existing SQLite files may contain legacy content tables: initialization must drop those tables and tests must prove the allowed table set.
- Expired, disabled, stale-terms, or replayed-session credentials must fail closed at pages and APIs.
- OAuth callbacks can arrive with wrong session, expired state, reused state, or absent refresh tokens; never save a plaintext token.
- Drive listing must remain within the app-owned root/category and must not query arbitrary My Drive files.
- Offline editing/export must continue to work when Drive is disconnected, while long-term save actions explain that Drive is required.

---

## File Structure

- `src/db/schema.ts`: allowed account/security tables and destructive legacy content-table migration.
- `src/db/client.ts`: Node SQLite initialization; `src/db/repository.ts` is removed as a content repository.
- `src/auth/*`: password hashing, session cookies, rate limits, registration/recovery, and server-side authorization.
- `src/privacy/terms.ts`: canonical terms version and copy for registration and re-consent.
- `app/(public)/*`, `app/(protected)/*`, `app/admin/*`, `app/api/auth/*`, `app/api/account/*`, `app/api/admin/*`: route structure and checks.
- `src/drive/*`, `app/api/drive/*`: OAuth, encrypted tokens, app folder mapping, and category-scoped Drive operations.
- `src/components/drive/*`, `src/components/auth/*`: focused UI controls; retain existing editor, task pane, and responsive layout.
- `tests/auth/*`, `tests/db/*`, `tests/drive/*`, `tests/privacy/*`, `tests/unit/*`: focused unit/integration and UI contract tests.
- `web_app/.env.example`, `web_app/docs/*`, root `PROJECT_MEMORY.md`: safe configuration and architecture notes.

## Task 1: Remove server-side content persistence

**Files:** `src/db/schema.ts`, `src/db/repository.ts`, `app/api/documents/**`, `app/api/audits/route.ts`, `tests/db/sqlite-repository.test.ts`, `tests/privacy/database-contract.test.ts`.

- [x] Replace document/template/audit repository tests with a failing migration test that pre-creates legacy tables, calls `initializeDatabase`, and asserts the only tables are `users`, `sessions`, `recovery_credentials`, `terms_acceptances`, `drive_connections`, `oauth_states`.
- [x] Run `npm test -- tests/db/sqlite-repository.test.ts tests/privacy/database-contract.test.ts`; confirm it fails because legacy tables remain and content routes exist.
- [x] Implement schema migration that drops `documents`, `document_versions`, `user_templates`, and `audit_logs`; create only minimal auth/Drive state tables; remove content repositories and old content/audit API routes.
- [x] Re-run the targeted tests and assert DB tests use `:memory:` only.

## Task 2: Authentication, recovery, terms, sessions, and admin APIs

**Files:** create `src/auth/{passwords,sessions,service,rate-limit}.ts`, `src/privacy/terms.ts`, `app/api/auth/{register,login,logout,recover,terms}/route.ts`, `app/api/account/{recovery,route}.ts`, `app/api/admin/{users,users/[id],users/[id]/recovery}/route.ts`, `tests/auth/auth-service.test.ts`, `tests/auth/auth-routes.test.ts`.

- [x] Add failing tests for terms-required registration; scrypt hash-only storage; one-time recovery code consumption/rotation; hashed random session tokens; finite expiry/cookie flags; disabled accounts; bootstrap superadmin env-only and must-change-password; per-username bounded attempts; admin-only account actions.
- [x] Run targeted auth tests and record expected missing behavior.
- [x] Implement the minimal functions with signatures `hashPassword(password)`, `verifyPassword(password, encodedHash)`, `createSession(userId)`, `getSession(token)`, `registerAccount(input)`, and `recoverAccount(input)`; use random per-password salts, SHA-256 session/recovery hashes, constant-time comparisons, and no IP/User-Agent persistence.
- [x] Add API handlers and env-only bootstrap from `SUPERADMIN_USERNAME` / `SUPERADMIN_INITIAL_PASSWORD`; never include secrets in source or responses except a one-time recovery code.
- [x] Re-run auth tests; add admin reset/disable/enable checks.

## Task 3: Public/protected UI and current terms acceptance

**Files:** create `app/(public)/{login,register,recover,consent}/page.tsx`, `app/(protected)/layout.tsx`, move editor entry to `app/(protected)/page.tsx`, create `app/(protected)/account/page.tsx`, `app/admin/page.tsx`, `src/components/auth/*`, `tests/auth/auth-ui.test.tsx`, `tests/privacy/protected-routes.test.ts`.

- [x] Add failing UI tests for registration fields only, warning against PII usernames, scrollable shared terms copy, unchecked acceptance gating, one-time recovery display/copy, login/recovery forms, session-protected editor redirect, stale-terms re-consent, account recovery rotation, responsive auth/editor controls, and admin role rejection.
- [x] Confirm the tests fail because route/UI gates do not exist.
- [x] Implement public forms and Node server layouts using validated server-side session lookups (not cookie-presence middleware); preserve the existing editor UI and expose username/Drive/account actions.
- [x] Re-run focused route/UI tests.

## Task 4: Drive OAuth and credential protection

**Files:** create `src/drive/{crypto,oauth,client,folders}.ts`, `app/api/drive/{connect,callback,disconnect,status,files}/route.ts`, `.env.example`, `tests/drive/oauth.test.ts`, `tests/drive/crypto.test.ts`.

- [x] Add failing tests asserting OAuth uses only `drive.file`, binds one-time state to current hashed session, rejects expiry/replay/wrong-session state, AES-256-GCM round-trips tokens, and SQLite never contains plaintext tokens.
- [x] Run targeted Drive tests and observe expected failures.
- [x] Implement OAuth code exchange with offline access, session-bound expiring one-time state, AES-256-GCM using a 32-byte environment key, access-token refresh, revocation on disconnect when possible, and no Drive file deletion.
- [x] Implement canonical app root plus `Documents`, `Templates`, `Knowledge`, `References`, and visible `AppData` folders; use app properties and parent-scoped queries only.
- [x] Re-run tests with mocked Google endpoints; live OAuth remains deployment-configured.

## Task 5: Drive-backed documents, Library, Knowledge, and References

**Files:** create `src/drive/resources.ts`, `app/api/drive/{documents,templates,knowledge,references}/route.ts`, resource detail routes, `src/components/drive/PersonalStoragePanel.tsx`, `tests/drive/resources.test.ts`, `tests/privacy/content-storage.test.ts`.

- [x] Add failing tests for app-category isolation, save/open/save-as/delete with explicit confirmation, manifest metadata only, explicit Knowledge save and selected-only AI context, no References-to-Knowledge promotion, personal templates separate from built-ins, and no content persistence on TVCI.
- [x] Run the tests and confirm they fail before resource APIs/UI exist.
- [x] Implement JSON canonical document files and user-triggered DOCX export where appropriate; explicit upload/import into separate categories; Knowledge title/body/tags/timestamps; user-driven list/search/view/edit/delete; and a minimal AppData manifest containing identifiers/metadata only.
- [x] Keep offline export enabled; disable/prompt Drive save when disconnected. Do not add automatic autosave, arbitrary Drive scanning, or automatic Knowledge injection.
- [x] Re-run mocked Drive integration and privacy tests.

## Task 6: Replace SQLite editor actions and remove server audits

**Files:** `app/(protected)/page.tsx`, `src/components/layout/Header.tsx`, remove `src/components/documents/DocumentManagerModal.tsx`, update `tests/unit/workspace-layout.test.tsx`, `tests/unit/responsive-ui.test.tsx`, add `tests/privacy/editor-storage.test.tsx`.

- [x] Add failing editor tests proving offline DOCX export remains available, disconnected Drive save prompts instead of issuing content requests, connected actions use Drive endpoints, and audit is client/session-only.
- [x] Run tests to confirm old SQLite labels/routes are still present.
- [x] Replace SQLite controls with privacy-correct Drive connect/save/open/save-as/export and account status; remove `/api/audits` writes and DB document manager; retain editor/task pane responsive behavior.
- [x] Re-run focused editor/privacy tests and ensure no UI label “Lưu DB” or active content DB write path remains.

## Task 7: Final hardening, documentation, and verification

**Files:** `web_app/docs/*`, `.env.example`, root `PROJECT_MEMORY.md`, tests touched above.

- [x] Add safe deployment/configuration documentation in `web_app/docs/auth-and-drive-setup.md` and `web_app/docs/privacy-storage-migration.md`.
- [x] Update `PROJECT_MEMORY.md` with the privacy table model, auth/session design, Google Drive least-privilege flow, and the Knowledge resolution: Drive-only persistence on explicit save with selected-only request context.
- [x] Record the immediately preceding corrective task's full `npm test`: exit 0; 395 tests passed across 68 files (see exact verification record below).
- [x] Record the immediately preceding task's `npm run typecheck`: passed.
- [x] Record the immediately preceding task's `npm run build`: succeeded; optional `jsdom` `canvas` resolution warning.
- [x] Record the immediately preceding task's root `npm run validate-manifest`: passed.
- [x] Record the immediately preceding task's `git diff --check`: exit 0; scope/content-persistence searches found no broad Drive scope or active TVCI document/audit persistence route/write.
- [ ] Run a valid lint check; the immediately preceding task has no successful valid lint result recorded.
- [ ] Run `npm audit --omit=dev`; it was not run in the immediately preceding task, so no result is available.
- [x] If a verification failure occurs, use systematic debugging, add a reproducing test before a fix, then rerun affected and full checks.
- [x] Review the corrective diff and working-tree scope; do not commit or push.

### Corrective acceptance verification (2026-10-02)

- Recovery RED reproduced both concurrent attempts succeeding (2/2). After the atomic claim fix, `npm test -- tests/auth/auth-service.test.ts` passed 11/11, including one winner, one consumed code, and authentication only with the winning password.
- Context RED reproduced unchecked selection after Personal → AI → Personal, missing queued-context visibility, and the old reference payload surviving a new-document reset while Personal was unmounted. The focused lifecycle/storage/AI set passed 19/19 after the shared-state fix.
- Full web-app verification: `npm test` passed 395 tests across 68 files; `npm run typecheck` passed; `npm run build` succeeded with an optional `jsdom` `canvas` resolution warning; root `npm run validate-manifest` passed; `git diff --check` exited 0. Scope and content-persistence searches found no broad Drive scope or active TVCI document/audit persistence route/write.
- At the time of the corrective acceptance run, the Task 7 deployment-memory update and `npm audit --omit=dev` were outside scope. The docs/memory deliverable is now checked above; `npm audit --omit=dev` remains unverified, and no valid lint result was recorded.
