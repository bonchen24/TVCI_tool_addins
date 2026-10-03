import type { TemplateFormSchema, TemplateFormValue, TemplateFormValues } from "../templates/form-schema";
import type { TemplateOrganization } from "../templates/library";
import { normalizeTemplateFormValues } from "../templates/form-validation";
import { normalizeControlTag } from "../content-controls/field-map";
import { sanitizeAdministrativeBody } from "../utils/administrative-body";
import {
  parseAndFormatTvciDate
} from "../utils/tvci-formatter";

export interface FormContentControlLike {
  id: number;
  tag: string;
  title: string;
}

export interface TemplateFormContentControlUpdate {
  id: number;
  tag: string;
  value: string;
}

export interface TemplateFormContentControlResult {
  updates: TemplateFormContentControlUpdate[];
  missingFields: Array<{ tag: string; label: string }>;
  ignoredLayoutTags: string[];
  unknownTags: string[];
}

export function preserveTemplateLocalityForDate(templateText: string, formattedDate: string): string {
  const dateStart = formattedDate.search(/ngày/i);
  if (dateStart < 0) return formattedDate;

  const localityPrefix = templateText.match(/^(.+?,\s*)ngày\b/i)?.[1];
  if (!localityPrefix) return formattedDate;

  return `${localityPrefix}${formattedDate.slice(dateStart)}`;
}
export function sanitizeTemplateBodyValue(value: string): string {
  return sanitizeAdministrativeBody(value);
}
export function normalizeTemplateAddresseeValue(value: string): string {
  return String(value ?? "").replace(/\r\n?/g, "\n").split("\n")
    .map((line, index) => {
      let text = line.trim();
      if (index === 0) text = text.replace(/^Kính\s+gửi\s*:\s*/iu, "");
      text = text.replace(/^(?:[-–—•*]\s*)+/, "").trim();
      return text;
    })
    .filter(Boolean)
    .join("\n");
}

export function preserveTemplateParagraphBullet(templateText: string, value: string): string {
  const templatePrefix = /^\s*[-–—]\s*/u.exec(templateText)?.[0] ?? "";
  if (!templatePrefix) return value;
  return /^\s*[-–—]\s*/u.test(value) ? value : `${templatePrefix}${value}`;
}
export function preserveTemplateSubjectLabel(templateText: string, value: string): string {
  const templateLabel = /^\s*(?:V\/v|Về việc)\s*:?\s*/iu.exec(templateText)?.[0];
  if (!templateLabel) return value;
  const subject = value.replace(/^\s*(?:V\/v|Về việc)\s*:?\s*/iu, "");
  return `${templateLabel}${subject}`;
}
export function preserveTemplateDocumentNumber(templateText: string, value: string): string {
  const templateLabel = /^\s*Số\s*:/iu.exec(templateText)?.[0];
  if (!templateLabel) return value;
  let number = value.replace(/^\s*Số\s*:\s*/iu, "").trim();
  const templateSuffix = /\/[^\s/]+\s*$/u.exec(templateText)?.[0]?.trimEnd() ?? "";
  if (templateSuffix && !number.includes("/")) number += templateSuffix;
  return `${templateLabel.trimEnd()} ${number}`;
}
export function replaceInlineAddresseePlaceholder(paragraphText: string, value: string): string | null {
  const placeholder = /^(\s*Kính\s+gửi\s*:\s*)\[[^\]]+\](\s*)$/iu;
  const match = placeholder.exec(paragraphText);
  const replacement = normalizeTemplateAddresseeValue(value);
  if (!match || !replacement) return null;
  return `${match[1]}${replacement}${match[2]}`;
}
export function preserveInlineAddresseeLabel(controlText: string, value: string): string {
  const replacement = normalizeTemplateAddresseeValue(value);
  const label = /^(\s*Kính\s+gửi\s*:\s*)/iu.exec(controlText);
  return label && replacement ? `${label[1]}${replacement}` : replacement;
}
export function isUnusedTemplateBodyInstruction(value: string): boolean {
  const text = String(value ?? "").trim();
  return /^\[Nội dung do [^\]]+ chủ trì soạn thảo\.\]$/iu.test(text)
    || /^\[Kết luận\/đề nghị\/phối hợp thực hiện\.\](?:\.\/\.)?$/iu.test(text);
}
export function isLayoutContentControlTag(tag: string): boolean {
  return /^TVCI_HRULE:/i.test(tag.trim());
}

function valueText(value: TemplateFormValue): string {
  return Array.isArray(value) ? value.join("\n").trim() : String(value ?? "").trim();
}

