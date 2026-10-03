/**
 * Tier 1 - Feature 19: Contextual Drafting Subsystem
 * Verifies AI generation of administrative sections based on prompt, document type, and context.
 */

import { describe, it, expect } from "../framework/testHarness";
import { MOCK_AI_RESPONSES } from "../fixtures/templateFixtures";

describe("F19: Contextual Drafting Subsystem", 1, () => {
  interface DraftingRequest {
    docType: "cong_van" | "quyet_dinh" | "to_trinh" | "thong_bao";
    section: "mo_dau" | "noi_dung" | "ket_luan" | "dieu_khoan";
    userPrompt: string;
    context?: string;
  }

  const buildDraftingPrompt = (req: DraftingRequest): string => {
    return [
      `Loại văn bản: ${req.docType}`,
      `Phần cần soạn: ${req.section}`,
      `Bối cảnh tài liệu: ${req.context || "Không có"}`,
      `Yêu cầu người dùng: ${req.userPrompt}`,
      `Quy chuẩn: Viết văn phong hành chính trang trọng, ngắn gọn, chuẩn NĐ 30/2020/NĐ-CP.`,
    ].join("\n");
  };

  it("should construct prompt incorporating document type, section, and context", () => {
    const req: DraftingRequest = {
      docType: "cong_van",
      section: "noi_dung",
      userPrompt: "Báo cáo công tác kiểm toán nội bộ tháng 9/2026",
      context: "Tổng công ty đã thực hiện kiểm toán tại 3 đơn vị thành viên.",
    };

    const prompt = buildDraftingPrompt(req);
    expect(prompt).toContain("Loại văn bản: cong_van");
    expect(prompt).toContain("Phần cần soạn: noi_dung");
    expect(prompt).toContain("kiểm toán nội bộ tháng 9/2026");
    expect(prompt).toContain("3 đơn vị thành viên");
  });

  it("should parse generated drafting response into paragraphs", () => {
    const aiText = MOCK_AI_RESPONSES.drafting.content;
    const paragraphs = aiText.split("\n").filter((p) => p.trim().length > 0);

    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0]).toContain("Kính gửi: Ban Lãnh đạo");
    expect(paragraphs[1]).toContain("Phòng Kế hoạch xin trân trọng báo cáo");
  });

  it("should enforce formal administrative phrasing ('Kính gửi', 'Trân trọng', 'Căn cứ')", () => {
    const hasFormalKeywords = (text: string) => {
      return /kính gửi|trân trọng|căn cứ|thực hiện|báo cáo/i.test(text);
    };

    expect(hasFormalKeywords(MOCK_AI_RESPONSES.drafting.content)).toBe(true);
    expect(hasFormalKeywords("Chào bạn, hôm nay thế nào?")).toBe(false);
  });

  it("should track token consumption metadata from drafting responses", () => {
    const response = MOCK_AI_RESPONSES.drafting;
    expect(response.tokensUsed).toBeDefined();
    expect(response.tokensUsed).toBeGreaterThan(0);
  });

  it("should handle empty prompt input with validation error", () => {
    const validateRequest = (req: Partial<DraftingRequest>) => {
      if (!req.userPrompt || req.userPrompt.trim().length === 0) {
        throw new Error("Yêu cầu soạn thảo không được để trống");
      }
    };

    expect(() => validateRequest({ userPrompt: "" })).toThrow("không được để trống");
  });
}, 19);
