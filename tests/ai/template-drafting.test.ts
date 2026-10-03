import { buildTemplateNarrativePrompt } from "../../src/ai/template-drafting";

test("template narrative drafting requests the complete substantive body and preserves source facts", () => {
  const prompt = buildTemplateNarrativePrompt({
    templateName: "Công văn",
    controls: [{ id: 1, tag: "NOI_DUNG", title: "Nội dung" }],
    fields: [],
    sourceText: "Đề nghị gửi hồ sơ trước ngày 30/9.",
    documentText: "",
  });

  expect(prompt).toMatch(/toàn bộ phần nội dung hành chính thực chất/i);
  expect(prompt).toMatch(/giữ lại mọi dữ kiện nguồn có ý nghĩa/i);
  expect(prompt).toMatch(/không trả các đoạn rời/i);
  expect(prompt).toMatch(/không đưa vào nội dung các khối cố định/i);
});
