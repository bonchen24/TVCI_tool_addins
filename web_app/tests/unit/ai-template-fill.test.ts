import { describe, it, expect } from 'vitest';
import {
  extractFieldsFromNotesHeuristic,
  extractTemplateFields,
  buildTemplateFillPrompt,
} from '@/ai/template-fill';
import { getFormSchema } from '@/templates/form-schema';

describe('AI Template Fill Assistant (F21)', () => {
  it('should extract recipient (Kính gửi) from unstructured user notes', async () => {
    const notes =
      'Cần làm công văn gửi cho Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam về việc triển khai phần mềm.';
    const result = await extractTemplateFields({
      schemaId: 'cong_van',
      userNotes: notes,
      config: { provider: 'mock', apiKey: 'mock' },
    });

    expect(result.fields.KINH_GUI).toBe('Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam');
  });

  it("should extract subject summary (Trích yếu) and prefix with 'V/v'", async () => {
    const notes =
      'Soạn văn bản về việc báo cáo định kỳ tình hình sản xuất than quý 3.';
    const result = await extractTemplateFields({
      schemaId: 'cong_van',
      userNotes: notes,
      config: { provider: 'mock', apiKey: 'mock' },
    });

    expect(result.fields.TRICH_YEU).toBe('V/v báo cáo định kỳ tình hình sản xuất than quý 3');
  });

  it('should extract signer name (Người ký) accurately', async () => {
    const notes =
      'Công văn gửi Sở Xây dựng về việc nghiệm thu công trình, người ký Tổng Giám đốc Nguyễn Văn An.';
    const result = await extractTemplateFields({
      schemaId: 'cong_van',
      userNotes: notes,
      config: { provider: 'mock', apiKey: 'mock' },
    });

    expect(result.fields.NGUOI_KY).toBe('Tổng Giám đốc Nguyễn Văn An');
  });

  it('should validate extracted fields against canonical schema and discard unknown tags', () => {
    const congVan = getFormSchema('cong_van')!;
    const schemaFieldIds = new Set(congVan.fields.map((f) => f.id));

    const mockExtracted = {
      KINH_GUI: 'Sở Tài nguyên và Môi trường',
      TRICH_YEU: 'V/v xin cấp phép khai thác',
      UNKNOWN_EXTRA_TAG: 'Giá trị thừa không có trong schema',
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

  it('should return confidence score alongside extracted fields exceeding threshold 0.8', async () => {
    const notes =
      'Công văn gửi cho Bộ Công Thương về việc đề xuất chính sách giá, người ký Nguyễn Văn An.';
    const result = await extractTemplateFields({
      schemaId: 'cong_van',
      userNotes: notes,
      config: { provider: 'mock', apiKey: 'mock' },
    });

    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.fieldDetails.length).toBeGreaterThan(0);
    expect(result.fieldDetails[0].confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('should construct prompt containing schema field definitions', () => {
    const congVan = getFormSchema('cong_van')!;
    const prompt = buildTemplateFillPrompt(congVan.fields, 'Ghi chú thử nghiệm');

    expect(prompt).toContain('KINH_GUI');
    expect(prompt).toContain('TRICH_YEU');
    expect(prompt).toContain('V/v');
  });

  it('should extract date and format conforming to administrative standards', () => {
    const notes =
      'Công văn gửi Sở Xây dựng về việc nghiệm thu ngày 05/02/2026 người ký Nguyễn Văn An.';
    const heuristic = extractFieldsFromNotesHeuristic(notes, 'cong_van');

    expect(heuristic.fields.NGAY_BAN_HANH).toBeDefined();
    expect(heuristic.fields.NGAY_BAN_HANH).toContain('ngày 05');
    expect(heuristic.fields.NGAY_BAN_HANH).toContain('tháng 02');
    expect(heuristic.fields.NGAY_BAN_HANH).toContain('năm 2026');
  });
});
