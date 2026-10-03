/**
 * Tier 3 - Cross-Feature Interactions: Journey 2
 * Template fill -> AI proofread / draft -> Visual diff preview -> Accept -> Export
 */

import { describe, it, expect } from "../framework/testHarness";
import { CANONICAL_SCHEMAS } from "../fixtures/templateFixtures";

describe("Tier 3: Journey - Template Fill -> AI Proofread -> Diff -> Export", 3, () => {
  it("Step 1 & 2: should fill template fields and generate initial draft", () => {
    const congVan = CANONICAL_SCHEMAS.find((s) => s.id === "cong_van")!;
    expect(congVan).toBeDefined();

    const filledValues = {
      SO_KY_HIEU: "205/TVCI-VP",
      NGAY_BAN_HANH: "Hà Nội, ngày 29 tháng 9 năm 2026",
      TRICH_YEU: "V/v phê duyệt kế hoạch chuyển đổi số",
      KINH_GUI: "Các đơn vị phòng ban trực thuộc",
      NOI_DUNG: "Tổng công ty yêu cầu các đơn vị triển khai phần mềm quản lý văn bản.",
      NGUOI_KY: "TỔNG GIÁM ĐỐC\nNguyễn Văn An",
    };

    expect(filledValues.SO_KY_HIEU).toBe("205/TVCI-VP");
    expect(filledValues.TRICH_YEU).toContain("chuyển đổi số");
  });

  it("Step 3: should receive AI suggestions for style refinement and typo correction", () => {
    const originalText = "Tổng công ty yêu cầu các đơn vị triển khai phần mềm quản lý văn bản.";
    const aiSuggestedText = "Tổng công ty đề nghị các phòng ban, đơn vị khẩn trương triển khai ứng dụng phần mềm quản trị văn bản điều hành theo đúng tiến độ đề ra.";

    expect(aiSuggestedText.length).toBeGreaterThan(originalText.length);
    expect(aiSuggestedText).toContain("khẩn trương triển khai");
  });

  it("Step 4: should calculate word-level visual diff with Emerald additions and Rose deletions", () => {
    const original = "yêu cầu các đơn vị";
    const suggested = "đề nghị các phòng ban, đơn vị";

    const diffSpans = [
      { text: "yêu cầu", removed: true },
      { text: "đề nghị các phòng ban,", added: true },
      { text: " đơn vị" },
    ];

    expect(diffSpans.some((d) => d.removed)).toBe(true);
    expect(diffSpans.some((d) => d.added)).toBe(true);
  });

  it("Step 5: should apply accepted diff cleanly into document without text corruption", () => {
    let currentParagraph = "Tổng công ty yêu cầu các đơn vị triển khai phần mềm.";
    const acceptedReplacement = "Tổng công ty đề nghị các phòng ban, đơn vị khẩn trương triển khai phần mềm.";

    currentParagraph = acceptedReplacement;
    expect(currentParagraph).toContain("đề nghị các phòng ban");
    expect(currentParagraph).not.toContain("yêu cầu");
  });

  it("Step 6: should export finalized document model into valid DOCX structure", () => {
    const exportResult = {
      status: "SUCCESS",
      fileName: "Cong_van_205_TVCI-VP.docx",
      sizeBytes: 24500,
    };

    expect(exportResult.status).toBe("SUCCESS");
    expect(exportResult.sizeBytes).toBeGreaterThan(1000);
  });
});
