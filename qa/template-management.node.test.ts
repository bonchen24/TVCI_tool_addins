import test from "node:test";
import assert from "node:assert/strict";
import type { TemplateRecord } from "../src/templates/library.ts";
import {
  applyTemplatePreferences,
  moveTemplate,
  setTemplateDefault,
  setTemplateHidden,
  type TemplatePreferences,
} from "../src/templates/management.ts";

const records: TemplateRecord[] = [
  { id: "a", name: "A", organization: "TVCI", department: "Văn bản chung", documentType: "Công văn", keywords: [], version: "1.0", status: "active", source: { kind: "bundled", path: "/a.docx" } },
  { id: "b", name: "B", organization: "TVCI", department: "Văn bản chung", documentType: "Công văn", keywords: [], version: "1.0", status: "active", source: { kind: "user", storageId: "b" } },
  { id: "c", name: "C", organization: "TVCI", department: "Văn bản chung", documentType: "Quyết định", keywords: [], version: "1.0", status: "active", source: { kind: "user", storageId: "c" } },
];

test("hides a template without changing its source metadata", () => {
  const prefs = setTemplateHidden({}, "a", true);
  const [first] = applyTemplatePreferences(records, prefs);
  assert.equal(first.hidden, true);
  assert.deepEqual(first.source, { kind: "bundled", path: "/a.docx" });
});

test("default is unique within organization department and document type", () => {
  let prefs: TemplatePreferences = {};
  prefs = setTemplateDefault(records, prefs, "a");
  prefs = setTemplateDefault(records, prefs, "b");
  const applied = applyTemplatePreferences(records, prefs);
  assert.equal(applied.find((item) => item.id === "a")?.isDefault, false);
  assert.equal(applied.find((item) => item.id === "b")?.isDefault, true);
  assert.equal(applied.find((item) => item.id === "c")?.isDefault, false);
});

test("moveTemplate reorders templates only inside the same organization and department", () => {
  const prefs = moveTemplate(records, {}, "b", "up");
  const applied = applyTemplatePreferences(records, prefs)
    .filter((item) => item.department === "Văn bản chung")
    .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0));
  assert.deepEqual(applied.map((item) => item.id), ["b", "a", "c"]);
});
