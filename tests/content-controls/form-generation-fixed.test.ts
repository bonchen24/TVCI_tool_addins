import {
  normalizeTemplateAddresseeValue,
  preserveTemplateLocalityForDate,
  sanitizeTemplateBodyValue,
} from "../../src/word/form-content-control.service";
import { buildTemplateFillPrompt } from "../../src/ai/template-fill";

describe("fixed form generation helpers", () => {
  describe("preserveTemplateLocalityForDate", () => {
    it("keeps the full Hà Nội date using the template locality", () => {
      expect(
        preserveTemplateLocalityForDate(
          "Hà Nội, ngày ... tháng ... năm ...",
          "Hà Nội, ngày 19 tháng 01 năm 2021",
        ),
      ).toBe("Hà Nội, ngày 19 tháng 01 năm 2021");
    });

    it("preserves another template locality without hardcoding Hà Nội", () => {
      const result = preserveTemplateLocalityForDate(
        "Quảng Ninh, ngày ... tháng ... năm ...",
        "Hà Nội, ngày 19 tháng 01 năm 2021",
      );

      expect(result).toBe("Quảng Ninh, ngày 19 tháng 01 năm 2021");
      expect(result).toContain("Quảng Ninh,");
      expect(result).not.toContain("Hà Nội");
    });
  });

  describe("sanitizeTemplateBodyValue", () => {
    it("removes standalone administrative and signature lines while retaining business paragraphs", () => {
      const result = sanitizeTemplateBodyValue(
        [
          "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
          "Độc lập - Tự do - Hạnh phúc",
          "Kính gửi: Sở Công Thương",
          "Nơi nhận: Như trên",
          "VIỆN TRƯỞNG",
          "(Chữ ký, họ và tên, đóng dấu)",
          "Đề nghị đơn vị rà soát hồ sơ trước ngày 30 tháng 9.",
          "Báo cáo kết quả thực hiện về Trung tâm sau khi hoàn thành.",
        ].join("\n"),
      );

      expect(result).toBe(
        [
          "Đề nghị đơn vị rà soát hồ sơ trước ngày 30 tháng 9.",
          "Báo cáo kết quả thực hiện về Trung tâm sau khi hoàn thành.",
        ].join("\n"),
      );
    });

    it("keeps a legitimate sentence containing viện trưởng mid-sentence", () => {
      const sentence = "Hồ sơ được chuyển đến viện trưởng để xem xét và phê duyệt.";

      expect(sanitizeTemplateBodyValue(sentence)).toBe(sentence);
    });
  });

  describe("normalizeTemplateAddresseeValue", () => {
    it("removes labels and bullet markers without inventing template formatting", () => {
      expect(
        normalizeTemplateAddresseeValue(
          "Kính gửi: - - Sở Công Thương;\n• - Trung tâm Kiểm định;\n-- Phòng Kỹ thuật.",
        ),
      ).toBe("Sở Công Thương;\nTrung tâm Kiểm định;\nPhòng Kỹ thuật.");
    });
  });

  describe("buildTemplateFillPrompt", () => {
    it("forbids document structure in NOI_DUNG and requires preserving source meaning", () => {
      const prompt = buildTemplateFillPrompt(
        [{ id: 1, tag: "NOI_DUNG", title: "Nội dung" }],
        "Đề nghị kiểm tra thiết bị trong tháng 10.",
      );

      expect(prompt).toMatch(/NOI_DUNG[\s\S]*?không đưa quốc hiệu/i);
      expect(prompt).toMatch(/Kính gửi/);
      expect(prompt).toMatch(/Nơi nhận/);
      expect(prompt).toMatch(/chữ ký/i);
      expect(prompt).toMatch(/không tự thêm bullet, dấu câu, placeholder/i);
      expect(prompt).toMatch(/giữ đủ mọi dữ kiện nghiệp vụ/i);
      expect(prompt).toMatch(/không rút gọn làm mất ý/i);
    });
  });
});
