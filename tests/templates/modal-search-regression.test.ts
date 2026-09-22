import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { searchTemplates, type TemplateRecord } from "../../src/templates/library";

const modalPaths = [
  resolve(__dirname, "../../src/taskpane/components/TemplateLibraryModal.tsx"),
  resolve(__dirname, "../../src/taskpane/components/SmartDraftingModal.tsx"),
];

function readModal(path: string): string {
  return readFileSync(path, "utf8");
}

describe("template modal search regression", () => {
  test.each(modalPaths)("delegates template text search to searchTemplates: %s", (path) => {
    const source = readModal(path);

    expect(source).toContain("searchTemplates");
    expect(source).not.toMatch(/toLowerCase\(\)/);
    expect(source).not.toMatch(/t\.(?:name|documentType|description|keywords)[^\r\n]*\.includes\(/);
  });

  test("shared search behavior covers the fields used by both modals", () => {
    const record: TemplateRecord = {
      id: "shared-search-record",
      name: "Mẫu kiểm tra",
      organization: "TVCI",
      department: "Văn phòng",
      documentType: "Công văn",
      description: "Phiếu yêu cầu kiểm định",
      keywords: ["Báo cáo", "Quyết định"],
      source: { kind: "bundled", path: "/templates/shared.docx" },
      version: "1.0",
      status: "active",
    };

    for (const query of ["phieu yeu cau", "kiem dinh", "bao cao", "quyet dinh", "cong van"]) {
      expect(searchTemplates([record], { query })).toEqual([record]);
    }
  });
});
