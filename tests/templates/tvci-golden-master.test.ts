import { normalizeTemplateFormValues } from "../../src/templates/form-validation";
import { getTemplateFormSchemaByDocumentType } from "../../src/templates/form-schema";
import { TEMPLATE_CATALOG } from "../../src/templates/catalog";

describe("TVCI golden master normalization", () => {
  it("does not expose a separate subject field when the Thông báo template has a fixed title", () => {
    const schema = getTemplateFormSchemaByDocumentType("Thông báo");

    expect(schema.fields.some((field) => field.tag === "TRICH_YEU")).toBe(false);
  });

  it("preserves the Công văn TRICH_YEU exactly", () => {
    const subject = "V/v thông báo về thời gian thử nghiệm hiệu suất năng lượng";
    const schema = getTemplateFormSchemaByDocumentType("Công văn");

    expect(normalizeTemplateFormValues(schema, { TRICH_YEU: subject }).TRICH_YEU).toBe(subject);
  });

  it("does not rewrite subject punctuation or invent Nơi nhận lines", () => {
    const schema = getTemplateFormSchemaByDocumentType("Công văn");

    expect(normalizeTemplateFormValues(schema, {
      TRICH_YEU: "V/v: Thông báo về thời gian thử nghiệm",
      NOI_NHAN: "Phòng Kỹ thuật",
    })).toMatchObject({
      TRICH_YEU: "V/v: Thông báo về thời gian thử nghiệm",
      NOI_NHAN: "Phòng Kỹ thuật",
    });
  });

  it("preserves the Thông báo TRICH_YEU exactly", () => {
    const subject = "V/v: Thông báo thời gian trả kết quả thử nghiệm hiệu suất năng lượng";
    const schema = getTemplateFormSchemaByDocumentType("Thông báo");

    expect(normalizeTemplateFormValues(schema, { TRICH_YEU: subject }).TRICH_YEU).toBe(subject);
  });

  it("removes a repeated leading v/v from TRICH_YEU", () => {
    const schema = getTemplateFormSchemaByDocumentType("Công văn");

    expect(normalizeTemplateFormValues(schema, { TRICH_YEU: "V/v: v/v triển khai thử nghiệm" }).TRICH_YEU)
      .toBe("V/v: triển khai thử nghiệm");
  });

  it("preserves NOI_NHAN lines and archive punctuation exactly", () => {
    const recipients = "Như trên\nLưu: VT, VP.";
    const schema = getTemplateFormSchemaByDocumentType("Thông báo");

    expect(normalizeTemplateFormValues(schema, { NOI_NHAN: recipients }).NOI_NHAN).toBe(recipients);
  });

  it("cleans the legacy NOI_NHAN prefix and semicolon", () => {
    const schema = getTemplateFormSchemaByDocumentType("Thông báo");

    expect(normalizeTemplateFormValues(schema, { NOI_NHAN: "- Như trên;\nLưu: VT, VP." }).NOI_NHAN)
      .toBe("Như trên\nLưu: VT, VP.");
  });

  it("preserves recipient line structure and punctuation without adding bullets or dashes", () => {
    const schema = getTemplateFormSchemaByDocumentType("Công văn");
    const recipients = "Bộ Công Thương;\nViện trưởng.";

    for (const tag of ["KINH_GUI", "NOI_NHAN_TRUC_TIEP", "DOI_TUONG_MOI"] as const) {
      expect(normalizeTemplateFormValues(schema, { [tag]: recipients })[tag]).toBe(recipients);
    }
  });

  it("preserves arbitrary NOI_NHAN lines without generating recipient or archive text", () => {
    const schema = getTemplateFormSchemaByDocumentType("Thông báo");
    const recipients = "Phòng Thử nghiệm;\nLưu: VT, VP.";

    expect(normalizeTemplateFormValues(schema, { NOI_NHAN: recipients }).NOI_NHAN).toBe(recipients);
  });

  it("preserves numbered NOI_DUNG text and line breaks exactly", () => {
    const body = "1. Kiểm tra thiết bị trước khi thử nghiệm.\n2. Ghi nhận kết quả theo biểu mẫu.\n3. Lập báo cáo kết quả thử nghiệm.";
    const schema = getTemplateFormSchemaByDocumentType("Thông báo");

    expect(normalizeTemplateFormValues(schema, { NOI_DUNG: body }).NOI_DUNG).toBe(body);
  });


  it("formats NGAY_BAN_HANH as an administrative date", () => {
    const schema = getTemplateFormSchemaByDocumentType("Thông báo");

    expect(normalizeTemplateFormValues(schema, { NGAY_BAN_HANH: "10/09/2026" }).NGAY_BAN_HANH)
      .toBe("Hà Nội, ngày 10 tháng 9 năm 2026");
  });

  it("has the expected document types in the catalog", () => {
    expect(TEMPLATE_CATALOG.find((template) => template.id === "tvci-cv-001")?.documentType).toBe("Công văn");
    expect(TEMPLATE_CATALOG.find((template) => template.id === "tvci-tb-001")?.documentType).toBe("Thông báo");
  });
});
