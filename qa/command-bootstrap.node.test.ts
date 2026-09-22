import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (name: string) => fs.readFileSync(path.join(root, name), "utf8");

test("commands bootstrap loads the vendored Office.js before the injected command chunk", () => {
  const html = read("src/commands/commands.html");
  const webpack = read("webpack.config.js");

  assert.doesNotMatch(html, /window\.Office\s*=|Office\.initialize/);
  const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
  assert.equal(externalScripts[0], "/assets/office-js/office.js");
  assert.match(webpack, /filename:\s*["']commands\.html["'][\s\S]*?chunks:\s*\[["']commands["']\][\s\S]*?inject:\s*["']body["']/);
});

test("command bootstrap telemetry posts only bounded sanitized runtime messages", () => {
  const html = read("src/commands/commands.html");

  assert.match(html, /window\.onerror/);
  assert.match(html, /unhandledrejection/);
  assert.match(html, /fetch\(["']\/api\/log["']/);
  assert.match(html, /\.replace\(\/https\?:/);
  assert.match(html, /api\[-_ \]\?key|token|secret|password/);
  assert.doesNotMatch(html, /\.stack|document\.body|document\.textContent/);
});

test("command handlers are global before deterministic post-ready action association", () => {
  const source = read("src/commands/commands.ts");
  const readyIndex = source.indexOf("Office.onReady()");
  const associateIndex = source.indexOf("actions.associate(name");

  assert.ok(readyIndex >= 0, "Office.onReady() must be present");
  assert.ok(associateIndex > readyIndex, "Office action association must occur after Office.onReady()");
  assert.match(source, /function registerGlobalRibbonActions\(\)/);
  assert.match(source, /registerGlobalRibbonActions\(\);/);
  assert.match(source, /Office\.onReady\(\)\.then\(/);
  assert.match(source, /office-ready-actions-registered/);
  assert.match(source, /registration-error/);
  assert.match(source, /event\.completed\(\)/);
  assert.match(source, /function runDialogCommand\(/);
  assert.match(source, /dialog-dispatched/);
  assert.match(source, /runDialogCommand\([\s\S]*openSmartDraftingDialog/);
});

test("vendored Office.js telemetry sink is packaged beside office.js", () => {
  for (const name of ["oteljs_agave.js", "oteljs_agave.debug.js", "oteljs.js", "oteljs.debug.js"]) {
    assert.ok(fs.existsSync(path.join(root, "assets", "office-js", "telemetry", name)), name);
  }
});

test("installer certificate validation covers identity, validity, localhost DNS, EKU, key, and trust", () => {
  const common = read("installer/common.ps1");

  assert.match(common, /X509Certificate2/);
  assert.match(common, /HasPrivateKey/);
  assert.match(common, /NotBefore/);
  assert.match(common, /NotAfter/);
  assert.match(common, /DnsNameList/);
  assert.match(common, /localhost/);
  assert.match(common, /1\.3\.6\.1\.5\.5\.7\.3\.1/);
  assert.match(common, /CurrentUser[\s\S]*Root|Root[\s\S]*CurrentUser/);
  assert.match(common, /CurrentUser[\s\S]*My|My[\s\S]*CurrentUser/);
});

test("setup and verify use bounded TLS-valid checks for the complete command runtime", () => {
  const common = read("installer/common.ps1");
  const setup = read("installer/setup.ps1");
  const verify = read("installer/verify.ps1");

  assert.match(common, /function Test-TvciCommandRuntime/);
  assert.match(common, /AddSeconds\(3\)/);
  for (const endpoint of [
    "/api/health",
    "/commands.html",
    "/commands.js",
    "/assets/office-js/office.js",
    "/dialog.html",
    "/dialog.js",
  ]) {
    assert.match(common, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(common, /office\\\.js[\s\S]*commands\\\.js/);
  assert.ok(common.includes("(?is)office\\.js[\\s\\S]*commands\\.js"));
  assert.match(setup, /Test-TvciCommandRuntime/);
  assert.match(setup, /runtime\.Ok/);
  assert.match(verify, /Test-TvciCommandRuntime/);
  assert.match(verify, /runtime\.Ok/);
});

test("WEF ownership is exact and uninstall removes only the TVCI AppId value", () => {
  const setup = read("installer/setup.ps1");
  const verify = read("installer/verify.ps1");
  const uninstall = read("installer/uninstall.ps1");

  assert.match(setup, /New-ItemProperty[\s\S]*\$WefKey[\s\S]*\$AppId/);
  assert.match(setup, /registered\s+-ne\s+\$manifest/);
  assert.match(verify, /registered\s+-eq\s+\$manifestPath/);
  assert.match(uninstall, /Remove-ItemProperty[\s\S]*\$WefKey[\s\S]*\$AppId/);
  assert.doesNotMatch(uninstall, /Remove-Item\s+-LiteralPath\s+\$WefKey/);
});

test("repair cache overwrite validates that the copied EXE matches the current source", () => {
  const iss = read("installer/TVCIWordTools.iss");

  assert.match(iss, /SourceSize:\s*Int64/);
  assert.match(iss, /CopyFile\(SourceExe, RepairExe, False\)/);
  assert.match(iss, /FileSize64\(SourceExe, SourceSize\)/);
  assert.match(iss, /RepairSize\s*=\s*SourceSize/);
  assert.match(iss, /Name:\s*"\{app\}\\app"/);
});

test("source and manifest versions are current", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  const manifest = read("manifest/manifest.xml");

  assert.equal(pkg.version, "0.1.8");
  assert.equal(lock.version, "0.1.8");
  assert.equal(lock.packages[""].version, "0.1.8");
  assert.match(manifest, /<Version>1\.0\.0\.22<\/Version>/);
});
