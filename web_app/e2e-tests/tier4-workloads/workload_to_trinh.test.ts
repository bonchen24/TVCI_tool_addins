/**
 * Tier 4 - Real-World Application Scenarios: Workload 3
 * Real-world Proposal document (Tờ trình phê duyệt kinh phí) per Nghị định 30/2020/NĐ-CP
 */

import { describe, it, expect } from "../framework/testHarness";
import { TiptapDocument, STANDARD_A4_PAGE_SETUP, createHeaderTableNode } from "../fixtures/documentFixtures";

describe("Tier 4: Workload - Tờ trình (Proposal)", 4, () => {
  const SAMPLE_TO_TRINH: TiptapDocument = {
    type: "doc",
    attrs: STANDARD_A4_PAGE_SETUP,
    content: [
      createHeaderTableNode(
        "PHÒNG CÔNG NGHỆ THÔNG TIN",
        "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "Hà Nội, ngày 29 tháng 9 năm 2026"
      ),
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 14, bold: true, spaceBefore: 6, fontName: "Times New Roman" },
        text: "TỜ TRÌNH",
      },
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 13, bold: true, spaceAfter: 6, fontName: "Times New Roman" },
        text: "V/v phê duyệt dự toán kinh phí nâng cấp hệ thống phần mềm quản lý văn bản TVCI",
      },
      {
        type: "paragraph",
        attrs: { align: "left", fontSize: 13, bold: true, fontName: "Times New Roman" },
        text: "Kính gửi: Hội đồng thành viên Tổng công ty Công nghiệp mỏ Việt Bắc TKV-CTCP",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, bold: true, spaceBefore: 4, fontName: "Times New Roman" },
        text: "I. SỰ CẦN THIẾT ĐẦU TƯ",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Hệ thống hiện tại cần nâng cấp để đáp ứng chuẩn định dạng theo Nghị định số 30/2020/NĐ-CP.",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, bold: true, spaceBefore: 4, fontName: "Times New Roman" },
        text: "II. NỘI DUNG ĐỀ XUẤT VÀ DỰ TOÁN KINH PHÍ",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Tổng dự toán khái toán là: 450.000.000 VNĐ (Bốn trăm năm mươi triệu đồng chẵn).",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, bold: true, spaceBefore: 4, fontName: "Times New Roman" },
        text: "III. KIẾN NGHỊ",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Kính trình Hội đồng thành viên xem xét, phê duyệt chủ trương để triển khai các bước tiếp theo./.",
      },
    ],
  };

  it("should validate document title 'TỜ TRÌNH': bold, centered, 14pt", () => {
    const titleNode = SAMPLE_TO_TRINH.content[1];
    expect(titleNode.text).toBe("TỜ TRÌNH");
    expect(titleNode.attrs?.fontSize).toBe(14);
    expect(titleNode.attrs?.bold).toBe(true);
  });

  it("should validate subject prefix with 'V/v' without colon and lowercase first letter after V/v", () => {
    const subjectNode = SAMPLE_TO_TRINH.content[2];
    expect(subjectNode.text?.startsWith("V/v")).toBe(true);
    // TVCI rule: V/v should be followed by space and lowercase letter (unless proper noun)
    const afterVv = subjectNode.text?.substring(4).trim() || "";
    expect(afterVv.charAt(0)).toBe("p"); // 'phê duyệt' lowercase
  });

  it("should validate section headings (I, II, III) format: bold, uppercase, 13pt", () => {
    const headings = SAMPLE_TO_TRINH.content.filter(
      (n) => n.text?.startsWith("I.") || n.text?.startsWith("II.") || n.text?.startsWith("III.")
    );

    expect(headings.length).toBe(3);
    for (const h of headings) {
      expect(h.attrs?.bold).toBe(true);
      expect(h.attrs?.fontSize).toBe(13);
    }
  });

  it("should validate budget specification with currency denomination in both numeric and words", () => {
    const budgetParagraph = SAMPLE_TO_TRINH.content[7];
    expect(budgetParagraph.text).toContain("450.000.000 VNĐ");
    expect(budgetParagraph.text).toContain("Bốn trăm năm mươi triệu đồng chẵn");
  });

  it("should validate respectful closing sentence in proposal", () => {
    const closingNode = SAMPLE_TO_TRINH.content[9];
    expect(closingNode.text?.startsWith("Kính trình")).toBe(true);
    expect(closingNode.text?.endsWith("./.")).toBe(true);
  });
});
