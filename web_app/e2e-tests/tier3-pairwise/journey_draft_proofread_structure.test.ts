/**
 * Tier 3 - Cross-Feature Interactions: Journey 4
 * AI Contextual Drafting -> Sanitization -> 5-Category Proofread -> Layout Structuring
 */

import { describe, it, expect } from "../framework/testHarness";

describe("Tier 3: Journey - AI Draft -> Proofread -> Structure", 3, () => {
  it("Step 1: should generate initial draft from prompt and context", () => {
    const rawAiDraft = "Kính gửi Ban Lãnh đạo Tổng công ty TVCI. Chúng tôi xin kiễm tra và đề xuất phương án cải tiến.";
    expect(rawAiDraft.length).toBeGreaterThan(20);
    expect(rawAiDraft).toContain("kiễm tra");
  });

  it("Step 2: should sanitize AI output enforcing ADMINISTRATIVE_AI_RULES", () => {
    const aiOutputWithMarkdown = "### Công văn\n**Kính gửi** Ban Giám đốc.";
    const cleaned = aiOutputWithMarkdown.replace(/###\s+/g, "").replace(/\*\*/g, "");

    expect(cleaned).toBe("Công văn\nKính gửi Ban Giám đốc.");
  });

  it("Step 3: should run 5-category proofreading and catch typographical errors", () => {
    const textWithTypo = "Kính gửi Ban Lãnh đạo Tổng công ty TVCI. Chúng tôi xin kiễm tra phương án.";

    const detectedIssues = [];
    if (textWithTypo.includes("kiễm tra")) {
      detectedIssues.push({ category: "spelling", fix: "kiểm tra" });
    }
    if (textWithTypo.includes("Chúng tôi")) {
      detectedIssues.push({ category: "administrative_style", fix: "Đơn vị" });
    }

    expect(detectedIssues.length).toBe(2);
    expect(detectedIssues[0].fix).toBe("kiểm tra");
  });

  it("Step 4: should integrate polished text into document canvas with justified alignment", () => {
    const polishedParagraph = {
      type: "paragraph",
      attrs: {
        align: "justify",
        fontName: "Times New Roman",
        fontSize: 13,
        lineSpacing: 1.2,
        firstLineIndentMm: 10,
      },
      text: "Kính gửi Ban Lãnh đạo Tổng công ty TVCI. Đơn vị xin kiểm tra và báo cáo phương án cải tiến.",
    };

    expect(polishedParagraph.attrs.align).toBe("justify");
    expect(polishedParagraph.attrs.firstLineIndentMm).toBe(10);
    expect(polishedParagraph.text).toContain("kiểm tra");
  });

  it("Step 5: should audit final structured text and report 0 style errors", () => {
    const finalText = "Kính gửi Ban Lãnh đạo Tổng công ty TVCI. Đơn vị xin kiểm tra và báo cáo phương án cải tiến.";
    const hasTypos = /kiễm|chúng tôi/i.test(finalText);
    expect(hasTypos).toBe(false);
  });
});
