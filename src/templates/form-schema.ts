import type { TemplateOrganization, TemplateRecord } from "./library";

export const FORM_DOCUMENT_TYPES = [
  "Công văn",
  "Quyết định",
  "Thông báo",
  "Tờ trình",
  "Báo cáo",
  "Biên bản",
  "Thư mời",
  "Đơn nghỉ phép",
] as const;

export type FormDocumentType = (typeof FORM_DOCUMENT_TYPES)[number];
export type TemplateFormFieldType = "text" | "textarea" | "date" | "select" | "multi-line" | "repeatable";
export type TemplateFormValue = string | string[] | null;
export type TemplateFormValues = Record<string, TemplateFormValue>;

export interface TemplateFormOption {
  value: string;
  label: string;
}

export interface TemplateFormField {
  tag: string;
  label: string;
  type: TemplateFormFieldType;
  required?: boolean;
  options?: TemplateFormOption[];
  placeholder?: string;
  helpText?: string;
  wordTarget: "content-control" | "selection" | "manual";
}

export interface TemplateFormSchema {
  id: FormDocumentType | "generic";
  documentType: string;
  label: string;
  fields: TemplateFormField[];
  compatibility?: boolean;
}

const text = (tag: string, label: string, options: Partial<TemplateFormField> = {}): TemplateFormField => ({
  tag,
  label,
  type: "text",
  wordTarget: "content-control",
  ...options,
});

const area = (tag: string, label: string, options: Partial<TemplateFormField> = {}): TemplateFormField => ({
  tag,
  label,
  type: "textarea",
  wordTarget: "content-control",
  ...options,
});

const date = (tag: string, label: string, options: Partial<TemplateFormField> = {}): TemplateFormField => ({
  tag,
  label,
  type: "date",
  wordTarget: "content-control",
  ...options,
});

const multiLine = (tag: string, label: string, options: Partial<TemplateFormField> = {}): TemplateFormField => ({
  tag,
  label,
  type: "multi-line",
  wordTarget: "content-control",
  ...options,
});

const repeatable = (tag: string, label: string, options: Partial<TemplateFormField> = {}): TemplateFormField => ({
  tag,
  label,
  type: "repeatable",
  wordTarget: "content-control",
  ...options,
});

const select = (tag: string, label: string, options: TemplateFormOption[], config: Partial<TemplateFormField> = {}): TemplateFormField => ({
  tag,
  label,
  type: "select",
  options,
  wordTarget: "content-control",
  ...config,
});

function schema(id: FormDocumentType, fields: TemplateFormField[]): TemplateFormSchema {
  const tags = fields.map((field) => field.tag);
  if (new Set(tags).size !== tags.length) throw new Error(`Schema ${id} có tag trùng.`);
  if (fields.some((field) => !/^[A-Z][A-Z0-9_]*$/.test(field.tag))) throw new Error(`Schema ${id} có tag không hợp lệ.`);
  return { id, documentType: id, label: id, fields };
}

const leaveOptions: TemplateFormOption[] = [
  { value: "annual", label: "Nghỉ phép năm" },
  { value: "sick", label: "Nghỉ ốm" },
  { value: "unpaid", label: "Nghỉ không hưởng lương" },
  { value: "other", label: "Loại nghỉ khác" },
];

