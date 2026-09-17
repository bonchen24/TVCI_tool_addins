import { detectDocumentContext, type AutoDetectResult } from "../../src/rules/auto-detect.service";

describe("detectDocumentContext", () => {
  it("detects TVCI organization and Cong van document type accurately", () => {
    const sampleParagraphs = [
      "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN",
      "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP",
      "Số: 142/TVCI-KĐ",
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập - Tự do - Hạnh phúc",
      "Hà Nội, ngày 17 tháng 09 năm 2026",
      "CÔNG VĂN",
      "V/v trả kết quả kiểm định an toàn thiết bị mỏ",
      "Kính gửi: Công ty Cổ phần Than Hà Lầm - Vinacomin",
    ];

    const result = detectDocumentContext(sampleParagraphs);

    expect(result.detectedOrg).toBe("TVCI");
    expect(result.documentType).toBe("Công văn");
    expect(result.ruleProfileId).toBe("NĐ30_TVCI");
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.rationale.length).toBeGreaterThan(0);
  });

  it("detects IEMM Institute organization and Quyet dinh document type", () => {
    const sampleParagraphs = [
      "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM",
      "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN",
      "Số: 58/QĐ-CKNLM",
      "QUYẾT ĐỊNH",
      "Về việc phê duyệt đề cương nghiên cứu phát triển máy xúc thủy lực mỏ",
      "VIỆN TRƯỞNG VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN",
      "Căn cứ Điều lệ tổ chức và hoạt động của Viện...",
    ];

    const result = detectDocumentContext(sampleParagraphs);

    expect(result.detectedOrg).toBe("IEMM");
    expect(result.documentType).toBe("Quyết định");
    expect(result.ruleProfileId).toBe("IEMM");
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("detects Party documents and 05-HD/VPTW profile", () => {
    const sampleParagraphs = [
      "ĐẢNG BỘ TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM",
      "ĐẢNG ỦY VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ",
      "Số: 12-BC/ĐU",
      "ĐẢNG CỘNG SẢN VIỆT NAM",
      "Hà Nội, ngày 15 tháng 09 năm 2026",
      "BÁO CÁO",
      "Kết quả công tác xây dựng Đảng 9 tháng đầu năm 2026",
    ];

    const result = detectDocumentContext(sampleParagraphs);

    expect(result.detectedOrg).toBe("DANG");
    expect(result.documentType).toBe("Báo cáo");
    expect(result.ruleProfileId).toBe("DANG_05_HD_VPTW_2026");
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("returns fallback with sensible defaults for empty or unrecognized document", () => {
    const result = detectDocumentContext([]);

    expect(result.detectedOrg).toBe("TVCI");
    expect(result.documentType).toBe("Văn bản hành chính");
    expect(result.ruleProfileId).toBe("NĐ30_TVCI");
    expect(result.confidence).toBeLessThan(0.6);
  });
});
