import type { MeasurementRule, SupportedAlignment } from "./models";
import type { RuleProfileId } from "./profiles";
import type { DocumentComponentType } from "./component-classifier";

export interface ComponentFormattingRule {
  fontName?: string;
  fontSize?: MeasurementRule;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: SupportedAlignment;
}

const range = (min: number, max: number, target: number): MeasurementRule => ({ min, max, target });

const ADMIN_RULES: Partial<Record<DocumentComponentType, ComponentFormattingRule>> = {
  NATIONAL_EMBLEM: { fontName: "Times New Roman", fontSize: range(12, 13, 12), bold: true, italic: false, alignment: "Centered" },
  MOTTO: { fontName: "Times New Roman", fontSize: range(13, 14, 13), bold: true, italic: false, alignment: "Centered" },
  AGENCY_NAME: { fontName: "Times New Roman", fontSize: range(12, 13, 13), italic: false, alignment: "Centered" },
  NUMBER_SYMBOL: { fontName: "Times New Roman", fontSize: 13, italic: false, alignment: "Centered" },
  PLACE_DATE: { fontName: "Times New Roman", fontSize: range(13, 14, 14), italic: true, alignment: "Right" },
  DOCUMENT_TYPE: { fontName: "Times New Roman", fontSize: range(13, 14, 14), bold: true, italic: false, alignment: "Centered" },
  ABSTRACT: { fontName: "Times New Roman", fontSize: range(13, 14, 14), bold: true, italic: false, alignment: "Centered" },
  LEGAL_BASIS: { fontName: "Times New Roman", fontSize: 13, italic: true, alignment: "Left" },
  ADDRESSEE: { fontName: "Times New Roman", fontSize: range(13, 14, 14), bold: false, italic: false, alignment: "Left" },
  RECIPIENTS: { fontName: "Times New Roman", fontSize: 12, italic: true, alignment: "Left" },
  SIGNER_ROLE: { fontName: "Times New Roman", fontSize: range(13, 14, 14), bold: true, italic: false, alignment: "Centered" },
};

const IEMM_RULES: Partial<Record<DocumentComponentType, ComponentFormattingRule>> = {
  NATIONAL_EMBLEM: { fontName: "Times New Roman", fontSize: range(12, 13, 12), bold: true, italic: false, alignment: "Centered" },
  MOTTO: { fontName: "Times New Roman", fontSize: range(13, 14, 13), bold: true, italic: false, alignment: "Centered" },
  AGENCY_NAME: { fontName: "Times New Roman", fontSize: range(12, 13, 13), italic: false, alignment: "Centered" },
  NUMBER_SYMBOL: { fontName: "Times New Roman", fontSize: 13, italic: false, alignment: "Centered" },
  PLACE_DATE: { fontName: "Times New Roman", fontSize: range(13, 14, 13), italic: true, alignment: "Right" },
  DOCUMENT_TYPE: { fontName: "Times New Roman", fontSize: 13, bold: true, italic: false, alignment: "Centered" },
  ABSTRACT: { fontName: "Times New Roman", fontSize: 13, bold: true, italic: false, alignment: "Centered" },
  LEGAL_BASIS: { fontName: "Times New Roman", fontSize: 13, italic: true, alignment: "Left" },
  ADDRESSEE: { fontName: "Times New Roman", fontSize: 13, bold: false, italic: false, alignment: "Left" },
  RECIPIENTS: { fontName: "Times New Roman", fontSize: 12, bold: true, italic: true, alignment: "Left" },
  SIGNER_ROLE: { fontName: "Times New Roman", fontSize: 13, bold: true, italic: false, alignment: "Centered" },
};

const PARTY_RULES: Partial<Record<DocumentComponentType, ComponentFormattingRule>> = {
  PARTY_TITLE: { fontName: "Times New Roman", fontSize: 13, bold: true, italic: false, alignment: "Centered" },
  AGENCY_NAME: { fontName: "Times New Roman", fontSize: 13, italic: false, alignment: "Centered" },
  NUMBER_SYMBOL: { fontName: "Times New Roman", fontSize: 13, italic: false, alignment: "Centered" },
  PLACE_DATE: { fontName: "Times New Roman", fontSize: 13, italic: true, alignment: "Right" },
  DOCUMENT_TYPE: { fontName: "Times New Roman", fontSize: 13, bold: true, italic: false, alignment: "Centered" },
  ABSTRACT: { fontName: "Times New Roman", fontSize: 13, bold: true, italic: false, alignment: "Centered" },
  LEGAL_BASIS: { fontName: "Times New Roman", fontSize: 13, italic: true, alignment: "Left" },
  ADDRESSEE: { fontName: "Times New Roman", fontSize: 13, bold: false, italic: false, alignment: "Centered" },
  RECIPIENTS: { fontName: "Times New Roman", fontSize: 12, bold: true, italic: true, alignment: "Left" },
  SIGNER_ROLE: { fontName: "Times New Roman", fontSize: 13, bold: true, italic: false, alignment: "Centered" },
};

export function getComponentRule(profileId: RuleProfileId, type: DocumentComponentType): ComponentFormattingRule {
  const source = profileId === "DANG_05_HD_VPTW_2026" ? PARTY_RULES : profileId === "IEMM" ? IEMM_RULES : ADMIN_RULES;
  const rule = source[type];
  if (!rule) return { fontName: "Times New Roman" };
  return rule;
}

export function resolveAddresseeAlignment(profileId: RuleProfileId, documentType = ""): SupportedAlignment {
  if (profileId === "DANG_05_HD_VPTW_2026") return "Centered";
  return /(?:^|\s)CÔNG\s+VĂN(?:\s|$)/i.test(documentType) ? "Centered" : "Left";
}

export function getRecipientsItemRule(profileId: RuleProfileId): ComponentFormattingRule {
  return { fontName: "Times New Roman", fontSize: 11, bold: false, italic: false, alignment: "Left" };
}
