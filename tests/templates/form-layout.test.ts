import {
  isMainContentField,
  FORM_SCHEMA_REGISTRY,
} from "../../src/templates/form-schema";

describe("Form Layout Field Classification (UI/UX Pro Max)", () => {
  describe("isMainContentField unit tests", () => {
    test("classifies multi-line, textarea and repeatable field types as main content", () => {
      expect(isMainContentField({ tag: "CUSTOM_FIELD", type: "textarea" })).toBe(true);
      expect(isMainContentField({ tag: "CUSTOM_FIELD", type: "multi-line" })).toBe(true);
      expect(isMainContentField({ tag: "CUSTOM_FIELD", type: "repeatable" })).toBe(true);
    });

    test("classifies key narrative and full-width tags as main content even if type is text", () => {
      expect(isMainContentField({ tag: "TRICH_YEU", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "TIEU_DE", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "NOI_DUNG", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "CAN_CU", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "DIEU_KHOAN", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "LY_DO", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "DE_XUAT_KIEN_NGHI", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "KIEN_NGHI", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "NOI_NHAN", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "KINH_GUI", type: "text" })).toBe(true);
      expect(isMainContentField({ tag: "THANH_PHAN", type: "text" })).toBe(true);
    });

    test("classifies compact metadata fields as non-main content (half-width / span 1)", () => {
      expect(isMainContentField({ tag: "SO_KY_HIEU", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "NGAY_BAN_HANH", type: "date" })).toBe(false);
      expect(isMainContentField({ tag: "DIA_DANH", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "CO_QUAN_BAN_HANH", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "CHUC_VU_NGUOI_KY", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "NGUOI_KY", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "HO_TEN", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "DON_VI_CONG_VIEC", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "LOAI_NGHI", type: "select" })).toBe(false);
      expect(isMainContentField({ tag: "TU_NGAY", type: "date" })).toBe(false);
      expect(isMainContentField({ tag: "DEN_NGAY", type: "date" })).toBe(false);
      expect(isMainContentField({ tag: "THOI_GIAN", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "DIA_DIEM", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "CHU_TRI", type: "text" })).toBe(false);
      expect(isMainContentField({ tag: "THU_KY", type: "text" })).toBe(false);
    });
  });

  describe("Schema registry validation against layout rules", () => {
    test("Cong van has compact fields and full-width main content fields", () => {
      const schema = FORM_SCHEMA_REGISTRY["Công văn"];
      const mainFields = schema.fields.filter(isMainContentField);
      const compactFields = schema.fields.filter((f) => !isMainContentField(f));

      const mainTags = mainFields.map((f) => f.tag);
      const compactTags = compactFields.map((f) => f.tag);

      expect(mainTags).toContain("TRICH_YEU");
      expect(mainTags).toContain("NOI_DUNG");
      expect(mainTags).toContain("NOI_NHAN");

      expect(compactTags).toContain("SO_KY_HIEU");
      expect(compactTags).toContain("NGAY_BAN_HANH");
      expect(compactTags).toContain("NGUOI_KY");
    });

    test("Quyet dinh has full-width CAN_CU and DIEU_KHOAN", () => {
      const schema = FORM_SCHEMA_REGISTRY["Quyết định"];
      const mainFields = schema.fields.filter(isMainContentField);
      const mainTags = mainFields.map((f) => f.tag);

      expect(mainTags).toContain("CAN_CU");
      expect(mainTags).toContain("DIEU_KHOAN");
      expect(mainTags).toContain("TRICH_YEU");
      expect(mainTags).toContain("NOI_NHAN");
    });

    test("Don nghi phep pairs TU_NGAY and DEN_NGAY side by side", () => {
      const schema = FORM_SCHEMA_REGISTRY["Đơn nghỉ phép"];
      const compactFields = schema.fields.filter((f) => !isMainContentField(f));
      const compactTags = compactFields.map((f) => f.tag);

      expect(compactTags).toContain("TU_NGAY");
      expect(compactTags).toContain("DEN_NGAY");
      expect(compactTags).toContain("HO_TEN");
      expect(compactTags).toContain("DON_VI_CONG_VIEC");
      expect(compactTags).toContain("LOAI_NGHI");
      expect(compactTags).toContain("NGUOI_DUYET");

      const mainFields = schema.fields.filter(isMainContentField);
      expect(mainFields.map((f) => f.tag)).toContain("LY_DO");
    });
  });
});
