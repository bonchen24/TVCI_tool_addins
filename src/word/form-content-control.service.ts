import type { TemplateFormSchema, TemplateFormValue, TemplateFormValues } from "../templates/form-schema";
import { formatAdministrativeDate } from "../templates/form-validation";
import { normalizeControlTag } from "../content-controls/field-map";
import {
  parseAndFormatTvciDate,
  formatTvciSubject,
  formatTvciAddressee,
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
    const value = valueText(values[tag]);
    if (value) result.updates.push({ id: control.id, tag, value });
  }

  result.missingFields = schema.fields
    .filter((field) => field.wordTarget === "content-control" && !found.has(field.tag))
    .map((field) => ({ tag: field.tag, label: field.label }));
  return result;
}

function formatDateVietnamese(rawDate: string): string {
  return formatAdministrativeDate(rawDate);
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
          const newText = `Số: ${cleanVal}`;
          p.insertText(newText, Word.InsertLocation.replace);
          wrapContentControl(p, "SO_KY_HIEU", missingMap.get("SO_KY_HIEU") || "Số và ký hiệu");
          claimedTags.add("SO_KY_HIEU");
          updates.push({ id: Math.floor(Math.random() * 100000), tag: "SO_KY_HIEU", value: newText });
          continue;
        }
      }
    }

    // Remove "(Ký và ghi rõ họ tên)" per Section XI.8
    if (/\(Ký\s*(?:và|,)?\s*ghi\s+rõ\s+họ\s+tên\)/i.test(trimmed)) {
      try {
        p.delete();
      } catch {}
      continue;
    }

    // 2. NGAY_BAN_HANH
    if (missingMap.has("NGAY_BAN_HANH") && !claimedTags.has("NGAY_BAN_HANH")) {
      const isDateParagraph = /(?:ngày\s+[…\.\d\[\]dm]+|\bngày\s+)\s*tháng\s+[…\.\d\[\]m]+\s*năm\s+[…\.\d\[\]y]+/i.test(trimmed);
      if (isDateParagraph) {
        const rawDate = valueText(values.NGAY_BAN_HANH);
        if (rawDate) {
          const newText = parseAndFormatTvciDate(rawDate);
          p.insertText(newText, Word.InsertLocation.replace);
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
          const newText = formatTvciSubject(val);
          p.insertText(newText, Word.InsertLocation.replace);
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
        const val = valueText(values[tag]);
        if (val) {
          p.insertText(val, Word.InsertLocation.replace);
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
        const val = valueText(values.NOI_NHAN);
        if (val) {
          p.insertText(val, Word.InsertLocation.replace);
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
          p.insertText(newText, Word.InsertLocation.replace);
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
        const val = valueText(values[tag]);
        if (val) {
          p.insertText(val, Word.InsertLocation.replace);
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

export async function applyTemplateFormToWord(schema: TemplateFormSchema, values: TemplateFormValues): Promise<TemplateFormContentControlResult> {
  return Word.run(async (context) => {
    const controls = context.document.contentControls;
    controls.load("items/id,items/tag,items/title");
    await context.sync();
    const snapshot = controls.items.map((control) => ({ id: control.id, tag: control.tag, title: control.title }));
    const result = planTemplateFormContentControlUpdates(schema, snapshot, values);
    const byId = new Map(result.updates.map((update) => [update.id, update.value]));
    for (const control of controls.items) {
      const value = byId.get(control.id);
      if (value !== undefined) {
        if ((control.tag === "NOI_NHAN_TRUC_TIEP" || control.tag === "KINH_GUI") && value.startsWith("- ")) {
          control.insertText(`\n${value}`, Word.InsertLocation.replace);
        } else {
          control.insertText(value, Word.InsertLocation.replace);
        }
      }
    }
    if (result.updates.length) await context.sync();

    // Fallback: If some fields were missing because the template docx has no Content Controls,
    // search document paragraphs for standard placeholders and replace them.
    if (result.missingFields.length > 0) {
      const fallbackApplied = await applyFallbackPlaceholders(context, schema, values, result.missingFields);
      if (fallbackApplied.length > 0) {
        for (const item of fallbackApplied) {
          result.updates.push(item);
        }
        const updatedTags = new Set(fallbackApplied.map((item) => item.tag));
        result.missingFields = result.missingFields.filter((f) => !updatedTags.has(f.tag));
      }
    }

    return result;
  });
}
