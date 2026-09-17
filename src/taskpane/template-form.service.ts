import type { TemplateFormField, TemplateFormValue, TemplateFormValues } from "../templates/form-schema";
import type { TemplateFormContentControlResult } from "../word/form-content-control.service";
import type { TemplateFormAiSuggestion } from "../ai/template-form";
import { MIN_TEMPLATE_FORM_AI_CONFIDENCE } from "../ai/template-form";

export function templateFormInputValue(value: TemplateFormValue): string {
  return Array.isArray(value) ? value.join("\n") : value ?? "";
}

export function templateFormInputToValue(field: TemplateFormField, input: string): TemplateFormValue {
  if (field.type === "repeatable") return input.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return input;
}

export function mergeAcceptedTemplateFormSuggestions(values: TemplateFormValues, suggestions: TemplateFormAiSuggestion[]): TemplateFormValues {
  const next = { ...values };
  for (const suggestion of suggestions) {
    if (suggestion.value !== null && suggestion.value.trim()
      && (suggestion.reviewed === true || suggestion.confidence >= MIN_TEMPLATE_FORM_AI_CONFIDENCE)) {
      next[suggestion.tag] = suggestion.value;
    }
  }
  return next;
}

export function describeTemplateFormSync(result: TemplateFormContentControlResult): string {
  const updated = `Đã cập nhật ${result.updates.length} Content Control`;
  const missing = result.missingFields.length
    ? ` Thiếu Content Control: ${result.missingFields.map((field) => `${field.label} (${field.tag})`).join(", ")}.`
    : ".";
  return `${updated}.${missing}`;
}
