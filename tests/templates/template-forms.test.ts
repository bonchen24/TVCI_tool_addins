import { TEMPLATE_CATALOG } from "../../src/templates/catalog";
import {
  FORM_DOCUMENT_TYPES,
  getTemplateFormSchema,
  getTemplateFormSchemaByDocumentType,
  type TemplateFormValues,
} from "../../src/templates/form-schema";
import { normalizeTemplateFormValues, validateTemplateForm } from "../../src/templates/form-validation";
import { loadTemplateFormDraft, saveTemplateFormDraft, templateFormDraftKey } from "../../src/templates/form-drafts";
import { buildTemplateFormPreview } from "../../src/templates/form-preview";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

test("registry exposes exactly the eight requested form groups", () => {
  expect(FORM_DOCUMENT_TYPES).toEqual([
    "Công văn", "Quyết định", "Thông báo", "Tờ trình",
    "Báo cáo", "Biên bản", "Thư mời", "Đơn nghỉ phép",
  ]);
});

test("every supported bundled template resolves to a schema and TKV does not", () => {
  const supported = TEMPLATE_CATALOG.filter((item) => ["IEMM", "TVCI", "DANG"].includes(item.organization));
  expect(supported.every((template) => Boolean(getTemplateFormSchema(template)))).toBe(true);
  expect(getTemplateFormSchema({
    id: "tkv-only", name: "TKV", organization: "TKV", department: "Dùng chung", documentType: "Quyết định",
    keywords: [], source: { kind: "bundled", path: "/templates/tkv.docx" }, version: "1.0", status: "active",
  })).toBeNull();
});

test("the leave template is surfaced with the requested document type name", () => {
  expect(TEMPLATE_CATALOG.find((item) => item.id === "iemm-nghi-phep-001")?.documentType).toBe("Đơn nghỉ phép");
});

test("form tags are safe, unique within a schema, and labels do not abbreviate organizations", () => {
  for (const documentType of FORM_DOCUMENT_TYPES) {
    const schema = getTemplateFormSchemaByDocumentType(documentType);
    expect(schema.fields.length).toBeGreaterThan(0);
    const tags = schema.fields.map((field) => field.tag);
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags.every((tag) => /^[A-Z][A-Z0-9_]*$/.test(tag))).toBe(true);
    expect(schema.fields.every((field) => !/\b(?:IEMM|TVCI|TKV|NĐ30|VCNM)\b/i.test(field.label))).toBe(true);
  }
});

test("form validation reports required, date, select and repeatable errors", () => {
  const schema = getTemplateFormSchemaByDocumentType("Đơn nghỉ phép");
  const errors = validateTemplateForm(schema, {
    HO_TEN: "",
    LOAI_NGHI: "không-có-trong-danh-mục",
    TU_NGAY: "2026-99-40",
    DEN_NGAY: "2026-09-16",
  });
  expect(errors.map((error) => error.tag)).toEqual(expect.arrayContaining(["HO_TEN", "LOAI_NGHI", "TU_NGAY"]));
});

test("form validation rejects a leave period whose end precedes its start", () => {
  const schema = getTemplateFormSchemaByDocumentType("Đơn nghỉ phép");
  const errors = validateTemplateForm(schema, {
    HO_TEN: "Nguyễn Văn A",
    DON_VI_CONG_VIEC: "Phòng Kỹ thuật",
    LOAI_NGHI: "annual",
    TU_NGAY: "2026-01-01",
    DEN_NGAY: "2025-12-31",
    LY_DO: "Việc riêng",
    NGUOI_DUYET: "Người duyệt",
  });
  expect(errors.map((error) => error.code)).toContain("range");
});

test("normalization keeps V/v and Về việc punctuation and formats Kính gửi/Nơi nhận without inventing facts", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  const normalized = normalizeTemplateFormValues(schema, {
    TRICH_YEU: "V/v: mở rộng thử nghiệm",
    NOI_NHAN_TRUC_TIEP: "Bộ Công Thương",
    NOI_NHAN: "Phòng Kỹ thuật",
  });
  expect(normalized.TRICH_YEU).toBe("V/v mở rộng thử nghiệm");
  expect(normalized.NOI_NHAN).toBe("- Như trên;\n- Phòng Kỹ thuật;\nLưu:");

  const normalizedVeViec = normalizeTemplateFormValues(schema, {
    TRICH_YEU: "Về việc: Ban hành quy chế",
  });
  expect(normalizedVeViec.TRICH_YEU).toBe("Về việc ban hành quy chế");

  const report = getTemplateFormSchemaByDocumentType("Báo cáo");
  expect(normalizeTemplateFormValues(report, {
    KINH_GUI: "Viện trưởng Viện Cơ khí Năng lượng và Mỏ - VINACOMIN\nHội đồng Viện",
    NOI_NHAN: "Như trên;",
  }).KINH_GUI).toBe("- Viện trưởng Viện Cơ khí Năng lượng và Mỏ - VINACOMIN;\n- Hội đồng Viện.");
});

