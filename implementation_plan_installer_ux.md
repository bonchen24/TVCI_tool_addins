# Installer UX implementation plan

## Scope

Improve the Inno Setup wizard and its user facing messages while preserving the existing install scripts, AppId, port 38473, per-user privileges, repair, verification, upgrade, and uninstall behavior.

## Steps

1. [x] Add source-level installer UX QA; the first run exposed a mismatch in the Word restart wording.
2. [x] Add a PowerShell preflight probe and show its results in Inno Setup. WebView2 remains an actionable warning; Word detection follows the installer's registry, Click-to-Run, and common-path checks.
3. [x] Add Vietnamese setup progress, success guidance, and failure/log/repair directions without changing the setup operations.
4. [x] Run installer UX QA, typecheck, manifest validation, and inspect the scoped diff and install invariants.

## Verification

- `node --experimental-strip-types --test qa/installer-ux.node.test.ts`
- `npm run typecheck`
- `npm run validate-manifest`
- `npm run test:installer` where the packaged installer artifacts are current.

## Completion notes

- Installer UX QA: PASS.
- Typecheck: PASS.
- Manifest validation: PASS.
- `npm run test:installer`: blocked by the existing EXE/SHA-256 mismatch; the EXE must be rebuilt before packaging verification.
- Inno Setup compiler (`ISCC.exe`) is not available in this environment, so the EXE has not been rebuilt.

## Constraints

- Preserve AppId `{8D912CC6-37A5-4B7A-8C41-6F661A999B36}`, port `38473`, `{localappdata}` install scope, `PrivilegesRequired=lowest`, and the existing setup/verify/repair/uninstall scripts.
- Keep in-place upgrade behavior and existing Start Menu actions.
