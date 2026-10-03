import { getQuickDraftActionsForDocument } from "../../src/ai/document-context";

describe("context-aware quick drafting actions", () => {
  test("uses meeting-specific labels for a biên bản", () => {
    const actions = getQuickDraftActionsForDocument("Biên bản");
    expect(actions.find((action) => action.id === "continue")?.label).toBe("Viết diễn biến");
    expect(actions.find((action) => action.id === "conclusion")?.label).toBe("Soạn kết luận");
  });

  test("keeps the generic catalog for an unknown document type", () => {
    const actions = getQuickDraftActionsForDocument("Văn bản chung");
    expect(actions.find((action) => action.id === "main")?.label).toBe("Nội dung chính");
  });
});
