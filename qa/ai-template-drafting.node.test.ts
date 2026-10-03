import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScriptModule } from "./test-support/load-typescript-module.mjs";

const { buildTemplateNarrativePrompt } = loadTypeScriptModule(
  new URL("../src/ai/template-drafting.ts", import.meta.url),
) as typeof import("../src/ai/template-drafting");

test("template narrative prompt asks for a complete substantive body while excluding fixed template blocks", () => {
  const prompt = buildTemplateNarrativePrompt({
    templateName: "Công văn hành chính TVCI",
    controls: [{ id: 1, tag: "TEN_KHACH_HANG", title: "Tên khách hàng" }],
    fields: [{ tag: "TEN_KHACH_HANG", value: "Công ty ABC", confidence: 0.98, source: "Công ty ABC" }],
    sourceText: "Công ty ABC đề nghị thử nghiệm điều hòa Daikin model X.",
  });
  assert.match(prompt, /Công văn hành chính TVCI/);
  assert.match(prompt, /Công ty ABC/);
  assert.match(prompt, /toàn bộ phần nội dung hành chính thực chất/i);
  assert.match(prompt, /giữ lại mọi dữ kiện nguồn có ý nghĩa/i);
  assert.match(prompt, /không đưa vào nội dung các khối cố định/i);
  assert.match(prompt, /không tự bịa/i);
});
