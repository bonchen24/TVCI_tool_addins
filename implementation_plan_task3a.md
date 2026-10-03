# Task 3A installer plan

1. [x] Add QA regression assertions for upgrade host shutdown before Inno file copy, shared TVCI host identity logic, and offline WebView2 packaging.
2. [x] Move upgrade shutdown to Inno `PrepareToInstall`, using the installed common identity and bounded waits for both the owned process and port 38473; abort installation on failure.
3. [ ] Replace WebView2 bootstrapper dependency with the official Evergreen Standalone x64 installer, package validation, and silent offline setup flow. Packaging/setup references are updated, but the official binary is unavailable locally and Microsoft download attempts fail with `SEC_E_NO_CREDENTIALS`; the old bootstrapper must not be substituted.
4. [x] Inspect the bundled Node executable's PE imports: x64 `node.exe` imports Windows system DLLs and has no `VCRUNTIME*`, `MSVCP*`, or `concrt*` import. No VC++ Redistributable dependency is indicated.
5. [x] Run installer QA plus requested typecheck, tests, build, and manifest validation; report unavailable full installer build and artifact prerequisites explicitly.

Verification criteria: old TVCI host is stopped and port is released before Inno starts file operations; unrelated `node.exe` is never stopped; no required online WebView2 path remains; staging fails with the precise offline prerequisite path if absent; package QA requires the offline payload.

Task 3A status: host shutdown and regression QA are complete. Full offline WebView2 packaging remains blocked until the official standalone x64 installer is supplied at `installer/prerequisites/MicrosoftEdgeWebView2RuntimeInstallerX64.exe`. Task 3B must obtain/verify that signed binary, stage it, compile the Inno EXE, and run `npm run test:installer` against the resulting EXE.
