import { getTemplateFormSchemaByDocumentType } from "../../src/templates/form-schema";
import { planTemplateFormContentControlUpdates } from "../../src/word/form-content-control.service";

test("content-control adapter updates only schema tags, ignores layout tags and reports missing fields", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  const result = planTemplateFormContentControlUpdates(schema, [
    { id: 1, tag: "SO_KY_HIEU", title: "Số ký hiệu" },
    { id: 2, tag: "TVCI_HRULE:TITLE_ABSTRACT", title: "Đường kẻ" },
    { id: 3, tag: "NOT_IN_SCHEMA", title: "Không được ghi" },
  ], {
    SO_KY_HIEU: "12/CV",
    TRICH_YEU: "V/v mở rộng thử nghiệm",
  });
  expect(result.updates).toEqual([{ id: 1, tag: "SO_KY_HIEU", value: "12/CV" }]);
  expect(result.ignoredLayoutTags).toEqual(["TVCI_HRULE:TITLE_ABSTRACT"]);
  expect(result.unknownTags).toEqual(["NOT_IN_SCHEMA"]);
  expect(result.missingFields.map((field) => field.tag)).toContain("TRICH_YEU");
});
