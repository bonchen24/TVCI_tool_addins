import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("template form UI is extracted and exposes the three separate card actions", async () => {
  const app = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/taskpane/TemplateFormPanel.tsx", import.meta.url), "utf8");
  assert.match(app, /TemplateFormPanel/);
  assert.doesNotMatch(app, /<form className="templateForm/);
  for (const label of ["Mở form", "Chèn mẫu trống", "Chèn và điền"]) assert.match(app + panel, new RegExp(label));
  assert.match(panel, /Áp dụng vào Word/);
  assert.match(panel, /source/);
  assert.match(panel, /confidence/);
});

test("template form UI keeps AI suggestions out of Word until acceptance", async () => {
  const source = await readFile(new URL("../src/taskpane/TemplateFormPanel.tsx", import.meta.url), "utf8");
  assert.match(source, /Chấp nhận đề xuất/);
  assert.match(source, /onAcceptAi/);
  assert.match(source, /onApplyToWord/);
});

test("template form surface excludes TKV and standalone NĐ30 organizations", async () => {
  const app = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  const manifest = await readFile(new URL("../manifest/manifest.xml", import.meta.url), "utf8");
  assert.doesNotMatch(app, /label:\s*["']TKV["']/);
  assert.doesNotMatch(app, /NĐ30/);
  assert.doesNotMatch(manifest, /biểu mẫu TKV/i);
});

test("FINAL catalog opens in a settings library modal while the form remains the main surface", async () => {
  const app = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(app, /templateLibraryOpen/);
  assert.match(app, /role="dialog" aria-label="Kho biểu mẫu"/);
  assert.match(app, /className="templateList"/);
  assert.match(app, /TemplateFormPanel/);
});

