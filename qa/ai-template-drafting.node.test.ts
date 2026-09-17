import test from "node:test";
import assert from "node:assert/strict";
import { buildTemplateNarrativePrompt } from "../src/ai/template-drafting.ts";

test("template narrative prompt uses mapped fields and asks only for missing free-form prose", () => {
  const prompt = buildTemplateNarrativePrompt({
    templateName: "Công văn hành chính TVCI",
    controls: [{ id: 1, tag: "TEN_KHACH_HANG", title: "Tên khách hàng" }],
    fields: [{ tag: "TEN_KHACH_HANG", value: "Công ty ABC", confidence: 0.98, source: "Công ty ABC" }],
    sourceText: "Công ty ABC đề nghị thử nghiệm điều hòa Daikin model X.",
  });
  assert.match(prompt, /Công văn hành chính TVCI/);
  assert.match(prompt, /Công ty ABC/);
  assert.match(prompt, /phần nội dung tự do/i);
  assert.match(prompt, /không tự bịa/i);
});
