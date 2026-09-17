import {
  getSuggestedQuickPrompts,
  findRelevantKnowledge,
  buildAugmentedAiPrompt,
  type ContextualPromptOptions,
} from "../../src/ai/contextual-pipeline";
import type { KnowledgeRecord } from "../../src/knowledge/models";
import type { TemplateRecord } from "../../src/templates/library";

const MOCK_KNOWLEDGE: KnowledgeRecord[] = [
  {
    id: "k-1",
    category: "mandatory",
    scope: "TVCI",
    title: "Tiêu đề 2 cấp văn bản TVCI",
    content: "Header phải gồm Viện Cơ khí Năng lượng và Mỏ và Trung tâm Thử nghiệm - Kiểm định Công nghiệp.",
    referenceSource: "Nghị định 30/2020",
    tags: ["header", "tieu de", "tvci"],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "k-2",
    category: "guideline",
    scope: "COMMON",
    title: "Khối Kính gửi và Nơi nhận",
    content: "Nếu 1 nơi nhận thì cùng dòng, nếu từ 2 nơi trở lên thì xuống dòng gạch đầu dòng.",
    referenceSource: "Vinacomin",
    tags: ["kinh gui", "noi nhan"],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "k-3",
    category: "phrase",
    scope: "TVCI",
    title: "Mở đầu thông báo kết quả thử nghiệm",
    content: "Căn cứ Hợp đồng dịch vụ thử nghiệm số... Trung tâm TVCI trân trọng thông báo...",
    exampleSnippet: "Căn cứ Hợp đồng dịch vụ thử nghiệm...",
    tags: ["mau cau", "thong bao", "ket qua"],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

const MOCK_TEMPLATE: TemplateRecord = {
  id: "tvci-cv-tra-kq",
  name: "Công văn trả kết quả thử nghiệm TVCI",
  organization: "TVCI",
  department: "Phòng Cơ điện",
  documentType: "Công văn",
  keywords: ["cong van", "ket qua"],
  status: "active",
  version: "1.0",
  source: { kind: "bundled", path: "test" },
};

describe("Contextual AI Pipeline", () => {
  describe("getSuggestedQuickPrompts", () => {
    it("returns drafting prompts with template info when on drafting tab with template", () => {
      const prompts = getSuggestedQuickPrompts({
        activeTab: "drafting",
        template: MOCK_TEMPLATE,
      });

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some((p) => p.prompt.includes("Công văn trả kết quả thử nghiệm TVCI"))).toBe(true);
    });

    it("returns inspect prompts with issue guidance when issues are present", () => {
      const prompts = getSuggestedQuickPrompts({
        activeTab: "inspect",
        issueCount: 3,
      });

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some((p) => p.label.includes("Giải thích lỗi"))).toBe(true);
    });

    it("returns knowledge search and drafting prompts when on knowledge tab", () => {
      const prompts = getSuggestedQuickPrompts({
        activeTab: "knowledge",
      });

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some((p) => p.label.includes("Mẫu câu") || p.label.includes("quy định"))).toBe(true);
    });
  });

  describe("findRelevantKnowledge", () => {
    it("finds knowledge relevant to query keywords and template scope", () => {
      const results = findRelevantKnowledge("Soạn văn bản có kính gửi nhiều nơi", {
        knowledgeRecords: MOCK_KNOWLEDGE,
        scope: "TVCI",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("k-2"); // Matched "kinh gui"
    });

    it("prioritizes mandatory rules over experience/phrases when multiple match", () => {
      const results = findRelevantKnowledge("tiêu đề TVCI", {
        knowledgeRecords: MOCK_KNOWLEDGE,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].category).toBe("mandatory");
    });
  });

  describe("buildAugmentedAiPrompt", () => {
    it("injects internal knowledge rules and template context into prompt", () => {
      const augmented = buildAugmentedAiPrompt({
        userMessage: "Hãy viết giúp phần mở đầu công văn trả kết quả",
        template: MOCK_TEMPLATE,
        knowledgeRecords: MOCK_KNOWLEDGE,
        selection: "Đoạn văn bản đã chọn trong Word",
      });

      expect(augmented).toContain("Hãy viết giúp phần mở đầu công văn trả kết quả");
      expect(augmented).toContain("THÔNG TIN BIỂU MẪU");
      expect(augmented).toContain("Công văn trả kết quả thử nghiệm TVCI");
      expect(augmented).toContain("QUY ĐỊNH VÀ KIẾN THỨC NGHIỆP VỤ LIÊN QUAN");
      expect(augmented).toContain("VĂN BẢN ĐANG CHỌN TRONG WORD");
    });
  });
});
