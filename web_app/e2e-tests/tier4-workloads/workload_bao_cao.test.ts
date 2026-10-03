/**
 * Tier 4 - Real-World Application Scenarios: Workload 5
 * Real-world Report document (Báo cáo sơ kết công tác an toàn lao động) per Nghị định 30/2020/NĐ-CP
 */

import { describe, it, expect } from "../framework/testHarness";
import { TiptapDocument, STANDARD_A4_PAGE_SETUP, createHeaderTableNode } from "../fixtures/documentFixtures";

describe("Tier 4: Workload - Báo cáo (Report)", 4, () => {
  const SAMPLE_BAO_CAO: TiptapDocument = {
    type: "doc",
    attrs: STANDARD_A4_PAGE_SETUP,
    content: [
      createHeaderTableNode(
        "BAN AN TOÀN VÀ MÔI TRƯỜNG",
        "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "Hà Nội, ngày 29 tháng 9 năm 2026"
      ),
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 14, bold: true, spaceBefore: 6, fontName: "Times New Roman" },
        text: "BÁO CÁO",
      },
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 13, bold: true, spaceAfter: 6, fontName: "Times New Roman" },
        text: "Sơ kết công tác an toàn, vệ sinh lao động quý III năm 2026",
      },
      {
        type: "paragraph",
        attrs: { align: "left", fontSize: 13, bold: true, fontName: "Times New Roman" },
        text: "Kính gửi: Lãnh đạo Tổng công ty và Hội đồng An toàn Tổng công ty",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, bold: true, spaceBefore: 4, fontName: "Times New Roman" },
        text: "I. TÌNH HÌNH CHUNG VÀ CÔNG TÁC CHỈ ĐẠO",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Trong quý III năm 2026, toàn Tổng công ty duy trì tốt công tác an toàn, không để xảy ra sự cố nghiêm trọng.",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, bold: true, spaceBefore: 4, fontName: "Times New Roman" },
        text: "II. KẾT QUẢ THỰC HIỆN CÁC CHỈ TIÊU AN TOÀN",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "100% cán bộ, công nhân viên được huấn luyện định kỳ theo đúng quy định hiện hành.",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, bold: true, spaceBefore: 4, fontName: "Times New Roman" },
        text: "III. PHƯƠNG HƯỚNG NHIỆM VỤ QUÝ IV NĂM 2026",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Tập trung kiểm tra cao điểm mùa mưa bão, đảm bảo an toàn tuyệt đối cho người và thiết bị./.",
      },
    ],
  };

  it("should validate document title 'BÁO CÁO': bold, centered, 14pt", () => {
    const titleNode = SAMPLE_BAO_CAO.content[1];
    expect(titleNode.text).toBe("BÁO CÁO");
    expect(titleNode.attrs?.fontSize).toBe(14);
    expect(titleNode.attrs?.bold).toBe(true);
  });

  it("should validate report subheader (Trích yếu nội dung báo cáo)", () => {
    const subheaderNode = SAMPLE_BAO_CAO.content[2];
    expect(subheaderNode.text).toContain("Sơ kết công tác an toàn, vệ sinh lao động quý III năm 2026");
    expect(subheaderNode.attrs?.fontSize).toBe(13);
  });

  it("should validate 3 standard report parts: Tình hình chung, Kết quả, Phương hướng", () => {
    const headings = SAMPLE_BAO_CAO.content.filter(
      (n) => n.text?.startsWith("I.") || n.text?.startsWith("II.") || n.text?.startsWith("III.")
    );

    expect(headings.length).toBe(3);
    expect(headings[0].text).toContain("TÌNH HÌNH CHUNG");
    expect(headings[1].text).toContain("KẾT QUẢ THỰC HIỆN");
    expect(headings[2].text).toContain("PHƯƠNG HƯỚNG NHIỆM VỤ");
  });

  it("should validate closing mark './.' on final paragraph", () => {
    const finalNode = SAMPLE_BAO_CAO.content[9];
    expect(finalNode.text?.endsWith("./.")).toBe(true);
  });
});
