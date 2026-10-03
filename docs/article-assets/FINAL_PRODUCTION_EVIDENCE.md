# Final Production Evidence — Atomic I2

**Captured:** 2026-10-03 02:05:44 +07:00  
**Result:** READY — the current `web_app` image was built and only the existing `tvci-web-app` Compose service was recreated.

## Readiness evidence reviewed before deployment

- The Oct. 2 [login experience verification plan](../superpowers/plans/2026-10-02-login-experience.md) records passing focused and full tests, typechecking, production builds, and manifest validation. It reports 56 root suites / 305 tests and 63 web-app test files / 353 tests.
- The Oct. 2 [Vietnamese spell-check verification plan](../superpowers/plans/2026-10-02-vietnamese-spell-check.md) records passing root and web-app typechecking, tests, and builds. Its lint command could not run because this workspace has no ESLint configuration/dependency.
- The M6 final forensic auditor run dated Sept. 29 is still marked `IN_PROGRESS`; it has no completed handoff verdict or recorded Critical/Important blocker. No current `NOT READY` finding was present in the reviewed evidence.

## Deployment

- Compose project directory: `web_app`
- Service/container: `tvci-web-app` / `tvci-web-app`
- Image tag: `web_app-tvci-web-app:latest`
- Image ID: `sha256:a4fa3bdd7269d427abd3fb2d560b14c1670feb3b4a04dd13736dd90fb4b8ddbf`
- Container ID: `60d4a94e8516de59f95cf735dbbd5d650cf57b3f6d787443fb0375312206fe74`
- Status: running; startup log reported `Ready in 101ms`
- Port: host `2350` → container `3000` (`0.0.0.0` and IPv6 host bindings)
- Persistent data: named volume `web_app_tvci_sqlite_data` remains mounted at `/app/data`. The same named volume was observed before and after recreation.
- Commands:

  ```powershell
  docker compose build tvci-web-app
  docker compose up -d --no-deps --force-recreate tvci-web-app
  ```

The Docker production build completed successfully. Next.js emitted a compile warning that optional module `canvas` could not be resolved through the `jsdom` → DOCX importer trace; page generation and the final image export completed.

## Live HTTP checks

Unauthenticated GET requests were sent to `http://127.0.0.1:2350` without following redirects.

| Path | Result | Response details |
|---|---:|---|
| `/` | 307 | Redirects to `/login` |
| `/admin` | 307 | Protected route redirects to `/login` |
| `/login` | 200 | `text/html`; 24,579 bytes |
| `/register` | 200 | `text/html`; 14,658 bytes |
| `/brand/iemm.jpg` | 200 | `image/jpeg`; 29,335 bytes |
| `/brand/tvci.png` | 200 | `image/png`; 38,063 bytes |
| `/spellcheck/vi-base.txt` | 200 | `text/plain; charset=UTF-8`; 39,891 bytes |
| `/spellcheck/vi.aff` | 200 | `application/octet-stream`; 1,081 bytes |
| `/spellcheck/vi.dic` | 200 | `text/x-c; charset=UTF-8`; 39,858 bytes |

The Vietnamese spell-check loader reads these responses as UTF-8 bytes, so the `.aff` and `.dic` content types do not prevent loading.

## Scope confirmation

Only `tvci-web-app` was built and recreated. No account was created, no database reset or volume removal was performed, and no commit or push was made.
