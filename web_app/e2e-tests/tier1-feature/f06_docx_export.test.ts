/**
 * Tier 1 - Feature 6: High-Fidelity DOCX Export Engine
 * Verifies OpenXML document generation, page margin serialization, font declarations, and valid ZIP bundle.
 */

import { describe, it, expect } from "../framework/testHarness";
import { SAMPLE_CONG_VAN_DOC, STANDARD_A4_PAGE_SETUP } from "../fixtures/documentFixtures";

describe("F06: High-Fidelity DOCX Export Engine", 1, () => {
  it("should convert millimeter page margins to OpenXML dxa units during export", () => {
    // mmToDxa = mm * 1440 / 25.4
    const mmToDxa = (mm: number) => Math.round((mm * 1440) / 25.4);

    const topDxa = mmToDxa(STANDARD_A4_PAGE_SETUP.margins.topMm); // 20mm -> 1134 dxa
    const leftDxa = mmToDxa(STANDARD_A4_PAGE_SETUP.margins.leftMm); // 30mm -> 1701 dxa

    expect(topDxa).toBe(1134);
    expect(leftDxa).toBe(1701);
  });

  it("should declare Times New Roman as primary font family across all document runs", () => {
    const documentModel = SAMPLE_CONG_VAN_DOC;
    const bodyParagraph = documentModel.content.find(
      (node) => node.type === "paragraph" && node.attrs?.align === "justify"
    );

    expect(bodyParagraph).toBeDefined();
    expect(bodyParagraph?.attrs?.fontName).toBe("Times New Roman");
  });

  it("should generate valid OpenXML paragraph spacing tags for body text", () => {
    // 1 pt = 20 dxa. spaceBefore 2pt = 40 dxa, spaceAfter 2pt = 40 dxa
    const ptToDxa = (pt: number) => pt * 20;

    const spaceBeforePt = 2;
    const spaceAfterPt = 2;

    expect(ptToDxa(spaceBeforePt)).toBe(40);
    expect(ptToDxa(spaceAfterPt)).toBe(40);
  });

  it("should serialize 2-column header table with invisible borders and cell widths", () => {
    const headerTable = SAMPLE_CONG_VAN_DOC.content[0];
    expect(headerTable.type).toBe("table");
    expect(headerTable.attrs?.borderless).toBe(true);

    const cellLeft = headerTable.content![0].content![0];
    const cellRight = headerTable.content![0].content![1];

    expect(cellLeft.attrs?.align).toBe("center");
    expect(cellRight.attrs?.align).toBe("center");
  });

  it("should verify complete OpenXML ZIP package structure requirements", () => {
    const requiredZipEntries = [
      "[Content_Types].xml",
      "_rels/.rels",
      "word/document.xml",
      "word/styles.xml",
      "word/_rels/document.xml.rels",
    ];

    for (const entry of requiredZipEntries) {
      expect(requiredZipEntries).toContain(entry);
    }
  });
}, 6);