export function planTemplateFormContentControlUpdates(
  schema: TemplateFormSchema,
  controls: FormContentControlLike[],
  values: TemplateFormValues,
): TemplateFormContentControlResult {
  const fields = new Map(schema.fields.map((field) => [field.tag, field]));
  const found = new Set<string>();
  const result: TemplateFormContentControlResult = { updates: [], missingFields: [], ignoredLayoutTags: [], unknownTags: [] };

  for (const control of controls) {
    const tag = normalizeControlTag(control.tag);
    if (!tag) continue;
    if (isLayoutContentControlTag(tag)) {
      result.ignoredLayoutTags.push(control.tag);
      continue;
    }
    const field = fields.get(tag);
    if (!field) {
      result.unknownTags.push(control.tag);
      continue;
    }
    found.add(tag);
    let value = valueText(values[tag]);
    if (tag === "NOI_DUNG" || tag === "NOI_DUNG_CHUNG") value = sanitizeTemplateBodyValue(value);
    if (tag === "KINH_GUI" || tag === "NOI_NHAN_TRUC_TIEP" || tag === "DOI_TUONG_NHAN") {
      value = normalizeTemplateAddresseeValue(value);
    }
    if (value) result.updates.push({ id: control.id, tag, value });
  }

  result.missingFields = schema.fields
    .filter((field) => field.wordTarget === "content-control" && !found.has(field.tag))
    .map((field) => ({ tag: field.tag, label: field.label }));
  return result;
}

function insertFallbackText(
  paragraph: Word.Paragraph,
  text: string,
  _tag: string,
  _organization?: TemplateOrganization,
): void {
  paragraph.insertText(text, Word.InsertLocation.replace);
}

function wrapContentControl(p: Word.Paragraph, tag: string, title: string) {
  try {
    if (typeof p.getRange === "function") {
      const range = p.getRange();
      if (typeof range.insertContentControl === "function") {
        const cc = range.insertContentControl();
        cc.tag = tag;
        cc.title = title;
      }
    }
  } catch {
    // Non-blocking progressive enhancement
  }
}

