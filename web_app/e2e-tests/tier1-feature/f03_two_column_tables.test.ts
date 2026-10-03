/**
 * Tier 1 - Feature 3: 2-Column Administrative Table Nodes
 * Verifies Header Table (Agency + Motto) and Footer Table (Recipients + Signer) with invisible borders.
 */

import { describe, it, expect } from "../framework/testHarness";
import { createHeaderTableNode, createFooterTableNode } from "../fixtures/documentFixtures";

describe("F03: 2-Column Administrative Table Nodes", 1, () => {
  it("should create header table with 2 columns and borderless attributes", () => {
    const headerNode = createHeaderTableNode(
      "TỔNG CÔNG TY CÔNG NGHIỆP MỎ VIỆT BẮC TKV-CTCP",
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Hà Nội, ngày 29 tháng 9 năm 2026"
    );

    expect(headerNode.type).toBe("table");
    expect(headerNode.attrs?.borderless).toBe(true);
    expect(headerNode.content?.length).toBe(1); // 1 row

    const row = headerNode.content![0];
    expect(row.content?.length).toBe(2); // 2 cells
  });

  it("should maintain correct column width ratio for header table (~45% / 55%)", () => {
    const headerNode = createHeaderTableNode("TỔNG CÔNG TY", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "Hà Nội");
    const ratios = headerNode.attrs?.columnRatios;

    expect(Array.isArray(ratios)).toBe(true);
    expect(ratios[0] + ratios[1]).toBeCloseTo(1.0, 0.001);
    expect(ratios[0]).toBeLessThan(ratios[1]);
  });

  it("should create footer table with recipients on left and signer on right", () => {
    const footerNode = createFooterTableNode(
      ["Như Điều 3", "Lưu: VT, TCCB"],
      "TỔNG GIÁM ĐỐC",
      "Nguyễn Văn An"
    );

    expect(footerNode.type).toBe("table");
    const row = footerNode.content![0];
    const leftCell = row.content![0];
    const rightCell = row.content![1];

    // Left cell contains "Nơi nhận:"
    const leftText = leftCell.content?.map((p) => p.text).join(" ") || "";
    expect(leftText).toContain("Nơi nhận:");
    expect(leftText).toContain("Như Điều 3");

    // Right cell contains Signer Role and Name
    const rightText = rightCell.content?.map((p) => p.text).join(" ") || "";
    expect(rightText).toContain("TỔNG GIÁM ĐỐC");
    expect(rightText).toContain("Nguyễn Văn An");
  });

  it("should enforce 11pt font size for recipient items in left footer cell", () => {
    const footerNode = createFooterTableNode(["Lưu: VT"], "GIÁM ĐỐC", "Trần Văn Bình");
    const leftCell = footerNode.content![0].content![0];
    const recipientParagraphs = leftCell.content!.slice(1); // skip "Nơi nhận:" title

    for (const p of recipientParagraphs) {
      expect(p.attrs?.fontSize).toBe(11);
    }
  });

  it("should enforce centered alignment for signer block in right footer cell", () => {
    const footerNode = createFooterTableNode(["Lưu: VT"], "CHỦ TỊCH HỘI ĐỒNG THÀNH VIÊN", "Lê Văn C");
    const rightCell = footerNode.content![0].content![1];
    const signerRoleParagraph = rightCell.content![0];

    expect(signerRoleParagraph.attrs?.align).toBe("center");
    expect(signerRoleParagraph.attrs?.bold).toBe(true);
  });
}, 3);
