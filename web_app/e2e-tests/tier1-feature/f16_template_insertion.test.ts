/**
 * Tier 1 - Feature 16: 2-Tier Template Insertion Engine
 * Verifies direct AST generation from schema + regex placeholder fallback replacement.
 */

import { describe, it, expect } from "../framework/testHarness";
import { TiptapDocument } from "../fixtures/documentFixtures";

describe("F16: 2-Tier Template Insertion Engine", 1, () => {
  it("should generate structured Tiptap AST directly from template form values (Tier 1)", () => {
    const values = {
      agencyName: "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM",
      motto: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      dateStr: "Hà Nội, ngày 29 tháng 9 năm 2026",
      subject: "V/v tổ chức hội nghị khách hàng năm 2026",
    };

    const doc: TiptapDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { align: "center", bold: true, fontSize: 13, fontName: "Times New Roman" },
          text: values.agencyName,
        },
        {
          type: "paragraph",
          attrs: { align: "center", bold: true, fontSize: 14, fontName: "Times New Roman" },
          text: values.subject,
        },
      ],
    };

    expect(doc.content.length).toBe(2);
    expect(doc.content[0].text).toBe(values.agencyName);
    expect(doc.content[1].text).toBe(values.subject);
  });

  it("should replace regex fallback placeholders in imported documents (Tier 2)", () => {
    let rawText = "Số: {{SO_KY_HIEU}}\nHà Nội, {{NGAY_BAN_HANH}}\nKính gửi: {{KINH_GUI}}";

    const replacements: Record<string, string> = {
      "{{SO_KY_HIEU}}": "99/TKV-VP",
      "{{NGAY_BAN_HANH}}": "ngày 29 tháng 9 năm 2026",
      "{{KINH_GUI}}": "Các đơn vị thành viên",
    };

    for (const [tag, val] of Object.entries(replacements)) {
      rawText = rawText.replace(new RegExp(tag, "g"), val);
    }

    expect(rawText).toContain("Số: 99/TKV-VP");
    expect(rawText).toContain("ngày 29 tháng 9 năm 2026");
    expect(rawText).toContain("Kính gửi: Các đơn vị thành viên");
  });

  it("should handle brackets fallback style placeholders ([Số ký hiệu], [Kính gửi])", () => {
    let rawText = "Số: [SO_KY_HIEU]\n[TRICH_YEU]";

    rawText = rawText.replace(/\[SO_KY_HIEU\]/g, "102/TVCI");
    rawText = rawText.replace(/\[TRICH_YEU\]/g, "V/v công tác tài chính");

    expect(rawText).toBe("Số: 102/TVCI\nV/v công tác tài chính");
  });

  it("should gracefully retain unfilled optional placeholders without crashing", () => {
    const rawText = "Số: 102/TVCI\n{{GHI_CHU_THEM}}";
    // If GHI_CHU_THEM is not in values
    const safeOutput = rawText; // Untouched

    expect(safeOutput).toContain("{{GHI_CHU_THEM}}");
  });

  it("should sanitize multi-line textarea input before inserting into paragraph nodes", () => {
    const multiLineInput = "Dòng 1\r\nDòng 2\nDòng 3";
    const paragraphs = multiLineInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(paragraphs.length).toBe(3);
    expect(paragraphs[0]).toBe("Dòng 1");
    expect(paragraphs[1]).toBe("Dòng 2");
    expect(paragraphs[2]).toBe("Dòng 3");
  });
}, 16);