async function applyFallbackPlaceholders(
  context: Word.RequestContext,
  schema: TemplateFormSchema,
  values: TemplateFormValues,
  missingFields: Array<{ tag: string; label: string }>,
  organization?: TemplateOrganization,
): Promise<TemplateFormContentControlUpdate[]> {
  const updates: TemplateFormContentControlUpdate[] = [];
  const missingMap = new Map(missingFields.map((f) => [f.tag, f.label]));
  const body = context.document?.body;
  if (!body || !body.paragraphs || typeof body.paragraphs.load !== "function") return updates;

  const paragraphs = body.paragraphs;
  paragraphs.load("items/text");
  await context.sync();

  const claimedTags = new Set<string>();
  let inKinhGuiSection = false;
  let inNoiNhanSection = false;

  for (const p of paragraphs.items) {
    const rawText = p.text ?? "";
    const trimmed = rawText.trim();
    if (!trimmed) continue;

    if (/^Kính gửi:?/i.test(trimmed)) {
      inKinhGuiSection = true;
      inNoiNhanSection = false;
      const tag = missingMap.has("KINH_GUI") ? "KINH_GUI" : "NOI_NHAN_TRUC_TIEP";
      if (missingMap.has(tag) && !claimedTags.has(tag)) {
        const replacement = replaceInlineAddresseePlaceholder(rawText, valueText(values[tag]));
        if (replacement) {
          insertFallbackText(p, replacement, tag, organization);
          wrapContentControl(p, tag, missingMap.get(tag) || tag);
          claimedTags.add(tag);
          updates.push({ id: Math.floor(Math.random() * 100000), tag, value: replacement });
        }
      }
      continue;
    }
    if (/^Nơi nhận:?/i.test(trimmed)) {
      inKinhGuiSection = false;
      inNoiNhanSection = true;
      continue;
    }

    // 1. SO_KY_HIEU
    if (missingMap.has("SO_KY_HIEU") && !claimedTags.has("SO_KY_HIEU")) {
      const isNumberParagraph = /^Số:\s*(\S*\/.*|\.\.\.|\…|\[KÝ HIỆU\])/i.test(trimmed);
      if (isNumberParagraph) {
        const val = valueText(values.SO_KY_HIEU);
        if (val) {
          const cleanVal = val.replace(/^Số:\s*/i, "");
          const newText = preserveTemplateDocumentNumber(trimmed, cleanVal);
          insertFallbackText(p, newText, "SO_KY_HIEU", organization);
          wrapContentControl(p, "SO_KY_HIEU", missingMap.get("SO_KY_HIEU") || "Số và ký hiệu");
          claimedTags.add("SO_KY_HIEU");
          updates.push({ id: Math.floor(Math.random() * 100000), tag: "SO_KY_HIEU", value: newText });
          continue;
        }
      }
    }

    // 2. NGAY_BAN_HANH
    if (missingMap.has("NGAY_BAN_HANH") && !claimedTags.has("NGAY_BAN_HANH")) {
      const isDateParagraph = /(?:ngày\s+[…\.\d\[\]dm]+|\bngày\s+)\s*tháng\s+[…\.\d\[\]m]+\s*năm\s+[…\.\d\[\]y]+/i.test(trimmed);
      if (isDateParagraph) {
        const rawDate = valueText(values.NGAY_BAN_HANH);
        if (rawDate) {
          const newText = preserveTemplateLocalityForDate(trimmed, parseAndFormatTvciDate(rawDate));
          insertFallbackText(p, newText, "NGAY_BAN_HANH", organization);
          wrapContentControl(p, "NGAY_BAN_HANH", missingMap.get("NGAY_BAN_HANH") || "Ngày ban hành");
          claimedTags.add("NGAY_BAN_HANH");
          updates.push({ id: Math.floor(Math.random() * 100000), tag: "NGAY_BAN_HANH", value: newText });
          continue;
        }
      }
    }

    // 3. TRICH_YEU
    if (missingMap.has("TRICH_YEU") && !claimedTags.has("TRICH_YEU")) {
      const isTrichYeuParagraph = /^(?:V\/v|Về việc:?)\s*(?:[…\.…]|\[.*\])/i.test(trimmed);
      if (isTrichYeuParagraph) {
        const val = valueText(values.TRICH_YEU);
        if (val) {
          const newText = preserveTemplateSubjectLabel(trimmed, val);
          insertFallbackText(p, newText, "TRICH_YEU", organization);
          wrapContentControl(p, "TRICH_YEU", missingMap.get("TRICH_YEU") || "Trích yếu");
          claimedTags.add("TRICH_YEU");
          updates.push({ id: Math.floor(Math.random() * 100000), tag: "TRICH_YEU", value: newText });
          continue;
        }
      }
    }

    // 4. KINH_GUI / NOI_NHAN_TRUC_TIEP (within Kính gửi section)
    if (inKinhGuiSection && ((missingMap.has("KINH_GUI") && !claimedTags.has("KINH_GUI")) || (missingMap.has("NOI_NHAN_TRUC_TIEP") && !claimedTags.has("NOI_NHAN_TRUC_TIEP")))) {
      const isKinhGuiDots = /^-\s*[…\.]{3,}[;；]?$/.test(trimmed) || /^-\s*\[.*\][;；]?$/.test(trimmed);
      if (isKinhGuiDots) {
        const tag = missingMap.has("KINH_GUI") ? "KINH_GUI" : "NOI_NHAN_TRUC_TIEP";
        const val = preserveTemplateParagraphBullet(trimmed, normalizeTemplateAddresseeValue(valueText(values[tag])));
        if (val) {
          insertFallbackText(p, val, tag, organization);
          wrapContentControl(p, tag, missingMap.get(tag) || tag);
          claimedTags.add(tag);
          updates.push({ id: Math.floor(Math.random() * 100000), tag, value: val });
          continue;
        }
      }
    }

    // 5. NOI_NHAN (within Nơi nhận section)
    if (inNoiNhanSection && missingMap.has("NOI_NHAN") && !claimedTags.has("NOI_NHAN")) {
      const isNoiNhanDots = /^-\s*[…\.]{3,}[;；]?$/.test(trimmed);
      if (isNoiNhanDots) {
        const val = preserveTemplateParagraphBullet(trimmed, valueText(values.NOI_NHAN));
        if (val) {
          insertFallbackText(p, val, "NOI_NHAN", organization);
          wrapContentControl(p, "NOI_NHAN", missingMap.get("NOI_NHAN") || "Nơi nhận");
          claimedTags.add("NOI_NHAN");
          updates.push({ id: Math.floor(Math.random() * 100000), tag: "NOI_NHAN", value: val });
          continue;
        }
      }
    }

    // 6. NGUOI_KY
    if (missingMap.has("NGUOI_KY") && !claimedTags.has("NGUOI_KY")) {
      const isSignerParagraph = /\[Họ và tên\]|\(Họ và tên\)/i.test(trimmed);
      if (isSignerParagraph) {
        const val = valueText(values.NGUOI_KY);
        if (val) {
          const newText = trimmed.replace(/\[Họ và tên\]|\(Họ và tên\)/i, val);
          insertFallbackText(p, newText, "NGUOI_KY", organization);
          wrapContentControl(p, "NGUOI_KY", missingMap.get("NGUOI_KY") || "Người ký");
          claimedTags.add("NGUOI_KY");
          updates.push({ id: Math.floor(Math.random() * 100000), tag: "NGUOI_KY", value: val });
          continue;
        }
      }
    }

    // 7. NOI_DUNG / NOI_DUNG_CHUNG
    if ((missingMap.has("NOI_DUNG") && !claimedTags.has("NOI_DUNG")) || (missingMap.has("NOI_DUNG_CHUNG") && !claimedTags.has("NOI_DUNG_CHUNG"))) {
      const tag = missingMap.has("NOI_DUNG") ? "NOI_DUNG" : "NOI_DUNG_CHUNG";
      const isNoiDungPlaceholder = /^\[(?:Nội dung|Nội dung do Trung tâm|Mở đầu:).*\]$/i.test(trimmed);
      if (isNoiDungPlaceholder) {
        const val = sanitizeTemplateBodyValue(valueText(values[tag]));
        if (val) {
          insertFallbackText(p, val, tag, organization);
          wrapContentControl(p, tag, missingMap.get(tag) || tag);
          claimedTags.add(tag);
          updates.push({ id: Math.floor(Math.random() * 100000), tag, value: val });
          continue;
        }
      }
    }
  }

  if (updates.length > 0) {
    await context.sync();
  }

  return updates;
}

