/**
 * Tier 1 - Feature 14: 8 Canonical Form Schemas
 * Verifies schemas for Công văn, Quyết định, Thông báo, Tờ trình, Báo cáo, Biên bản, Thư mời, Đơn nghỉ phép.
 */

import { describe, it, expect } from "../framework/testHarness";
import { CANONICAL_SCHEMAS } from "../fixtures/templateFixtures";

describe("F14: 8 Canonical Form Schemas", 1, () => {
  it("should register all 8 canonical schemas in registry", () => {
    expect(CANONICAL_SCHEMAS.length).toBe(8);
    const ids = CANONICAL_SCHEMAS.map((s) => s.id);

    const requiredIds = [
      "cong_van",
      "quyet_dinh",
      "thong_bao",
      "to_trinh",
      "bao_cao",
      "bien_ban",
      "thu_moi",
      "don_nghi_phep",
    ];

    for (const reqId of requiredIds) {
      expect(ids).toContain(reqId);
    }
  });

  it("should validate required fields for 'cong_van' (Số ký hiệu, Ngày, Trích yếu, Kính gửi, Nội dung, Người ký)", () => {
    const congVan = CANONICAL_SCHEMAS.find((s) => s.id === "cong_van");
    expect(congVan).toBeDefined();

    const fieldIds = congVan!.fields.map((f) => f.id);
    expect(fieldIds).toContain("SO_KY_HIEU");
    expect(fieldIds).toContain("NGAY_BAN_HANH");
    expect(fieldIds).toContain("TRICH_YEU");
    expect(fieldIds).toContain("KINH_GUI");
    expect(fieldIds).toContain("NOI_DUNG");
    expect(fieldIds).toContain("NGUOI_KY");
  });

  it("should validate required repeatable fields for 'quyet_dinh' (CAN_CU, QUYET_DINH_DIEU)", () => {
    const quyetDinh = CANONICAL_SCHEMAS.find((s) => s.id === "quyet_dinh");
    expect(quyetDinh).toBeDefined();

    const canCuField = quyetDinh!.fields.find((f) => f.id === "CAN_CU");
    const dieuField = quyetDinh!.fields.find((f) => f.id === "QUYET_DINH_DIEU");

    expect(canCuField?.type).toBe("repeatable");
    expect(dieuField?.type).toBe("repeatable");
  });

  it("should assign appropriate defaultProfile to each document schema", () => {
    for (const schema of CANONICAL_SCHEMAS) {
      expect(schema.defaultProfile).toBeDefined();
      expect(["ND30_TVCI", "TKV", "IEMM", "DANG_05_HD_VPTW_2026"]).toContain(schema.defaultProfile);
    }
  });

  it("should validate field input types (text, textarea, date, select, repeatable)", () => {
    const validTypes = new Set(["text", "textarea", "date", "select", "repeatable"]);
    for (const schema of CANONICAL_SCHEMAS) {
      for (const field of schema.fields) {
        expect(validTypes.has(field.type)).toBe(true);
      }
    }
  });
}, 14);
