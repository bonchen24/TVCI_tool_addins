import type { TemplateOrganization } from "./library";
import type { TemplateFormField, TemplateFormSchema, TemplateFormValue, TemplateFormValues } from "./form-schema";
import { sanitizeAiTextOutput } from "../ai/text-cleanup";

export interface TemplateFormValidationError {
  tag: string;
  label: string;
  code: "required" | "date" | "select" | "repeatable" | "range" | "format";
  message: string;
}

function valuesOf(value: TemplateFormValue): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return String(value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function stringValue(value: TemplateFormValue): string {
  return Array.isArray(value) ? value.join("\n").trim() : String(value ?? "").trim();
}

function isValidDate(value: string): boolean {
  const parts = parseDateParts(value);
  if (!parts) return false;
  const { year, month, day } = parts;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day;
}

function dateNumber(value: string): number {
  const parts = parseDateParts(value);
  return parts ? Date.UTC(parts.year, parts.month - 1, parts.day) : Number.NaN;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateParts(value: string): DateParts | null {
  const raw = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const administrative = /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/iu.exec(raw);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  if (local) return { year: Number(local[3]), month: Number(local[2]), day: Number(local[1]) };
  if (administrative) return { year: Number(administrative[3]), month: Number(administrative[2]), day: Number(administrative[1]) };
  return null;
}

function error(field: TemplateFormField, code: TemplateFormValidationError["code"], message: string): TemplateFormValidationError {
  return { tag: field.tag, label: field.label, code, message };
}

export function validateTemplateForm(schema: TemplateFormSchema, values: TemplateFormValues): TemplateFormValidationError[] {
  const errors: TemplateFormValidationError[] = [];
  for (const field of schema.fields) {
    const value = values[field.tag];
    const text = stringValue(value);
    const items = valuesOf(value);
    if (field.required && !text) errors.push(error(field, "required", `Trường bắt buộc “${field.label}” chưa được nhập.`));
    if (!text) continue;
    if (field.type === "date" && !isValidDate(text)) errors.push(error(field, "date", `“${field.label}” phải là ngày hợp lệ.`));
    if (field.type === "select" && !field.options?.some((option) => option.value === text)) errors.push(error(field, "select", `Giá trị “${field.label}” không thuộc danh mục.`));
    if (field.type === "repeatable" && !items.length) errors.push(error(field, "repeatable", `“${field.label}” cần ít nhất một dòng.`));
    if ((field.tag === "KINH_GUI" || field.tag === "NOI_NHAN") && !items.length) errors.push(error(field, "format", `“${field.label}” cần ít nhất một nơi nhận.`));
  }

  const from = values.TU_NGAY;
  const to = values.DEN_NGAY;
  if (stringValue(from) && stringValue(to) && isValidDate(stringValue(from)) && isValidDate(stringValue(to)) && dateNumber(stringValue(from)) > dateNumber(stringValue(to))) {
    const field = schema.fields.find((item) => item.tag === "DEN_NGAY");
    if (field) errors.push(error(field, "range", "Ngày kết thúc không được trước ngày bắt đầu."));
  }
  return errors;
}

function normalizeVv(value: TemplateFormValue): TemplateFormValue {
  const text = stringValue(value);
  if (!text) return value;
  const duplicated = /^((?:v\/v|về việc)(?:\s*:\s*|\s+))(?:v\/v|về việc)(?:\s*:\s*|\s+)([\s\S]+)$/iu.exec(text);
  return duplicated ? `${duplicated[1]}${duplicated[2]}` : text;
}

function normalizeRecipients(value: TemplateFormValue): string {
  return stringValue(value);
}

export function formatAdministrativeDate(value: string): string {
  const parts = parseDateParts(value);
  if (!parts) return value;
  const { day, month, year } = parts;
  if (!isValidDate(value.trim())) return value;
  const displayedMonth = month <= 2 ? String(month).padStart(2, "0") : String(month);
  return `Hà Nội, ngày ${String(day).padStart(2, "0")} tháng ${displayedMonth} năm ${year}`;
}

/** Value shown in date fields. The UI contract is always dd/mm/yyyy. */
export function formatDateForUi(value: string): string {
  const parts = parseDateParts(value);
  if (!parts || !isValidDate(value)) return value;
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}

/** Normalizes both pasted and typed date values without changing other text fields. */
export function normalizeDateInputValue(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (parseDateParts(raw) && isValidDate(raw)) return formatDateForUi(raw);

  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeAdministrativeBody(value: string): string {
  return value;
}

export function normalizeTemplateFormValues(schema: TemplateFormSchema, values: TemplateFormValues, organization?: TemplateOrganization): TemplateFormValues {
  const cleanedValues = Object.fromEntries(Object.entries(values).map(([tag, value]) => [
    tag,
    Array.isArray(value)
      ? value.map((item) => sanitizeAiTextOutput(item)).filter(Boolean)
      : typeof value === "string" ? sanitizeAiTextOutput(value) : value,
  ])) as TemplateFormValues;
  const normalized: TemplateFormValues = { ...cleanedValues };
  for (const field of schema.fields) {
    const value = cleanedValues[field.tag];
    if (field.tag === "TRICH_YEU") normalized[field.tag] = normalizeVv(value);
    else if (field.tag === "KINH_GUI" || field.tag === "NOI_NHAN_TRUC_TIEP" || field.tag === "DOI_TUONG_MOI") normalized[field.tag] = normalizeRecipients(value);
    else if (field.tag === "NOI_NHAN") {
      const recipients = valuesOf(value);
      if (!recipients.length) continue;
      normalized[field.tag] = recipients.map((item) =>
        /^[-–—]\s*Như trên[;. ]*$/iu.test(item) ? "Như trên" : item
      ).join("\n");
    } else if (field.type === "repeatable") normalized[field.tag] = valuesOf(value);
  }
  for (const tag of ["NOI_DUNG", "NOI_DUNG_CHUNG"]) if (cleanedValues[tag]) normalized[tag] = normalizeAdministrativeBody(stringValue(cleanedValues[tag]));
  if (cleanedValues.NGAY_BAN_HANH) normalized.NGAY_BAN_HANH = formatAdministrativeDate(stringValue(cleanedValues.NGAY_BAN_HANH));
  if (cleanedValues.KINH_GUI && !schema.fields.some((field) => field.tag === "KINH_GUI")) normalized.KINH_GUI = normalizeRecipients(cleanedValues.KINH_GUI);
  return normalized;
}