async function clearUnusedTemplateBodyInstructions(context: Word.RequestContext, bodyValue: TemplateFormValue): Promise<void> {
  if (!valueText(bodyValue)) return;
  const paragraphs = context.document?.body?.paragraphs;
  if (!paragraphs || typeof paragraphs.load !== "function") return;

  paragraphs.load("items/text");
  await context.sync();
  let changed = false;
  for (const paragraph of paragraphs.items) {
    if (!isUnusedTemplateBodyInstruction(paragraph.text ?? "")) continue;
    paragraph.insertText("", Word.InsertLocation.replace);
    changed = true;
  }
  if (changed) await context.sync();
}

export async function applyTemplateFormToWord(
  schema: TemplateFormSchema,
  values: TemplateFormValues,
  organization?: TemplateOrganization,
): Promise<TemplateFormContentControlResult> {
  return Word.run(async (context) => {
    const normalizedValues = normalizeTemplateFormValues(schema, values, organization);
    const controls = context.document.contentControls;
    controls.load("items/id,items/tag,items/title,items/text");
    await context.sync();
    const snapshot = controls.items.map((control) => ({ id: control.id, tag: control.tag, title: control.title }));
    const result = planTemplateFormContentControlUpdates(schema, snapshot, normalizedValues);
    const byId = new Map(result.updates.map((update) => [update.id, update]));
    for (const control of controls.items) {
      const update = byId.get(control.id);
      if (update !== undefined) {
        const controlText = String((control as unknown as { text?: string }).text ?? "");
        const insertValue = update.tag === "NGAY_BAN_HANH"
          ? preserveTemplateLocalityForDate(controlText, update.value)
          : update.tag === "SO_KY_HIEU"
            ? preserveTemplateDocumentNumber(controlText, update.value)
          : update.tag === "KINH_GUI" || update.tag === "NOI_NHAN_TRUC_TIEP" || update.tag === "DOI_TUONG_NHAN"
            ? preserveInlineAddresseeLabel(controlText, update.value)
          : update.tag === "TRICH_YEU"
            ? preserveTemplateSubjectLabel(controlText, update.value)
          : update.value;
        control.insertText(insertValue, Word.InsertLocation.replace);
      }
    }
    if (result.updates.length) await context.sync();

    // Fallback: If some fields were missing because the template docx has no Content Controls,
    // search document paragraphs for standard placeholders and replace them.
    if (result.missingFields.length > 0) {
      const fallbackApplied = await applyFallbackPlaceholders(context, schema, normalizedValues, result.missingFields, organization);
      if (fallbackApplied.length > 0) {
        for (const item of fallbackApplied) {
          result.updates.push(item);
        }
        const updatedTags = new Set(fallbackApplied.map((item) => item.tag));
        result.missingFields = result.missingFields.filter((f) => !updatedTags.has(f.tag));
      }
    }

    await clearUnusedTemplateBodyInstructions(context, normalizedValues.NOI_DUNG ?? normalizedValues.NOI_DUNG_CHUNG);

    return result;
  });
}
