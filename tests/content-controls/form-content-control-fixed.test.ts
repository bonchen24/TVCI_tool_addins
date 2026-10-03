import {
  normalizeTemplateAddresseeValue,

  preserveTemplateLocalityForDate,
  sanitizeTemplateBodyValue,
} from "../../src/word/form-content-control.service";

describe("form content control helpers", () => {
  it("preserves locality from the Word template when replacing administrative date", () => {
    expect(
      preserveTemplateLocalityForDate(
        "Quảng Ninh, ngày ... tháng ... năm ...",
        "Hà Nội, ngày 19 tháng 01 năm 2021"
      )
    ).toBe("Quảng Ninh, ngày 19 tháng 01 năm 2021");
  });

  it("removes duplicated fixed document blocks from body but keeps substantive prose", () => {
    const body = [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập - Tự do - Hạnh phúc",
      "Kính gửi: Công ty A",
      "",
      "Đề nghị Công ty A gửi hồ sơ trước ngày 30/09/2026.",
      "Nội dung này có cụm Viện trưởng trong câu nhưng vẫn là nội dung nghiệp vụ.",
      "",
      "VIỆN TRƯỞNG",
      "(Chữ ký, họ và tên, đóng dấu)",
    ].join("\n");

    const cleaned = sanitizeTemplateBodyValue(body);
    expect(cleaned).toContain("Đề nghị Công ty A gửi hồ sơ trước ngày 30/09/2026.");
    expect(cleaned).toContain("Viện trưởng trong câu");
    expect(cleaned).not.toContain("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
    expect(cleaned).not.toContain("Độc lập - Tự do - Hạnh phúc");
    expect(cleaned).not.toContain("Kính gửi:");
    expect(cleaned).not.toContain("(Chữ ký, họ và tên, đóng dấu)");
    expect(cleaned).not.toMatch(/\nVIỆN TRƯỞNG\s*$/u);
  });

  it("strips AI bullet markers without adding bullets to template-owned inline addressee text", () => {
    expect(
      normalizeTemplateAddresseeValue("Kính gửi: - Công ty A;\n- - Công ty B.")
    ).toBe("Công ty A;\nCông ty B.");
  });
});
