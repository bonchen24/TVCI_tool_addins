/**
 * Contextual Administrative Drafting Subsystem
 * Strictly conforms to Nghị định 30/2020/NĐ-CP & TVCI standards.
 */

import {
  DraftingRequest,
  DraftingResult,
  AiClientConfig,
} from './types';
import {
  ADMINISTRATIVE_AI_RULES_STRING,
  isInjectionAttempt,
} from './administrative-rules';
import { sanitizeAiOutput } from './sanitizer';
import { DirectAiClient, isMockConfig } from './direct-client';
import { handleMockDrafting } from './mock-provider';

/**
 * Builds standard administrative prompt for drafting
 */
export function buildDraftingPrompt(req: DraftingRequest): string {
  const lines: string[] = [
    `Loại văn bản: ${req.docType}`,
    `Phần cần soạn: ${req.section}`,
    `Bối cảnh tài liệu: ${req.context || 'Không có'}`,
    `Yêu cầu người dùng: ${req.userPrompt}`,
    `Quy chuẩn: Viết văn phong hành chính trang trọng, ngắn gọn, chuẩn Nghị định 30/2020/NĐ-CP.`,
  ];
  return lines.join('\n');
}

/**
 * Validates drafting request parameters
 */
export function validateDraftingRequest(req: Partial<DraftingRequest>): void {
  if (!req.userPrompt || req.userPrompt.trim().length === 0) {
    throw new Error('Yêu cầu soạn thảo không được để trống');
  }

  if (isInjectionAttempt(req.userPrompt)) {
    throw new Error('Yêu cầu chứa chỉ dẫn không hợp lệ hoặc cố gắng ghi đè hệ thống');
  }

  if (req.context && isInjectionAttempt(req.context)) {
    throw new Error('Bối cảnh chứa chỉ dẫn không hợp lệ hoặc cố gắng ghi đè hệ thống');
  }
}

/**
 * Generates an administrative draft
 */
export async function generateAdministrativeDraft(
  request: DraftingRequest,
  fetchImpl?: typeof fetch
): Promise<DraftingResult> {
  validateDraftingRequest(request);

  const config: AiClientConfig = request.config || {
    provider: 'mock',
    apiKey: 'mock',
  };

  // If mock configuration, return deterministic mock draft
  if (isMockConfig(config)) {
    return handleMockDrafting(request);
  }

  const prompt = buildDraftingPrompt(request);
  const client = new DirectAiClient(config, fetchImpl);

  const rawResult = await client.generateText(prompt, {
    systemPrompt: `Bạn là trợ lý AI chuyên nghiệp soạn thảo văn bản hành chính Việt Nam theo Nghị định 30/2020/NĐ-CP cho TVCI.\n${ADMINISTRATIVE_AI_RULES_STRING}`,
  });

  const content = sanitizeAiOutput(rawResult);
  const paragraphs = content.split('\n').filter((p) => p.trim().length > 0);
  const tokensUsed = Math.max(15, Math.round(content.length / 4));

  return {
    content,
    paragraphs,
    tokensUsed,
    model: config.model || (config.provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'),
  };
}
