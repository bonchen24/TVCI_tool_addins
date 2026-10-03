/**
 * Direct Multi-Provider AI Client (OpenAI & Google Gemini)
 * Pure TypeScript using native Fetch, AbortController, and transient retry.
 */

import {
  AiClientConfig,
  AiErrorCode,
  AiServiceError,
  NormalizedAiError,
} from './types';
import { maskApiKey, sanitizeAiOutput } from './sanitizer';

export const DEFAULT_TIMEOUT_MS = 45_000;
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

const TRANSIENT_STATUS_CODES = new Set([408, 500, 502, 503, 504]);

interface ErrorDetails {
  name?: string;
  message?: string;
  code?: string;
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) return error;
  if (typeof error === 'object' && error !== null) return error as ErrorDetails;
  return {};
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Normalizes HTTP status code into standardized AiServiceError format
 */
export function normalizeAiError(status: number, message?: string): NormalizedAiError {
  let code: AiErrorCode = 'INVALID_RESPONSE';
  let defaultMessage = 'Lỗi không xác định từ máy chủ AI';

  if (status === 401 || status === 403) {
    code = 'AUTH_ERROR';
    defaultMessage = 'Khóa API không hợp lệ hoặc hết hạn';
  } else if (status === 429) {
    code = 'RATE_LIMIT';
    defaultMessage = 'Hạn ngạch API đã vượt giới hạn';
  } else if (status === 408 || status === 504) {
    code = 'TIMEOUT';
    defaultMessage = 'Yêu cầu AI quá thời gian chờ (timeout)';
  }

  const finalMsg = message ? maskApiKey(message) : defaultMessage;
  return {
    code,
    status,
    message: finalMsg,
  };
}

/**
 * Determines whether the given configuration should execute via hermetic mock
 */
export function isMockConfig(config?: Partial<AiClientConfig>): boolean {
  if (!config) return false;
  if (config.provider === 'mock') return true;
  if (config.apiKey === 'mock') return true;
  if (typeof config.apiKey === 'string') {
    if (config.apiKey.startsWith('sk-mock')) return true;
    if (config.apiKey.startsWith('AIzaSyMock')) return true;
  }
  if (typeof process !== 'undefined' && process.env?.MOCK_AI === 'true') {
    return true;
  }
  return false;
}

/**
 * Executes a fetch request with timeout and transient error retry logic
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const fetchImpl = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch : undefined);

  if (!fetchImpl) {
    throw new Error('Môi trường không hỗ trợ fetch.');
  }

  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        return response;
      }

      lastResponse = response;

      // Check if status is transient retryable
      if (TRANSIENT_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 4000);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }

      // Non-retryable error
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = response.statusText;
      }

      const normalized = normalizeAiError(
        response.status,
        `HTTP ${response.status}: ${errorBody.slice(0, 300)}`
      );
      throw new AiServiceError(normalized.code, normalized.status, normalized.message);
    } catch (err: unknown) {
      clearTimeout(timer);
      lastError = err;
      const details = getErrorDetails(err);

      if (err instanceof AiServiceError) {
        throw err;
      }

      // Check if abort timeout
      if (details.name === 'AbortError' || details.message?.toLowerCase().includes('timeout')) {
        const normalized = normalizeAiError(504, 'Yêu cầu AI quá thời gian chờ (timeout)');
        throw new AiServiceError(normalized.code, normalized.status, normalized.message, err);
      }

      // Network error or 503 error
      const isTransientErr =
        details.message?.includes('503') ||
        details.message?.includes('network') ||
        details.code === 'ECONNRESET';

      if (isTransientErr && attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 4000);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }

      const maskedMsg = maskApiKey(details.message || 'Lỗi mạng khi kết nối dịch vụ AI');
      throw new AiServiceError('INVALID_RESPONSE', 500, maskedMsg, err);
    }
  }

  if (lastResponse) {
    const normalized = normalizeAiError(lastResponse.status, `HTTP ${lastResponse.status}`);
    throw new AiServiceError(normalized.code, normalized.status, normalized.message);
  }

  throw lastError || new Error('Yêu cầu AI thất bại sau nhiều lần thử lại');
}

/**
 * Direct client class managing multi-provider calls
 */
export class DirectAiClient {
  private config: AiClientConfig;
  private fetchImpl: typeof fetch;

  constructor(config: AiClientConfig, fetchImpl?: typeof fetch) {
    this.config = {
      ...config,
      apiKey: (config?.apiKey || '').trim(),
      timeoutMs: config?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: config?.maxRetries ?? DEFAULT_MAX_RETRIES,
    };
    this.fetchImpl = fetchImpl || fetch;
  }

  public getConfig(): AiClientConfig {
    return { ...this.config };
  }

  /**
   * Generates text via the configured provider
   */
  public async generateText(prompt: string, options: { systemPrompt?: string } = {}): Promise<string> {
    if (!prompt || !prompt.trim()) {
      throw new Error('Prompt không được để trống.');
    }

    if (isMockConfig(this.config)) {
      return sanitizeAiOutput(prompt);
    }

    if (this.config.provider === 'openai') {
      return this.callOpenAi(prompt, options.systemPrompt);
    } else if (this.config.provider === 'gemini') {
      return this.callGemini(prompt, options.systemPrompt);
    }

    throw new Error(`Nhà cung cấp AI không được hỗ trợ: ${this.config.provider}`);
  }

  private async callOpenAi(prompt: string, systemPrompt?: string): Promise<string> {
    const model = this.config.model || DEFAULT_OPENAI_MODEL;
    const apiKey = (this.config.apiKey || '').trim();

    if (!apiKey) {
      const err = normalizeAiError(401, 'Chưa cấu hình OpenAI API key.');
      throw new AiServiceError(err.code, err.status, err.message);
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetchWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
      },
      {
        timeoutMs: this.config.timeoutMs,
        maxRetries: this.config.maxRetries,
        fetchImpl: this.fetchImpl,
      }
    );

    const data = await response.json() as OpenAiChatResponse;
    const rawText = data.choices?.[0]?.message?.content;
    return sanitizeAiOutput(typeof rawText === 'string' ? rawText : '');
  }

  private async callGemini(prompt: string, systemPrompt?: string): Promise<string> {
    const rawModel = this.config.model || DEFAULT_GEMINI_MODEL;
    const model = rawModel.replace(/^models\//, '');
    const apiKey = (this.config.apiKey || '').trim();

    if (!apiKey) {
      const err = normalizeAiError(401, 'Chưa cấu hình Google Gemini API key.');
      throw new AiServiceError(err.code, err.status, err.message);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const contents: GeminiContent[] = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Đã hiểu và tuân thủ các quy tắc.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({ contents }),
      },
      {
        timeoutMs: this.config.timeoutMs,
        maxRetries: this.config.maxRetries,
        fetchImpl: this.fetchImpl,
      }
    );

    const data = await response.json() as GeminiResponse;
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return sanitizeAiOutput(typeof rawText === 'string' ? rawText : '');
  }
}
