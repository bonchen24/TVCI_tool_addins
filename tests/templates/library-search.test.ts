import { normalizeVietnamese, searchTemplates, type TemplateRecord } from "../../src/templates/library";

function template(overrides: Partial<TemplateRecord> = {}): TemplateRecord {
  return {
    id: "template-1",
    name: "Mẫu văn bản",
    organization: "TVCI",
    department: "Văn phòng",
    documentType: "Công văn",
    keywords: ["hành chính"],
    source: { kind: "bundled", path: "/templates/sample.docx" },
    version: "1.0",
    status: "active",
    ...overrides,
  };
}

describe("Vietnamese template search", () => {
  test("normalizes accents, d with stroke, punctuation, and whitespace", () => {
    expect(normalizeVietnamese("  Quyết-định / ĐƯỜNG — Đặng!  ")).toBe("quyet dinh duong dang");
  });

  test.each([
    ["quyet dinh", template({ id: "quyet-dinh", name: "Quyết định phê duyệt" })],
    ["phieu yeu cau", template({ id: "phieu-yeu-cau", documentType: "Phiếu yêu cầu" })],
    ["kiem dinh", template({ id: "kiem-dinh", description: "Phiếu kiểm định thiết bị" })],
    ["bao cao", template({ id: "bao-cao", keywords: ["Báo cáo chuyên môn"] })],
    ["cong van", template({ id: "cong-van", name: "Công văn hướng dẫn" })],
  ])("matches %s against accented template text", (query, record) => {
    expect(searchTemplates([record], { query })).toEqual([record]);
  });

  test("keeps existing default and sort-order precedence", () => {
    const records = [
      template({ id: "late", name: "Văn bản muộn", sortOrder: 20 }),
      template({ id: "default", name: "Văn bản mặc định", sortOrder: 30, isDefault: true }),
      template({ id: "early", name: "Văn bản sớm", sortOrder: 1 }),
    ];

    expect(searchTemplates(records, { query: "van ban" }).map((record) => record.id)).toEqual([
      "default",
      "early",
      "late",
    ]);
  });

  test("keeps organization and document type filters optional and composable", () => {
    const records = [
      template({ id: "tvci", organization: "TVCI", documentType: "Báo cáo" }),
      template({ id: "iemm", organization: "IEMM", documentType: "Báo cáo" }),
      template({ id: "tvci-cv", organization: "TVCI", documentType: "Công văn" }),
    ];

    expect(searchTemplates(records, { query: "bao cao", organization: "TVCI" }).map((record) => record.id)).toEqual(["tvci"]);
    expect(searchTemplates(records, { query: "bao cao", documentType: "Báo cáo" }).map((record) => record.id)).toEqual(["tvci", "iemm"]);
  });
});
