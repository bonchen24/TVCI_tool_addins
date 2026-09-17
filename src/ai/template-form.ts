import type { TemplateFormSchema } from "../templates/form-schema";

export interface TemplateFormAiSuggestion {
  tag: string;
  value: string | null;
  confidence: number;
  source: string;
  reviewed?: boolean;
}

export const MIN_TEMPLATE_FORM_AI_CONFIDENCE = 0.8;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI không trả về JSON hợp lệ.");
  return candidate.slice(start, end + 1);
}

export function buildTemplateFormPrompt(schema: TemplateFormSchema, rawText: string): string {
  if (!rawText.trim()) throw new Error("Chưa có dữ liệu nguồn cho AI.");
  const fields = schema.fields.map((field) => `- ${field.tag}: ${field.label} (${field.type})`).join("\n");
  return [
    "Bạn đang đề xuất dữ liệu cho biểu mẫu văn bản hành chính VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP/Văn bản Đảng.",
    "Chỉ được sử dụng các tag trong schema dưới đây; không được tạo tag mới.",
    "Không được tự suy đoán hoặc bịa dữ liệu; không có dữ liệu thì value là null và confidence = 0.",
    "Đây chỉ là bản nháp. Người dùng phải rà soát và chấp nhận trước khi áp dụng vào Word.",
    'Trả về DUY NHẤT JSON dạng {"fields":[{"tag":"TAG","value":"..."|null,"confidence":0.0,"source":"đoạn nguồn"}]}',
    `Schema ${schema.documentType}:\n${fields}`,
    `Dữ liệu người dùng cung cấp:\n${rawText.trim()}`,
  ].join("\n\n");
}

export function parseTemplateFormSuggestions(text: string, schema: TemplateFormSchema): TemplateFormAiSuggestion[] {
  const parsed = JSON.parse(extractJson(text)) as { fields?: unknown[] };
  if (!Array.isArray(parsed.fields)) throw new Error("AI không trả về danh sách fields.");
  const allowed = new Set(schema.fields.map((field) => field.tag));
  return parsed.fields.map((item) => {
    const field = item as Partial<TemplateFormAiSuggestion>;
    const tag = String(field.tag ?? "").trim().toUpperCase();
    if (!allowed.has(tag)) throw new Error(`Tag AI ${tag || "(trống)"} không thuộc schema.`);
    const value = field.value === null || field.value === undefined || String(field.value).trim() === "" ? null : String(field.value).trim();
    const confidence = Number.isFinite(Number(field.confidence)) ? Math.max(0, Math.min(1, Number(field.confidence))) : 0;
    return { tag, value, confidence, source: String(field.source ?? "").trim(), reviewed: false };
  });
}

export function filterTemplateFormSuggestions(schema: TemplateFormSchema, suggestions: TemplateFormAiSuggestion[]): TemplateFormAiSuggestion[] {
  const allowed = new Set(schema.fields.map((field) => field.tag));
  const seen = new Set<string>();
  return suggestions.flatMap((suggestion) => {
    const tag = suggestion.tag.trim().toUpperCase();
    if (!allowed.has(tag) || seen.has(tag)) return [];
    seen.add(tag);
    return [{ ...suggestion, tag }];
  });
}
