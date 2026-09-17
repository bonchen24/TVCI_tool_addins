import {
  formatTvciDate,
  parseAndFormatTvciDate,
  formatTvciSubject,
  formatTvciNumber,
  formatTvciAddressee,
  formatSemicolonCapitalization,
  formatBulletItems,
  formatTvciClosing,
} from "../../src/utils/tvci-formatter";

describe("TVCI Formatter Specification Tests", () => {
  describe("VI. Ngày, tháng, năm", () => {
    test("ngày có 1 chữ số phải có số 0 ở trước (01..09)", () => {
      expect(formatTvciDate(1, 5, 2026)).toBe("Hà Nội, ngày 01 tháng 5 năm 2026");
      expect(formatTvciDate(9, 9, 2026)).toBe("Hà Nội, ngày 09 tháng 9 năm 2026");
    });

    test("tháng 1 và tháng 2 phải có số 0 ở trước", () => {
      expect(formatTvciDate(15, 1, 2026)).toBe("Hà Nội, ngày 15 tháng 01 năm 2026");
      expect(formatTvciDate(20, 2, 2026)).toBe("Hà Nội, ngày 20 tháng 02 năm 2026");
    });

    test("tháng 3 đến 12 không thêm số 0 ở trước", () => {
      expect(formatTvciDate(10, 3, 2026)).toBe("Hà Nội, ngày 10 tháng 3 năm 2026");
      expect(formatTvciDate(9, 9, 2026)).toBe("Hà Nội, ngày 09 tháng 9 năm 2026");
      expect(formatTvciDate(25, 10, 2026)).toBe("Hà Nội, ngày 25 tháng 10 năm 2026");
      expect(formatTvciDate(31, 12, 2026)).toBe("Hà Nội, ngày 31 tháng 12 năm 2026");
    });

    test("parseAndFormatTvciDate handles string formats and ISO dates", () => {
      expect(parseAndFormatTvciDate("2026-09-09")).toBe("Hà Nội, ngày 09 tháng 9 năm 2026");
      expect(parseAndFormatTvciDate("2026-01-05")).toBe("Hà Nội, ngày 05 tháng 01 năm 2026");
      expect(parseAndFormatTvciDate("09/09/2026")).toBe("Hà Nội, ngày 09 tháng 9 năm 2026");
    });
  });

  describe("V. Phần V/v hoặc Về việc (Trích yếu)", () => {
    test("không có dấu hai chấm sau V/v và viết thường chữ cái đầu", () => {
      expect(formatTvciSubject("V/v: Thông báo thời gian trả kết quả")).toBe(
        "V/v thông báo thời gian trả kết quả"
      );
      expect(formatTvciSubject("V/v: Điều chỉnh tiến độ")).toBe(
        "V/v điều chỉnh tiến độ"
      );
    });

    test("không có dấu hai chấm sau Về việc và viết thường chữ cái đầu", () => {
      expect(formatTvciSubject("Về việc: Ban hành quy chế đào tạo")).toBe(
        "Về việc ban hành quy chế đào tạo"
      );
      expect(formatTvciSubject("về việc: Đề xuất kinh phí")).toBe(
        "Về việc đề xuất kinh phí"
      );
    });

    test("chữ cái đầu tiên viết thường khi không có tiền tố", () => {
      expect(formatTvciSubject("thời gian trả kết quả")).toBe(
        "V/v thời gian trả kết quả"
      );
      expect(formatTvciSubject("Thời gian trả kết quả")).toBe(
        "V/v thời gian trả kết quả"
      );
    });

    test("không lặp tiền tố V/v hoặc Về việc", () => {
      expect(formatTvciSubject("V/v V/v Thông báo nghỉ lễ")).toBe(
        "V/v thông báo nghỉ lễ"
      );
      expect(formatTvciSubject("Về việc: V/v: Thông báo")).toBe(
        "Về việc thông báo"
      );
      expect(formatTvciSubject("V/v: Về việc: Phê duyệt dự án")).toBe(
        "V/v phê duyệt dự án"
      );
    });
  });

  describe("IV. Phần Số và Ký hiệu", () => {
    test("có khoảng trống đủ rộng trước dấu / khi chưa có số", () => {
      expect(formatTvciNumber("VCKM-TB")).toBe("Số:         /VCKM-TB");
      expect(formatTvciNumber("VCKM-TB", "")).toBe("Số:         /VCKM-TB");
      expect(formatTvciNumber("VCKM-TB", "[KÝ HIỆU]")).toBe("Số:         /VCKM-TB");
    });

    test("hiển thị số chuẩn khi đã có số", () => {
      expect(formatTvciNumber("VCKM-TB", "123")).toBe("Số: 123/VCKM-TB");
    });
  });

  describe("VII. Phần Kính gửi", () => {
    test("1 nơi nhận: Kính gửi: và tên đơn vị cùng dòng, không dấu cuối câu", () => {
      const result = formatTvciAddressee("Công ty TNHH ABC");
      expect(result.isMultiple).toBe(false);
      expect(result.fullFormattedText).toBe("Kính gửi: Công ty TNHH ABC");
    });

    test("2+ nơi nhận: Kính gửi: dòng riêng, các đơn vị bắt đầu bằng -, kết thúc bằng ; và .", () => {
      const input = "Chi cục Hải quan CK cảng Hải Phòng khu vực I;\nCông ty TNHH ĐT Xuất nhập khẩu Đại Dương.";
      const result = formatTvciAddressee(input);
      expect(result.isMultiple).toBe(true);
      expect(result.recipientLines).toEqual([
        "- Chi cục Hải quan CK cảng Hải Phòng khu vực I;",
        "- Công ty TNHH ĐT Xuất nhập khẩu Đại Dương.",
      ]);
      expect(result.fullFormattedText).toBe(
        "Kính gửi:\n- Chi cục Hải quan CK cảng Hải Phòng khu vực I;\n- Công ty TNHH ĐT Xuất nhập khẩu Đại Dương."
      );
    });
  });

  describe("VIII. Quy tắc sau dấu chấm phẩy (;)", () => {
    test("viết hoa chữ cái đầu tiên sau dấu ; trong cùng đoạn", () => {
      const input = "Đơn vị đã tiếp nhận hồ sơ; sau đó tiến hành kiểm tra; cuối cùng lập báo cáo.";
      expect(formatSemicolonCapitalization(input)).toBe(
        "Đơn vị đã tiếp nhận hồ sơ; Sau đó tiến hành kiểm tra; Cuối cùng lập báo cáo."
      );
    });
  });

  describe("IX. Các đoạn gạch đầu dòng trong nội dung", () => {
    test("bắt đầu bằng -, viết hoa đầu, kết thúc ; và .", () => {
      const items = ["ý thứ nhất,", "ý thứ hai;", "ý cuối cùng;"];
      expect(formatBulletItems(items)).toEqual([
        "- Ý thứ nhất;",
        "- Ý thứ hai;",
        "- Ý cuối cùng.",
      ]);
    });
  });

  describe("X. Câu kết nội dung", () => {
    test("Trân trọng hoặc Trân trọng cảm ơn mặc định thêm ./.", () => {
      expect(formatTvciClosing("Trân trọng")).toBe("Trân trọng./.");
      expect(formatTvciClosing("Trân trọng cảm ơn")).toBe("Trân trọng cảm ơn./.");
    });

    test("giữ nguyên dấu ! nếu có", () => {
      expect(formatTvciClosing("Trân trọng cảm ơn!")).toBe("Trân trọng cảm ơn!");
      expect(formatTvciClosing("Trân trọng!")).toBe("Trân trọng!");
    });
  });
});
