import type { TemplateFillControl } from "./template-fill";

export interface AiDocumentContext {
  documentText: string;
  selectionText?: string;
  controls: TemplateFillControl[];
  activeTemplateName?: string;
  documentType?: string;
  ruleProfileName: string;
}

export type QuickDraftActionId = "opening" | "basis" | "continue" | "main" | "conclusion" | "addressee" | "recipients" | "next_article";

export const QUICK_DRAFT_ACTIONS: Array<{ id: QuickDraftActionId; label: string; instruction: string }> = [
  { id: "opening", label: "Mở đầu", instruction: "Soạn đoạn mở đầu phù hợp với loại văn bản và ngữ cảnh hiện tại." },
  { id: "basis", label: "Căn cứ", instruction: "Soạn phần Căn cứ. Chỉ sử dụng căn cứ có thật trong tài liệu/ngữ cảnh; nếu thiếu thì để chỗ trống hoặc nêu rõ cần bổ sung, tuyệt đối không bịa." },
  { id: "continue", label: "Viết tiếp", instruction: "Viết tiếp ngay sau nội dung hiện có, giữ mạch văn và không lặp lại phần đã có." },
  { id: "main", label: "Nội dung chính", instruction: "Soạn phần nội dung chính theo mục đích của văn bản, rõ ràng và có cấu trúc phù hợp." },
  { id: "conclusion", label: "Kết luận/kiến nghị", instruction: "Soạn phần kết luận, đề nghị hoặc kiến nghị phù hợp với nội dung đã có." },
  { id: "addressee", label: "Kính gửi", instruction: "Soạn phần Kính gửi theo loại văn bản và quy cách đang áp dụng; không tự thêm nơi nhận không có căn cứ." },
  { id: "recipients", label: "Nơi nhận", instruction: "Soạn phần Nơi nhận dựa trên đối tượng đã xuất hiện trong tài liệu; không tự bịa cơ quan/cá nhân." },
  { id: "next_article", label: "Điều tiếp theo", instruction: "Soạn điều tiếp theo của quyết định/quy định dựa trên các điều hiện có; không tự tạo nghĩa vụ, thẩm quyền hoặc dữ kiện mới." },
];

const DOCUMENT_TYPE_LABELS = new Set([
  "NGHỊ QUYẾT", "QUYẾT ĐỊNH", "CHỈ THỊ", "QUY ĐỊNH", "QUY CHẾ", "THÔNG BÁO",
  "KẾ HOẠCH", "BÁO CÁO", "TỜ TRÌNH", "BIÊN BẢN", "CÔNG VĂN", "HƯỚNG DẪN",
  "CHƯƠNG TRÌNH", "ĐỀ ÁN", "PHƯƠNG ÁN", "GIẤY MỜI", "GIẤY ỦY QUYỀN", "ĐƠN",
]);

export function inferDocumentType(documentText: string): string | undefined {
  for (const line of documentText.split(/\r\n|\n|\r/)) {
    const candidate = line.trim().replace(/[\s:.;]+$/g, "").toLocaleUpperCase("vi-VN");
    if (DOCUMENT_TYPE_LABELS.has(candidate)) return candidate;
  }
  return undefined;
}

function truncate(text: string, max = 12000): string {
  const value = text.trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n...[đã rút gọn ngữ cảnh]`;
}

export function buildDocumentContextBlock(context: AiDocumentContext): string {
  const controls = context.controls.length
    ? context.controls.map((item) => `- ${item.tag}: ${item.title || item.tag}`).join("\n")
    : "- Không có Content Control có tag";
  return [
    `Biểu mẫu đang dùng: ${context.activeTemplateName?.trim() || "Chưa xác định"}`,
    `Loại văn bản: ${context.documentType?.trim() || "Chưa xác định"}`,
    `Quy cách hiện tại: ${context.ruleProfileName}`,
    `Các trường dữ liệu trong Word:\n${controls}`,
    context.selectionText?.trim() ? `Đoạn đang chọn:\n${truncate(context.selectionText, 3000)}` : "Đoạn đang chọn: (không có)",
    `Nội dung tài liệu hiện tại:\n${truncate(context.documentText)}`,
  ].join("\n\n");
}

export function buildQuickDraftPrompt(input: {
  action: QuickDraftActionId;
  context: AiDocumentContext;
  userInstruction?: string;
}): string {
  const action = QUICK_DRAFT_ACTIONS.find((item) => item.id === input.action);
  if (!action) throw new Error("Tác vụ soạn nhanh không hợp lệ.");
  return [
    "Bạn là AI trợ lý soạn thảo văn bản VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP trong Microsoft Word.",
    "Không tự bịa số hiệu, ngày tháng, tên người, tên cơ quan, tiêu chuẩn, model, mã hồ sơ, số liệu, căn cứ pháp lý hoặc dữ kiện chưa có trong ngữ cảnh.",
    `Tác vụ: ${action.instruction}`,
    input.userInstruction?.trim() ? `Yêu cầu bổ sung: ${input.userInstruction.trim()}` : "",
    "Ngữ cảnh Word:",
    buildDocumentContextBlock(input.context),
    "Chỉ trả về phần văn bản cần chèn/soạn, không giải thích quy trình.",
  ].filter(Boolean).join("\n\n");
}