export const FORM_SCHEMA_REGISTRY: Readonly<Record<FormDocumentType, TemplateFormSchema>> = {
  "Công văn": schema("Công văn", [
    text("SO_KY_HIEU", "Số và ký hiệu", { required: true, placeholder: "12/VCNM-TTTN" }),
    date("NGAY_BAN_HANH", "Ngày ban hành", { required: true }),
    text("NOI_NHAN_TRUC_TIEP", "Nơi nhận trực tiếp", { placeholder: "Tên cơ quan hoặc cá nhân" }),
    text("TRICH_YEU", "Trích yếu V/v", { required: true, placeholder: "V/v triển khai công việc" }),
    area("NOI_DUNG", "Nội dung", { required: true }),
    text("NGUOI_KY", "Người ký", { required: true, placeholder: "Họ và tên người ký" }),
    multiLine("NOI_NHAN", "Nơi nhận", { required: true, helpText: "Mỗi nơi nhận một dòng; dòng Lưu: luôn được đặt ở cuối." }),
  ]),
  "Quyết định": schema("Quyết định", [
    text("SO_KY_HIEU", "Số và ký hiệu", { required: true, placeholder: "123/QĐ-VCNM" }),
    date("NGAY_BAN_HANH", "Ngày ban hành", { required: true }),
    text("TRICH_YEU", "Trích yếu", { required: true }),
    repeatable("CAN_CU", "Căn cứ", { required: true, placeholder: "Mỗi căn cứ một dòng" }),
    repeatable("DIEU_KHOAN", "Các điều và khoản", { required: true, placeholder: "Mỗi điều hoặc khoản một dòng" }),
    text("NGUOI_KY", "Người ký", { required: true }),
    multiLine("NOI_NHAN", "Nơi nhận", { required: true, helpText: "Dòng Lưu: được đặt ở cuối." }),
  ]),
  "Thông báo": schema("Thông báo", [
    text("SO_KY_HIEU", "Số và ký hiệu", { required: true, placeholder: "12/TB-VCNM" }),
    date("NGAY_BAN_HANH", "Ngày ban hành", { required: true }),
    text("TRICH_YEU", "Trích yếu", { required: true }),
    area("NOI_DUNG", "Nội dung", { required: true }),
    text("DOI_TUONG_NHAN", "Đối tượng nhận", { required: true }),
    text("NGUOI_KY", "Người ký", { required: true }),
    multiLine("NOI_NHAN", "Nơi nhận", { required: true }),
  ]),
  "Tờ trình": schema("Tờ trình", [
    text("SO_KY_HIEU", "Số và ký hiệu", { required: true, placeholder: "12/TTr-VCNM" }),
    date("NGAY_BAN_HANH", "Ngày ban hành", { required: true }),
    multiLine("KINH_GUI", "Kính gửi", { required: true, helpText: "Một nơi có thể nhập một dòng; từ hai nơi sẽ được trình bày theo từng dòng." }),
    repeatable("CAN_CU", "Căn cứ", { required: true }),
    area("LY_DO", "Lý do", { required: true }),
    area("DE_XUAT_KIEN_NGHI", "Đề xuất và kiến nghị", { required: true }),
    text("NGUOI_KY", "Người ký", { required: true }),
    multiLine("NOI_NHAN", "Nơi nhận", { required: true }),
  ]),
  "Báo cáo": schema("Báo cáo", [
    text("SO_KY_HIEU", "Số và ký hiệu", { required: true, placeholder: "12/BC-VCNM" }),
    date("NGAY_BAN_HANH", "Ngày ban hành", { required: true }),
    multiLine("KINH_GUI", "Kính gửi khi báo cáo cấp trên", { helpText: "Chỉ nhập khi báo cáo thuộc trường hợp gửi cấp trên." }),
    text("KY_BAO_CAO", "Kỳ báo cáo", { required: true, placeholder: "Quý I năm 2026" }),
    area("NOI_DUNG", "Nội dung", { required: true }),
    area("KIEN_NGHI", "Kiến nghị", { placeholder: "Có thể để trống nếu không có kiến nghị" }),
    text("NGUOI_KY", "Người ký", { required: true }),
    multiLine("NOI_NHAN", "Nơi nhận", { required: true }),
  ]),
  "Biên bản": schema("Biên bản", [
    text("THOI_GIAN", "Thời gian", { required: true, placeholder: "08 giờ 30, ngày 16/09/2026" }),
    text("DIA_DIEM", "Địa điểm", { required: true }),
    repeatable("THANH_PHAN", "Thành phần", { required: true, placeholder: "Mỗi thành phần một dòng" }),
    text("CHU_TRI", "Chủ trì", { required: true }),
    text("THU_KY", "Thư ký", { required: true }),
    area("NOI_DUNG_DIEN_BIEN", "Nội dung diễn biến", { required: true }),
    area("KET_LUAN", "Kết luận", { required: true }),
    text("NGUOI_KY", "Người ký", { required: true }),
  ]),
  "Thư mời": schema("Thư mời", [
    multiLine("DOI_TUONG_MOI", "Đối tượng mời", { required: true }),
    area("NOI_DUNG_CUOC_HOP", "Nội dung cuộc họp", { required: true }),
    text("THOI_GIAN", "Thời gian", { required: true }),
    text("DIA_DIEM", "Địa điểm", { required: true }),
    text("CHU_TRI", "Chủ trì", { required: true }),
    area("CHUAN_BI", "Nội dung cần chuẩn bị", { placeholder: "Tài liệu, báo cáo hoặc yêu cầu chuẩn bị" }),
    text("NGUOI_KY", "Người ký", { required: true }),
  ]),
  "Đơn nghỉ phép": schema("Đơn nghỉ phép", [
    text("HO_TEN", "Họ và tên", { required: true }),
    text("DON_VI_CONG_VIEC", "Đơn vị và công việc", { required: true }),
    select("LOAI_NGHI", "Loại nghỉ", leaveOptions, { required: true }),
    date("TU_NGAY", "Nghỉ từ ngày", { required: true }),
    date("DEN_NGAY", "Nghỉ đến ngày", { required: true }),
    area("LY_DO", "Lý do", { required: true }),
    text("NGUOI_DUYET", "Người duyệt", { required: true }),
  ]),
};

const schemaByTemplateId: Readonly<Record<string, FormDocumentType>> = {
  "iemm-nghi-phep-001": "Đơn nghỉ phép",
};

const documentTypeAliases: Readonly<Record<string, FormDocumentType>> = {
  "Đơn": "Đơn nghỉ phép",
  "Đơn nghỉ phép": "Đơn nghỉ phép",
};

function supportedOrganization(organization: TemplateOrganization): boolean {
  return organization === "IEMM" || organization === "TVCI" || organization === "DANG";
}

export function getTemplateFormSchemaByDocumentType(documentType: string): TemplateFormSchema {
  const canonical = documentTypeAliases[documentType] ?? documentType;
  if (Object.prototype.hasOwnProperty.call(FORM_SCHEMA_REGISTRY, canonical)) {
    return FORM_SCHEMA_REGISTRY[canonical as FormDocumentType];
  }
  return {
    id: "generic",
    documentType,
    label: documentType || "Văn bản chung",
    compatibility: true,
    fields: [
      area("NOI_DUNG_CHUNG", "Nội dung văn bản", { wordTarget: "manual", helpText: "Mẫu chưa có schema riêng; hãy kiểm tra và chỉnh trực tiếp trong Word." }),
    ],
  };
}

export function getTemplateFormSchema(template: TemplateRecord): TemplateFormSchema | null {
  if (!supportedOrganization(template.organization)) return null;
  const documentType = schemaByTemplateId[template.id] ?? template.documentType;
  return getTemplateFormSchemaByDocumentType(documentType);
}
