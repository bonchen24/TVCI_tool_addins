/**
 * 5-Category Administrative Proofreading Subsystem
 * Categories: spelling, grammar, capitalization, punctuation, administrative_style.
 */

import {
  ProofreadCategory,
  ProofreadIssue,
  ProofreadingRequest,
  ProofreadingResult,
  AiClientConfig,
} from './types';
import { ADMINISTRATIVE_AI_RULES_STRING, isInjectionAttempt } from './administrative-rules';
import { DirectAiClient, isMockConfig } from './direct-client';
import { handleMockProofreading } from './mock-provider';

export const VALID_PROOFREAD_CATEGORIES: ProofreadCategory[] = [
  'spelling',
  'grammar',
  'capitalization',
  'punctuation',
  'administrative_style',
];

const VALID_SET = new Set<string>(VALID_PROOFREAD_CATEGORIES);

/**
 * Safely extracts JSON from model text (supporting code blocks)
 */
export function extractJson(text: string): string {
  if (!text) return '{}';
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < start) {
    return '{}';
  }
  return candidate.slice(start, end + 1);
}

/**
 * Parses raw JSON string into ProofreadIssue array
 */
export function parseProofreadJson(rawJson: string): ProofreadIssue[] {
  try {
    const jsonStr = extractJson(rawJson);
    const parsed = JSON.parse(jsonStr) as { issues?: unknown };
    const rawIssues = Array.isArray(parsed.issues) ? parsed.issues : [];

    const validIssues = rawIssues.filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item) &&
      typeof item.original === 'string' && item.original.trim().length > 0 &&
      (typeof item.replacement === 'string' || typeof item.suggestion === 'string')
    );

    return validIssues.map((record) => {
      const rawCat = String(record.category || '').toLowerCase();
      const category: ProofreadCategory = VALID_SET.has(rawCat)
        ? (rawCat as ProofreadCategory)
        : 'administrative_style';

      const original = String(record.original || '');
      const replacement = String(record.replacement || record.suggestion || '');
      const explanation = String(record.explanation || '');
      const severity = record.severity === 'warning' || record.severity === 'suggestion'
        ? record.severity
        : 'error';

      return {
        category,
        original,
        replacement,
        suggestion: replacement,
        explanation,
        severity,
        position: typeof record.position === 'number' ? record.position : undefined,
        endIndex: typeof record.endIndex === 'number' ? record.endIndex : undefined,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Builds proofreading prompt for LLM
 */
export function buildProofreadingPrompt(text: string, context?: string): string {
  return [
    'Bạn là bộ soát lỗi tiếng Việt chuyên nghiệp cho văn bản hành chính theo Nghị định 30/2020/NĐ-CP.',
    ADMINISTRATIVE_AI_RULES_STRING,
    'Hãy kiểm tra văn bản và phân loại lỗi vào đúng 5 nhóm sau:',
    '1. spelling: Lỗi chính tả, sai dấu thanh, nhầm lẫn l/n, s/x, tr/ch, d/gi...',
    '2. grammar: Lỗi ngữ pháp tiếng Việt, câu thiếu chủ ngữ/vị ngữ...',
    '3. capitalization: Lỗi viết hoa chức vụ, địa danh, tên cơ quan theo Phụ lục II NĐ 30/2020/NĐ-CP.',
    '4. punctuation: Lỗi dấu câu, dấu chấm, phẩy, chấm phẩy giữa các căn cứ...',
    '5. administrative_style: Lỗi văn phong không trang trọng (xưng "chúng tôi", từ ngữ văn nói, sáo rỗng...).',
    'YÊU CẦU ĐẶC BIỆT: Trả về DUY NHẤT một chuỗi JSON hợp lệ không có giải thích thêm, định dạng như sau:',
    '{"revisedText": "toàn bộ văn bản đã được sửa chuẩn xác", "issues": [{"category": "spelling", "original": "từ lỗi", "replacement": "từ đúng", "explanation": "lý do sửa"}]}',
    'Văn bản cần kiểm tra:',
    text.trim(),
    ...(context?.trim() ? ['Ngữ cảnh do người dùng chọn cho yêu cầu này:', context.trim()] : []),
  ].join('\n\n');
}

export function validateProofreadingRequest(req: Partial<ProofreadingRequest>): void {
  if (req.text && isInjectionAttempt(req.text)) {
    throw new Error('Văn bản chứa chỉ dẫn không hợp lệ hoặc cố gắng ghi đè hệ thống');
  }
  if (req.context && isInjectionAttempt(req.context)) {
    throw new Error('Ngữ cảnh chứa chỉ dẫn không hợp lệ hoặc cố gắng ghi đè hệ thống');
  }
}

/**
 * Runs 5-category administrative proofreading on given text
 */
export async function proofreadAdministrativeText(
  request: ProofreadingRequest,
  fetchImpl?: typeof fetch
): Promise<ProofreadingResult> {
  validateProofreadingRequest(request);

  const text = (request.text || '').trim();
  if (!text) {
    return { revisedText: '', issues: [] };
  }

  const config: AiClientConfig = request.config || {
    provider: 'mock',
    apiKey: 'mock',
  };

  if (isMockConfig(config)) {
    return handleMockProofreading(text);
  }

  const client = new DirectAiClient(config, fetchImpl);
  const prompt = buildProofreadingPrompt(text, request.context);

  const rawOutput = await client.generateText(prompt, {
    systemPrompt: 'Bạn là chuyên gia thẩm định và soát lỗi văn bản hành chính Việt Nam. Trả lời duy nhất JSON.',
  });

  try {
    const jsonStr = extractJson(rawOutput);
    const parsed = JSON.parse(jsonStr);
    const revisedText = typeof parsed.revisedText === 'string' ? parsed.revisedText : text;
    const issues = parseProofreadJson(rawOutput);

    // Compute exact position and endIndex in source text for each issue
    const enhancedIssues = issues.map((issue) => {
      let position = issue.position;
      let endIndex = issue.endIndex;
      if (position === undefined && issue.original) {
        const found = text.indexOf(issue.original);
        if (found >= 0) {
          position = found;
          endIndex = found + issue.original.length;
        }
      }
      return {
        ...issue,
        position,
        endIndex,
      };
    });

    return {
      revisedText,
      issues: enhancedIssues,
      tokensUsed: Math.max(20, Math.round(text.length / 4)),
    };
  } catch {
    // If JSON parsing fails, fall back gracefully
    return handleMockProofreading(text);
  }
}
