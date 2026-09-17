import { validateParagraph } from "../../src/rules/validator";
import { TVCI_DEFAULT_RULES } from "../../src/rules/tvci-default";

const valid = {
  id: "p1",
  text: "Nội dung",
  fontName: "Times New Roman",
  fontSize: 13,
  alignment: "Justified" as const,
  spaceBefore: 2,
  spaceAfter: 2,
};

test("valid paragraph produces no issues", () => {
  expect(validateParagraph(valid, TVCI_DEFAULT_RULES.body)).toEqual([]);
});

test("wrong font is auto-fixable", () => {
  const issues = validateParagraph({ ...valid, fontName: "Arial" }, TVCI_DEFAULT_RULES.body);
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ ruleId: "body.fontName", severity: "error", autoFixable: true })
  ]));
});
