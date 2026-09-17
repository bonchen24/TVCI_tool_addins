export interface TemplateFieldSuggestion {
  tag: string;
  title: string;
  sourceText: string;
  confidence: number;
}

export function buildTemplateFieldPrompt(text: string): string {
  const input = text.trim();
  if (!input) throw new Error("Văn bản trống, không thể phân tích template.");
  return [
    "Bạn là trợ lý phân tích biểu mẫu Word của TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP.",
    "Hãy phát hiện các giá trị có khả năng thay đổi giữa các hồ sơ để chuyển thành Content Control.",
    "Ưu tiên các tag chuẩn: SO_VAN_BAN, SO_HO_SO, TEN_KHACH_HANG, DIA_CHI, SAN_PHAM, MODEL, TIEU_CHUAN, NGAY_BAN_HANH, NGUOI_KY.",
    "Nếu cần tag khác, dùng CHỮ_IN_HOA_ASCII và dấu gạch dưới, không dấu cách hay ký tự đặc biệt.",
    "Chỉ trả JSON đúng schema: {\"fields\":[{\"tag\":\"TEN_KHACH_HANG\",\"title\":\"Tên khách hàng\",\"sourceText\":\"đúng nguyên văn xuất hiện trong tài liệu\",\"confidence\":0.95}]}",
    "sourceText phải giữ chính xác chuỗi xuất hiện trong văn bản để Word có thể tìm và đánh dấu.",
    "Không bịa trường không có trong tài liệu. Không thêm markdown ngoài JSON.",
    "Văn bản cần phân tích:",
    input,
  ].join("\n\n");
}

export function parseTemplateFieldSuggestions(raw: string): TemplateFieldSuggestion[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error("AI không trả về JSON hợp lệ cho phân tích template.");
  }
  const fields = (data as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) throw new Error("JSON AI thiếu mảng fields.");
  return fields.map((field, index) => {
    const item = field as Partial<TemplateFieldSuggestion>;
    const tag = String(item.tag ?? "").trim().toUpperCase();
    const title = String(item.title ?? "").trim() || tag;
    const sourceText = String(item.sourceText ?? "").trim();
    const confidence = Number(item.confidence ?? 0);
    if (!/^[A-Z0-9_]+$/.test(tag)) throw new Error(`Field ${index + 1}: tag không hợp lệ.`);
    if (!sourceText) throw new Error(`Field ${index + 1}: sourceText không được để trống.`);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error(`Field ${index + 1}: confidence không hợp lệ.`);
    return { tag, title, sourceText, confidence };
  });
}
