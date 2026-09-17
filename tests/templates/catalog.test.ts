import { TEMPLATE_CATALOG } from "../../src/templates/catalog";

test("catalog seeds bundled templates for every supported organization", () => {
  expect(TEMPLATE_CATALOG.length).toBeGreaterThanOrEqual(4);
  expect(new Set(TEMPLATE_CATALOG.map((item) => item.organization))).toEqual(new Set(["IEMM", "TVCI", "DANG"]));
  expect(TEMPLATE_CATALOG.every((item) => item.source.kind === "bundled")).toBe(true);
});
