import { findDuplicateKnowledge, calculateSimilarity } from "../../src/knowledge/similarity";
import type { KnowledgeRecord } from "../../src/knowledge/models";

const mockRecords: KnowledgeRecord[] = [
  {
    id: "kb-1",
    title: "Quy chuẩn trích yếu công văn TVCI",
    content: "Trích yếu công văn phải ngắn gọn, bắt đầu bằng chữ viết hoa, kết thúc không có dấu chấm.",
    category: "guideline",
    scope: "TVCI",
    tags: ["trich-yeu", "cong-van"],
  },
  {
    id: "kb-2",
    title: "Mẫu câu đề nghị thanh toán tạm ứng",
    content: "Kính đề nghị Ban Giám đốc xem xét phê duyệt tạm ứng kinh phí thực hiện hợp đồng số...",
    category: "phrase",
    scope: "COMMON",
    tags: ["tam-ung", "kinh-phi"],
  },
];

describe("findDuplicateKnowledge", () => {
  test("calculates high similarity for identical or nearly identical titles", () => {
    const score = calculateSimilarity(
      "Quy chuan trich yeu cong van TVCI",
      "Quy chuẩn trích yếu công văn TVCI"
    );
    expect(score).toBeGreaterThan(0.9);
  });

  test("detects duplicate when title is very similar", () => {
    const duplicates = findDuplicateKnowledge(
      {
        title: "Quy chuẩn trích yếu công văn TVCI",
        content: "Nội dung khác",
      },
      mockRecords
    );

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].record.id).toBe("kb-1");
    expect(duplicates[0].score).toBeGreaterThan(0.7);
  });

  test("detects duplicate when content is substantially matching", () => {
    const duplicates = findDuplicateKnowledge(
      {
        title: "Một tiêu đề hoàn toàn mới",
        content: "Trích yếu công văn phải ngắn gọn, bắt đầu bằng chữ viết hoa, kết thúc không có dấu chấm.",
      },
      mockRecords
    );

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].record.id).toBe("kb-1");
    expect(duplicates[0].score).toBeGreaterThan(0.7);
  });

  test("returns empty array when content is completely novel", () => {
    const duplicates = findDuplicateKnowledge(
      {
        title: "Kinh nghiệm thử nghiệm áp suất bình chịu áp lực mỏ",
        content: "Quy trình kiểm tra áp suất thủy tĩnh theo tiêu chuẩn QCVN 01 cho thiết bị nâng mỏ hầm lò.",
      },
      mockRecords
    );

    expect(duplicates.length).toBe(0);
  });
});
