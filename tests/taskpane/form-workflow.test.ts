import {
  getFormWorkflowStatus,
  isTemplateFormValueFilled,
} from "../../src/taskpane/form-workflow";
import type { TemplateFormSchema } from "../../src/templates/form-schema";

const schema: TemplateFormSchema = {
  id: "generic",
  documentType: "Công văn",
  label: "Công văn",
  fields: [
    { tag: "SO_KY_HIEU", label: "Số và ký hiệu", type: "text", required: true, wordTarget: "content-control" },
    { tag: "NOI_DUNG", label: "Nội dung", type: "textarea", required: true, wordTarget: "content-control" },
    { tag: "GHI_CHU", label: "Ghi chú", type: "text", wordTarget: "content-control" },
  ],
};

describe("form workflow status", () => {
  test("treats array and whitespace values consistently", () => {
    expect(isTemplateFormValueFilled(["A", "B"])).toBe(true);
    expect(isTemplateFormValueFilled(["", "  "])).toBe(false);
    expect(isTemplateFormValueFilled("  ")).toBe(false);
    expect(isTemplateFormValueFilled(null)).toBe(false);
  });

  test("starts at the fields step until required values are present", () => {
    expect(getFormWorkflowStatus(schema, { SO_KY_HIEU: "" }, 0)).toMatchObject({
      activeStep: "fields",
      requiredCount: 2,
      completedRequiredCount: 0,
      isReadyToApply: false,
    });
  });

  test("asks for review when AI suggestions are waiting", () => {
    expect(getFormWorkflowStatus(schema, { SO_KY_HIEU: "12/CV", NOI_DUNG: "Nội dung" }, 2)).toMatchObject({
      activeStep: "content",
      completedRequiredCount: 2,
      isReadyToApply: true,
    });
  });

  test("moves to preview when required values are complete and no review is pending", () => {
    expect(getFormWorkflowStatus(schema, { SO_KY_HIEU: "12/CV", NOI_DUNG: "Nội dung" }, 0)).toMatchObject({
      activeStep: "preview",
      isReadyToApply: true,
    });
  });
});
