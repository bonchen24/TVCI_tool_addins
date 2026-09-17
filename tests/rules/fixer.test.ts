import { issueToPatch } from "../../src/rules/fixer";

test("font issue maps to only fontName patch", () => {
  expect(issueToPatch({
    id: "p1-font", ruleId: "body.fontName", targetId: "p1", message: "Sai font",
    severity: "error", autoFixable: true, actual: "Arial", expected: "Times New Roman"
  })).toEqual({ fontName: "Times New Roman" });
});
