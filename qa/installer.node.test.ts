import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  inspectCanonicalRibbonManifest,
  manifestAssetPaths,
  missingManifestAssets,
} from '../scripts/ribbon-preservation.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (name: string) => fs.readFileSync(path.join(root, name), 'utf8');

test('one universal per-user installer with no shared certificate payload', () => {
  const pkg = JSON.parse(read('package.json'));
  const iss = read('installer/TVCIWordTools.iss');
  const build = read('scripts/package-installer.mjs');
  assert.equal(pkg.version, '0.1.12');
  assert.equal(pkg.scripts.installer, 'node scripts/package-installer.mjs');
  assert.equal(pkg.scripts['package:exe'], undefined);
  assert.match(iss, /PrivilegesRequired=lowest/);
  assert.match(iss, /OutputBaseFilename=TVCI-Word-Tools-Setup-\{#MyAppVersion\}/);
  assert.match(iss, /#define Publisher "Trung tâm Thử nghiệm - Kiểm định Công nghiệp"/);
  assert.match(iss, /AppPublisher=\{#Publisher\}/);
  assert.match(iss, /WizardStyle=modern/);
  assert.match(iss, /WizardSmallImageFile=\.\.\\assets\\icon-80\.png/);
  assert.doesNotMatch(iss, /-x64|HKLM|tvci-cert\.pfx|CloseApplications=force/i);
  assert.match(build, /process\.arch.*x64/);
  assert.match(build, /\.sha256/);
  assert.doesNotMatch(build, /copyDir\(path\.join\(PROJECT_ROOT, "manifest"\)/);
});

test('installer staging preserves every manifest asset used by the canonical Ribbon', () => {
  const webpack = read('webpack.config.js');
  const build = read('scripts/package-installer.mjs');
  const iss = read('installer/TVCIWordTools.iss');
  const manifest = read('manifest/manifest.xml');
  assert.match(webpack, /from: "assets", to: "assets"/);
  assert.match(build, /copyTree\(path\.join\(PROJECT_ROOT, 'dist'\), path\.join\(staging, 'app'\)\)/);
  assert.match(iss, /staging\\app\\\*.*recursesubdirs/);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tvci-installer-ribbon-test-'));
  try {
    const stagedApp = path.join(tempRoot, 'app');
    fs.cpSync(path.join(root, 'assets'), path.join(stagedApp, 'assets'), { recursive: true });
    const ribbonCheck = inspectCanonicalRibbonManifest(manifest);
    assert.equal(ribbonCheck.ok, true, JSON.stringify(ribbonCheck));
    assert.deepEqual(missingManifestAssets(manifest, stagedApp), []);
    const stagedAssetPaths = manifestAssetPaths(manifest);
    for (const expected of [
      'assets/ribbon/icon-library-16.png',
      'assets/ribbon/icon-builder-80.png',
      'assets/ribbon/icon-convert-unicode-32.png',
      'assets/ribbon/icon-delete-blank-page-80.png',
    ]) {
      assert.ok(stagedAssetPaths.includes(expected), `Manifest does not reference expected asset ${expected}`);
      assert.equal(fs.existsSync(path.join(stagedApp, ...expected.split('/'))), true, `Missing ${expected}`);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('repair installer cache overwrites existing files and validates the copied payload', () => {
  const iss = read('installer/TVCIWordTools.iss');
  assert.match(iss, /CacheOk := CompareText\(SourceExe, RepairExe\) = 0;/);
  assert.match(iss, /SourceSize: Int64;/);
  assert.match(iss, /if not CacheOk then\s+begin\s+CacheOk := FileSize64\(SourceExe, SourceSize\);\s+if CacheOk then\s+CacheOk := CopyFile\(SourceExe, RepairExe, False\);\s+if CacheOk then\s+begin\s+CacheOk := FileExists\(RepairExe\);\s+if CacheOk then\s+begin\s+CacheOk := FileSize64\(RepairExe, RepairSize\);\s+if CacheOk then\s+CacheOk := RepairSize = SourceSize;\s+end;\s+end;\s+end;/);
  assert.doesNotMatch(iss, /CopyFile\(SourceExe, RepairExe, True\)/);
});

test('host is loopback-only, checks port, and has a health endpoint', () => {
  const host = read('installer/server.js');
  assert.match(host, /127\.0\.0\.1/);
  assert.match(host, /const data = root/);
  assert.match(host, /api\/health/);
  assert.match(host, /EADDRINUSE/);
  assert.doesNotMatch(host, /tvci123|Access-Control-Allow-Origin.*\*/);
});

test('production lifecycle never restarts Word and names failed checks', () => {
  const setup = read('installer/setup.ps1');
  const repair = read('installer/repair.ps1');
  const repairCmd = read('installer/repair.cmd');
  const verify = read('installer/verify.ps1');
  assert.match(setup, /CHECK FAIL|Fail-Check/);
  assert.match(setup, /Port conflict/);
  assert.match(setup, /verify\.ps1/);
  assert.match(verify, /Port conflict/);
  assert.match(verify, /Test-CanonicalRibbonManifest/);
  assert.match(verify, /Check 'Ribbon manifest'/);
  assert.doesNotMatch(`${setup}\n${repair}\n${repairCmd}`, /Stop-Process\s+.*WINWORD|Start-Process\s+.*WINWORD|Remove-Item\s+.*Wef/i);
  assert.doesNotMatch(repairCmd, /-RestartWord/i);
});

test('production installer does not embed workspace or fixed-machine install paths', () => {
  const production = [
    read('installer/common.ps1'),
    read('installer/setup.ps1'),
    read('installer/verify.ps1'),
    read('installer/repair.ps1'),
    read('installer/uninstall.ps1'),
    read('installer/server.js'),
    read('installer/TVCIWordTools.iss')
  ].join('\n');
  assert.doesNotMatch(production, /E:\\CODING|C:\\TVCIWordTools/i);
  assert.match(production, /localappdata/i);
});

test('Office detection includes user registry and Click-to-Run installation paths', () => {
  const common = read('installer/common.ps1');
  assert.match(common, /HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WINWORD\.EXE/);
  assert.match(common, /InstallationPath/);
  assert.match(common, /Registry32/);
  assert.match(common, /Registry64/);
});

test('lifecycle keeps Word and user data intact', () => {
  const setup = read('installer/setup.ps1');
  const remove = read('installer/uninstall.ps1');
  const verify = read('installer/verify.ps1');
  assert.match(setup, /New-SelfSignedCertificate/);
  assert.match(setup, /CurrentUser/);
  assert.match(setup, /OfficeArch/);
  assert.match(setup, /MicrosoftEdgeWebView2RuntimeInstallerX64\.exe/);
  assert.doesNotMatch(setup, /MicrosoftEdgeWebview2Setup\.exe|Internet required|Connect to the Internet/i);
  assert.match(remove, /Thumbprint/);
  assert.match(verify, /READY|FAIL/);
  assert.doesNotMatch(setup + remove, /Stop-Process.*WINWORD|taskkill.*WINWORD|Remove-Item\s+.*Wef/i);
});

test('upgrade stops only the identified TVCI host and releases port before Inno file operations', () => {
  const iss = read('installer/TVCIWordTools.iss');
  const common = read('installer/common.ps1');
  const stop = read('installer/stop-host.ps1');
  assert.match(iss, /function PrepareToInstall\s*\(var NeedsRestart: Boolean\): String/i);
  assert.match(iss, /ExtractTemporaryFile\('common\.ps1'\)/);
  assert.match(iss, /ExtractTemporaryFile\('stop-host\.ps1'\)/);
  assert.match(iss, /PrepareToInstall[\s\S]*?stop-host\.ps1[\s\S]*?Result :=/i);
  assert.match(common, /function Get-OwnHost/);
  assert.match(common, /function Get-PortOwners/);
  assert.match(common, /function Test-TvciExecutablePath/);
  assert.match(common, /function Get-PortOwnerProcesses/);
  assert.match(stop, /\. common\.ps1|common\.ps1/);
  const preserveTarget = stop.indexOf('$targetInstallDir = $InstallDir');
  const importCommon = stop.indexOf(". (Join-Path $PSScriptRoot 'common.ps1')");
  assert.ok(preserveTarget >= 0 && preserveTarget < importCommon,
    'stop-host must preserve the requested install path before common.ps1 can overwrite $InstallDir');
  assert.match(stop, /Stop-TvciHost\s+-InstallPath\s+\$targetInstallDir/,
    'host shutdown must use the preserved target path');
  assert.match(stop, /InstallDir=\$targetInstallDir/,
    'failure diagnostic must report the preserved install path');
  assert.match(stop, /Stop-TvciHost\s+-InstallPath/);
  assert.match(stop, /DiagnosticFile/);
  assert.match(stop, /Exception\.ToString\(\)/);
  assert.match(stop, /File\]::WriteAllText/);
  const stopHost = common.match(/function Stop-TvciHost\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.ok(stopHost, 'shared Stop-TvciHost implementation must exist');
  assert.match(stopHost, /Get-ExternalPortOwners[\s\S]*throw[\s\S]*No process was stopped/);
  assert.match(stopHost, /Stop-Process\s+-Id/);
  assert.match(stopHost, /Get-PortOwnerProcesses/);
  assert.match(stopHost, /do\s*\{[\s\S]*Get-OwnHost[\s\S]*Get-PortOwners[\s\S]*ownedProcesses\.Count\s+-eq\s+0\s+-and\s+\$portOwners\.Count\s+-eq\s+0[\s\S]*\}\s+while[\s\S]*TimeoutSeconds/i);
  assert.doesNotMatch(stop, /Get-CimInstance Win32_Process -Filter "Name = 'node\.exe'"|launcher\.vbs\*|taskkill/i);
  assert.match(common, /HostPort = 38473/);
  const prepare = iss.match(/function PrepareToInstall\s*\(var NeedsRestart: Boolean\): String;([\s\S]*?)\nend;/i)?.[1] ?? '';
  assert.match(prepare, /stop-host\.ps1[\s\S]*StopHostExitCode[\s\S]*StopHostExitCode\s*<>\s*0[\s\S]*Result\s*:=/i);
  assert.match(prepare, /StopHostDiagnostic[\s\S]*LoadStringFromFile[\s\S]*Result\s*:=/i);
  assert.match(iss, /Could not stop the existing TVCI host|Không thể dừng TVCI/i);
  const filesSection = iss.slice(iss.indexOf('[Files]'), iss.indexOf('[InstallDelete]'));
  assert.match(iss, /function PrepareToInstall\s*\(var NeedsRestart: Boolean\): String[\s\S]*?StopHostExitCode\s*<>\s*0/i);
  assert.match(filesSection, /DestDir: "\{app\}\\app"/);
});

test('host stop regression scenarios use executable ownership and port PID resolution', t => {
  if (process.platform !== 'win32' || process.arch !== 'x64') return t.skip('Windows x64 PowerShell only');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tvci-stop-host-test-'));
  const installDir = path.join(tempRoot, 'install');
  fs.mkdirSync(path.join(installDir, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(installDir, 'runtime', 'node.exe'), 'mock');
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = path.join(tempRoot, 'host-stop-tests.ps1');
  const commonPath = path.join(root, 'installer', 'common.ps1').replaceAll("'", "''");
  const installPath = installDir.replaceAll("'", "''");
  fs.writeFileSync(script, `
$ErrorActionPreference = 'Stop'
. '${commonPath}'
$script:MockProcesses = @()
$script:MockPorts = @()
$script:StoppedIds = @()
function Get-CimInstance {
  param([string]$ClassName, [string]$Filter)
  if ($Filter -eq "Name = 'node.exe'") { return @($script:MockProcesses | Where-Object Name -eq 'node.exe') }
  if ($Filter -match 'ProcessId = (\\d+)') { $id = [int]$Matches[1]; return @($script:MockProcesses | Where-Object ProcessId -eq $id) }
}
function Get-NetTCPConnection { param([int]$LocalPort, [string]$State) return @($script:MockPorts) }
function Stop-Process { param([int]$Id, [string]$ErrorAction) $script:StoppedIds += $Id; $script:MockProcesses = @($script:MockProcesses | Where-Object ProcessId -ne $Id); $script:MockPorts = @($script:MockPorts | Where-Object OwningProcess -ne $Id) }
function Start-Sleep { param([int]$Milliseconds) }
$install = '${installPath}'
$hostExe = Join-Path $install 'runtime\\node.exe'
$tempExeForTests = $hostExe
$foreignExe = Join-Path $env:WINDIR 'System32\\node.exe'
$script:InstallDir = $install
$script:HostExe = $hostExe
$script:HostScript = Join-Path $install 'server\\server.js'
$script:HostPort = 38473

# The actual acceptance-test install path remains owned when its node.exe owns the port.
$actualInstall = Join-Path $env:LOCALAPPDATA 'TVCIWordTools'
$actualExe = Join-Path $actualInstall 'runtime\\node.exe'
$script:HostExe = $actualExe
$script:MockProcesses = @([pscustomobject]@{ ProcessId = 38473; Name = 'node.exe'; ExecutablePath = $actualExe; CommandLine = 'node.exe server.js' })
$script:MockPorts = @([pscustomobject]@{ OwningProcess = 38473; LocalAddress = '127.0.0.1'; LocalPort = 38473; State = 'Listen' })
if (@(Get-OwnHost).Count -ne 1 -or @(Get-ExternalPortOwners).Count -ne 0) { throw ("REAL_INSTALL_PATH_PORT_OWNER_NOT_CLASSIFIED_OWNED expected=$actualExe own=$(@(Get-OwnHost).Count) external=$(@(Get-ExternalPortOwners).Count) resolved=$(ConvertTo-TvciCanonicalPath $actualExe) host=$(ConvertTo-TvciCanonicalPath $script:HostExe)") }
$script:HostExe = $tempExeForTests

# Correct executable path is owned even when arguments use another quoting/path format.
$script:MockProcesses = @([pscustomobject]@{ ProcessId = 501; Name = 'node.exe'; ExecutablePath = $hostExe; CommandLine = '"' + $hostExe + '" --old-format' })
$script:MockPorts = @([pscustomobject]@{ OwningProcess = 501; LocalAddress = '127.0.0.1'; LocalPort = 38473; State = 'Listen' })
if (@(Get-OwnHost).Count -ne 1) { throw 'OWNED_PATH_WITH_NONMATCHING_COMMANDLINE_NOT_RECOGNIZED' }
Stop-TvciHost -InstallPath $install -TimeoutSeconds 1 | Out-Null
if (501 -notin $script:StoppedIds) { throw 'OWNED_PORT_PID_NOT_STOPPED' }

# A separate node.exe outside the install path must never be stopped.
$script:StoppedIds = @()
$script:MockProcesses = @([pscustomobject]@{ ProcessId = 601; Name = 'node.exe'; ExecutablePath = $foreignExe; CommandLine = 'node.exe server.js' })
$script:MockPorts = @()
Stop-TvciHost -InstallPath $install -TimeoutSeconds 1 | Out-Null
if (601 -in $script:StoppedIds) { throw 'UNRELATED_NODE_WAS_STOPPED' }

# An external port owner fails with PID and executable path and stops nothing.
$script:StoppedIds = @()
$script:MockProcesses = @([pscustomobject]@{ ProcessId = 701; Name = 'node.exe'; ExecutablePath = $foreignExe; CommandLine = 'node.exe unrelated.js' })
$script:MockPorts = @([pscustomobject]@{ OwningProcess = 701; LocalAddress = '127.0.0.1'; LocalPort = 38473; State = 'Listen' })
try { Stop-TvciHost -InstallPath $install -TimeoutSeconds 1 | Out-Null; throw 'EXTERNAL_PORT_OWNER_WAS_ACCEPTED' }
catch { if ($_.Exception.Message -eq 'EXTERNAL_PORT_OWNER_WAS_ACCEPTED') { throw }; if ($_.Exception.Message -notmatch '701' -or $_.Exception.Message -notmatch [regex]::Escape($foreignExe)) { throw ('EXTERNAL_DIAGNOSTIC_MISSING_PID_OR_PATH: ' + $_.Exception.Message) } }
if ($script:StoppedIds.Count -ne 0) { throw 'EXTERNAL_OWNER_SCENARIO_STOPPED_A_PROCESS' }
Write-Output 'HOST_STOP_REGRESSION_PASS'
`, 'utf8');
  try {
    const result = spawnSync(powershell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { encoding: 'utf8' });
    if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'EPERM') return t.skip('PowerShell launch is blocked by the sandbox');
    assert.equal(result.error, undefined, result.error?.message || 'PowerShell failed to launch');
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /HOST_STOP_REGRESSION_PASS/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('offline WebView2 standalone installer is a required packaged prerequisite', () => {
  const setup = read('installer/setup.ps1');
  const iss = read('installer/TVCIWordTools.iss');
  const build = read('scripts/package-installer.mjs');
  const verify = read('scripts/verify-installer.mjs');
  assert.match(setup, /MicrosoftEdgeWebView2RuntimeInstallerX64\.exe/);
  assert.match(setup, /\/silent.*\/install/);
  assert.doesNotMatch(setup + build + iss, /MicrosoftEdgeWebview2Setup\.exe|online bootstrapper|Internet required/i);
  assert.match(build, /MicrosoftEdgeWebView2RuntimeInstallerX64\.exe/);
  assert.match(build, /installer', 'prerequisites', 'MicrosoftEdgeWebView2RuntimeInstallerX64\.exe/);
  assert.match(build, /Missing required offline prerequisite/);
  assert.doesNotMatch(build, /installer', 'MicrosoftEdgeWebview2Setup\.exe/);
  assert.match(iss, /staging\\runtime\\\*.*DestDir: "\{app\}\\runtime"/);
  assert.doesNotMatch(iss, /MicrosoftEdgeWebView2RuntimeInstallerX64\.exe/,
    'runtime wildcard must package the standalone installer exactly once');
  assert.match(verify, /MicrosoftEdgeWebView2RuntimeInstallerX64\.exe/);
  assert.doesNotMatch(verify, /MicrosoftEdgeWebview2Setup\.exe/);
});

test('installed-manifest verifier reports stale or missing canonical Ribbon identifiers', t => {
  if (process.platform !== 'win32') return t.skip('Windows PowerShell only');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tvci-ribbon-verify-test-'));
  const scriptsDir = path.join(tempRoot, 'scripts');
  const manifestDir = path.join(tempRoot, 'manifest');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.copyFileSync(path.join(root, 'installer', 'common.ps1'), path.join(scriptsDir, 'common.ps1'));
  const verifier = path.join(scriptsDir, 'verify.ps1');
  fs.copyFileSync(path.join(root, 'installer', 'verify.ps1'), verifier);
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const runVerifier = (executable: string, source: string) => {
    fs.writeFileSync(path.join(manifestDir, 'manifest.xml'), source, 'utf8');
    return spawnSync(executable, [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', verifier, '-RibbonOnly',
    ], { encoding: 'utf8' });
  };
  const runWithAvailablePowerShell = (source: string) => {
    const native = runVerifier(powershell, source);
    return native.error?.code === 'EPERM' ? runVerifier('pwsh', source) : native;
  };
  try {
    const canonical = runWithAvailablePowerShell(read('manifest/manifest.xml'));
    if (canonical.error?.code === 'EPERM') return t.skip('PowerShell launch is blocked by the sandbox');
    assert.equal(canonical.error, undefined, canonical.error?.message || 'PowerShell failed to launch');
    assert.equal(canonical.status, 0, canonical.stdout + canonical.stderr);
    assert.match(canonical.stdout, /PASS Ribbon manifest/);

    const stale = runWithAvailablePowerShell(read('manifest/manifest.xml').replace('</CustomTab>', '<!-- GroupStandardize -->\n</CustomTab>'));
    assert.notEqual(stale.status, 0);
    assert.match(stale.stdout, /FAIL Ribbon manifest/);
    assert.match(stale.stdout, /stale legacy markers/);

    const missing = runWithAvailablePowerShell(read('manifest/manifest.xml').replace('id="KnowledgeButton"', 'id="RemovedKnowledgeButton"'));
    assert.notEqual(missing.status, 0);
    assert.match(missing.stdout, /FAIL Ribbon manifest/);
    assert.match(missing.stdout, /missing identifiers/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('Office detection agrees in 32-bit and 64-bit PowerShell', t => {
  if (process.platform !== 'win32' || process.arch !== 'x64') return t.skip('Windows x64 only');
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const script = `. '${path.join(root, 'installer', 'common.ps1').replaceAll("'", "''")}'; (Get-OfficeInfo).OfficeArch`;
  const detect = (folder: string) => {
    const result = spawnSync(path.join(systemRoot, folder, 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { encoding: 'utf8' });
    if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'EPERM') {
      t.skip('PowerShell launch is blocked by the sandbox');
      return null;
    }
    assert.equal(result.status, 0, result.error?.message || result.stderr || 'PowerShell failed');
    return result.stdout.trim();
  };
  const native = detect('System32');
  if (native === null) return;
  if (native === 'unknown') return t.skip('Office is not installed');
  assert.equal(detect('SysWOW64'), native);
});
