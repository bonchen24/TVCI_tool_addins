/**
 * Rule Evaluation Snapshot Fixtures
 * Matches models in src/rules/models.ts and profiles in src/rules/profiles.ts
 */

export interface ParagraphSnapshot {
  index: number;
  text: string;
  fontName: string;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  alignment: "Left" | "Centered" | "Right" | "Justified";
  lineSpacingPt: number;
  lineSpacingMultiple?: number;
  spaceBeforePt: number;
  spaceAfterPt: number;
  leftIndentMm: number;
  rightIndentMm: number;
  firstLineIndentMm: number;
  componentType?: string;
  tableContext?: {
    row: number;
    col: number;
    totalRows: number;
    totalCols: number;
  };
}

export interface PageSetupSnapshot {
  orientation: "portrait" | "landscape";
  paperSize: "A4";
  topMarginMm: number;
  bottomMarginMm: number;
  leftMarginMm: number;
  rightMarginMm: number;
}

export interface ValidationIssue {
  ruleId: string;
  category: "page" | "header" | "symbol_date" | "title" | "recipients" | "body" | "signer";
  severity: "pass" | "warning" | "error";
  componentType: string;
  paragraphIndex?: number;
  message: string;
  actual?: string | number;
  expected?: string | number;
  fixValue?: any;
  autoFixable: boolean;
  status: "PASS" | "FAIL" | "MISSING" | "NOT_APPLICABLE";
}

/** Standard Compliant ND30 Snapshot */
export const COMPLIANT_PAGE_SETUP: PageSetupSnapshot = {
  orientation: "portrait",
  paperSize: "A4",
  topMarginMm: 20,
  bottomMarginMm: 20,
  leftMarginMm: 30,
  rightMarginMm: 15,
};

export const COMPLIANT_PARAGRAPHS: ParagraphSnapshot[] = [
  {
    index: 0,
    text: "TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC TKV-CTCP",
    fontName: "Times New Roman",
    fontSizePt: 12.5,
    bold: false,
    italic: false,
    alignment: "Centered",
    lineSpacingPt: 15.6,
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    leftIndentMm: 0,
    rightIndentMm: 0,
    firstLineIndentMm: 0,
    componentType: "AGENCY_NAME",
  },
  {
    index: 1,
    text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    fontName: "Times New Roman",
    fontSizePt: 12.5,
    bold: true,
    italic: false,
    alignment: "Centered",
    lineSpacingPt: 15.6,
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    leftIndentMm: 0,
    rightIndentMm: 0,
    firstLineIndentMm: 0,
    componentType: "NATIONAL_EMBLEM",
  },
  {
    index: 2,
    text: "Độc lập - Tự do - Hạnh phúc",
    fontName: "Times New Roman",
    fontSizePt: 13.5,
    bold: true,
    italic: false,
    alignment: "Centered",
    lineSpacingPt: 15.6,
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    leftIndentMm: 0,
    rightIndentMm: 0,
    firstLineIndentMm: 0,
    componentType: "MOTTO",
  },
  {
    index: 3,
    text: "Hà Nội, ngày 29 tháng 9 năm 2026",
    fontName: "Times New Roman",
    fontSizePt: 13.5,
    bold: false,
    italic: true,
    alignment: "Right",
    lineSpacingPt: 15.6,
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    leftIndentMm: 0,
    rightIndentMm: 0,
    firstLineIndentMm: 0,
    componentType: "PLACE_DATE",
  },
  {
    index: 4,
    text: "Thực hiện Nghị định số 30/2020/NĐ-CP của Chính phủ...",
    fontName: "Times New Roman",
    fontSizePt: 13,
    bold: false,
    italic: false,
    alignment: "Justified",
    lineSpacingPt: 15.6,
    lineSpacingMultiple: 1.2,
    spaceBeforePt: 2,
    spaceAfterPt: 2,
    leftIndentMm: 0,
    rightIndentMm: 0,
    firstLineIndentMm: 10,
    componentType: "BODY",
  },
];

/** Non-compliant snapshots designed to trigger rule violations */
export const NON_COMPLIANT_PAGE_SETUP: PageSetupSnapshot = {
  orientation: "portrait",
  paperSize: "A4",
  topMarginMm: 10, // Violates min 20mm
  bottomMarginMm: 35, // Violates max 25mm
  leftMarginMm: 20, // Violates min 30mm
  rightMarginMm: 10, // Violates min 15mm
};

export const NON_COMPLIANT_PARAGRAPHS: ParagraphSnapshot[] = [
  {
    index: 0,
    text: "TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC",
    fontName: "Arial", // Violates Times New Roman
    fontSizePt: 10, // Violates 12-13pt
    bold: true,
    italic: false,
    alignment: "Left", // Violates Centered
    lineSpacingPt: 12,
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    leftIndentMm: 0,
    rightIndentMm: 0,
    firstLineIndentMm: 0,
    componentType: "AGENCY_NAME",
  },
  {
    index: 1,
    text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    fontName: "Calibri",
    fontSizePt: 16, // Violates 12-13pt
    bold: false, // Violates bold
    italic: true, // Violates not italic
    alignment: "Left",
    lineSpacingPt: 12,
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    leftIndentMm: 0,
    rightIndentMm: 0,
    firstLineIndentMm: 0,
    componentType: "NATIONAL_EMBLEM",
  },
  {
    index: 2,
    text: "Nội dung văn bản chưa thụt lề đầu dòng và căn trái...",
    fontName: "Arial",
    fontSizePt: 11,
    bold: false,
    italic: false,
    alignment: "Left", // Violates Justified
    lineSpacingPt: 12,
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    leftIndentMm: 0,
    rightIndentMm: 0,
    firstLineIndentMm: 0, // Violates 10-12.7mm
    componentType: "BODY",
  },
];
