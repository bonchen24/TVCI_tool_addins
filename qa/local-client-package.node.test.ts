import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLocalClientPackage } from "../scripts/package-local-client.mjs";
import {
  inspectCanonicalRibbonManifest,
  manifestAssetPaths,
  missingManifestAssets,
} from "../scripts/ribbon-preservation.mjs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

test("local client package command is exposed", () => {
  assert.match(packageJson.scripts["package:local-client"] ?? "", /package-local-client\.mjs/);
});

test("local client package script includes the complete lifecycle surface", () => {
  const script = fs.readFileSync("scripts/package-local-client.mjs", "utf8");
  for (const required of [
    "package.json",
    "package-lock.json",
    "webpack.config.js",
    "manifest",
    "src",
    "assets",
    "templates",
    "setup.cmd",
    "repair.cmd",
    "uninstall.cmd",
    "local-startup.ps1",
    "local-host-launcher.vbs",
    "setup-client.ps1",
    "uninstall-client.ps1",
    "start-local-client.ps1",
  ]) {
    assert.match(script, new RegExp(required.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), `Missing ${required}`);
  }
  assert.match(script, /node_modules/);
  assert.match(script, /does not overwrite|khong ghi de|không ghi đè/i);
});

test("generated local client package contains runtime files but excludes development bulk", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tvci-local-client-test-"));
  try {
    const result = createLocalClientPackage({
      rootDir: process.cwd(),
      outputDir: path.join(tempRoot, "package"),
    });
    const generatedPackageJson = JSON.parse(fs.readFileSync(path.join(result.packageDir, "package.json"), "utf8")) as {
      scripts: Record<string, string | undefined>;
    };
    assert.match(generatedPackageJson.scripts.start ?? "", /start-local-client\.ps1/);
    assert.doesNotMatch(generatedPackageJson.scripts.start ?? "", /office-addin-debugging/);
    assert.equal(generatedPackageJson.scripts["start:debug"], undefined);
    for (const required of [
      "package.json",
      "package-lock.json",
      "webpack.config.js",
      "tsconfig.json",
      "manifest/manifest.xml",
      "src/taskpane/App.tsx",
      "assets/logo-tvci.png",
      "templates/sample-template.docx",
      "scripts/setup-client.ps1",
      "scripts/uninstall-client.ps1",
      "scripts/start-local-client.ps1",
      "scripts/check-local-host.mjs",
      "scripts/local-startup.ps1",
      "scripts/local-host-launcher.vbs",
      "setup.cmd",
      "repair.cmd",
      "uninstall.cmd",
      "README.txt",
      "deployment.json",
    ]) {
      assert.equal(fs.existsSync(path.join(result.packageDir, required)), true, `Missing ${required}`);
    }
    const packagedManifest = fs.readFileSync(path.join(result.packageDir, "manifest/manifest.xml"), "utf8");
    const ribbonCheck = inspectCanonicalRibbonManifest(packagedManifest);
    assert.equal(ribbonCheck.ok, true, `Packaged manifest is not canonical: ${JSON.stringify(ribbonCheck)}`);
    assert.deepEqual(missingManifestAssets(packagedManifest, result.packageDir), []);
    const packagedAssetPaths = manifestAssetPaths(packagedManifest);
    for (const expected of [
      "assets/ribbon/icon-library-16.png",
      "assets/ribbon/icon-builder-80.png",
      "assets/ribbon/icon-convert-unicode-32.png",
      "assets/ribbon/icon-delete-blank-page-80.png",
    ]) {
      assert.ok(packagedAssetPaths.includes(expected), `Manifest does not reference expected asset ${expected}`);
      assert.equal(fs.existsSync(path.join(result.packageDir, ...expected.split("/"))), true, `Missing ${expected}`);
    }
    for (const excluded of ["node_modules", "dist", "qa", "tests", ".git"]) {
      assert.equal(fs.existsSync(path.join(result.packageDir, excluded)), false, `Unexpected ${excluded}`);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
