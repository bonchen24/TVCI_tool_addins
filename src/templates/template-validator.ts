import type { TemplateOrganization } from "./library";
import type { TemplateFormField } from "./form-schema";

export type TemplateCandidateField = Partial<TemplateFormField> & {
  tag: string;
  label?: string;
  type?: TemplateFormField["type"];
};

export interface TemplateCandidateInput {
  name: string;
  organization: TemplateOrganization;
  department: string;
  documentType: string;
  fields?: TemplateCandidateField[];
  docxBuffer?: ArrayBuffer;
  description?: string;
  symbolHint?: string;
  keywords?: string[];
}

export interface TemplateValidationIssue {
  field?: string;
  severity: "error" | "warning";
  message: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateValidationIssue[];
  warnings: TemplateValidationIssue[];
}

const VALID_ORGANIZATIONS: TemplateOrganization[] = ["TVCI", "IEMM", "DANG", "TKV"];
const TAG_REGEX = /^[A-Z0-9_]{2,50}$/;

export function validateTemplateCandidate(candidate: TemplateCandidateInput): TemplateValidationResult {
  const errors: TemplateValidationIssue[] = [];
  const warnings: TemplateValidationIssue[] = [];

  // 1. Tên biểu mẫu
  const trimmedName = (candidate.name || "").trim();
  if (!trimmedName) {
    errors.push({ field: "name", severity: "error", message: "Tên biểu mẫu không được để trống." });
  } else if (trimmedName.length < 3) {
    errors.push({ field: "name", severity: "error", message: "Tên biểu mẫu phải có ít nhất 3 ký tự." });
  } else if (trimmedName.length > 120) {
    errors.push({ field: "name", severity: "error", message: "Tên biểu mẫu không được vượt quá 120 ký tự." });
  }

  // 2. Tổ chức / Nhóm
  if (!VALID_ORGANIZATIONS.includes(candidate.organization)) {
    errors.push({
      field: "organization",
      severity: "error",
      message: `Tổ chức không hợp lệ (${candidate.organization}). Phải là một trong: ${VALID_ORGANIZATIONS.join(", ")}.`,
    });
  }

  // 3. Phòng ban / Bộ phận
  const trimmedDept = (candidate.department || "").trim();
  if (!trimmedDept) {
    errors.push({ field: "department", severity: "error", message: "Phòng ban/Bộ phận không được để trống." });
  }

  // 4. Loại văn bản
  const trimmedType = (candidate.documentType || "").trim();
  if (!trimmedType) {
    errors.push({ field: "documentType", severity: "error", message: "Loại văn bản không được để trống." });
  }

  // 5. Kiểm tra danh sách trường form (fields)
  if (candidate.fields && candidate.fields.length > 0) {
    const seenTags = new Set<string>();

    for (const field of candidate.fields) {
      const tag = (field.tag || "").trim();
      if (!tag) {
        errors.push({ severity: "error", message: "Mã trường (tag) không được để trống." });
        continue;
      }

      if (!TAG_REGEX.test(tag)) {
        errors.push({
          field: tag,
          severity: "error",
          message: `Mã trường "${tag}" không hợp lệ. Phải viết hoa, không dấu, không khoảng trắng (chỉ gồm A-Z, 0-9 và dấu gạch dưới _).`,
        });
      }

      if (seenTags.has(tag)) {
        errors.push({
          field: tag,
          severity: "error",
          message: `Mã trường "${tag}" bị trùng lặp trong biểu mẫu.`,
        });
      }
      seenTags.add(tag);

      const label = (field.label || "").trim();
      if (!label) {
        warnings.push({ field: tag, severity: "warning", message: `Trường "${tag}" chưa có nhãn hiển thị tiếng Việt.` });
      }

      if (field.type === "select") {
        if (!field.options || field.options.length === 0) {
          errors.push({
            field: tag,
            severity: "error",
            message: `Trường chọn "${field.label || tag}" phải có ít nhất một lựa chọn.`,
          });
        }
      }
    }
  }

  // 6. Kiểm tra file DOCX nếu có đính kèm
  if (candidate.docxBuffer) {
    if (candidate.docxBuffer.byteLength < 4) {
      errors.push({ field: "docxBuffer", severity: "error", message: "Dữ liệu tệp DOCX quá ngắn hoặc không hợp lệ." });
    } else {
      const bytes = new Uint8Array(candidate.docxBuffer);
      // Kiểm tra magic header zip PK (0x50, 0x4B)
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        errors.push({
          field: "docxBuffer",
          severity: "error",
          message: "Tệp không phải định dạng DOCX tiêu chuẩn (thiếu định dạng gói OpenXML/ZIP).",
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
