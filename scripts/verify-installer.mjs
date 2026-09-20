import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = path.join(root, 'release');
const stage = path.join(release, 'staging');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const exeName = `TVCI-Word-Tools-Setup-${version}.exe`;
const exe = path.join(release, exeName);
const required = [
  'app/taskpane.html', 'app/commands.html', 'app/assets/logo-tvci.png',
  'app/templates/tvci-sample.docx', 'manifest/manifest.xml', 'server/server.js',
  'runtime/node.exe', 'runtime/MicrosoftEdgeWebview2Setup.exe',
  'scripts/setup.ps1', 'scripts/verify.ps1', 'scripts/uninstall.ps1',
  'scripts/common.ps1', 'scripts/stop-host.ps1', 'scripts/launcher.vbs',
  'scripts/repair.ps1', 'repair.cmd'
];
for (const name of required) assert.ok(fs.existsSync(path.join(stage, name)), `Missing ${name}`);
const files = [];
function scan(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(dir, item.name);
    if (item.isDirectory()) scan(name);
    else files.push(path.relative(stage, name).replaceAll('\\', '/'));
  }
}
scan(stage);
for (const name of files) assert.doesNotMatch(name, /(^|\/)(src|tests?|node_modules|\.git|__pycache__)(\/|$)|\.(env|pfx|pem|key|map)$/i, `Unsafe ${name}`);
const runtime = fs.readFileSync(path.join(stage, 'runtime', 'node.exe'));
assert.equal(runtime.toString('ascii', 0, 2), 'MZ');
assert.equal(runtime.readUInt16LE(runtime.readUInt32LE(0x3c) + 4), 0x8664, 'Bundled host must be x64');
assert.ok(fs.statSync(exe).size > 1024 * 1024);
const digest = crypto.createHash('sha256').update(fs.readFileSync(exe)).digest('hex');
assert.equal(fs.readFileSync(`${exe}.sha256`, 'utf8').trim(), `${digest}  ${exeName}`);
console.log(`Installer QA PASS: ${files.length} staged files, x64 runtime, EXE ${fs.statSync(exe).size} bytes, SHA-256 ${digest}`);
