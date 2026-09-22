import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceManifestPath = path.join(root, "manifest", "manifest.xml");
const updaterPath = path.join(root, "update-manifest.js");
const require = createRequire(import.meta.url);
const updater = require(updaterPath) as {
  updateManifest: (manifestPath: string) => { changed: boolean };
};

function runUpdater(manifestPath: string) {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => output.push(args.join(" "));
  try {
    const result = updater.updateManifest(manifestPath);
    return { result, output: output.join("\n") };
  } finally {
    console.log = originalLog;
  }
}

function resourceIds(xml: string) {
  return [...xml.matchAll(/<bt:(?:Image|Url|String)\s+id="([^"]+)"/g)].map((match) => match[1]);
}

test("update-manifest is a byte-preserving no-op for the canonical Ribbon", () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tvci-manifest-updater-"));
  const fixturePath = path.join(tempDirectory, "manifest.xml");

  try {
    const canonical = fs.readFileSync(sourceManifestPath);
    fs.writeFileSync(fixturePath, canonical);

    const firstRun = runUpdater(fixturePath);
    assert.equal(firstRun.result.changed, false);
    assert.match(firstRun.output, /canonical Ribbon/i);
    assert.deepEqual(fs.readFileSync(fixturePath), canonical);

    const secondRun = runUpdater(fixturePath);
    assert.equal(secondRun.result.changed, false);
    assert.match(secondRun.output, /no changes written/i);
    assert.deepEqual(fs.readFileSync(fixturePath), canonical);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test("update-manifest rejects a noncanonical fixture without writing legacy Ribbon content", () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tvci-manifest-updater-"));
  const fixturePath = path.join(tempDirectory, "manifest.xml");

  try {
    const noncanonical = fs.readFileSync(sourceManifestPath, "utf8").replace("GroupAi", "GroupStandardize");
    fs.writeFileSync(fixturePath, noncanonical, "utf8");
    const before = fs.readFileSync(fixturePath);

    assert.throws(() => runUpdater(fixturePath), /canonical Ribbon|refusing to write/i);

    assert.deepEqual(fs.readFileSync(fixturePath), before);
    assert.doesNotMatch(fs.readFileSync(fixturePath, "utf8"), /GroupResources|ShowTaskpane|Chuẩn hóa 1-click|Nhận kinh nghiệm/);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test("the canonical fixture keeps the four groups, required direct controls, and unique resources", () => {
  const manifest = fs.readFileSync(sourceManifestPath, "utf8");
  const customTab = manifest.match(/<CustomTab id="TabTVCI">[\s\S]*?<\/CustomTab>/)?.[0];
  assert.ok(customTab);
  assert.deepEqual(
    [...customTab.matchAll(/<Group id="([^"]+)"/g)].map((match) => match[1]),
    ["GroupAi", "GroupDocument", "GroupQuickInsert", "GroupLayout"],
  );

  for (const [controlId, label] of [
    ["DocumentToolsMenu", "Kiểm tra &amp; cấu hình"],
    ["TemplateWizardButton", "Tạo biểu mẫu"],
    ["LearnExperienceButton", "Tạo kinh nghiệm"],
    ["KnowledgeButton", "Kho tri thức"],
    ["QuickStandardizeButton", "Chuẩn hóa nhanh"],
    ["RollbackButton", "Hoàn tác chuẩn hóa"],
  ]) {
    assert.match(customTab, new RegExp(`id="${controlId}"`));
    assert.match(manifest, new RegExp(`DefaultValue="${label}"`));
  }

  const ids = resourceIds(manifest);
  assert.equal(new Set(ids).size, ids.length);
  assert.doesNotMatch(manifest, /GroupStandardize|GroupPageLayout|GroupResources|ShowTaskpane|Chuẩn hóa 1-click|Nhận kinh nghiệm/);
});
