import type { TemplateFormSchema, TemplateFormValue, TemplateFormValues } from "../templates/form-schema";

export const FORM_WORKFLOW_STEPS = [
  { id: "template", label: "Nguồn & mẫu", shortLabel: "Mẫu" },
  { id: "structure", label: "Cấu trúc", shortLabel: "Cấu trúc" },
  { id: "fields", label: "Trường cần nhập", shortLabel: "Trường" },
  { id: "content", label: "Soạn nội dung", shortLabel: "Nội dung" },
  { id: "preview", label: "Xem trước", shortLabel: "Xem trước" },
  { id: "apply", label: "Áp dụng Word", shortLabel: "Áp dụng" },
] as const;

export type FormWorkflowStepId = (typeof FORM_WORKFLOW_STEPS)[number]["id"];

export interface FormWorkflowStatus {
  activeStep: FormWorkflowStepId;
  requiredCount: number;
  completedRequiredCount: number;
  filledCount: number;
  totalFieldCount: number;
  isReadyToApply: boolean;
}

export function isTemplateFormValueFilled(value: TemplateFormValue | undefined): boolean {
  if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
  return typeof value === "string" ? value.trim().length > 0 : false;
}

export function getFormWorkflowStatus(
  schema: TemplateFormSchema,
  values: TemplateFormValues,
  pendingSuggestionCount: number,
): FormWorkflowStatus {
  const requiredFields = schema.fields.filter((field) => field.required);
  const completedRequiredCount = requiredFields.filter((field) => isTemplateFormValueFilled(values[field.tag])).length;
  const filledCount = schema.fields.filter((field) => isTemplateFormValueFilled(values[field.tag])).length;
  const isReadyToApply = completedRequiredCount === requiredFields.length;

  return {
    activeStep: pendingSuggestionCount > 0 ? "content" : isReadyToApply ? "preview" : "fields",
    requiredCount: requiredFields.length,
    completedRequiredCount,
    filledCount,
    totalFieldCount: schema.fields.length,
    isReadyToApply,
  };
}
