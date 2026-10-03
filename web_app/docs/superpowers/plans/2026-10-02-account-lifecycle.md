# Account Lifecycle Completion Implementation Plan

> **For agentic workers:** Execute inline with Superpowers plan checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users change their own password and let normal users delete their TVCI account while preserving Google Drive files.

**Architecture:** Keep account authority in the validated TVCI session. Password changes verify the session owner's existing hash, rotate every session, and issue a fresh cookie. Self-deletion verifies the session owner's password and confirmations, best-effort revokes only encrypted Google credentials using the existing Drive client, then relies on account foreign-key cascades for local security metadata.

**Tech Stack:** Next.js 14.2.15 App Router, React 18, TypeScript, Node `crypto`, `node:sqlite`, Vitest, React Testing Library.

**Spec:** Root `design.md`, account/privacy section 6.1 and Google Drive section 6.3, updated with this lifecycle.

## Global Constraints

- Keep Next.js `14.2.15` and React 18; add no dependencies.
- Do not redesign login, Drive, Knowledge, Library, References, or admin table.
- Do not accept a client username or user ID as authority for password change or deletion.
- Never return or log passwords, hashes, recovery values, OAuth tokens, or document content.
- Account deletion may revoke credentials but must never mutate Google Drive files or folders.
- Preserve the current schema's `ON DELETE CASCADE` relationships and verify every account-owned table is emptied.
- Do not commit or push; preserve unrelated dirty workspace files.

---

## File Map

- `tests/auth/account-lifecycle-api.test.ts`: auth API regression coverage for current-password checks, session rotation, deletion validation, cascades, revocation, and cookie clearing.
- `tests/auth/account-panel.test.tsx`: password and deletion form behavior/copy.
- `src/auth/service.ts`: verify the current password against the user loaded by session ID before changing its hash.
- `src/auth/api.ts`: require password confirmation, rotate sessions, and implement authenticated self-deletion with existing Drive decryption/revocation helpers.
- `app/api/account/route.ts`: expose the deletion handler as `DELETE`.
- `src/components/auth/AccountPanel.tsx` and `app/(protected)/account/page.tsx`: always show password settings; show the danger zone only for normal accounts.
- `design.md`: record the account lifecycle and preserve existing privacy/Drive invariants.

## Task 1: Add focused tests and record RED

- [x] Add UI tests for voluntary password-change availability, required-state emphasis, current/new/confirmation validation, and explicit Drive-preservation copy in the danger zone.
- [x] Add API tests proving a wrong current password cannot change the hash; a correct current password updates the hash, clears the forced-change flag, invalidates old sessions, and issues a fresh cookie.
- [x] Add API tests for unauthenticated deletion, wrong password, missing checkbox, mismatched typed username, normal-user cascades, best-effort revoke without file operations, revocation failure, superadmin block, and cookie clearing.
- [x] Run the focused tests before production edits. RED evidence: `npm test -- tests/auth/account-lifecycle-api.test.ts tests/auth/account-panel.test.tsx --reporter=verbose` exited 1 with 2 test files failed, 13 tests failed, 2 passed. Failures were the expected missing current-password/confirmation checks, deletion handler, normal-account password form, and deletion UI; the existing forced-change emphasis and successful session-rotation behavior passed.

## Task 2: Implement secure password changes and self-deletion

- [x] Update `design.md` with the approved lifecycle before changing production behavior.
- [x] Add a service operation that loads the session owner's stored hash, verifies the current password, applies existing 12–128 character validation through `hashPassword`, updates the hash/flag, and removes all old sessions.
- [x] Update `changePassword` to require `currentPassword`, `newPassword`, and matching `confirmPassword`; return a generic Vietnamese verification error for a wrong current password; create a new session for the current user and set its secure cookie.
- [x] Add `deleteAccount` to resolve only `session.id`, block `superadmin`, require the explicit checkbox and normalized username match, verify the current password, reuse `loadEncryptedCredentials` and `GoogleDriveClient.revoke` best-effort, delete the local user, and clear the session cookie.
- [x] Add `DELETE /api/account`; do not add any Drive file or folder operation to this flow.
- [x] Re-run focused API tests and confirm GREEN. Both focused files passed: 15/15 tests.

## Task 3: Implement the account UI

- [x] Render the password form for every authenticated account, including current password, new password, confirmation, browser length constraints, and mismatch handling.
- [x] Retain amber required-state emphasis/copy when `mustChangePassword` is true; preserve existing protected-route redirects.
- [x] Render the normal-user danger zone with the password, checkbox, and username confirmation fields and the required Vietnamese Drive-preservation explanation.
- [x] Submit `DELETE /api/account`; on success navigate to `/login`.
- [x] Re-run focused UI tests and confirm GREEN as part of the 15/15 focused test run.

## Task 4: Fresh verification and scope audit

- [x] Run focused account/auth tests, then `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check`. Focused tests: 15/15; all auth tests: 51/51 across 9 files; full `web_app` suite: 391/391 across 67 files; typecheck/build/diff check all exited 0. Root `npm run validate-manifest` also exited 0.
- [x] Search production account/auth paths for password values being logged or returned. No console logging matches; responses are limited to generic errors or `{ success: true }`, with password hashes remaining in service-level database reads/writes.
- [x] Search the deletion implementation and its tests to verify it performs no Drive file delete/trash operation. Implementation search returned no Drive file, trash, or `deleteManagedFile` match; the test observes only POST to `https://oauth2.googleapis.com/revoke`.
- [x] Review the final `design.md` diff. It records voluntary current-password-verified changes, self-deletion and local cascades, best-effort Drive revoke without file mutation, the superadmin block, and no new PII fields.

### Final warning notes

- Vitest prints the existing Vite CJS Node API deprecation and Node experimental `localStorage` warnings.
- Next build succeeds with the existing optional `canvas` resolution warning from `jsdom`.
- `git diff --check` exits 0 and prints Git LF/CRLF conversion warnings for already-dirty files in the shared working tree.
