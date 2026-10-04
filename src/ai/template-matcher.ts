import { isTemplateSelectable, type TemplateRecord } from "../templates/library";
import type { TemplateFormSchema, TemplateFormValues } from "../templates/form-schema";

export type DraftSectionKind =
  | "SO_KY_HIEU"
  | "NGAY_BAN_HANH"
  | "TRICH_YEU"
  | "KINH_GUI"
  | "NOI_NHAN_TRUC_TIEP"
  | "CAN_CU"
  | "NOI_DUNG"
  | "LY_DO"
  | "DE_XUAT_KIEN_NGHI"
  | "NOI_DUNG_DIEN_BIEN"
  | "KET_LUAN"
  | "DIEU_KHOAN"
  | "THOI_GIAN"
  | "DIA_DIEM"
  | "THANH_PHAN"
  | "CHU_TRI"
  | "THU_KY"
  | "NGUOI_KY"
  | "NOI_NHAN";

export interface DraftSection {
  kind: DraftSectionKind;
  heading: string;
  value: string;
  items?: string[];
}

export interface ParsedDraftSections {
  sections: DraftSection[];
  narrative: string;
  recognizedKinds: DraftSectionKind[];
}

export function suggestMatchingTemplates(text: string, templates: TemplateRecord[]): TemplateRecord[] {
  const availableTemplates = templates.filter(isTemplateSelectable);
  if (!text || !availableTemplates.length) return availableTemplates.slice(0, 5);

  const lower = text.toLowerCase();

  // Keyword scoring map
  const scores = new Map<string, number>();

  for (const t of availableTemplates) {
    let score = 0;
    const docType = t.documentType.toLowerCase();
    const name = t.name.toLowerCase();

    // Check specific doc types
    if (lower.includes("tờ trình") || (lower.includes("kính gửi") && (lower.includes("phê duyệt") || lower.includes("chủ trương") || lower.includes("đề nghị")))) {
      if (docType.includes("tờ trình")) score += 50;
    }
    if (lower.includes("báo cáo") || lower.includes("kết quả thực hiện") || lower.includes("tình hình") || lower.includes("quý i") || lower.includes("quý ii")) {
      if (docType.includes("báo cáo")) score += 50;
    }
    if (lower.includes("quyết định") || lower.includes("điều 1") || lower.includes("ban hành quy chế")) {
      if (docType.includes("quyết định")) score += 50;
    }
    if (lower.includes("biên bản") || (lower.includes("chủ trì") && lower.includes("thư ký")) || lower.includes("thành phần tham dự")) {
      if (docType.includes("biên bản")) score += 50;
    }
    if (lower.includes("thông báo") || lower.includes("thông báo về việc")) {
      if (docType.includes("thông báo")) score += 50;
    }
    if (lower.includes("công văn") || (lower.includes("v/v") && lower.includes("kính gửi"))) {
      if (docType.includes("công văn")) score += 35;
    }
    if (lower.includes("đảng") || lower.includes("chi bộ") || lower.includes("đảng ủy")) {
      if (t.organization === "DANG") score += 40;
    }

    // Secondary keyword matching
    for (const kw of t.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 5;
      }
    }

    // Prefer active & TVCI/IEMM
    if (t.status === "active") score += 2;
    if (t.organization === "TVCI") score += 1;

    scores.set(t.id, score);
  }

  // Sort by score descending
  const sorted = [...availableTemplates].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));

  // If top score is 0, return all templates in catalog order
  const topScore = scores.get(sorted[0]?.id ?? "") ?? 0;
  if (topScore === 0) {
    return availableTemplates;
  }

  return sorted;
}

export function getPrimaryContentField(schema: TemplateFormSchema): string {
  const fields = schema.fields;
  const tags = fields.map((f) => f.tag);

  if (tags.includes("NOI_DUNG")) return "NOI_DUNG";
  if (tags.includes("NOI_DUNG_DIEN_BIEN")) return "NOI_DUNG_DIEN_BIEN";
  if (tags.includes("LY_DO")) return "LY_DO";
  if (tags.includes("DE_XUAT_KIEN_NGHI")) return "DE_XUAT_KIEN_NGHI";
  if (tags.includes("DIEU_KHOAN")) return "DIEU_KHOAN";
  if (tags.includes("NOI_DUNG_CUOC_HOP")) return "NOI_DUNG_CUOC_HOP";

  // Fallback to first textarea field
  const textAreaField = fields.find((f) => f.type === "textarea" || f.type === "multi-line");
  if (textAreaField) return textAreaField.tag;

  return fields[0]?.tag ?? "NOI_DUNG";
}

