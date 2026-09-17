import type { MeasurementRule, ParagraphSnapshot, ValidationIssue } from "./models";
import type { DocumentComponentType } from "./component-classifier";
import type { ComponentFormattingRule } from "./component-rules";

const LABELS: Record<DocumentComponentType, string> = {
  NATIONAL_EMBLEM: "Quốc hiệu",
  MOTTO: "Tiêu ngữ",
  PARTY_TITLE: "Tiêu đề Đảng Cộng sản Việt Nam",
  AGENCY_NAME: "Tên cơ quan ban hành",
  NUMBER_SYMBOL: "Số, ký hiệu",
  PLACE_DATE: "Địa danh và ngày tháng",
  DOCUMENT_TYPE: "Tên loại văn bản",
  ABSTRACT: "Trích yếu nội dung",
  LEGAL_BASIS: "Căn cứ ban hành",
  ADDRESSEE: "Kính gửi",
  RECIPIENTS: "Nơi nhận",
  SIGNER_ROLE: "Quyền hạn / chức vụ người ký",
};

function measurementMatches(value: number, rule: MeasurementRule): boolean {
  return typeof rule === "number" ? value === rule : value >= rule.min && value <= rule.max;
}

function measurementExpected(rule: MeasurementRule): number | string {
  return typeof rule === "number" ? rule : `${rule.min}-${rule.max}`;
}

function measurementTarget(rule: MeasurementRule): number {
  return typeof rule === "number" ? rule : rule.target;
}

function issue(
  snapshot: ParagraphSnapshot,
  type: DocumentComponentType,
  field: keyof ComponentFormattingRule,
  actual: string | number | boolean,
  expected: string | number | boolean,
  fixValue?: string | number | boolean,
): ValidationIssue {
  const fieldLabels: Record<string, string> = {
    fontName: "phông chữ",
    fontSize: "cỡ chữ",
    bold: "chữ đậm",
    italic: "chữ nghiêng",
    underline: "gạch chân",
    alignment: "căn đoạn",
  };
  return {
    id: `${snapshot.id}-${type}-${String(field)}`,
    ruleId: `component.${type}.${String(field)}`,
    targetId: snapshot.id,
    message: `[${LABELS[type]}] Sai ${fieldLabels[String(field)]}`,
    severity: "error",
    autoFixable: field !== "underline" || snapshot.underline !== undefined,
    actual: String(actual),
    expected: String(expected),
    fixValue,
  };
}

export function validateComponentParagraph(
  snapshot: ParagraphSnapshot,
  type: DocumentComponentType,
  rule: ComponentFormattingRule,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (rule.fontName !== undefined && snapshot.fontName !== rule.fontName) {
    issues.push(issue(snapshot, type, "fontName", snapshot.fontName, rule.fontName, rule.fontName));
  }
  if (rule.fontSize !== undefined && !measurementMatches(snapshot.fontSize, rule.fontSize)) {
    issues.push(issue(snapshot, type, "fontSize", snapshot.fontSize, measurementExpected(rule.fontSize), measurementTarget(rule.fontSize)));
  }
  if (rule.bold !== undefined && snapshot.bold !== undefined && snapshot.bold !== rule.bold) {
    issues.push(issue(snapshot, type, "bold", snapshot.bold, rule.bold, rule.bold));
  }
  if (rule.italic !== undefined && snapshot.italic !== undefined && snapshot.italic !== rule.italic) {
    issues.push(issue(snapshot, type, "italic", snapshot.italic, rule.italic, rule.italic));
  }
  if (rule.underline !== undefined && snapshot.underline !== undefined && snapshot.underline !== rule.underline) {
    issues.push(issue(snapshot, type, "underline", snapshot.underline, rule.underline, rule.underline));
  }
  if (rule.alignment !== undefined && snapshot.alignment !== rule.alignment) {
    issues.push(issue(snapshot, type, "alignment", snapshot.alignment, rule.alignment, rule.alignment));
  }
  return issues;
}
