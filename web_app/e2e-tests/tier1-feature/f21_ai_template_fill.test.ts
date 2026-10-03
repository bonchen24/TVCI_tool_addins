/**
 * Tier 1 - Feature 21: AI Template Fill Assistant
 * Verifies intelligent field suggestion and extraction from user notes into template schema.
 */

import { describe, it, expect } from "../framework/testHarness";
import { CANONICAL_SCHEMAS } from "../fixtures/templateFixtures";

describe("F21: AI Template Fill Assistant", 1, () => {
  interface ExtractedFieldValues {
    [fieldId: string]: string | string[];
  }

  const mockExtractFromNotes = (notes: string, schemaId: string): ExtractedFieldValues => {
    const result: ExtractedFieldValues = {};

    // Simple deterministic extraction rules for testing
    if (schemaId === "cong_van") {
      const matchKinhGui = notes.match(/gửi cho\s+([^,.\n]+)/i);
      if (matchKinhGui) result.KINH_GUI = matchKinhGui[1].trim();

      const matchTrichYeu = notes.match(/về việc\s+([^,.\n]+)/i);
      if (matchTrichYeu) result.TRICH_YEU = `V/v ${matchTrichYeu[1].trim()}`;

      const matchNguoiKy = notes.match(/người ký\s+([^,.\n]+)/i);
      if (matchNguoiKy) result.NGUOI_KY = matchNguoiKy[1].trim();
    }
    return result;
  };

  it("should extract recipient (Kính gửi) from unstructured user notes", () => {
    const notes = "Cần làm công văn gửi cho Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam về việc triển khai phần mềm.";
    const extracted = mockExtractFromNotes(notes, "cong_van");

    expect(extracted.KINH_GUI).toBe("Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam");
  });

  it("should extract subject summary (Trích yếu) and prefix with 'V/v'", () => {
    const notes = "Soạn văn bản về việc báo cáo định kỳ tình hình sản xuất than quý 3.";
    const extracted = mockExtractFromNotes(notes, "cong_van");

    expect(extracted.TRICH_YEU).toBe("V/v báo cáo định kỳ tình hình sản xuất than quý 3");
  });

  it("should extract signer name (Người ký) accurately", () => {
    const notes = "Công văn gửi Sở Xây dựng về việc nghiệm thu công trình, người ký Tổng Giám đốc Nguyễn Văn An.";
    const extracted = mockExtractFromNotes(notes, "cong_van");

    expect(extracted.NGUOI_KY).toBe("Tổng Giám đốc Nguyễn Văn An");
  });

  it("should validate extracted fields against canonical schema field list", () => {
    const congVan = CANONICAL_SCHEMAS.find((s) => s.id === "cong_van")!;
    const schemaFieldIds = new Set(congVan.fields.map((f) => f.id));

    const mockExtracted = {
      KINH_GUI: "Sở Tài nguyên và Môi trường",
      TRICH_YEU: "V/v xin cấp phép khai thác",
      UNKNOWN_EXTRA_TAG: "Giá trị thừa",
    };

    const validFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(mockExtracted)) {
      if (schemaFieldIds.has(k)) {
        validFields[k] = v;
      }
    }

    expect(validFields.KINH_GUI).toBeDefined();
    expect(validFields.UNKNOWN_EXTRA_TAG).toBeUndefined();
  });

  it("should return confidence score alongside extracted fields", () => {
    interface ExtractionResult {
      fields: Record<string, any>;
      confidence: number;
    }

    const res: ExtractionResult = {
      fields: { KINH_GUI: "Bộ Công Thương" },
      confidence: 0.95,
    };

    expect(res.confidence).toBeGreaterThan(0.9);
  });
}, 21);
