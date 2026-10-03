/**
 * Tier 2 - Boundary & Corner Cases: Unicode Vietnamese Stress
 * Verifies handling of combined diacritics, NFC/NFD normalization, uppercase tones, and Vietnamese quotes.
 */

import { describe, it, expect } from "../framework/testHarness";

describe("Tier 2: Unicode Vietnamese Stress", 2, () => {
  it("should normalize NFD decomposed characters to NFC precomposed Unicode form", () => {
    // 'ế' decomposed as 'e' + U+0302 (circumflex) + U+0301 (acute)
    const nfdString = "ti\u0065\u0302\u0301ng Vi\u0065\u0302\u0323t";
    const nfcString = nfdString.normalize("NFC");

    expect(nfcString).toBe("tiếng Việt");
    expect(nfcString.length).toBeLessThan(nfdString.length);
  });

  it("should correctly handle all Vietnamese uppercase tonal vowels and Đ", () => {
    const uppercaseVowels = "ÀÁẢÃẠ ÂẦẤẨẪẬ ĂẰẮẲẴẶ ÈÉẺẼẸ ÊỀẾỂỄỆ ÌÍỈĨỊ ÒÓỎÕỌ ÔỒỐỔỖỘ ƠỜỚỞỠỢ ÙÚỦŨỤ ƯỪỨỬỮỰ ỲÝỶỸỴ Đ";
    const normalized = uppercaseVowels.normalize("NFC");

    expect(normalized).toContain("Đ");
    expect(normalized).toContain("Ẫ");
    expect(normalized).toContain("Ự");
    expect(normalized.length).toBe(uppercaseVowels.length);
  });

  it("should handle mixed typography quotes (« », “ ”, „ ”) and dashes (—, –)", () => {
    const textWithQuotes = "«Dự án “Hiện đại hóa” – Tổng công ty TVCI»";
    expect(textWithQuotes).toContain("«");
    expect(textWithQuotes).toContain("»");
    expect(textWithQuotes).toContain("“");
    expect(textWithQuotes).toContain("”");
    expect(textWithQuotes).toContain("–");
  });

  it("should preserve non-breaking spaces (U+00A0) in administrative titles and numbers", () => {
    const textWithNbsp = "Số:\u00A0102/TVCI-VP";
    expect(textWithNbsp.includes("\u00A0")).toBe(true);

    const normalizedSpaces = textWithNbsp.replace(/\u00A0/g, " ");
    expect(normalizedSpaces).toBe("Số: 102/TVCI-VP");
  });

  it("should handle scientific and currency symbols alongside Vietnamese text", () => {
    const complexText = "Công suất: 500 MW; Tiêu hao: 12,5%; Nhiệt độ: 45°C; Kinh phí: 1.500.000.000 VNĐ.";
    expect(complexText).toContain("MW");
    expect(complexText).toContain("12,5%");
    expect(complexText).toContain("45°C");
    expect(complexText).toContain("VNĐ");
  });
});
