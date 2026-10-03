# TVCI Login Experience Implementation Plan

> **For agentic workers:** Execute inline in the current shared workspace. Do not stage, commit, or push. Preserve all unrelated existing changes.

**Goal:** Redesign only the TVCI Document Platform login experience while preserving authentication, routing, session, and privacy behavior.

**Architecture:** The login route gets a dedicated responsive `LoginExperience` shell, leaving the shared `AuthShell` and registration/recovery pages unchanged. `LoginForm` retains its existing POST and redirect flow while adding accessible password visibility and touch-friendly styling. Both real logos are copied unchanged to the Next.js public brand directory.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, lucide-react, Vitest, React Testing Library.

**Spec:** Approved login redesign requirements in the active user request; no separate design document for this bounded change.

## Global Constraints

- Change only the login page, login UI components, login UI tests, and real logo copies needed for this task.
- Preserve `POST /api/auth/login`, request body, busy state, error state, routing, privacy, and session behavior.
- Do not change registration, recovery, Google Drive consent, auth APIs, dependencies, or packages.
- Use the existing IEMM and TVCI logo files, preserve their aspect ratios, and render with `object-contain`.
- Run login tests RED before UI implementation, then focused and full verification; do not commit or push.

---

### Task 1: Add login experience regression coverage

**Files:**
- Modify: `web_app/tests/auth/auth-ui.test.tsx`

- [x] Add behavior tests for real logo paths and alt text, responsive desktop/mobile brand regions, approved copy, password visibility, login POST payload and both existing redirect destinations, register/recover links, no Google sign-in action, and a fluid mobile-width shell.
- [x] Run `npm test -- tests/auth/auth-ui.test.tsx` from `web_app/`; RED was 5 failed and 8 passed before implementation.

### Task 2: Implement the login-only presentation

**Files:**
- Create: `web_app/src/components/auth/LoginExperience.tsx`
- Modify: `web_app/app/(public)/login/page.tsx`
- Modify: `web_app/src/components/auth/LoginForm.tsx`
- Create: `web_app/public/brand/iemm.jpg` (byte-for-byte copy of `assets/logo-iemm.jpg`)
- Create: `web_app/public/brand/tvci.png` (byte-for-byte copy of `assets/logo-tvci.png`)

- [x] Build a 45/55 desktop shell with the institutional product panel and CSS-only A4 motif, plus a compact single-column mobile brand header.
- [x] Keep the form column around 448px, use explicit labels and 44px+ controls, visible focus rings, accessible password toggling, secondary account links, and an accessible nearby error alert.
- [x] Keep all auth request and routing statements unchanged; leave shared `AuthShell` consumers untouched.
- [x] Run the focused auth UI tests and confirm GREEN: 13/13 passed.

### Task 3: Verify the scoped result

**Files:**
- No additional files unless a verification failure requires a test-first fix.

- [x] Run focused login/auth UI tests, full `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check`.
- [x] Search the login implementation for both `/brand` assets and confirm no fake `TV` badge is rendered by the login route.
- [x] Review the login form against the original API payload, busy/error states, and redirect condition; report all command counts and warnings accurately. Root and web app suites, typechecks, and builds passed; manifest validation passed.
