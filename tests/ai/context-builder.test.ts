import { buildAiRequest } from "../../src/ai/context-builder";

test("AI request contains only the current selection", () => {
  expect(buildAiRequest("rewrite", "Đoạn được chọn", "Trang trọng hơn")).toEqual({
    action: "rewrite",
    text: "Đoạn được chọn",
    instruction: "Trang trọng hơn"
  });
});
