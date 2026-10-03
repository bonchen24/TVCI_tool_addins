import { describe, it, expect } from 'vitest';
import {
  VALID_PROOFREAD_CATEGORIES,
  parseProofreadJson,
  extractJson,
  buildProofreadingPrompt,
  proofreadAdministrativeText,
} from '@/ai/proofreading';

describe('AI 5-Category Proofreading Subsystem (F20)', () => {
  it('should categorize suggestions into exactly 5 defined categories', () => {
    expect(VALID_PROOFREAD_CATEGORIES.length).toBe(5);
    expect(VALID_PROOFREAD_CATEGORIES).toContain('spelling');
    expect(VALID_PROOFREAD_CATEGORIES).toContain('grammar');
    expect(VALID_PROOFREAD_CATEGORIES).toContain('capitalization');
    expect(VALID_PROOFREAD_CATEGORIES).toContain('punctuation');
    expect(VALID_PROOFREAD_CATEGORIES).toContain('administrative_style');
  });

  it('should detect spelling mistakes with Vietnamese diacritic errors', async () => {
    const text = 'Đề nghị các phòng ban nghiên cứu kiễm tra hồ sơ kỹ lưỡng.';
    const result = await proofreadAdministrativeText({
      text,
      config: { provider: 'mock', apiKey: 'mock' },
    });

    const spellingIssue = result.issues.find((i) => i.category === 'spelling');
    expect(spellingIssue).toBeDefined();
    expect(spellingIssue?.original).toBe('nghiên cứu kiễm tra');
    expect(spellingIssue?.replacement).toBe('nghiên cứu kiểm tra');
    expect(result.revisedText).toContain('kiểm tra');
  });

  it('should detect inappropriate administrative style phrasing', async () => {
    const text = 'Trong quý vừa qua, chúng tôi đã hoàn thành các nhiệm vụ được giao.';
    const result = await proofreadAdministrativeText({
      text,
      config: { provider: 'mock', apiKey: 'mock' },
    });

    const styleIssue = result.issues.find((i) => i.category === 'administrative_style');
    expect(styleIssue).toBeDefined();
    expect(styleIssue?.original).toContain('chúng tôi');
    expect(styleIssue?.explanation).toContain('Văn phong hành chính');
  });

  it('should calculate replacement range indices within source text', async () => {
    const sourceText = 'Đề nghị các phòng ban nghiên cứu kiễm tra hồ sơ kỹ lưỡng.';
    const result = await proofreadAdministrativeText({
      text: sourceText,
      config: { provider: 'mock', apiKey: 'mock' },
    });

    const issue = result.issues[0];
    expect(issue.position).toBeDefined();
    expect(issue.endIndex).toBeDefined();
    expect(issue.position).toBeGreaterThanOrEqual(0);
    expect(sourceText.substring(issue.position!, issue.endIndex!)).toBe(issue.original);
  });

  it('should extract JSON correctly across markdown code fences', () => {
    const fencedJson = '```json\n{"revisedText": "Đoạn văn đúng", "issues": []}\n```';
    const extracted = extractJson(fencedJson);
    const parsed = JSON.parse(extracted);

    expect(parsed.revisedText).toBe('Đoạn văn đúng');
    expect(parsed.issues).toEqual([]);
  });

  it('should handle clean text without issues returning empty issue list', async () => {
    const cleanText =
      'Tổng công ty Công nghiệp mỏ Việt Bắc TKV-CTCP trân trọng báo cáo tình hình triển khai công tác.';
    const result = await proofreadAdministrativeText({
      text: cleanText,
      config: { provider: 'mock', apiKey: 'mock' },
    });

    expect(result.issues.length).toBe(0);
    expect(result.revisedText).toBe(cleanText);
  });

  it('should construct proofreading prompt with all 5 category explanations', () => {
    const prompt = buildProofreadingPrompt('Đoạn văn mẫu');
    expect(prompt).toContain('spelling');
    expect(prompt).toContain('grammar');
    expect(prompt).toContain('capitalization');
    expect(prompt).toContain('punctuation');
    expect(prompt).toContain('administrative_style');
  });
});
