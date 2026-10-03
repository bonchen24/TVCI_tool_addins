/**
 * Tier 4 - Real-World Application Scenarios: Workload 2
 * Real-world Decision document (Quyết định thành lập / bổ nhiệm) per Nghị định 30/2020/NĐ-CP
 */

import { describe, it, expect } from "../framework/testHarness";
import { TiptapDocument, STANDARD_A4_PAGE_SETUP, createHeaderTableNode } from "../fixtures/documentFixtures";

describe("Tier 4: Workload - Quyết định (Decision)", 4, () => {
  const SAMPLE_QUYET_DINH: TiptapDocument = {
    type: "doc",
    attrs: STANDARD_A4_PAGE_SETUP,
    content: [
      createHeaderTableNode(
        "TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC TKV-CTCP",
        "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "Hà Nội, ngày 29 tháng 9 năm 2026"
      ),
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 14, bold: true, spaceBefore: 6, fontName: "Times New Roman" },
        text: "QUYẾT ĐỊNH",
      },
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 13, bold: true, spaceAfter: 6, fontName: "Times New Roman" },
        text: "Về việc thành lập Ban Chỉ đạo Chuyển đổi số và Ứng dụng CNTT",
      },
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 13, bold: true, fontName: "Times New Roman" },
        text: "TỔNG GIÁM ĐỐC TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC TKV-CTCP",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, italic: true, fontName: "Times New Roman" },
        text: "Căn cứ Điều lệ tổ chức và hoạt động của Tổng công ty Công nghiệp mỏ Việt Bắc TKV-CTCP;",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, italic: true, fontName: "Times New Roman" },
        text: "Theo đề nghị của Trưởng phòng Tổ chức cán bộ và Trưởng phòng Công nghệ thông tin.",
      },
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 13, bold: true, spaceBefore: 4, spaceAfter: 4, fontName: "Times New Roman" },
        text: "QUYẾT ĐỊNH:",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Điều 1. Thành lập Ban Chỉ đạo Chuyển đổi số và Ứng dụng CNTT Tổng công ty gồm các ông (bà) có tên sau:",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Điều 2. Ban Chỉ đạo có trách nhiệm xây dựng lộ trình và đôn đốc thực hiện theo đúng kế hoạch.",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Điều 3. Các Phòng ban nghiệp vụ, đơn vị trực thuộc và các cá nhân có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này./.",
      },
    ],
  };

  it("should validate document title 'QUYẾT ĐỊNH': bold, centered, 14pt", () => {
    const titleNode = SAMPLE_QUYET_DINH.content[1];
    expect(titleNode.text).toBe("QUYẾT ĐỊNH");
    expect(titleNode.attrs?.fontSize).toBe(14);
    expect(titleNode.attrs?.bold).toBe(true);
    expect(titleNode.attrs?.align).toBe("center");
  });

  it("should validate legal basis (Căn cứ) typography: italic, 13pt, justified", () => {
    const canCuNode1 = SAMPLE_QUYET_DINH.content[4];
    const canCuNode2 = SAMPLE_QUYET_DINH.content[5];

    expect(canCuNode1.text?.startsWith("Căn cứ")).toBe(true);
    expect(canCuNode1.attrs?.italic).toBe(true);
    expect(canCuNode1.text?.endsWith(";")).toBe(true); // Semicolon between bases

    expect(canCuNode2.text?.endsWith(".")).toBe(true); // Period on final base
  });

  it("should validate command statement 'QUYẾT ĐỊNH:': centered, bold, 13pt", () => {
    const commandNode = SAMPLE_QUYET_DINH.content[6];
    expect(commandNode.text).toBe("QUYẾT ĐỊNH:");
    expect(commandNode.attrs?.bold).toBe(true);
    expect(commandNode.attrs?.align).toBe("center");
  });

  it("should validate sequential numbered articles (Điều 1, Điều 2, Điều 3) with 10mm indent", () => {
    const articles = SAMPLE_QUYET_DINH.content.slice(7, 10);
    expect(articles.length).toBe(3);

    expect(articles[0].text?.startsWith("Điều 1.")).toBe(true);
    expect(articles[1].text?.startsWith("Điều 2.")).toBe(true);
    expect(articles[2].text?.startsWith("Điều 3.")).toBe(true);

    for (const art of articles) {
      expect(art.attrs?.firstLineIndentMm).toBe(10);
      expect(art.attrs?.align).toBe("justify");
    }
  });

  it("should validate closing mark './.' on final execution article per administrative convention", () => {
    const finalArticle = SAMPLE_QUYET_DINH.content[9];
    expect(finalArticle.text?.endsWith("./.")).toBe(true);
  });
});
