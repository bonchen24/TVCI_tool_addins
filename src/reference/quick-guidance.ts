function normalizeVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type GuidanceGroup = "IEMM" | "TVCI" | "Soạn thảo" | "Lỗi thường gặp";

export interface QuickGuidanceItem {
  id: string;
  group: GuidanceGroup;
  title: string;
  content: string;
  source: string;
  keywords: string[];
}

export const QUICK_GUIDANCE: QuickGuidanceItem[] = [
  {
    id: "iemm-symbols",
    group: "IEMM",
    title: "Ký hiệu văn bản của Viện",
    content: "Quyết định: …/QĐ-VCNM; Thông báo: …/TB-VCNM. Công văn không ghi chữ CV trong ký hiệu và dùng dạng …/VCNM-[ĐƠN VỊ].",
    source: "Quy định riêng về Văn bản của Viện; Phụ lục I-III-V",
    keywords: ["ký hiệu", "số văn bản", "QĐ-VCNM", "TB-VCNM", "công văn"],
  },
  {
    id: "tvci-symbol",
    group: "TVCI",
    title: "Công văn do Trung tâm chủ trì soạn thảo",
    content: "Theo tài liệu Viện, công văn do Trung tâm Thử nghiệm - Kiểm định Công nghiệp soạn thảo dùng ký hiệu: Số: …/VCNM-TTTN.",
    source: "4. Quy dinh rieng ve Van ban cua Vien.ppt",
    keywords: ["TVCCI", "TVCI", "TTTN", "VCNM-TTTN", "công văn trung tâm"],
  },
  {
    id: "iemm-font",
    group: "IEMM",
    title: "Font và cỡ chữ cơ bản",
    content: "Dùng Times New Roman - Unicode. Nội dung, tên loại và trích yếu mặc định cỡ 13; tên loại và trích yếu đậm, địa danh/ngày tháng nghiêng.",
    source: "Phụ lục IV - Mẫu chữ và chi tiết trình bày",
    keywords: ["Times New Roman", "font", "cỡ chữ", "trích yếu", "địa danh"],
  },
  {
    id: "iemm-recipients",
    group: "IEMM",
    title: "Kính gửi và Nơi nhận",
    content: "Kính gửi dùng cỡ 13. Từ 'Nơi nhận:' cỡ 12, nghiêng đậm; tên cơ quan/cá nhân nhận văn bản cỡ 11, đứng.",
    source: "Phụ lục IV - Mẫu chữ và chi tiết trình bày",
    keywords: ["Kính gửi", "Nơi nhận", "cỡ 12", "cỡ 11"],
  },
  {
    id: "iemm-internal-submission",
    group: "IEMM",
    title: "Tờ trình nội bộ đơn vị gửi Viện",
    content: "Tờ trình nội bộ từ đơn vị gửi Viện không lấy số văn bản, không đóng dấu Viện và không lưu tại Văn thư Viện. Có thể có Người viết tờ trình và Trưởng đơn vị/KT. Trưởng đơn vị ký.",
    source: "Phụ lục VII - Mẫu 1.6.3",
    keywords: ["tờ trình nội bộ", "không lấy số", "không đóng dấu", "trưởng đơn vị"],
  },
  {
    id: "drafting-process",
    group: "Soạn thảo",
    title: "Quy trình duyệt văn bản",
    content: "Lãnh đạo phụ trách trực tiếp (trưởng/phó phòng, GĐ/PGĐ Trung tâm) duyệt nội dung; Trưởng phòng Tổ chức - Hành chính hoặc Văn thư được ủy quyền duyệt thể thức và tính pháp lý; Viện trưởng/Phó Viện trưởng phụ trách lĩnh vực duyệt và ký ban hành.",
    source: "2. Van ban-Van thu (Xay dung VB).ppt",
    keywords: ["duyệt văn bản", "trưởng phòng", "giám đốc trung tâm", "văn thư", "viện trưởng"],
  },
  {
    id: "common-errors",
    group: "Lỗi thường gặp",
    title: "Các lỗi cần rà trước khi phát hành",
    content: "Hay quên trích yếu, số, nơi nhận; dùng nhiều font; lạm dụng đậm/nghiêng; copy-paste gây lỗi logic hoặc văn bản hết hiệu lực; cần đọc kỹ trước khi phát hành.",
    source: "3. Cac loi thuong gap.ppt",
    keywords: ["lỗi", "trích yếu", "số", "nơi nhận", "copy paste", "font"],
  },
  {
    id: "administrative-style",
    group: "Soạn thảo",
    title: "Văn phong hành chính - công vụ",
    content: "Ưu tiên chính xác, rõ ràng, đơn nghĩa, logic; dễ hiểu; khách quan, phi cá tính; trang trọng, lịch sự; sử dụng khuôn mẫu và các quán ngữ hành chính phù hợp.",
    source: "3. Cac loi thuong gap.ppt",
    keywords: ["văn phong", "hành chính", "công vụ", "chính xác", "khách quan"],
  },
  {
    id: "iemm-page-number",
    group: "IEMM",
    title: "Đánh số trang văn bản nhiều trang",
    content: "Văn bản và phụ lục nhiều trang đánh số từ trang thứ hai bằng chữ số Ả-rập; theo tài liệu đào tạo của Viện, số trang đặt bên phải ở cuối trang (footer).",
    source: "Phụ lục I-III-V; 1. Van ban-Van thu (Phan loai-The thuc).ppt",
    keywords: ["số trang", "footer", "trang thứ hai", "đánh số trang"],
  },
  {
    id: "iemm-outline-hierarchy",
    group: "IEMM",
    title: "Cấp đề mục Phần - Chương - Mục - Điều - Khoản - Điểm",
    content: "Phần/Chương/Mục/Tiểu mục và số thứ tự cỡ 13 đậm; tiêu đề đặt dòng riêng, in hoa, căn giữa; Điều cỡ 13 đậm, lùi đầu dòng 10mm; Khoản và Điểm cỡ 13 đứng.",
    source: "Phụ lục IV - Mẫu chữ và chi tiết trình bày",
    keywords: ["phần", "chương", "mục", "điều", "khoản", "điểm", "đề mục"],
  },
  {
    id: "header-footer-caution",
    group: "Lỗi thường gặp",
    title: "Header / Footer chỉ dùng khi mẫu yêu cầu",
    content: "Tài liệu lỗi thường gặp của Viện nhắc tránh trình bày sáng tạo, Header & Footer và các đường kẻ không cần thiết. Add-in vì vậy để Header/Footer trống mặc định; chỉ thêm khi biểu mẫu/quy định cụ thể yêu cầu.",
    source: "3. Cac loi thuong gap.ppt",
    keywords: ["header", "footer", "không dùng", "lỗi trình bày"],
  },
];

export function searchQuickGuidance(items: QuickGuidanceItem[], query: string): QuickGuidanceItem[] {
  const needle = normalizeVietnamese(query);
  if (!needle) return items;
  return items.filter((item) => {
    const haystack = normalizeVietnamese([item.group, item.title, item.content, item.source, ...item.keywords].join(" "));
    return needle.split(" ").every((token) => haystack.includes(token));
  });
}
