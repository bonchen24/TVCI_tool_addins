/**
 * Tier 4 - Real-World Application Scenarios: Workload 4
 * Real-world Notice document (Thông báo kết luận cuộc họp / nghỉ lễ) per Nghị định 30/2020/NĐ-CP
 */

import { describe, it, expect } from "../framework/testHarness";
import { TiptapDocument, STANDARD_A4_PAGE_SETUP, createHeaderTableNode } from "../fixtures/documentFixtures";

describe("Tier 4: Workload - Thông báo (Notice)", 4, () => {
  const SAMPLE_THONG_BAO: TiptapDocument = {
    type: "doc",
    attrs: STANDARD_A4_PAGE_SETUP,
    content: [
      createHeaderTableNode(
        "VĂN PHÒNG TỔNG CÔNG TY",
        "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "Hà Nội, ngày 29 tháng 9 năm 2026"
      ),
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 14, bold: true, spaceBefore: 6, fontName: "Times New Roman" },
        text: "THÔNG BÁO",
      },
      {
        type: "paragraph",
        attrs: { align: "center", fontSize: 13, bold: true, spaceAfter: 6, fontName: "Times New Roman" },
        text: "Về việc triệu tập Hội nghị sơ kết công tác 9 tháng đầu năm 2026",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "Thực hiện ý kiến chỉ đạo của Tổng Giám đốc Tổng công ty, Văn phòng xin thông báo kế hoạch tổ chức Hội nghị như sau:",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "1. Thời gian: 08 giờ 30 phút, ngày 05 tháng 10 năm 2026 (thứ Hai).",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "2. Địa điểm: Hội trường tầng 3, Trụ sở Tổng công ty Công nghiệp mỏ Việt Bắc TKV-CTCP.",
      },
      {
        type: "paragraph",
        attrs: { align: "justify", fontSize: 13, firstLineIndentMm: 10, fontName: "Times New Roman" },
        text: "3. Thành phần: Các đồng chí Lãnh đạo Tổng công ty, Trưởng các Phòng ban và Giám đốc các đơn vị thành viên.",
      },
    ],
  };

  it("should validate title 'THÔNG BÁO': centered, bold, 14pt", () => {
    const titleNode = SAMPLE_THONG_BAO.content[1];
    expect(titleNode.text).toBe("THÔNG BÁO");
    expect(titleNode.attrs?.fontSize).toBe(14);
    expect(titleNode.attrs?.bold).toBe(true);
    expect(titleNode.attrs?.align).toBe("center");
  });

  it("should validate subject prefix with 'Về việc' for notification documents", () => {
    const subjectNode = SAMPLE_THONG_BAO.content[2];
    expect(subjectNode.text?.startsWith("Về việc")).toBe(true);
  });

  it("should validate numbered agenda points (1. Thời gian, 2. Địa điểm, 3. Thành phần)", () => {
    const items = SAMPLE_THONG_BAO.content.slice(4, 7);
    expect(items.length).toBe(3);

    expect(items[0].text?.includes("1. Thời gian:")).toBe(true);
    expect(items[1].text?.includes("2. Địa điểm:")).toBe(true);
    expect(items[2].text?.includes("3. Thành phần:")).toBe(true);
  });

  it("should validate date formatting in meeting schedule conforming to ND 30", () => {
    const timeNode = SAMPLE_THONG_BAO.content[4];
    expect(timeNode.text).toContain("ngày 05 tháng 10 năm 2026");
  });
});
