import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const read = (name: string) => fs.readFileSync(path.join(root, name), 'utf8');

test('one universal per-user installer with no shared certificate payload', () => {
  const pkg = JSON.parse(read('package.json'));
  const iss = read('installer/TVCIWordTools.iss');
  const build = read('scripts/package-installer.mjs');
  assert.equal(pkg.scripts.installer, 'node scripts/package-installer.mjs');
  assert.equal(pkg.scripts['package:exe'], undefined);
  assert.match(iss, /PrivilegesRequired=lowest/);
  assert.match(iss, /OutputBaseFilename=TVCI-Word-Tools-Setup-\{#MyAppVersion\}/);
  assert.doesNotMatch(iss, /-x64|HKLM|tvci-cert\.pfx|CloseApplications=force/i);
  assert.match(build, /process\.arch.*x64/);
  assert.match(build, /\.sha256/);
  assert.doesNotMatch(build, /copyDir\(path\.join\(PROJECT_ROOT, "manifest"\)/);
});

test('host is loopback-only, checks port, and has a health endpoint', () => {
  const host = read('installer/server.js');
  assert.match(host, /127\.0\.0\.1/);
  assert.match(host, /api\/health/);
  assert.match(host, /EADDRINUSE/);
  assert.doesNotMatch(host, /tvci123|Access-Control-Allow-Origin.*\*/);
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
