export type WritingStyleId = "administrative" | "formal" | "concise" | "clear" | "persuasive" | "neutral" | "preserve";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WritingStylePreset {
  id: WritingStyleId;
  label: string;
  instruction: string;
}

export const WRITING_STYLES: WritingStylePreset[] = [
  { id: "administrative", label: "Hành chính", instruction: "Viết theo văn phong hành chính, công vụ: chính xác, rõ ràng, khách quan, khuôn mẫu và phù hợp văn bản cơ quan." },
  { id: "formal", label: "Trang trọng", instruction: "Viết trang trọng, lịch sự, chuẩn mực nhưng không sáo rỗng." },
  { id: "concise", label: "Ngắn gọn", instruction: "Rút gọn câu chữ, ưu tiên trực tiếp và súc tích nhưng không làm mất dữ kiện." },
  { id: "clear", label: "Rõ ràng", instruction: "Viết lại mạch lạc, đơn nghĩa, logic, dễ hiểu và giữ đầy đủ dữ kiện." },
  { id: "persuasive", label: "Thuyết phục", instruction: "Sắp xếp lập luận thuyết phục, nêu căn cứ và lợi ích hợp lý nhưng không bịa thêm dữ kiện." },
  { id: "neutral", label: "Trung tính", instruction: "Dùng giọng trung tính, khách quan, tránh cảm tính hoặc nhận định cá nhân." },
  { id: "preserve", label: "Giữ nguyên ý", instruction: "Chỉ chỉnh câu chữ và lỗi diễn đạt, giữ nguyên tối đa cấu trúc, ý nghĩa và dữ kiện gốc." },
];

export function getWritingStyle(id: WritingStyleId): WritingStylePreset {
  return WRITING_STYLES.find((item) => item.id === id) ?? WRITING_STYLES[0];
}

export function buildWritingPrompt(input: {
  input: string;
  style: WritingStyleId;
  history?: ChatMessage[];
  instruction?: string;
}): string {
  const history = (input.history ?? []).map((message) => `${message.role === "user" ? "Người dùng" : "Trợ lý"}: ${message.content}`).join("\n\n");
  const style = getWritingStyle(input.style);
  return [
    "Bạn là AI trợ lý soạn thảo văn bản của VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP.",
    "Không tự bịa số hiệu, ngày tháng, tên người, tên cơ quan, model, tiêu chuẩn, mã hồ sơ, số liệu hoặc dữ kiện không có trong nội dung người dùng cung cấp.",
    `Phong cách yêu cầu: ${style.instruction}`,
    input.instruction?.trim() ? `Yêu cầu bổ sung: ${input.instruction.trim()}` : "",
    history ? `Toàn bộ ngữ cảnh hội thoại hiện tại:\n${history}` : "",
    "Hãy trả về nội dung soạn thảo hoàn chỉnh, không giải thích dài dòng trừ khi người dùng yêu cầu.",
    `Nội dung cần xử lý:\n${input.input.trim()}`,
  ].filter(Boolean).join("\n\n");
}