const SECTION_HEADERS: Array<{ kind: DraftSectionKind; pattern: RegExp }> = [
  { kind: "SO_KY_HIEU", pattern: /^\s*số(?:\s*ký\s*hiệu|\/kh)?\s*:?\s*(.*)$/iu },
  { kind: "NGAY_BAN_HANH", pattern: /^\s*(?:hà nội,\s*)?ngày\s+(.+)$/iu },
  { kind: "TRICH_YEU", pattern: /^\s*(?:v\/v|về việc|trích yếu)\s*:?\s*(.*)$/iu },
  { kind: "KINH_GUI", pattern: /^\s*kính gửi\s*:?\s*(.*)$/iu },
  { kind: "CAN_CU", pattern: /^\s*căn cứ\s*:?\s*(.*)$/iu },
  { kind: "NOI_DUNG_DIEN_BIEN", pattern: /^\s*(?:nội dung diễn biến|diễn biến(?: cuộc họp)?)\s*(?::\s*(.*)|)$/iu },
  { kind: "NOI_DUNG", pattern: /^\s*(?:nội dung|nội dung chính)\s*(?::\s*(.*)|)$/iu },
  { kind: "LY_DO", pattern: /^\s*(?:lý do(?: và sự cần thiết)?|sự cần thiết)\s*(?::\s*(.*)|)$/iu },
  { kind: "DE_XUAT_KIEN_NGHI", pattern: /^\s*(?:đề xuất(?: và kiến nghị)?|kiến nghị)\s*(?::\s*(.*)|)$/iu },
  { kind: "KET_LUAN", pattern: /^\s*kết luận(?: cuộc họp)?\s*(?::\s*(.*)|)$/iu },
  { kind: "DIEU_KHOAN", pattern: /^\s*điều\s+\d+[.:]?\s*(.*)$/iu },
  { kind: "THOI_GIAN", pattern: /^\s*thời gian\s*:?\s*(.*)$/iu },
  { kind: "DIA_DIEM", pattern: /^\s*địa điểm\s*:?\s*(.*)$/iu },
  { kind: "THANH_PHAN", pattern: /^\s*thành phần(?: tham dự)?\s*:?\s*(.*)$/iu },
  { kind: "CHU_TRI", pattern: /^\s*chủ trì\s*:?\s*(.*)$/iu },
  { kind: "THU_KY", pattern: /^\s*thư ký\s*:?\s*(.*)$/iu },
  { kind: "NGUOI_KY", pattern: /^\s*người ký\s*:?\s*(.*)$/iu },
  { kind: "NOI_NHAN", pattern: /^\s*nơi nhận\s*:?\s*(.*)$/iu },
];

const STRUCTURAL_HEADING = /^\s*(?:[IVX]+|\d+|[a-z])\s*[.)-]\s+/iu;
const FIXED_DOCUMENT_LINE = /^(?:TỜ TRÌNH|QUYẾT ĐỊNH:?|CÔNG VĂN|THÔNG BÁO|BIÊN BẢN|BÁO CÁO|KẾ HOẠCH|QUY CHẾ|NGHỊ QUYẾT|NƠI NHẬN:?|LƯU\s*:)/iu;
const SIGNER_TITLE_LINE = /^(?:(?:KT|TL|TUQ)\.\s*)?(?:GIÁM ĐỐC|VIỆN TRƯỞNG|PHÓ GIÁM ĐỐC|PHÓ VIỆN TRƯỞNG|CHỦ TỊCH|CHỦ TRÌ|THỦ TRƯỞNG|TRƯỞNG PHÒNG)$/iu;
const SIGNER_NAME_LINE = /^\p{Lu}[\p{L}.'’-]*(?:\s+\p{Lu}[\p{L}.'’-]*){1,5}$/u;

