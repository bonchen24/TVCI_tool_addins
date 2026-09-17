export interface TemplateFillControl {
  id: number;
  tag: string;
  title: string;
}

export interface TemplateFillField {
  tag: string;
  value: string | null;
  confidence: number;
  source: string;
  reviewed?: boolean;
}

export const MIN_AUTO_FILL_CONFIDENCE = 0.8;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI không trả về JSON hợp lệ.");
  return candidate.slice(start, end + 1);
}

export function buildTemplateFillPrompt(controls: TemplateFillControl[], rawText: string): string {
  if (!controls.length) throw new Error("Biểu mẫu hiện tại không có Content Control có tag.");
  if (!rawText.trim()) throw new Error("Chưa có dữ liệu để điền biểu mẫu.");
  const fields = controls.map((item) => `- ${item.tag}: ${item.title || item.tag}`).join("\n");
  return [
    "Bạn đang trích dữ liệu để điền vào biểu mẫu Word của VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP.",
    "QUY TẮC ĐỊNH DẠNG BẮT BUỘC THEO QUY CÁCH TVCI:",
    "1. Ngày tháng: 'Hà Nội, ngày DD tháng MM năm YYYY' (Ngày < 10 có số 0: ngày 01..09; Tháng 1, 2 có số 0: tháng 01, 02; Tháng 3-12 không có số 0: tháng 3..tháng 12).",
    "2. Trích yếu: 'V/v [nội dung viết thường chữ cái đầu]' hoặc 'Về việc [nội dung viết thường chữ cái đầu]', TUYỆT ĐỐI không có dấu hai chấm sau V/v hoặc Về việc, không viết hoa chữ cái đầu sau V/v hoặc Về việc, không lặp 'V/v V/v'.",
    "3. Kính gửi: 1 nơi nhận không để dấu câu ở cuối. Nhiều nơi nhận dùng danh sách gạch đầu dòng '-', kết thúc bằng ';' và dòng cuối kết thúc bằng '.'.",
    "4. Tuyệt đối giữ đúng tiếng Việt có dấu đầy đủ.",
    "Chỉ được sử dụng các tag trong danh sách dưới đây, không được tạo tag mới.",
    "Không tự suy đoán hoặc bịa dữ liệu. Nếu không xác định được thì value phải là null và confidence = 0.",
    "Trả về DUY NHẤT JSON dạng: {\"fields\":[{\"tag\":\"TAG\",\"value\":\"...\"|null,\"confidence\":0.0,\"source\":\"đoạn nguồn\"}]}",
    `Các trường trong biểu mẫu:\n${fields}`,
    `Dữ liệu người dùng cung cấp:\n${rawText.trim()}`,
  ].join("\n\n");
}

export function parseTemplateFillResult(text: string): TemplateFillField[] {
  const parsed = JSON.parse(extractJson(text)) as { fields?: unknown[] };
  if (!Array.isArray(parsed.fields)) throw new Error("AI không trả về danh sách fields.");
  return parsed.fields.map((item) => {
    const field = item as Partial<TemplateFillField>;
    const tag = String(field.tag ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9_]+$/.test(tag)) throw new Error(`Tag AI không hợp lệ: ${tag || "(trống)"}`);
    const value = field.value === null || field.value === undefined || String(field.value).trim() === "" ? null : String(field.value).trim();
    const confidence = Number.isFinite(Number(field.confidence)) ? Math.max(0, Math.min(1, Number(field.confidence))) : 0;
    return { tag, value, confidence, source: String(field.source ?? "").trim() };
  });
}

export function selectSafeTemplateFills(
  controls: TemplateFillControl[],
  fields: TemplateFillField[],
): Array<{ tag: string; value: string }> {
  const allowed = new Set(controls.map((item) => item.tag.trim().toUpperCase()));
  return fields
    .filter((field) => allowed.has(field.tag.trim().toUpperCase())
      && field.value !== null
      && field.value.trim() !== ""
      && (field.reviewed === true || field.confidence >= MIN_AUTO_FILL_CONFIDENCE))
    .map((field) => ({ tag: field.tag.trim().toUpperCase(), value: field.value!.trim() }));
}

export function filterTemplateFillFieldsToControls(
  controls: TemplateFillControl[],
  fields: TemplateFillField[],
): TemplateFillField[] {
  const availableFields = new Map<string, TemplateFillField>();
  for (const field of fields) {
    const tag = field.tag.trim().toUpperCase();
    if (tag && !availableFields.has(tag)) availableFields.set(tag, { ...field, tag });
  }

  const seen = new Set<string>();
  return controls.flatMap((control) => {
    const tag = control.tag.trim().toUpperCase();
    if (!tag || seen.has(tag)) return [];
    seen.add(tag);
    return [availableFields.get(tag) ?? { tag, value: null, confidence: 0, source: "" }];
  });
}
