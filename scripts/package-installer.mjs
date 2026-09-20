import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = path.join(PROJECT_ROOT, 'release');
const staging = path.join(release, 'staging');
const version = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')).version;
const exeName = `TVCI-Word-Tools-Setup-${version}.exe`;
const npmCli = process.env.npm_execpath;

function fail(message) { throw new Error(`[installer] ${message}`); }
function run(file, args) {
  const result = spawnSync(file, args, { cwd: PROJECT_ROOT, stdio: 'inherit', shell: false });
  if (result.error) fail(`${file}: ${result.error.message}`);
  if (result.status !== 0) fail(`${file} ${args.join(' ')} failed (exit ${result.status}).`);
}
function copy(source, target) {
  if (!fs.existsSync(source)) fail(`Missing payload: ${source}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      fs.copyFileSync(source, target);
      return;
    } catch (err) {
      if ((err.code === 'EBUSY' || err.code === 'EPERM') && attempt < 9) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
        continue;
      }
      throw err;
    }
  }
}
function copyTree(source, target) {
  if (!fs.existsSync(source)) fail(`Missing payload: ${source}`);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) {
      if (/\.(env|pfx|pem|key|map)$/i.test(entry.name) || /(^|[\/])(__pycache__|node_modules|tests?|\.git)([\/]|$)/i.test(from)) fail(`Unsafe payload: ${from}`);
      copy(from, to);
    }
  }
}
function findIscc() {
  const candidates = [process.env.ISCC_PATH,
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Inno Setup 6', 'ISCC.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Inno Setup 6', 'ISCC.exe'),
    path.join(process.env.ProgramFiles || '', 'Inno Setup 6', 'ISCC.exe')].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

if (process.platform !== 'win32' || process.arch !== 'x64') fail('Build requires Windows x64 and an x64 Node runtime. Windows x86 is not supported.');
if (!npmCli || !fs.existsSync(npmCli)) fail('npm CLI path not available; invoke this script with npm run installer.');
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`Invalid package version: ${version}`);
fs.mkdirSync(release, { recursive: true });
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

run(process.execPath, [npmCli, 'test', '--', '--runInBand']);
run(process.execPath, ['--experimental-strip-types', '--test', '--test-isolation=none', 'qa/installer.node.test.ts']);
run(process.execPath, [npmCli, 'run', 'typecheck']);
run(process.execPath, [npmCli, 'run', 'build']);
run(process.execPath, [npmCli, 'run', 'validate-manifest']);

copyTree(path.join(PROJECT_ROOT, 'dist'), path.join(staging, 'app'));
copy(path.join(PROJECT_ROOT, 'manifest', 'manifest.xml'), path.join(staging, 'manifest', 'manifest.xml'));
copy(path.join(PROJECT_ROOT, 'installer', 'server.js'), path.join(staging, 'server', 'server.js'));
copy(path.join(PROJECT_ROOT, 'installer', 'repair.cmd'), path.join(staging, 'repair.cmd'));
for (const name of ['common.ps1', 'setup.ps1', 'verify.ps1', 'uninstall.ps1', 'stop-host.ps1', 'launcher.vbs', 'repair.ps1']) {
  copy(path.join(PROJECT_ROOT, 'installer', name), path.join(staging, 'scripts', name));
}
copy(process.execPath, path.join(staging, 'runtime', 'node.exe'));
const bootstrapper = path.join(PROJECT_ROOT, 'installer', 'MicrosoftEdgeWebview2Setup.exe');
copy(bootstrapper, path.join(staging, 'runtime', 'MicrosoftEdgeWebview2Setup.exe'));

const iscc = findIscc();
if (!iscc) fail('Inno Setup 6 (ISCC.exe) is not installed. Install it on the build PC or set ISCC_PATH.');
const output = path.join(release, exeName);
fs.rmSync(output, { force: true });
fs.rmSync(`${output}.sha256`, { force: true });
run(iscc, [`/DMyAppVersion=${version}`, path.join(PROJECT_ROOT, 'installer', 'TVCIWordTools.iss')]);
if (!fs.existsSync(output) || fs.statSync(output).size < 1024 * 1024) fail(`Compiler did not produce ${output}.`);
const hash = crypto.createHash('sha256');
const bytes = fs.readFileSync(output);
hash.update(bytes);
const digest = hash.digest('hex');
fs.writeFileSync(`${output}.sha256`, `${digest}  ${exeName}\n`, 'utf8');
run(process.execPath, [path.join(PROJECT_ROOT, 'scripts', 'verify-installer.mjs')]);
console.log(`EXE: ${output}\nSize: ${bytes.length} bytes\nSHA-256: ${digest}`);