function isEmptyValue(value: unknown): boolean {
  return Array.isArray(value) ? value.every((item) => !String(item).trim()) : !String(value ?? "").trim();
}

function cleanSectionLine(value: string): string {
  return value
    .replace(/^\s*[-*•]\s*/u, "")
    .replace(/^\s*(?:căn cứ|kính gửi|nơi nhận)\s*:?\s*/iu, "")
    .trim();
}

function sectionHeader(line: string): { kind: DraftSectionKind; heading: string; inline: string } | null {
  for (const candidate of SECTION_HEADERS) {
    const match = candidate.pattern.exec(line);
    if (match) return { kind: candidate.kind, heading: line.trim(), inline: (match[1] ?? "").trim() };
  }

  const numbered = /^\s*(?:[IVX]+|\d+|[a-z])\s*[.)-]\s*(.+)$/iu.exec(line);
  if (!numbered) return null;
  const heading = numbered[1].trim();
  if (/^(?:lý do|sự cần thiết)/iu.test(heading)) return { kind: "LY_DO", heading: line.trim(), inline: "" };
  if (/^(?:đề xuất|kiến nghị)/iu.test(heading)) return { kind: "DE_XUAT_KIEN_NGHI", heading: line.trim(), inline: "" };
  if (/^(?:nội dung diễn biến|diễn biến)/iu.test(heading)) return { kind: "NOI_DUNG_DIEN_BIEN", heading: line.trim(), inline: "" };
  if (/^kết luận/iu.test(heading)) return { kind: "KET_LUAN", heading: line.trim(), inline: "" };
  return null;
}

function sectionItems(kind: DraftSectionKind, lines: string[]): string[] {
  const cleaned = lines.map(cleanSectionLine).filter(Boolean);
  if (kind === "CAN_CU" || kind === "KINH_GUI" || kind === "NOI_NHAN" || kind === "THANH_PHAN") return cleaned;
  return cleaned;
}

/**
 * Splits a draft into semantic sections before any schema fallback is applied.
 * The parser deliberately removes section labels from values because those
 * labels already belong to the Word template's fixed layout.
 */
