# TVCI installer host stop regression

## Scope

Fix upgrade shutdown detection for the TVCI runtime under `%LOCALAPPDATA%\TVCIWordTools`, retain strict executable-path ownership, report PID/path diagnostics, and rebuild the existing 0.1.11 offline installer after QA passes.

## Checklist

- [x] Diagnose port 38473 and confirm the local TVCI runtime path.
- [x] Add regression coverage for command-line variation, unrelated Node processes, external port owners, diagnostics, and pre-copy stop ordering.
- [x] Make ownership depend on normalized executable path; resolve port PIDs and stop only owned processes.
- [x] Persist stop-host diagnostics and surface them in `PrepareToInstall`.
- [x] Run installer QA, typecheck, build, and manifest validation.
- [x] Rebuild and verify the full 0.1.11 offline EXE and SHA-256.

## Verification results

- Port 38473 diagnostic: no active listener was present; installed runtime executable exists at `%LOCALAPPDATA%\TVCIWordTools\runtime\node.exe`.
- Installer regression QA: PASS (13 tests), including mocked Windows PowerShell scenarios for command-line variation, unrelated Node safety, and external port owner diagnostics.
- Jest: PASS (51 suites, 288 tests); typecheck, production build, and manifest validation: PASS.
- Inno Setup compile and packaged installer verification: PASS; 155 staged files and x64 runtime.
- EXE: `release/TVCI-Word-Tools-Setup-0.1.11.exe`, 240960410 bytes, SHA-256 `532683321391c3443d7e9875afde3ed0771e32d90332780fdf833d1be9243a7f`.

## Acceptance-test scope-clobber follow-up (2026-09-24)

- [x] Preserve the Inno `-InstallDir` parameter before dot-sourcing `common.ps1`; use the preserved value for shutdown and diagnostics.
- [x] Add QA for preservation ordering and real `%LOCALAPPDATA%\TVCIWordTools\runtime\node.exe` port ownership while keeping unrelated `node.exe` processes untouched.
- [x] Installer QA/UX, full test suite, typecheck, production build, manifest validation, and existing artifact verification passed.
- [x] Compile the full offline 0.1.11 EXE and generate its SHA-256.
- Note: the canonical release EXE was held open by a running `TVCI-Word-Tools-Setup-0.1.11` process; the rebuilt artifact is in `release/build-20260924/` so the active installer was not interrupted.
