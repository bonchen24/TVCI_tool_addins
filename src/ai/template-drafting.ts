import type { TemplateFillControl, TemplateFillField } from "./template-fill";

export function buildTemplateNarrativePrompt(input: {
  templateName?: string;
  controls: TemplateFillControl[];
  fields: TemplateFillField[];
  sourceText: string;
  documentText?: string;
}): string {
  const mapped = input.fields
    .filter((item) => item.value)
    .map((item) => `- ${item.tag}: ${item.value}`)
    .join("\n") || "- Chưa có trường nào xác định";
  const controls = input.controls.map((item) => `- ${item.tag}: ${item.title || item.tag}`).join("\n") || "- Không có";
  return [
    "Bạn là AI hỗ trợ hoàn thiện biểu mẫu Word của VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP.",
    `Biểu mẫu: ${input.templateName?.trim() || "Tài liệu Word hiện tại"}`,
    "Hãy soạn CHỈ phần nội dung tự do còn thiếu giữa/cạnh các trường dữ liệu; không lặp lại các trường đã map nếu không cần thiết.",
    "Không tự bịa số hiệu, ngày, tiêu chuẩn, tên người, cơ quan, model, mã hồ sơ hoặc số liệu. Nếu thông tin còn thiếu, dùng cách diễn đạt không khẳng định dữ kiện chưa có.",
    `Các Content Control:\n${controls}`,
    `Dữ liệu đã map:\n${mapped}`,
    `Nguồn người dùng:\n${input.sourceText.trim()}`,
    input.documentText?.trim() ? `Nội dung Word hiện tại để tránh lặp:\n${input.documentText.trim().slice(0, 10000)}` : "",
    "Trả về phần nội dung có thể chèn trực tiếp vào Word, không trả JSON và không giải thích.",
  ].filter(Boolean).join("\n\n");
}
