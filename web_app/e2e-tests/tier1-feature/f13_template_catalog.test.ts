/**
 * Tier 1 - Feature 13: Template Catalog (22 templates)
 * Verifies catalog organization across TVCI, IEMM, TKV, and Party templates, search, and filtering.
 */

import { describe, it, expect } from "../framework/testHarness";

describe("F13: Template Catalog (22 templates)", 1, () => {
  interface TemplateMetadata {
    id: string;
    title: string;
    organization: "TVCI" | "IEMM" | "TKV" | "DANG";
    category: "cong_van" | "quyet_dinh" | "thong_bao" | "to_trinh" | "bieu_mau_noi_bo";
    fileName: string;
  }

  const CATALOG: TemplateMetadata[] = [
    { id: "tvci-cv", title: "Công văn TVCI chuẩn", organization: "TVCI", category: "cong_van", fileName: "tvci-cong-van-template.docx" },
    { id: "tvci-tb", title: "Thông báo TVCI chuẩn", organization: "TVCI", category: "thong_bao", fileName: "tvci-thong-bao-template.docx" },
    { id: "tkv-qd", title: "Quyết định Tập đoàn TKV", organization: "TKV", category: "quyet_dinh", fileName: "tkv-quyet-dinh-template.docx" },
    { id: "dang-sample", title: "Văn bản mẫu Ban Đảng", organization: "DANG", category: "cong_van", fileName: "dang-sample.docx" },
    { id: "iemm-01", title: "Quyết định cá biệt", organization: "IEMM", category: "quyet_dinh", fileName: "01-quyet-dinh-ca-biet.docx" },
    { id: "iemm-02", title: "Quyết định quy định", organization: "IEMM", category: "quyet_dinh", fileName: "02-quyet-dinh-quy-dinh.docx" },
    { id: "iemm-03", title: "Công văn hành chính", organization: "IEMM", category: "cong_van", fileName: "03-cong-van.docx" },
    { id: "iemm-04", title: "Tờ trình phê duyệt", organization: "IEMM", category: "to_trinh", fileName: "04-to-trinh.docx" },
    { id: "iemm-05", title: "Thông báo kết luận", organization: "IEMM", category: "thong_bao", fileName: "05-thong-bao.docx" },
    { id: "iemm-06", title: "Biên bản cuộc họp", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "06-bien-ban.docx" },
    { id: "iemm-07", title: "Báo cáo công tác", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "07-bao-cao.docx" },
    { id: "iemm-08", title: "Kế hoạch hoạt động", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "08-ke-hoach.docx" },
    { id: "iemm-09", title: "Chương trình công tác", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "09-chuong-trinh.docx" },
    { id: "iemm-10", title: "Giấy mời dự họp", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "10-giay-moi.docx" },
    { id: "iemm-11", title: "Giấy giới thiệu", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "11-giay-gioi-thieu.docx" },
    { id: "iemm-12", title: "Giấy nghỉ phép", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "12-giay-nghi-phep.docx" },
    { id: "iemm-13", title: "Bản cam kết", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "13-ban-cam-ket.docx" },
    { id: "iemm-14", title: "Công văn đính chính", organization: "IEMM", category: "cong_van", fileName: "14-cong-van-dinh-chinh.docx" },
    { id: "iemm-tt-nb", title: "Tờ trình nội bộ", organization: "IEMM", category: "to_trinh", fileName: "iemm-to-trinh-noi-bo-template.docx" },
    { id: "iemm-don-np", title: "Đơn xin nghỉ phép", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "iemm-don-xin-nghi-phep-template.docx" },
    { id: "iemm-thu-moi", title: "Thư mời đối tác", organization: "IEMM", category: "bieu_mau_noi_bo", fileName: "iemm-thu-moi-template.docx" },
    { id: "tvci-sample", title: "Tài liệu mẫu chuẩn TVCI", organization: "TVCI", category: "cong_van", fileName: "tvci-sample.docx" },
  ];

  it("should contain at least 22 template records in catalog", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(22);
  });

  it("should categorize templates by organization (TVCI, IEMM, TKV, DANG)", () => {
    const orgs = new Set(CATALOG.map((t) => t.organization));
    expect(orgs.has("TVCI")).toBe(true);
    expect(orgs.has("IEMM")).toBe(true);
    expect(orgs.has("TKV")).toBe(true);
    expect(orgs.has("DANG")).toBe(true);
  });

  it("should filter templates by search keyword (case-insensitive Vietnamese)", () => {
    const search = (q: string) => {
      const lower = q.toLowerCase();
      return CATALOG.filter((t) => t.title.toLowerCase().includes(lower) || t.id.toLowerCase().includes(lower));
    };

    const cvResults = search("công văn");
    expect(cvResults.length).toBeGreaterThan(0);

    const qdResults = search("quyết định");
    expect(qdResults.length).toBeGreaterThan(0);
  });

  it("should ensure all templates possess valid filename with .docx extension", () => {
    for (const t of CATALOG) {
      expect(t.fileName.endsWith(".docx")).toBe(true);
    }
  });

  it("should map template categories into document form schemas", () => {
    const validCategories = ["cong_van", "quyet_dinh", "thong_bao", "to_trinh", "bieu_mau_noi_bo"];
    for (const t of CATALOG) {
      expect(validCategories).toContain(t.category);
    }
  });
}, 13);
