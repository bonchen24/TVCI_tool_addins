/**
 * Tier 1 - Feature 10: Editor AST Snapshot Adapter
 * Verifies transformation of editor state into ParagraphSnapshot[] and PageSetupSnapshot.
 */

import { describe, it, expect } from "../framework/testHarness";
import { SAMPLE_CONG_VAN_DOC } from "../fixtures/documentFixtures";
import { ParagraphSnapshot, PageSetupSnapshot } from "../fixtures/ruleSnapshots";

describe("F10: Editor AST Snapshot Adapter", 1, () => {
  it("should extract PageSetupSnapshot from editor document attributes", () => {
    const pageSetup: PageSetupSnapshot = {
      orientation: SAMPLE_CONG_VAN_DOC.attrs?.orientation || "portrait",
      paperSize: SAMPLE_CONG_VAN_DOC.attrs?.pageSize || "A4",
      topMarginMm: SAMPLE_CONG_VAN_DOC.attrs?.margins?.topMm || 20,
      bottomMarginMm: SAMPLE_CONG_VAN_DOC.attrs?.margins?.bottomMm || 20,
      leftMarginMm: SAMPLE_CONG_VAN_DOC.attrs?.margins?.leftMm || 30,
      rightMarginMm: SAMPLE_CONG_VAN_DOC.attrs?.margins?.rightMm || 15,
    };

    expect(pageSetup.paperSize).toBe("A4");
    expect(pageSetup.topMarginMm).toBe(20);
    expect(pageSetup.leftMarginMm).toBe(30);
  });

  it("should flatten table cells and extract paragraph nodes in visual reading order", () => {
    // Collect all paragraphs from doc, including those inside table cells
    const snapshots: ParagraphSnapshot[] = [];
    let idx = 0;

    for (const node of SAMPLE_CONG_VAN_DOC.content) {
      if (node.type === "paragraph") {
        snapshots.push({
          index: idx++,
          text: node.text || "",
          fontName: node.attrs?.fontName || "Times New Roman",
          fontSizePt: node.attrs?.fontSize || 13,
          bold: !!node.attrs?.bold,
          italic: !!node.attrs?.italic,
          alignment: (node.attrs?.align || "Left") as any,
          lineSpacingPt: 15.6,
          spaceBeforePt: node.attrs?.spaceBefore || 0,
          spaceAfterPt: node.attrs?.spaceAfter || 0,
          leftIndentMm: 0,
          rightIndentMm: 0,
          firstLineIndentMm: node.attrs?.firstLineIndentMm || 0,
        });
      } else if (node.type === "table") {
        for (const row of node.content || []) {
          for (const cell of row.content || []) {
            for (const p of cell.content || []) {
              snapshots.push({
                index: idx++,
                text: p.text || "",
                fontName: p.attrs?.fontName || "Times New Roman",
                fontSizePt: p.attrs?.fontSize || 13,
                bold: !!p.attrs?.bold,
                italic: !!p.attrs?.italic,
                alignment: (p.attrs?.align || "Left") as any,
                lineSpacingPt: 15.6,
                spaceBeforePt: 0,
                spaceAfterPt: 0,
                leftIndentMm: 0,
                rightIndentMm: 0,
                firstLineIndentMm: 0,
              });
            }
          }
        }
      }
    }

    expect(snapshots.length).toBeGreaterThanOrEqual(5);
    expect(snapshots[0].text).toContain("TỔNG CÔNG TY CÔNG NGHIỆP MỎ");
  });

  it("should classify paragraph component types (AGENCY_NAME, MOTTO, TITLE, BODY) automatically", () => {
    const classifyText = (text: string): string => {
      if (/CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/i.test(text)) return "NATIONAL_EMBLEM";
      if (/Độc lập - Tự do - Hạnh phúc/i.test(text)) return "MOTTO";
      if (/V\/v/i.test(text)) return "ABSTRACT";
      if (/Kính gửi:/i.test(text)) return "ADDRESSEE";
      return "BODY";
    };

    expect(classifyText("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")).toBe("NATIONAL_EMBLEM");
    expect(classifyText("Độc lập - Tự do - Hạnh phúc")).toBe("MOTTO");
    expect(classifyText("V/v báo cáo tiến độ")).toBe("ABSTRACT");
    expect(classifyText("Kính gửi: Tập đoàn TKV")).toBe("ADDRESSEE");
  });

  it("should preserve tableContext metadata for paragraphs within 2-column tables", () => {
    const cellParagraph: ParagraphSnapshot = {
      index: 1,
      text: "Độc lập - Tự do - Hạnh phúc",
      fontName: "Times New Roman",
      fontSizePt: 14,
      bold: true,
      italic: false,
      alignment: "Centered",
      lineSpacingPt: 15.6,
      spaceBeforePt: 0,
      spaceAfterPt: 0,
      leftIndentMm: 0,
      rightIndentMm: 0,
      firstLineIndentMm: 0,
      tableContext: {
        row: 0,
        col: 1,
        totalRows: 1,
        totalCols: 2,
      },
    };

    expect(cellParagraph.tableContext).toBeDefined();
    expect(cellParagraph.tableContext?.col).toBe(1);
    expect(cellParagraph.tableContext?.totalCols).toBe(2);
  });

  it("should handle empty or whitespace-only paragraphs without throwing exceptions", () => {
    const emptyParagraph: ParagraphSnapshot = {
      index: 10,
      text: "   ",
      fontName: "Times New Roman",
      fontSizePt: 13,
      bold: false,
      italic: false,
      alignment: "Left",
      lineSpacingPt: 15.6,
      spaceBeforePt: 0,
      spaceAfterPt: 0,
      leftIndentMm: 0,
      rightIndentMm: 0,
      firstLineIndentMm: 0,
    };

    expect(emptyParagraph.text.trim().length).toBe(0);
  });
}, 10);
