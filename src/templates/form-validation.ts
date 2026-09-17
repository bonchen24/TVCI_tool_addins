import type { TemplateOrganization } from "./library";
import type { TemplateFormField, TemplateFormSchema, TemplateFormValue, TemplateFormValues } from "./form-schema";
import { formatTvciSubject } from "../utils/tvci-formatter";

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
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const year = Number(iso?.[1] ?? local?.[3]);
  const month = Number(iso?.[2] ?? local?.[2]);
  const day = Number(iso?.[3] ?? local?.[1]);
  if (!year || !month || !day) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day;
}

function dateNumber(value: string): number {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (local) return Date.UTC(Number(local[3]), Number(local[2]) - 1, Number(local[1]));
  return Number.NaN;
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
  return formatTvciSubject(text);
}

function cleanRecipient(item: string): string {
  return item.replace(/^[-–—]\s*/, "").replace(/^[Kk]ính gửi\s*:\s*/, "").replace(/[;；,.\s]+$/g, "").trim();
}

function normalizeRecipients(value: TemplateFormValue, multipleAsBullets: boolean): string {
  const items = valuesOf(value).map(cleanRecipient).filter(Boolean);
  if (!multipleAsBullets || items.length <= 1) return items.join("\n");
  return items.map((item, index) => `- ${item}${index === items.length - 1 ? "." : ";"}`).join("\n");
}

export function formatAdministrativeDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!iso && !local) return value;
  const day = Number(iso?.[3] ?? local?.[1]);
  const month = Number(iso?.[2] ?? local?.[2]);
  const year = Number(iso?.[1] ?? local?.[3]);
  if (!isValidDate(value.trim())) return value;
  const displayedMonth = month <= 2 ? String(month).padStart(2, "0") : String(month);
  return `Hà Nội, ngày ${String(day).padStart(2, "0")} tháng ${displayedMonth} năm ${year}`;
}

export function normalizeAdministrativeBody(value: string): string {
  const lines = value.replace(/;\s*([a-zà-ỹđ])/giu, (_match, letter: string) => `; ${letter.toLocaleUpperCase("vi-VN")}`).split(/\r?\n/);
  const normalized = lines.map((line) => {
    const trimmed = line.trim();
    if (/^Trân trọng(?: cảm ơn)?$/i.test(trimmed)) return `${trimmed}./.`;
    return line;
  });
  return normalized.join("\n");
}

export function normalizeTemplateFormValues(schema: TemplateFormSchema, values: TemplateFormValues, organization?: TemplateOrganization): TemplateFormValues {
  const normalized: TemplateFormValues = { ...values };
  for (const field of schema.fields) {
    const value = values[field.tag];
    if (field.tag === "TRICH_YEU") normalized[field.tag] = normalizeVv(value);
    else if (field.tag === "KINH_GUI" || field.tag === "NOI_NHAN_TRUC_TIEP" || field.tag === "DOI_TUONG_MOI") normalized[field.tag] = normalizeRecipients(value, true);
    else if (field.tag === "NOI_NHAN") {
      const recipients = valuesOf(value);
      if (!recipients.length) continue;
      const hasAddressee = Boolean(stringValue(values.KINH_GUI) || stringValue(values.NOI_NHAN_TRUC_TIEP) || stringValue(values.KINH_TRINH));
      const archiveInput = recipients.find((item) => /^Lưu\s*:/i.test(item));
      const other = recipients.filter((item) => !/^Lưu\s*:/i.test(item))
        .map(cleanRecipient).filter((item) => item && !/^Như trên$/i.test(item));
      const lines = [
        ...(hasAddressee ? ["- Như trên;"] : []),
        ...other.map((item) => `- ${item};`),
      ];
      const archive = archiveInput?.replace(/^Lưu\s*:\s*/i, "").replace(/[;；,.\s]+$/g, "").trim();
      const defaultArchive = organization === "TVCI"
        ? "Lưu: VT, T2."
        : organization === "DANG"
        ? "Lưu: VP, ĐẢNG BỘ VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN."
        : organization === "IEMM"
        ? "Lưu: VT, VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN."
        : "Lưu:";
      lines.push(archive ? `Lưu: ${archive}.` : defaultArchive);
      normalized[field.tag] = lines.join("\n");
    } else if (field.type === "repeatable") normalized[field.tag] = valuesOf(value);
  }
  for (const tag of ["NOI_DUNG", "NOI_DUNG_CHUNG"]) if (values[tag]) normalized[tag] = normalizeAdministrativeBody(stringValue(values[tag]));
  if (values.NGAY_BAN_HANH) normalized.NGAY_BAN_HANH = formatAdministrativeDate(stringValue(values.NGAY_BAN_HANH));
  if (values.KINH_GUI && !schema.fields.some((field) => field.tag === "KINH_GUI")) normalized.KINH_GUI = normalizeRecipients(values.KINH_GUI, true);
  return normalized;
}
