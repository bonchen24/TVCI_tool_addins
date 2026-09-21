import type { TemplateRecord } from "./library";
import type { TemplateFormSchema, TemplateFormValue, TemplateFormValues } from "./form-schema";
import { normalizeTemplateFormValues } from "./form-validation";
import {
  formatTvciSubject,
  parseAndFormatTvciDate,
  formatTvciAddressee,
  formatSemicolonCapitalization,
} from "../utils/tvci-formatter";

const INSTITUTE = "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN";
const CENTER = "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP";
const GROUP = "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM";

function text(value: TemplateFormValue | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value.join("\n") : String(value ?? "");
}

function splitLines(value: TemplateFormValue | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter((s) => s.trim().length > 0);
  return String(value)
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface TemplateFormPreview {
  issuerLines: string[];
  docSymbol: string;
  subject: string;
  date: string;
  addressee: string;
  recipients: string;
  body: string;
  documentType: string;
  signerTitle: string;
  signerName: string;
  legalBases: string[];
  articles: string[];
  reason: string;
  proposals: string;
  attendees: string[];
  meetingContent: string;
  conclusion: string;
  location: string;
  timeText: string;
  applicantName: string;
  applicantDept: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
}

export function buildTemplateFormPreview(
  template: TemplateRecord,
  schema: TemplateFormSchema,
  values: TemplateFormValues
): TemplateFormPreview {
  const normalized = normalizeTemplateFormValues(schema, values);
  const rawAddressee = text(normalized.KINH_GUI || normalized.NOI_NHAN_TRUC_TIEP || values.KINH_GUI || values.NOI_NHAN_TRUC_TIEP).trim();
  const rawSubject = text(normalized.TRICH_YEU || values.TRICH_YEU).trim();
  const rawDate = text(normalized.NGAY_BAN_HANH || values.NGAY_BAN_HANH).trim();
  const rawBody = text(normalized.NOI_DUNG || normalized.NOI_DUNG_CHUNG || values.NOI_DUNG).trim();

  const rawSymbol = text(normalized.SO_KY_HIEU || values.SO_KY_HIEU || normalized.SO_VAN_BAN || values.SO_VAN_BAN).trim();
  let formattedSymbol = "";
  if (rawSymbol) {
    formattedSymbol = rawSymbol.startsWith("Số:") || rawSymbol.startsWith("Số ") ? rawSymbol : `Số: ${rawSymbol}`;
  } else {
    formattedSymbol = template.symbolHint ? (template.symbolHint.startsWith("Số") ? template.symbolHint : `Số: ${template.symbolHint}`) : "Số: .../TVCI";
  }

  const rawSignerTitle = text(normalized.CHUC_VU_NGUOI_KY || values.CHUC_VU_NGUOI_KY).trim();
  const defaultSignerTitle = template.documentType === "Quyết định"
    ? (template.organization === "TVCI" ? "GIÁM ĐỐC TRUNG TÂM" : "VIỆN TRƯỞNG")
    : template.documentType === "Đơn nghỉ phép"
      ? "NGƯỜI DUYỆT ĐƠN"
      : (template.organization === "TVCI" ? "GIÁM ĐỐC" : "VIỆN TRƯỞNG");

  const legalBases = splitLines(normalized.CAN_CU || values.CAN_CU);
  const articles = splitLines(normalized.DIEU_KHOAN || values.DIEU_KHOAN);
  const attendees = splitLines(normalized.THANH_PHAN || values.THANH_PHAN);

  return {
    issuerLines:
      template.organization === "TVCI"
        ? [INSTITUTE, CENTER]
        : template.organization === "IEMM"
          ? [GROUP, INSTITUTE]
          : ["ĐẢNG BỘ " + INSTITUTE, "ĐẢNG CỘNG SẢN VIỆT NAM"],
    docSymbol: formattedSymbol,
    subject: rawSubject ? formatTvciSubject(rawSubject) : "",
    date: rawDate ? parseAndFormatTvciDate(rawDate) : "",
    addressee: rawAddressee ? formatTvciAddressee(rawAddressee).fullFormattedText : "",
    recipients: text(normalized.NOI_NHAN || values.NOI_NHAN).trim(),
    body: rawBody ? formatSemicolonCapitalization(rawBody) : "",
    documentType: template.documentType || schema.documentType || "Văn bản",
    signerTitle: rawSignerTitle || defaultSignerTitle,
    signerName: text(normalized.NGUOI_KY || normalized.NGUOI_DUYET || values.NGUOI_KY || values.NGUOI_DUYET).trim(),
    legalBases,
    articles,
    reason: text(normalized.LY_DO || values.LY_DO).trim(),
    proposals: text(normalized.DE_XUAT_KIEN_NGHI || normalized.KIEN_NGHI || values.DE_XUAT_KIEN_NGHI || values.KIEN_NGHI).trim(),
    attendees,
    meetingContent: text(normalized.NOI_DUNG_DIEN_BIEN || normalized.NOI_DUNG_CUOC_HOP || values.NOI_DUNG_DIEN_BIEN).trim(),
    conclusion: text(normalized.KET_LUAN || values.KET_LUAN).trim(),
    location: text(normalized.DIA_DIEM || values.DIA_DIEM).trim(),
    timeText: text(normalized.THOI_GIAN || values.THOI_GIAN).trim(),
    applicantName: text(normalized.HO_TEN || values.HO_TEN).trim(),
    applicantDept: text(normalized.DON_VI_CONG_VIEC || values.DON_VI_CONG_VIEC).trim(),
    leaveType: text(normalized.LOAI_NGHI || values.LOAI_NGHI).trim(),
    fromDate: text(normalized.TU_NGAY || values.TU_NGAY).trim(),
    toDate: text(normalized.DEN_NGAY || values.DEN_NGAY).trim(),
  };
}
