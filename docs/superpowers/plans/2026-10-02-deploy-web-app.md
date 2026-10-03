# Deploy Web App to Docker Desktop Plan

> **For agentic workers:** Execute this plan inline with checkpoints. This is an operational deployment; do not add application behavior or alter Docker architecture.

**Goal:** Build the current `web_app` production image and recreate its existing Docker Compose service on Docker Desktop.

**Architecture:** Use `web_app/Dockerfile` and `web_app/docker-compose.yml` as configured. Rebuild and force-recreate `tvci-web-app`, preserving its existing named SQLite volume and published port.

**Tech Stack:** Next.js 14, Node.js 22 Alpine, Docker Compose, SQLite named volume.

**Spec:** `design.md` (Single Source of Truth; local Vietnamese spell-check privacy requirements).

## Global Constraints

- Keep Compose service/container `tvci-web-app`, published port `2350:3000`, and named volume `tvci_sqlite_data`.
- Do not remove persistent volumes or expose secret values.
- Build from the current `web_app` workspace, including spell-check files.
- Make no product logic changes unless a build failure proves one is needed.

---

### Task 1: Inspect and check the current app

**Files:** Read `design.md`, `web_app/Dockerfile`, `web_app/docker-compose.yml`, and `web_app/package.json`.

- [x] Confirm the app's production build and existing Compose service/port/volume.
- [x] Run web app typecheck and unit tests; record any failures before changing code. Typecheck passed; after one timeout on the first parallel run, the timed test passed alone and the full suite passed (353 tests).

### Task 2: Build and deploy the existing Compose service

**Files:** No application files unless a verified build failure requires a minimal fix.

- [x] Build and force-recreate `tvci-web-app` with Docker Compose without removing volumes.
- [x] Confirm the resulting container uses the current image and remains running.

### Task 3: Verify runtime and finish

**Files:** No application files.

- [x] Review recent startup logs for fatal errors; Next.js reported `Ready` with no fatal errors.
- [x] Request the app endpoint on port 2350 and confirm a successful response; `/`, `/login`, and both Vietnamese dictionary assets returned HTTP 200.
- [x] Confirm the named data volume remains attached and report commands/results; `web_app_tvci_sqlite_data` remains mounted at `/app/data`.
