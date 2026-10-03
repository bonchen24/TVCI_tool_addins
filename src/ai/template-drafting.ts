import type { TemplateFillControl, TemplateFillField } from "./template-fill";
import { ADMINISTRATIVE_AI_RULES } from "./administrative-rules";

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
    ADMINISTRATIVE_AI_RULES,
    `Biểu mẫu: ${input.templateName?.trim() || "Tài liệu Word hiện tại"}`,
    "Hãy soạn TOÀN BỘ phần nội dung hành chính thực chất cho biểu mẫu hiện tại thành một nội dung hoàn chỉnh, tự đầy đủ, chỉ dựa trên nguồn. Giữ lại mọi dữ kiện nguồn có ý nghĩa; có thể sắp xếp các đoạn theo trình tự hợp lý. Không trả các đoạn rời hoặc chỉ phần còn thiếu chỉ vì một số dữ kiện đã được map sang trường khác.",
    "KHÔNG đưa vào nội dung các khối cố định của biểu mẫu: tên cơ quan/đầu trang, quốc hiệu 'CỘNG HÒA...', tiêu ngữ 'Độc lập...', số/ký hiệu, ngày tháng, tên văn bản/trích yếu, Kính gửi, Nơi nhận, chức danh/tên người ký hoặc chữ ký.",
    "Không tự bịa số hiệu, ngày, tiêu chuẩn, tên người, cơ quan, model, mã hồ sơ hoặc số liệu. Nếu thông tin còn thiếu, dùng cách diễn đạt không khẳng định dữ kiện chưa có.",

    "Không dùng Markdown hoặc các dấu **, *, ###, _, backtick, code fence. Dữ liệu đã map là ngữ cảnh để bảo toàn nội dung, không phải lý do để lược bỏ các sự kiện liên quan khỏi phần thân văn bản.",
    `Các Content Control:\n${controls}`,
    `Dữ liệu đã map:\n${mapped}`,
    `Nguồn người dùng:\n${input.sourceText.trim()}`,
    input.documentText?.trim() ? `Nội dung Word hiện tại để tránh lặp:\n${input.documentText.trim().slice(0, 10000)}` : "",
    "Trả về phần nội dung có thể chèn trực tiếp vào Word, không trả JSON và không giải thích.",
  ].filter(Boolean).join("\n\n");
}
