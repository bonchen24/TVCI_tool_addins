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
  assert.equal(pkg.version, '0.1.3');
  assert.equal(pkg.scripts.installer, 'node scripts/package-installer.mjs');
  assert.equal(pkg.scripts['package:exe'], undefined);
  assert.match(iss, /PrivilegesRequired=lowest/);
  assert.match(iss, /OutputBaseFilename=TVCI-Word-Tools-Setup-\{#MyAppVersion\}/);
  assert.match(iss, /AppPublisher=Trung tam Thu nghiem - Kiem dinh Cong nghiep/);
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
  assert.match(iss, /if not CacheOk then\s+begin\s+CacheOk := CopyFile\(SourceExe, RepairExe, False\);\s+if CacheOk then\s+begin\s+CacheOk := FileExists\(RepairExe\);\s+if CacheOk then\s+begin\s+CacheOk := FileSize64\(RepairExe, RepairSize\);\s+if CacheOk then\s+CacheOk := RepairSize > 0;\s+end;\s+end;\s+end;/);
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
  assert.match(setup, /MicrosoftEdgeWebview2Setup\.exe/);
  assert.match(remove, /Thumbprint/);
  assert.match(verify, /READY|FAIL/);
  assert.doesNotMatch(setup + remove, /Stop-Process.*WINWORD|taskkill.*WINWORD|Remove-Item\s+.*Wef/i);
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
