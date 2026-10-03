import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iss = fs.readFileSync(path.join(root, 'installer', 'TVCIWordTools.iss'), 'utf8');
const preflight = fs.readFileSync(path.join(root, 'installer', 'preflight.ps1'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'installer', 'setup.ps1'), 'utf8');

assert.doesNotMatch(iss, /\\n\s*$/, 'Inno script must not end with a literal escaped newline');
assert.match(iss, /AppId=\{\{8D912CC6-37A5-4B7A-8C41-6F661A999B36\}/i);
assert.match(iss, /PrivilegesRequired=lowest/i);
const preflightPage = iss.match(/PreflightPage\s*:=\s*CreateCustomPage\(([^;]+)\);/i)?.[1] ?? '';
assert.match(preflightPage, /wpSelectDir/i, 'Preflight must run after the user has selected an install directory');
const runPreflight = iss.match(/procedure RunPreflight;([\s\S]*?)\nend;/i)?.[1] ?? '';
assert.ok(runPreflight, 'RunPreflight procedure must exist');
assert.match(runPreflight, /-InstallDir\s+"'\s*\+\s*WizardDirValue\(\)/i,
  'Preflight must use the selected directory through WizardDirValue()');
assert.doesNotMatch(runPreflight, /ExpandConstant\s*\(\s*'\{app\}'\s*\)/i,
  'Preflight must not expand {app} before app initialization');
assert.match(iss, /ArchitecturesAllowed=x64/i);
assert.match(iss, /38473/);
assert.match(iss, /TVCI Word Tools/);
assert.match(iss, /InstallVersion := '\{#MyAppVersion\}'/);
assert.match(iss, /Trung tâm Thử nghiệm - Kiểm định Công nghiệp/);
assert.match(iss, /bộ công cụ hỗ trợ soạn thảo\/biểu mẫu trên Microsoft Word/i);
assert.match(iss, /Windows x64/i);
assert.match(iss, /Microsoft Word desktop/i);
for (const condition of ['Windows x64', 'Microsoft Word/Office', 'Office x86/x64', 'WebView2', '38473', 'ghi vào thư mục cài']) {
  assert.ok(iss.includes(condition), `Preflight page must report ${condition}`);
}
assert.match(iss, /TVCI_PREFLIGHT|preflight\.ps1/);
assert.match(iss, /PASS|FAIL|CẦN CÀI/i);
assert.match(iss, /offline/i);
assert.match(setup, /Evergreen Standalone Installer/i);
assert.doesNotMatch(setup, /online bootstrapper|Internet required/i);
for (const step of ['sao chép thành phần', 'HTTPS localhost', 'certificate', 'đăng ký Word add-in', 'local host', 'Ribbon']) {
  assert.ok(setup.includes(step) || iss.includes(step), `Installer must explain step: ${step}`);
}
assert.match(iss, /Cài đặt thành công/);
assert.match(iss + setup, /đóng toàn bộ Microsoft Word/i);
assert.match(iss, /tab TVCI/i);
for (const action of ['Repair', 'Check Status', 'Open Logs', 'Uninstall']) assert.match(iss, new RegExp(action));
assert.match(iss, /setup\.log/);
assert.match(iss, /WebView2/i);
assert.match(iss, /38473/);
assert.match(iss, /WINWORD|Word/i);
assert.match(setup, /CHECK FAIL/);

console.log('Installer UX QA PASS: welcome, preflight, progress, completion, failure guidance, and install invariants');
