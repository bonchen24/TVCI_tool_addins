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
