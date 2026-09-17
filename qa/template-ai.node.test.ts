import test from "node:test";
import assert from "node:assert/strict";
import { buildTemplateFieldPrompt, parseTemplateFieldSuggestions } from "../src/ai/template-field-analysis.ts";

test("template field prompt asks for structured JSON and preserves source text", () => {
  const prompt = buildTemplateFieldPrompt("Công ty ABC - Số 12/QĐ-TVCI");
  assert.match(prompt, /JSON/);
  assert.match(prompt, /sourceText/);
  assert.match(prompt, /Công ty ABC/);
});

test("parses fenced AI JSON field suggestions", () => {
  const parsed = parseTemplateFieldSuggestions('```json\n{"fields":[{"tag":"TEN_KHACH_HANG","title":"Tên khách hàng","sourceText":"Công ty ABC","confidence":0.95}]}\n```');
  assert.deepEqual(parsed, [{ tag: "TEN_KHACH_HANG", title: "Tên khách hàng", sourceText: "Công ty ABC", confidence: 0.95 }]);
});

test("rejects unsafe tags and empty source text", () => {
  assert.throws(() => parseTemplateFieldSuggestions('{"fields":[{"tag":"bad tag!","title":"X","sourceText":"ABC","confidence":0.9}]}'), /tag/i);
  assert.throws(() => parseTemplateFieldSuggestions('{"fields":[{"tag":"TEN_KHACH_HANG","title":"X","sourceText":"","confidence":0.9}]}'), /sourceText/i);
});

import { readFile } from "node:fs/promises";
test("Template Builder exposes AI analysis and apply controls", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(source, /AI phân tích văn bản cũ/);
  assert.match(source, /Tạo Content Control/);
});
