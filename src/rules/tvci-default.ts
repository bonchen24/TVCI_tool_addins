import type { DocumentRuleSet } from "./models";

export const TVCI_DEFAULT_RULES: DocumentRuleSet = {
  id: "TVCI_DEFAULT",
  name: "Trung tâm Thử nghiệm - Kiểm định Công nghiệp mặc định",
  body: {
    fontName: "Times New Roman",
    fontSize: 13,
    alignment: "Justified",
    spaceBefore: 2,
    spaceAfter: 2,
    firstLineIndentMm: 10,
    lineSpacingPt: 15.6,
    lineSpacingRule: "multiple",
    lineSpacingMultiple: 1.2,
  },
};
