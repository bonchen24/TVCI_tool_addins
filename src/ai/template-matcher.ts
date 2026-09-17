import type { TemplateRecord } from "../templates/library";
import type { TemplateFormSchema, TemplateFormValues } from "../templates/form-schema";

export function suggestMatchingTemplates(text: string, templates: TemplateRecord[]): TemplateRecord[] {
  if (!text || !templates.length) return templates.slice(0, 5);

  const lower = text.toLowerCase();

  // Keyword scoring map
  const scores = new Map<string, number>();

  for (const t of templates) {
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
  const sorted = [...templates].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));

  // If top score is 0, return all templates in catalog order
  const topScore = scores.get(sorted[0]?.id ?? "") ?? 0;
  if (topScore === 0) {
    return templates;
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

export function decomposeDraftIntoFormFields(
  schema: TemplateFormSchema,
  draftText: string,
  existingValues: TemplateFormValues = {}
): TemplateFormValues {
  const result: TemplateFormValues = { ...existingValues };
  const allowedTags = new Set(schema.fields.map((f) => f.tag));

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

  // 4. Kính gửi / Nơi nhận trực tiếp: "Kính gửi: ..."
  const kgMatch = draftText.match(/(?:kính gửi)[:\s]+([^\r\n]+(?:\r?\n(?!\r?\n)[^\r\n]+)*)/i);
  if (kgMatch && kgMatch[1]) {
    const val = kgMatch[1].trim().replace(/^[:\-\s]+/, "");
    if (allowedTags.has("KINH_GUI") && !result.KINH_GUI) {
      result.KINH_GUI = val;
    } else if (allowedTags.has("NOI_NHAN_TRUC_TIEP") && !result.NOI_NHAN_TRUC_TIEP) {
      result.NOI_NHAN_TRUC_TIEP = val;
    }
  }

  // 5. Căn cứ pháp lý: các dòng bắt đầu bằng "Căn cứ ..."
  if (allowedTags.has("CAN_CU") && (!result.CAN_CU || (Array.isArray(result.CAN_CU) && result.CAN_CU.length === 0))) {
    const canCuLines = draftText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^căn\s+cứ/i.test(line));
    if (canCuLines.length > 0) {
      result.CAN_CU = canCuLines;
    }
  }

  // 6. Biên bản: Thời gian, Địa điểm, Chủ trì, Thư ký, Thành phần
  if (allowedTags.has("THOI_GIAN") && !result.THOI_GIAN) {
    const m = draftText.match(/(?:thời gian)[:\s]+([^\r\n]+)/i);
    if (m && m[1]) result.THOI_GIAN = m[1].trim();
  }
  if (allowedTags.has("DIA_DIEM") && !result.DIA_DIEM) {
    const m = draftText.match(/(?:địa điểm)[:\s]+([^\r\n]+)/i);
    if (m && m[1]) result.DIA_DIEM = m[1].trim();
  }
  if (allowedTags.has("CHU_TRI") && !result.CHU_TRI) {
    const m = draftText.match(/(?:chủ trì)[:\s]+([^\r\n]+)/i);
    if (m && m[1]) result.CHU_TRI = m[1].trim();
  }
  if (allowedTags.has("THU_KY") && !result.THU_KY) {
    const m = draftText.match(/(?:thư ký)[:\s]+([^\r\n]+)/i);
    if (m && m[1]) result.THU_KY = m[1].trim();
  }
  if (allowedTags.has("THANH_PHAN") && !result.THANH_PHAN) {
    const m = draftText.match(/(?:thành phần(?: tham dự)?)[:\s]*\r?\n([\s\S]*?)(?=(?:\r?\n\s*(?:[I|V|X]+\.|\d+\.|chủ trì|thư ký|nội dung|kết luận|người ký)))/i);
    if (m && m[1]) {
      const items = m[1].split(/\r?\n/).map((l) => l.trim().replace(/^[\-\*•\d\.]\s*/, "")).filter(Boolean);
      if (items.length > 0) result.THANH_PHAN = items;
    }
  }

  // 7. Tờ trình: Lý do & Đề xuất kiến nghị
  if (allowedTags.has("LY_DO") && !result.LY_DO) {
    const m = draftText.match(/(?:(?:I\.\s*|1\.\s*)?lý do(?: và sự cần thiết)?|sự cần thiết)[:\s]*\r?\n([\s\S]*?)(?=(?:\r?\n\s*(?:(?:II\.|2\.)?\s*đề xuất|kiến nghị|người ký|nơi nhận)))/i);
    if (m && m[1]) {
      result.LY_DO = m[1].trim();
    }
  }
  if (allowedTags.has("DE_XUAT_KIEN_NGHI") && !result.DE_XUAT_KIEN_NGHI) {
    const m = draftText.match(/(?:(?:II\.|2\.)?\s*đề xuất(?: và kiến nghị)?|kiến nghị)[:\s]*\r?\n([\s\S]*?)(?=(?:\r?\n\s*(?:người ký|nơi nhận|$)))/i);
    if (m && m[1]) {
      result.DE_XUAT_KIEN_NGHI = m[1].trim();
    }
  }

  // 8. Biên bản: Diễn biến & Kết luận
  if (allowedTags.has("NOI_DUNG_DIEN_BIEN") && !result.NOI_DUNG_DIEN_BIEN) {
    const m = draftText.match(/(?:(?:I\.\s*|1\.\s*)?nội dung diễn biến|diễn biến cuộc họp|nội dung cuộc họp)[:\s]*\r?\n([\s\S]*?)(?=(?:\r?\n\s*(?:(?:II\.|2\.)?\s*kết luận|người ký)))/i);
    if (m && m[1]) {
      result.NOI_DUNG_DIEN_BIEN = m[1].trim();
    }
  }
  if (allowedTags.has("KET_LUAN") && !result.KET_LUAN) {
    const m = draftText.match(/(?:(?:II\.|2\.)?\s*kết luận(?: cuộc họp)?)[:\s]*\r?\n([\s\S]*?)(?=(?:\r?\n\s*(?:người ký|$)))/i);
    if (m && m[1]) {
      result.KET_LUAN = m[1].trim();
    }
  }

  // 9. Quyết định: Điều khoản & Căn cứ
  if (allowedTags.has("DIEU_KHOAN") && !result.DIEU_KHOAN) {
    const dieuKhoanLines = draftText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^điều\s+\d+[:\.]/i.test(l));
    if (dieuKhoanLines.length > 0) {
      result.DIEU_KHOAN = dieuKhoanLines;
    }
  }

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
  if (allowedTags.has("NOI_NHAN") && !result.NOI_NHAN) {
    const noiNhanIndex = draftText.search(/nơi\s+nhận[:\s]*/i);
    if (noiNhanIndex !== -1) {
      const remaining = draftText.slice(noiNhanIndex);
      const lines = remaining
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"));
      if (lines.length > 0) {
        result.NOI_NHAN = lines.join("\n");
      }
    }
  }

  // 12. Fallback for primary body field (NOI_DUNG / NOI_DUNG_CHUNG) if still empty
  const primaryField = getPrimaryContentField(schema);
  if (!result[primaryField]) {
    result[primaryField] = draftText;
  }

  return result;
}

export function mapDraftToFormValues(
  schema: TemplateFormSchema,
  draftText: string,
  existingValues: TemplateFormValues = {}
): TemplateFormValues {
  return decomposeDraftIntoFormFields(schema, draftText, existingValues);
}

