# TVCI Word Tools: universal installer

## Build

On a Windows x64 build PC with Node.js/npm and Inno Setup 6, run `npm ci` then `npm run installer`. The command cleans staging, runs Jest, QA, typecheck, Webpack and manifest validation, copies only production assets plus the x64 Node runtime and WebView2 bootstrapper, compiles Inno Setup, checks the EXE and writes SHA-256. `ISCC_PATH` may point to `ISCC.exe` if Inno Setup is installed outside its standard location. No developer certificate, private key, source tree, npm dependencies, API keys or test files are in the installer.

Output: `release/TVCI-Word-Tools-Setup-<package.json version>.exe` and the matching `.exe.sha256` file. The SHA file uses standard `hash  filename` format.

## Install on a new PC

Copy the single EXE and double-click. The destination is `%LOCALAPPDATA%\TVCIWordTools`; Node.js, Python, Git, VS Code and Inno Setup are unnecessary on the destination. The installer uses current-user registration and certificate trust, so it normally needs no administrator rights. Open Word after installation. If Word was open, close it normally, saving documents, then reopen it. The installer never terminates Word.

The local host is bundled Node x64, launched invisibly at sign-in under the current user. It binds `127.0.0.1:38473` and serves `https://localhost:38473`. If another process owns the port, installation reports failure and leaves that process alone. Logs live in `%LOCALAPPDATA%\TVCIWordTools\logs`.

| Machine | Office | Status |
| --- | --- | --- |
| Windows x64 | Office/Word 2024 x64 | Supported design; physical clean-PC acceptance pending |
| Windows x64 | Office/Word 2024 x86 | Supported design; Office bitness detected separately; physical clean-PC acceptance pending |
| Windows x86 | Office/Word x86 | Unsupported: installer detects and rejects before copying files because only x64 host is bundled |

Office 2024 Click-to-Run reports a 16.0 version and x86/x64 platform in its configuration registry key. The installer requires that signal and writes one HKCU Office 16.0 WEF Developer manifest registration. The Office Add-in ID remains `8d912cc6-37a5-4b7a-8c41-6f661a999b36`.

## WebView2 and HTTPS

If WebView2 is absent, setup runs the bundled Microsoft WebView2 **online bootstrapper**. Internet access is required in that case. A failed download or installation appears as a specific install/repair failure; the EXE is not fully offline on a PC without WebView2.

Setup generates a new `localhost` certificate on the destination, trusts it in CurrentUser Root, and stores an encrypted PFX with a random per-install password under the current user's app directory. The host loads that PFX. The certificate is never built into the EXE. Uninstall identifies the certificate by its saved thumbprint and subject before removing it.

## Repair, verify, uninstall, upgrade

Start Menu → TVCI Word Tools has **Repair**, **Check Status**, **Open Logs**, and **Uninstall**. Setup saves a local copy of the installer as `repair-installer.exe`. Repair reruns that installer to restore missing files, runtime, templates and assets, then checks WebView2, certificate, manifest, autostart, port and HTTPS host. Check Status is read-only and reports Windows architecture, Office version and architecture, WebView2, host, port, HTTPS, registration, templates and assets. Run a newer installer to upgrade in place.

Uninstall stops only this app's bundled host, removes its HKCU registration and certificate, and leaves user data such as drafts, favorites, recent items, user templates, knowledge, preferences and AI settings. Setup and repair do not remove the Office WEF cache. User-created files under the app directory remain after uninstall; back them up before any manual folder cleanup.

## Troubleshooting

- **FAIL WebView2**: connect to the Internet and run Repair. The bundled bootstrapper downloads the runtime.
- **FAIL Port/Host**: inspect Open Logs and release port 38473 from the other application; TVCI does not kill it.
- **FAIL Office installation**: confirm desktop Office/Word 2024 Click-to-Run is installed, then run Repair.
- **Word does not show the add-in**: close Word normally and reopen it; check the status report. Organizational policy may block Developer WEF registration.
- **SmartScreen**: an unsigned internal build can trigger a Windows SmartScreen warning. Sign the EXE for broader deployment.

Physical acceptance remains required on clean Windows x64 systems with Office 2024 x64 and x86, with Node/Python/Git absent, and on a system without WebView2. Check the ribbon, task pane, document operations, repair, upgrade and uninstall on each.
