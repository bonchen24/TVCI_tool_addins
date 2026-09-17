import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("local startup helper targets the current user's Startup folder", () => {
  const script = fs.readFileSync("scripts/local-startup.ps1", "utf8");
  assert.match(script, /GetFolderPath\(['"]Startup['"]\)/);
  assert.match(script, /CreateShortcut/);
  assert.match(script, /npm\.cmd/);
});

test("local startup helper starts only the local server and supports removal", () => {
  const script = fs.readFileSync("scripts/local-startup.ps1", "utf8");
  const launcher = fs.readFileSync("scripts/local-host-launcher.vbs", "utf8");
  assert.match(script, /local-host-launcher\.vbs/);
  assert.match(script, /wscript\.exe/);
  assert.match(script, /\$shortcut\.Arguments/);
  assert.match(launcher, /run dev-server/);
  assert.match(launcher, /shell\.Run[\s\S]*, 0, True/i);
  assert.match(script, /localhost:38473/);
  assert.doesNotMatch(script, /npm start/);
  assert.doesNotMatch(script, /WindowStyle\s*=\s*7/);
  assert.match(script, /\[switch\]\$Uninstall/);
  assert.match(script, /Remove-Item -LiteralPath/);
});

test("local startup helper quotes every path passed to the hidden launcher", () => {
  const script = fs.readFileSync("scripts/local-startup.ps1", "utf8");
  assert.match(script, /`"\$launcherPath`"/);
  assert.match(script, /`"\$resolvedProjectPath`"/);
  assert.match(script, /`"\$npmCommand`"/);
});

test("hidden local launcher keeps the host alive and honors the uninstall stop marker", () => {
  const script = fs.readFileSync("scripts/local-host-launcher.vbs", "utf8");
  assert.match(script, /\.tvci-host-stop/);
  assert.match(script, /shell\.Run\(commandLine, 0, True\)/);
  assert.match(script, /WScript\.Sleep 2000/);
  assert.match(script, /WScript\.Quit 0/);
});

test("package scripts expose explicit setup and removal commands", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
  assert.match(packageJson.scripts["setup:local-startup"] ?? "", /local-startup\.ps1/);
  assert.match(packageJson.scripts["remove:local-startup"] ?? "", /-Uninstall/);
});
