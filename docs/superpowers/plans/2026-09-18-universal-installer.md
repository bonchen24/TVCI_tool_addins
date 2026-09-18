# Universal installer implementation plan

Approved design: one per-user Inno Setup EXE, bundled x64 Node host, per-machine-generated user certificate, HKCU WEF registration, and WebView2 bootstrapper fallback.

- [x] Add installer QA covering output, payload allowlist, host safety, lifecycle and architecture rejection.
- [x] Replace the legacy host and lifecycle scripts; verify the QA fails first, then passes.
- [x] Consolidate staging and Inno compilation into `npm run installer`; remove the second release pipeline.
- [x] Document support matrix and clean-PC acceptance steps.
- [x] Run the required test, typecheck, build, packaging, and installer commands. Full `test:qa`: 164/238 pass, 74 unrelated existing UI/rules assertions fail. Clean-PC Office acceptance remains manual.
