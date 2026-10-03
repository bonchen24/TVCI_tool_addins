import { getTemplateFormSchemaByDocumentType } from "../../src/templates/form-schema";
import {
  planTemplateFormContentControlUpdates,
  replaceInlineAddresseePlaceholder,
  preserveInlineAddresseeLabel,
  normalizeTemplateAddresseeValue,
  preserveTemplateSubjectLabel,
  preserveTemplateDocumentNumber,
  isUnusedTemplateBodyInstruction,
} from "../../src/word/form-content-control.service";

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

test("inline Kính gửi fallback replaces only the template placeholder and keeps its fixed label", () => {
  expect(replaceInlineAddresseePlaceholder(
    "Kính gửi: [Tên cơ quan, tổ chức hoặc cá nhân nhận văn bản]",
    "Sở Công Thương;",
  )).toBe("Kính gửi: Sở Công Thương;");
});

test("Thông báo addressee content control keeps its fixed Kính gửi label when planned", () => {
  const schema = getTemplateFormSchemaByDocumentType("Thông báo");
  const planned = planTemplateFormContentControlUpdates(schema, [
    { id: 10, tag: "DOI_TUONG_NHAN", title: "Đối tượng nhận" },
  ], { DOI_TUONG_NHAN: "- Công ty TNHH Neway Group;\n• Các cơ quan hữu quan." });
  const update = planned.updates[0];

  expect(update.value).toBe("Công ty TNHH Neway Group;\nCác cơ quan hữu quan.");
  expect(preserveInlineAddresseeLabel(
    "Kính gửi: [Tên cơ quan, tổ chức hoặc cá nhân nhận văn bản]",
    update.value,
  )).toBe("Kính gửi: Công ty TNHH Neway Group;\nCác cơ quan hữu quan.");
});

test("inline Kính gửi fallback does not alter paragraphs without an existing placeholder", () => {
  expect(replaceInlineAddresseePlaceholder("Kính gửi: Sở Công Thương", "Công ty ABC")).toBeNull();
});

test("reapplying an inline addressee keeps the fixed Kính gửi label", () => {
  expect(preserveInlineAddresseeLabel("Kính gửi: Sở Công Thương", "Công ty ABC"))
    .toBe("Kính gửi: Công ty ABC");
});

test("addressee text does not bring AI bullets into a template-owned inline layout", () => {
  expect(normalizeTemplateAddresseeValue("- Bộ Công Thương;\n• Viện trưởng."))
    .toBe("Bộ Công Thương;\nViện trưởng.");
});

test("trích yếu replacement retains only the V/v label already present in the template", () => {
  expect(preserveTemplateSubjectLabel("V/v [trích yếu nội dung công văn]", "Thông báo thời gian thử nghiệm"))
    .toBe("V/v Thông báo thời gian thử nghiệm");
  expect(preserveTemplateSubjectLabel("V/v [trích yếu nội dung công văn]", "V/v: Thông báo thời gian thử nghiệm"))
    .toBe("V/v Thông báo thời gian thử nghiệm");
  expect(preserveTemplateSubjectLabel("[Trích yếu]", "V/v: Thông báo thời gian thử nghiệm"))
    .toBe("V/v: Thông báo thời gian thử nghiệm");
});

test("document number replacement retains its template label and unused fixed suffix", () => {
  expect(preserveTemplateDocumentNumber("Số:         /VCNM-TTTN", "45"))
    .toBe("Số: 45/VCNM-TTTN");
  expect(preserveTemplateDocumentNumber("Số:         /VCNM-TTTN", "45/CV-VCNM"))
    .toBe("Số: 45/CV-VCNM");
  expect(preserveTemplateDocumentNumber("Số:         /VCNM-TTTN", "Số: 45"))
    .toBe("Số: 45/VCNM-TTTN");
});

test("recognizes only standalone template body instructions for cleanup", () => {
  expect(isUnusedTemplateBodyInstruction("[Nội dung do Trung tâm Thử nghiệm chủ trì soạn thảo.]"))
    .toBe(true);
  expect(isUnusedTemplateBodyInstruction("[Kết luận/đề nghị/phối hợp thực hiện.]./."))
    .toBe(true);
  expect(isUnusedTemplateBodyInstruction("Đề nghị đơn vị phối hợp thực hiện công việc."))
    .toBe(false);
});
