import {
  buildTemplateFormPrompt,
  filterTemplateFormSuggestions,
  parseTemplateFormSuggestions,
} from "../../src/ai/template-form";
import { getTemplateFormSchemaByDocumentType } from "../../src/templates/form-schema";
import { mergeAcceptedTemplateFormSuggestions } from "../../src/taskpane/template-form.service";

test("form AI prompt is constrained to schema tags and asks for source/confidence", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  const prompt = buildTemplateFormPrompt(schema, "Số 12/CV, ngày 16/09/2026");
  expect(prompt).toContain("SO_KY_HIEU");
  expect(prompt).toContain("confidence");
  expect(prompt).toContain("không được tạo tag mới");
});

test("form AI parser rejects unknown tags and filter keeps only schema suggestions", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  expect(() => parseTemplateFormSuggestions('{"fields":[{"tag":"NOPE","value":"x","confidence":1,"source":"x"}]}', schema)).toThrow(/không thuộc schema/i);
  const suggestions = parseTemplateFormSuggestions('{"fields":[{"tag":"SO_KY_HIEU","value":"12/CV","confidence":0.9,"source":"Số 12/CV"}]}', schema);
  expect(filterTemplateFormSuggestions(schema, [...suggestions, { ...suggestions[0], tag: "TVCI_HRULE:TITLE_ABSTRACT" }])).toEqual(suggestions);
});

test("low-confidence form suggestions stay explicitly unreviewed", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  const [suggestion] = parseTemplateFormSuggestions('{"fields":[{"tag":"SO_KY_HIEU","value":"12/CV","confidence":0.42,"source":"suy đoán"}]}', schema);
  expect(suggestion.reviewed).toBe(false);
});

test("AI acceptance merges only trusted or reviewed values into the form", () => {
  const next = mergeAcceptedTemplateFormSuggestions({}, [
    { tag: "SO_KY_HIEU", value: "12/CV", confidence: 0.42, source: "suy đoán", reviewed: false },
    { tag: "NGAY_BAN_HANH", value: "2026-09-16", confidence: 0.42, source: "nguồn", reviewed: true },
    { tag: "TRICH_YEU", value: "V/v thử nghiệm", confidence: 0.95, source: "nguồn", reviewed: false },
  ]);
  expect(next).toEqual({ NGAY_BAN_HANH: "2026-09-16", TRICH_YEU: "V/v thử nghiệm" });
});
