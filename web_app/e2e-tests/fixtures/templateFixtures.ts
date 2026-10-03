/**
 * Form Template Fixtures & Sample Inputs
 */

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "repeatable";
  required?: boolean;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
}

export interface DocumentFormSchema {
  id: string;
  name: string;
  category: "hanh_chinh" | "dang" | "noi_bo";
  defaultProfile: "ND30_TVCI" | "TKV" | "IEMM" | "DANG_05_HD_VPTW_2026";
  fields: FormFieldDefinition[];
}

/** 8 Canonical Document Form Schemas */
export const CANONICAL_SCHEMAS: DocumentFormSchema[] = [
  {
    id: "cong_van",
    name: "Công văn",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    fields: [
      { id: "SO_KY_HIEU", label: "Số ký hiệu", type: "text", required: true, defaultValue: "102/TVCI-VP" },
      { id: "NGAY_BAN_HANH", label: "Ngày ban hành", type: "date", required: true },
      { id: "TRICH_YEU", label: "Trích yếu", type: "text", required: true },
      { id: "KINH_GUI", label: "Kính gửi", type: "text", required: true },
      { id: "NOI_DUNG", label: "Nội dung", type: "textarea", required: true },
      { id: "NGUOI_KY", label: "Người ký", type: "text", required: true },
      { id: "NOI_NHAN", label: "Nơi nhận", type: "repeatable", required: true },
    ],
  },
  {
    id: "quyet_dinh",
    name: "Quyết định",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    fields: [
      { id: "SO_KY_HIEU", label: "Số ký hiệu", type: "text", required: true },
      { id: "NGAY_BAN_HANH", label: "Ngày ban hành", type: "date", required: true },
      { id: "TRICH_YEU", label: "Về việc", type: "text", required: true },
      { id: "CAN_CU", label: "Căn cứ pháp lý", type: "repeatable", required: true },
      { id: "QUYET_DINH_DIEU", label: "Các điều khoản", type: "repeatable", required: true },
      { id: "NGUOI_KY", label: "Người ký", type: "text", required: true },
    ],
  },
  {
    id: "thong_bao",
    name: "Thông báo",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    fields: [
      { id: "SO_KY_HIEU", label: "Số ký hiệu", type: "text", required: true },
      { id: "TRICH_YEU", label: "Về việc", type: "text", required: true },
      { id: "NOI_DUNG", label: "Nội dung thông báo", type: "textarea", required: true },
      { id: "NGUOI_KY", label: "Người ký", type: "text", required: true },
    ],
  },
  {
    id: "to_trinh",
    name: "Tờ trình",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    fields: [
      { id: "SO_KY_HIEU", label: "Số ký hiệu", type: "text", required: true },
      { id: "TRICH_YEU", label: "Về việc", type: "text", required: true },
      { id: "KINH_GUI", label: "Kính gửi", type: "text", required: true },
      { id: "SU_CAN_THIET", label: "Sự cần thiết", type: "textarea", required: true },
      { id: "NOI_DUNG_DE_XUAT", label: "Nội dung đề xuất", type: "textarea", required: true },
    ],
  },
  {
    id: "bao_cao",
    name: "Báo cáo",
    category: "hanh_chinh",
    defaultProfile: "ND30_TVCI",
    fields: [
      { id: "SO_KY_HIEU", label: "Số ký hiệu", type: "text", required: true },
      { id: "TRICH_YEU", label: "Về việc", type: "text", required: true },
      { id: "KET_QUA", label: "Kết quả đạt được", type: "textarea", required: true },
      { id: "KIEN_NGHI", label: "Kiến nghị đề xuất", type: "textarea", required: true },
    ],
  },
  {
    id: "bien_ban",
    name: "Biên bản",
    category: "noi_bo",
    defaultProfile: "IEMM",
    fields: [
      { id: "TEN_BIEN_BAN", label: "Tên biên bản", type: "text", required: true },
      { id: "THOI_GIAN", label: "Thời gian", type: "text", required: true },
      { id: "THANH_PHAN", label: "Thành phần tham dự", type: "textarea", required: true },
      { id: "DIEN_BIEN", label: "Diễn biến cuộc họp", type: "textarea", required: true },
    ],
  },
  {
    id: "thu_moi",
    name: "Thư mời",
    category: "noi_bo",
    defaultProfile: "IEMM",
    fields: [
      { id: "KINH_GUI", label: "Kính gửi", type: "text", required: true },
      { id: "LY_DO", label: "Lý do mời", type: "text", required: true },
      { id: "THOI_GIAN_DIA_DIEM", label: "Thời gian, địa điểm", type: "textarea", required: true },
    ],
  },
  {
    id: "don_nghi_phep",
    name: "Đơn nghỉ phép",
    category: "noi_bo",
    defaultProfile: "ND30_TVCI",
    fields: [
      { id: "HO_TEN", label: "Họ và tên", type: "text", required: true },
      { id: "CHUC_VU", label: "Chức vụ / Đơn vị", type: "text", required: true },
      { id: "SO_NGAY_NGHI", label: "Số ngày nghỉ", type: "text", required: true },
      { id: "LY_DO", label: "Lý do xin nghỉ", type: "textarea", required: true },
    ],
  },
];

/** Mock AI responses for tests */
export const MOCK_AI_RESPONSES = {
  drafting: {
    content: "Kính gửi: Ban Lãnh đạo Tổng công ty.\nThực hiện chỉ đạo của Hội đồng thành viên, Phòng Kế hoạch xin trân trọng báo cáo phương án sản xuất kinh doanh quý IV năm 2026.",
    tokensUsed: 45,
  },
  proofreading: {
    issues: [
      {
        category: "spelling",
        original: "nghiên cứu kiễm tra",
        replacement: "nghiên cứu kiểm tra",
        explanation: "Sai dấu thanh: 'kiễm' sửa thành 'kiểm'",
      },
      {
        category: "administrative_style",
        original: "chúng tôi xin gửi kèm",
        replacement: "xin gửi kèm theo",
        explanation: "Văn phong hành chính trang trọng nên tránh xưng hô 'chúng tôi'",
      },
    ],
  },
};