test("normalization does not turn a missing required Nơi nhận into a fake Lưu line", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  expect(normalizeTemplateFormValues(schema, {}).NOI_NHAN).toBeUndefined();
  expect(validateTemplateForm(schema, normalizeTemplateFormValues(schema, {})).map((item) => item.tag)).toContain("NOI_NHAN");
});

test("drafts are keyed by template, organization and document type", () => {
  const storage = new MemoryStorage();
  const values: TemplateFormValues = { SO_KY_HIEU: "12/BC" };
  expect(templateFormDraftKey("iemm-bao-cao-001", "IEMM", "Báo cáo")).toContain("iemm-bao-cao-001");
  expect(templateFormDraftKey("iemm-bao-cao-001", "IEMM", "Báo cáo")).not.toBe(templateFormDraftKey("iemm-bao-cao-001", "TVCI", "Báo cáo"));
  saveTemplateFormDraft("iemm-bao-cao-001", "IEMM", "Báo cáo", values, storage);
  expect(loadTemplateFormDraft("iemm-bao-cao-001", "IEMM", "Báo cáo", storage)?.values).toEqual(values);
  expect(loadTemplateFormDraft("iemm-bao-cao-001", "TVCI", "Báo cáo", storage)).toBeNull();
});

test("FINAL formatting formats V/v with lowercase first letter and no colon, cleans recipient punctuation and completes archive", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  const normalized = normalizeTemplateFormValues(schema, {
    TRICH_YEU: "V/v: v/v triển khai thử nghiệm",
    KINH_GUI: "- Bộ Công Thương,\n- Viện trưởng;",
    NOI_NHAN: "Phòng Kỹ thuật,\nLưu: VT, Văn phòng",
  });
  expect(normalized.TRICH_YEU).toBe("V/v triển khai thử nghiệm");
  expect(normalized.KINH_GUI).toBe("- Bộ Công Thương;\n- Viện trưởng.");
  expect(normalized.NOI_NHAN).toBe("- Như trên;\n- Phòng Kỹ thuật;\nLưu: VT, Văn phòng.");
});

test("FINAL date display pads days and only January or February", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  expect(normalizeTemplateFormValues(schema, { NGAY_BAN_HANH: "2026-01-03" }).NGAY_BAN_HANH).toBe("Hà Nội, ngày 03 tháng 01 năm 2026");
  expect(normalizeTemplateFormValues(schema, { NGAY_BAN_HANH: "2026-09-09" }).NGAY_BAN_HANH).toBe("Hà Nội, ngày 09 tháng 9 năm 2026");
});

test("FINAL form preview uses the same normalized values as Word insertion", () => {
  const template = TEMPLATE_CATALOG.find((item) => item.id === "tvci-cv-001")!;
  const schema = getTemplateFormSchema(template)!;
  const preview = buildTemplateFormPreview(template, schema, {
    TRICH_YEU: "v/v: triển khai thử nghiệm",
    NGAY_BAN_HANH: "2026-09-09",
    KINH_GUI: "Bộ Công Thương\nViện trưởng",
    NOI_NHAN: "Phòng Kỹ thuật",
    NOI_DUNG: "Trân trọng cảm ơn",
  });
  expect(preview.issuerLines).toEqual(["VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN", "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP"]);
  expect(preview.subject).toBe("V/v triển khai thử nghiệm");
  expect(preview.date).toBe("Hà Nội, ngày 09 tháng 9 năm 2026");
  expect(preview.addressee).toBe("Kính gửi:\n- Bộ Công Thương;\n- Viện trưởng.");
  expect(preview.recipients).toContain("- Như trên;");
  expect(preview.body).toBe("Trân trọng cảm ơn./.");
});

test("FINAL direct addressee field formats multiple recipients for the actual Công văn schema", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  const normalized = normalizeTemplateFormValues(schema, {
    NOI_NHAN_TRUC_TIEP: "- Bộ Công Thương,\n- Viện trưởng;",
    NOI_NHAN: "Phòng Kỹ thuật",
  });
  expect(normalized.NOI_NHAN_TRUC_TIEP).toBe("- Bộ Công Thương;\n- Viện trưởng.");
  expect(normalized.NOI_NHAN).toBe("- Như trên;\n- Phòng Kỹ thuật;\nLưu:");
});

test("FINAL archive defaults to the full issuing unit for each organization", () => {
  const schema = getTemplateFormSchemaByDocumentType("Công văn");
  expect(normalizeTemplateFormValues(schema, { NOI_NHAN: "Như trên;" }, "IEMM").NOI_NHAN).toContain("Lưu: VT, VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN.");
  expect(normalizeTemplateFormValues(schema, { NOI_NHAN: "Như trên;" }, "TVCI").NOI_NHAN).toContain("Lưu: VT, T2.");
});
