import type {
  TemplateFormField,
  TemplateFormSchema,
  TemplateFormValue,
  TemplateFormValues,
} from "../templates/form-schema";

export type TemplateApplyAction = "CREATE" | "FILL_MISSING" | "APPEND" | "REPLACE" | "REFINE_SELECTION";
export type TemplateApplyItemStatus = "update" | "skip";

export interface TemplateApplyPlanItem {
  tag: string;
  label: string;
  action: TemplateApplyAction;
  before: TemplateFormValue;
  incoming: TemplateFormValue;
  after: TemplateFormValue;
  status: TemplateApplyItemStatus;
  reason?: string;
}

export interface TemplateApplyPlan {
  action: TemplateApplyAction;
  items: TemplateApplyPlanItem[];
  values: TemplateFormValues;
}

function asLines(value: TemplateFormValue): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return String(value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function asText(value: TemplateFormValue): string {
  return Array.isArray(value) ? value.join("\n").trim() : String(value ?? "").trim();
}

function comparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .replace(/^\s*(?:can cu|kinh gui|noi nhan)\s*:?\s*/i, "")
    .replace(/\bso\b/gi, "")
    .replace(/[^\p{L}\p{N}/%°±.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmpty(value: TemplateFormValue): boolean {
  return asText(value).length === 0;
}

function uniqueLines(existing: string[], incoming: string[]): string[] {
  const result = [...existing];
  const seen = new Set(existing.map(comparable).filter(Boolean));
  for (const item of incoming) {
    const key = comparable(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item.trim());
  }
  return result;
}

function appendValue(field: TemplateFormField, before: TemplateFormValue, incoming: TemplateFormValue): TemplateFormValue {
  if (field.type === "repeatable") return uniqueLines(asLines(before), asLines(incoming));
  const existingText = asText(before);
  const incomingLines = asLines(incoming);
  if (!existingText) return asText(incoming);
  if (!incomingLines.length) return existingText;
  const existingLines = asLines(before);
  const appended = uniqueLines(existingLines, incomingLines);
  return appended.join("\n");
}

function changed(before: TemplateFormValue, after: TemplateFormValue): boolean {
  if (Array.isArray(before) || Array.isArray(after)) {
    const beforeItems = asLines(before).map(comparable);
    const afterItems = asLines(after).map(comparable);
    return beforeItems.length !== afterItems.length || beforeItems.some((item, index) => item !== afterItems[index]);
  }
  return comparable(asText(before)) !== comparable(asText(after));
}

function applyField(field: TemplateFormField, before: TemplateFormValue, incoming: TemplateFormValue, action: TemplateApplyAction): { after: TemplateFormValue; reason?: string } {
  if (isEmpty(incoming)) return { after: before, reason: "AI không có dữ liệu cho trường này." };
  if (action === "CREATE" || action === "FILL_MISSING") {
    return isEmpty(before)
      ? { after: field.type === "repeatable" ? asLines(incoming) : incoming }
      : { after: before, reason: "Trường đã có dữ liệu." };
  }
  if (action === "APPEND") return { after: appendValue(field, before, incoming) };
  return { after: incoming };
}

export function buildTemplateApplyPlan(
  schema: TemplateFormSchema,
  existing: TemplateFormValues,
  incoming: TemplateFormValues,
  action: TemplateApplyAction = "FILL_MISSING",
): TemplateApplyPlan {
  const items: TemplateApplyPlanItem[] = [];
  const values: TemplateFormValues = {};
  for (const field of schema.fields) {
    const before = existing[field.tag] ?? null;
    const next = incoming[field.tag] ?? null;
    if (isEmpty(next)) continue;
    const result = applyField(field, before, next, action);
    const status: TemplateApplyItemStatus = changed(before, result.after) ? "update" : "skip";
    const item: TemplateApplyPlanItem = {
      tag: field.tag,
      label: field.label,
      action,
      before,
      incoming: next,
      after: result.after,
      status,
      reason: status === "skip" ? result.reason || "Nội dung không tạo ra thay đổi." : undefined,
    };
    items.push(item);
    if (status === "update") values[field.tag] = result.after;
  }
  return { action, items, values };
}

export function summarizeTemplateApplyPlan(plan: TemplateApplyPlan): { updates: number; skipped: number } {
  return {
    updates: plan.items.filter((item) => item.status === "update").length,
    skipped: plan.items.filter((item) => item.status === "skip").length,
  };
}
