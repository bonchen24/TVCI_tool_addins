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
function text(value: TemplateFormValue): string { return Array.isArray(value) ? value.join("\n") : String(value ?? ""); }
export interface TemplateFormPreview { issuerLines: string[]; subject: string; date: string; addressee: string; recipients: string; body: string; }
export function buildTemplateFormPreview(template: TemplateRecord, schema: TemplateFormSchema, values: TemplateFormValues): TemplateFormPreview {
  const normalized = normalizeTemplateFormValues(schema, values);
  const rawAddressee = text(normalized.KINH_GUI || normalized.NOI_NHAN_TRUC_TIEP).trim();
  const rawSubject = text(normalized.TRICH_YEU).trim();
  const rawDate = text(normalized.NGAY_BAN_HANH).trim();
  const rawBody = text(normalized.NOI_DUNG || normalized.NOI_DUNG_CHUNG).trim();

  return {
    issuerLines: template.organization === "TVCI" ? [INSTITUTE, CENTER] : template.organization === "IEMM" ? [GROUP, INSTITUTE] : ["ĐẢNG BỘ " + INSTITUTE, "ĐẢNG CỘNG SẢN VIỆT NAM"],
    subject: rawSubject ? formatTvciSubject(rawSubject) : "",
    date: rawDate ? parseAndFormatTvciDate(rawDate) : "",
    addressee: rawAddressee ? formatTvciAddressee(rawAddressee).fullFormattedText : "",
    recipients: text(normalized.NOI_NHAN).trim(),
    body: rawBody ? formatSemicolonCapitalization(rawBody) : "",
  };
}
