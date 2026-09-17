import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

test("default Word sideload runs without the WebView debugger prompt", () => {
  assert.match(packageJson.scripts.start, /--no-debug/);
});

test("a separate debug script remains available for attaching VS Code", () => {
  assert.equal(typeof packageJson.scripts["start:debug"], "string");
  assert.doesNotMatch(packageJson.scripts["start:debug"], /--no-debug/);
});

test("manual local start uses the safe host-and-register flow", () => {
  assert.match(packageJson.scripts.start, /--dev-server-port 38473/);
  assert.match(packageJson.scripts["start:debug"] ?? "", /--dev-server-port 38473/);
  assert.match(packageJson.scripts["start:local"], /start-local-client\.ps1/);
  assert.equal(packageJson.scripts["start:full"], "npm run start:local");
});

test("safe local start never invokes the Office debugging launcher", () => {
  const script = fs.readFileSync("scripts/start-local-client.ps1", "utf8");
  assert.match(script, /local-host-launcher\.vbs/);
  assert.match(script, /office-addin-dev-settings\.cmd/);
  assert.match(script, /register/);
  assert.match(script, /Assert-LocalHostReady/);
  assert.match(script, /\.tvci-host-stop/);
  assert.match(script, /Remove-Item -LiteralPath \$stopFilePath/);
  assert.match(script, /Test-ProjectHostWatchdog/);
  assert.match(script, /hostIsListening[\s\S]*watchdogIsRunning/);
  assert.match(script, /host cu[\s\S]*watchdog/);
  assert.doesNotMatch(script, /office-addin-debugging/);
});