export function parseDraftSections(draftText: string): ParsedDraftSections {
  const lines = String(draftText ?? "").replace(/\r\n?/g, "\n").split("\n");
  const sections: DraftSection[] = [];
  const narrative: string[] = [];
  let current: { kind: DraftSectionKind; heading: string; lines: string[] } | null = null;
  let signerNamePending = false;

  const flush = () => {
    if (!current) return;
    const values = sectionItems(current.kind, current.lines);
    if (values.length > 0) {
      const listKinds: DraftSectionKind[] = ["CAN_CU", "KINH_GUI", "NOI_NHAN", "THANH_PHAN", "DIEU_KHOAN"];
      sections.push({
        kind: current.kind,
        heading: current.heading,
        value: values.join("\n"),
        ...(listKinds.includes(current.kind) ? { items: values } : {}),
      });
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const header = line ? sectionHeader(line) : null;
    if (signerNamePending && !line) continue;
    if (signerNamePending && line) {
      signerNamePending = false;
      if (SIGNER_NAME_LINE.test(line)) continue;
    }
    if (header) {
      flush();
      current = { kind: header.kind, heading: header.heading, lines: header.inline ? [header.inline] : [] };
      continue;
    }

    if (!line) {
      flush();
      continue;
    }

    if (current) {
      // A new top-level structural heading ends a section even when it was not
      // one of the known semantic labels.
      if (STRUCTURAL_HEADING.test(line) && !/^\s*(?:[-*•]|\d+\.)/u.test(line)) {
        flush();
        narrative.push(line);
      } else {
        current.lines.push(line);
      }
      continue;
    }

    if (SIGNER_TITLE_LINE.test(line)) {
      signerNamePending = true;
      continue;
    }

    if (!FIXED_DOCUMENT_LINE.test(line) && !/^\s*(?:TẬP ĐOÀN|VIỆN CƠ KHÍ|CỘNG HOÀ|Độc lập|Hà Nội, ngày)/iu.test(line)) {
      narrative.push(line);
    }
  }
  flush();

  const recognizedKinds = [...new Set(sections.map((section) => section.kind))];
  return {
    sections,
    narrative: narrative.join("\n").trim(),
    recognizedKinds,
  };
}

function firstSectionValue(parsed: ParsedDraftSections, kind: DraftSectionKind): string | undefined {
  return parsed.sections.find((section) => section.kind === kind)?.value;
}

function allSectionItems(parsed: ParsedDraftSections, kind: DraftSectionKind): string[] {
  return parsed.sections.flatMap((section) => section.kind === kind ? section.items ?? section.value.split("\n") : []);
}

function setIfMissing(result: TemplateFormValues, tag: string, value: string | string[] | undefined): void {
  if (value === undefined || (Array.isArray(value) && value.length === 0) || isEmptyValue(result[tag])) {
    if (value !== undefined && (!Array.isArray(value) || value.length > 0)) result[tag] = value;
  }
}

export function decomposeDraftIntoFormFields(
  schema: TemplateFormSchema,
  draftText: string,
  existingValues: TemplateFormValues = {}
): TemplateFormValues {
  const result: TemplateFormValues = { ...existingValues };
  const allowedTags = new Set(schema.fields.map((f) => f.tag));

  const parsed = parseDraftSections(draftText);

  // 1. Số ký hiệu: "Số: 45/TTr-VCNM" or "Số 12/CV-TTTN"
  if (!result.SO_KY_HIEU) {
    const m = draftText.match(/(?:số|số\s*ký\s*hiệu|số\/kh)[:\s]*([0-9]+[a-zA-Z0-9\/\-\_]+)/i);
    if (m && m[1]) result.SO_KY_HIEU = m[1].trim();
  }

  // 2. Ngày ban hành: "Hà Nội, ngày 18 tháng 09 năm 2026"
  if (!result.NGAY_BAN_HANH) {
    const m = draftText.match(/(?:ngày)[:\s]*([0-9]{1,2}\s+tháng\s+[0-9]{1,2}\s+năm\s+[0-9]{4}|[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i);
    if (m && m[1]) result.NGAY_BAN_HANH = m[1].trim();
  }

  // 3. Trích yếu: V/v: ... or Trích yếu: ... or Về việc: ...
  if (!result.TRICH_YEU) {
    const m = draftText.match(/(?:v\/v|về việc|trích yếu)[:\s]+([^\r\n]+)/i);
    if (m && m[1]) {
      result.TRICH_YEU = m[1].trim().replace(/^[:\-\s]+/, "");
    }
  }

  // 4-5. Semantic sections are parsed once, then routed only to fields that
  // exist in the active schema. Section labels never enter the field value.
  const addressee = firstSectionValue(parsed, "KINH_GUI");
  if (addressee) {
    if (allowedTags.has("KINH_GUI")) setIfMissing(result, "KINH_GUI", addressee);
    else if (allowedTags.has("NOI_NHAN_TRUC_TIEP")) setIfMissing(result, "NOI_NHAN_TRUC_TIEP", addressee);
    else if (allowedTags.has("DOI_TUONG_NHAN")) setIfMissing(result, "DOI_TUONG_NHAN", addressee);
  }
  if (allowedTags.has("CAN_CU")) setIfMissing(result, "CAN_CU", allSectionItems(parsed, "CAN_CU"));

  // 6. Biên bản: Thời gian, Địa điểm, Chủ trì, Thư ký, Thành phần
  if (allowedTags.has("THOI_GIAN")) setIfMissing(result, "THOI_GIAN", firstSectionValue(parsed, "THOI_GIAN"));
  if (allowedTags.has("DIA_DIEM")) setIfMissing(result, "DIA_DIEM", firstSectionValue(parsed, "DIA_DIEM"));
  if (allowedTags.has("CHU_TRI")) setIfMissing(result, "CHU_TRI", firstSectionValue(parsed, "CHU_TRI"));
  if (allowedTags.has("THU_KY")) setIfMissing(result, "THU_KY", firstSectionValue(parsed, "THU_KY"));
  if (allowedTags.has("THANH_PHAN") && !result.THANH_PHAN) {
    setIfMissing(result, "THANH_PHAN", allSectionItems(parsed, "THANH_PHAN"));
  }

  // 7. Tờ trình: Lý do & Đề xuất kiến nghị
  if (allowedTags.has("LY_DO")) setIfMissing(result, "LY_DO", firstSectionValue(parsed, "LY_DO"));
  if (allowedTags.has("DE_XUAT_KIEN_NGHI")) setIfMissing(result, "DE_XUAT_KIEN_NGHI", firstSectionValue(parsed, "DE_XUAT_KIEN_NGHI"));

  // 8. Biên bản: Diễn biến & Kết luận
  if (allowedTags.has("NOI_DUNG_DIEN_BIEN")) setIfMissing(result, "NOI_DUNG_DIEN_BIEN", firstSectionValue(parsed, "NOI_DUNG_DIEN_BIEN"));
  if (allowedTags.has("KET_LUAN")) setIfMissing(result, "KET_LUAN", firstSectionValue(parsed, "KET_LUAN"));

  // 9. Quyết định: Điều khoản & Căn cứ
  if (allowedTags.has("DIEU_KHOAN")) setIfMissing(result, "DIEU_KHOAN", allSectionItems(parsed, "DIEU_KHOAN"));

  // 10. Người ký
  if (allowedTags.has("NGUOI_KY") && !result.NGUOI_KY) {
    const lines = draftText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const signerIndex = lines.findIndex((l) => /^(?:người ký|chủ trì|viện trưởng|giám đốc|thủ trưởng|trưởng phòng)[:\s]*$/i.test(l) || /người ký:/i.test(l));
    if (signerIndex !== -1 && signerIndex + 1 < lines.length) {
      // Pick the next line, or the one after if uppercase title
      let candidate = lines[signerIndex + 1];
      if (/^[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ\s]{3,}$/.test(candidate) && signerIndex + 2 < lines.length) {
        candidate = lines[signerIndex + 2];
      }
      if (candidate.length > 3 && candidate.length < 40 && !candidate.startsWith("-") && !candidate.startsWith("Nơi")) {
        result.NGUOI_KY = candidate;
      }
    }
  }

  // 11. Nơi nhận: "- Như trên; \n - Lưu: VT..."
  if (allowedTags.has("NOI_NHAN")) {
    const recipients = allSectionItems(parsed, "NOI_NHAN");
    setIfMissing(result, "NOI_NHAN", recipients.length > 0 ? recipients.join("\n") : undefined);
  }

  // 12. Keep free narrative and substantive sections with no dedicated field
  // in the primary body. Sections already mapped to fields are not duplicated.
  const primaryField = getPrimaryContentField(schema);
  const explicitBody = firstSectionValue(parsed, "NOI_DUNG");
  const structuralOnlyKinds: DraftSectionKind[] = [
    "SO_KY_HIEU", "NGAY_BAN_HANH", "TRICH_YEU", "KINH_GUI",
    "NOI_NHAN_TRUC_TIEP", "NGUOI_KY", "NOI_NHAN",
  ];
  const unclaimedSections = parsed.sections.filter((section) =>
    !structuralOnlyKinds.includes(section.kind)
    && section.kind !== "NOI_DUNG"
    && !allowedTags.has(section.kind)
  );
  const bodyParts = [
    ...(explicitBody ? [explicitBody] : []),
    ...(parsed.narrative ? [parsed.narrative] : []),
    ...unclaimedSections.map((section) =>
      section.heading ? `${section.heading}\n${section.value}` : section.value
    ),
  ].filter((part) => part.trim());
  const body = bodyParts.join("\n\n");
  if (isEmptyValue(result[primaryField]) && body) result[primaryField] = body;

  return result;
}

export function mapDraftToFormValues(
  schema: TemplateFormSchema,
  draftText: string,
  existingValues: TemplateFormValues = {}
): TemplateFormValues {
  return decomposeDraftIntoFormFields(schema, draftText, existingValues);
}
