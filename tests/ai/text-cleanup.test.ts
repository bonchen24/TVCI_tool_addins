import { sanitizeAiTextOutput } from "../../src/ai/text-cleanup";

test("AI output is plain Word text without Markdown markers or consecutive duplicates", () => {
  expect(sanitizeAiTextOutput("### **QUYẾT ĐỊNH**\n\n***\n**Điều 1.** Nội dung\n**Điều 1.** Nội dung\n* Dòng tiếp theo\n```text\nKết thúc\n```")).toBe(
    "QUYẾT ĐỊNH\n\nĐiều 1. Nội dung\n- Dòng tiếp theo\nKết thúc",
  );
});

test("plain text facts are preserved while only presentation markers are removed", () => {
  expect(sanitizeAiTextOutput("Số: 12/TVCI\nNgày: 22/09/2026")).toBe("Số: 12/TVCI\nNgày: 22/09/2026");
});

test("removes AI preambles and emoji while preserving administrative notation", () => {
  expect(sanitizeAiTextOutput([
    "Dưới đây là nội dung đề xuất:",
    "🙂 **Điều 1.** Thay thế thiết bị FTKF35XVMV;",
    "- Nhiệt độ vận hành: 25°C ± 2°C;",
    "1. Áp dụng theo TCVN/IEC 17025;",
    "Bản chỉnh sửa:",
    "Căn cứ Hợp đồng số 12/VCNM-TTTN.",
  ].join("\n"))).toBe([
    "Điều 1. Thay thế thiết bị FTKF35XVMV;",
    "- Nhiệt độ vận hành: 25°C ± 2°C;",
    "1. Áp dụng theo TCVN/IEC 17025;",
    "Căn cứ Hợp đồng số 12/VCNM-TTTN.",
  ].join("\n"));
});
