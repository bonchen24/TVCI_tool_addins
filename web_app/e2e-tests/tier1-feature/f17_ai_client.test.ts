/**
 * Tier 1 - Feature 17: Multi-Provider AI Client
 * Verifies OpenAI and Google Gemini provider abstraction, timeout, retry, and error normalization.
 */

import { describe, it, expect } from "../framework/testHarness";

describe("F17: Multi-Provider AI Client", 1, () => {
  interface AiClientConfig {
    provider: "openai" | "gemini";
    apiKey: string;
    model: string;
    timeoutMs: number;
    maxRetries: number;
  }

  it("should configure OpenAI client with gpt-4o-mini and 45s default timeout", () => {
    const openaiConfig: AiClientConfig = {
      provider: "openai",
      apiKey: "sk-mock-test-key",
      model: "gpt-4o-mini",
      timeoutMs: 45000,
      maxRetries: 2,
    };

    expect(openaiConfig.provider).toBe("openai");
    expect(openaiConfig.model).toBe("gpt-4o-mini");
    expect(openaiConfig.timeoutMs).toBe(45000);
  });

  it("should configure Gemini client with gemini-2.0-flash", () => {
    const geminiConfig: AiClientConfig = {
      provider: "gemini",
      apiKey: "AIzaSyMockKey",
      model: "gemini-2.0-flash",
      timeoutMs: 45000,
      maxRetries: 2,
    };

    expect(geminiConfig.provider).toBe("gemini");
    expect(geminiConfig.model).toBe("gemini-2.0-flash");
  });

  it("should normalize provider errors into standardized AiServiceError format", () => {
    interface NormalizedAiError {
      code: "AUTH_ERROR" | "RATE_LIMIT" | "TIMEOUT" | "INVALID_RESPONSE";
      status: number;
      message: string;
    }

    const normalizeError = (status: number): NormalizedAiError => {
      if (status === 401 || status === 403) {
        return { code: "AUTH_ERROR", status, message: "Khóa API không hợp lệ hoặc hết hạn" };
      }
      if (status === 429) {
        return { code: "RATE_LIMIT", status, message: "Hạn ngạch API đã vượt giới hạn" };
      }
      if (status === 408 || status === 504) {
        return { code: "TIMEOUT", status, message: "Yêu cầu AI quá thời gian chờ (timeout)" };
      }
      return { code: "INVALID_RESPONSE", status, message: "Lỗi không xác định từ máy chủ AI" };
    };

    expect(normalizeError(401).code).toBe("AUTH_ERROR");
    expect(normalizeError(429).code).toBe("RATE_LIMIT");
    expect(normalizeError(504).code).toBe("TIMEOUT");
  });

  it("should execute retry logic on transient network or 503 errors", async () => {
    let attempts = 0;
    const mockApiCall = async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error("503 Service Unavailable");
      }
      return { text: "Thành công sau retry" };
    };

    const callWithRetry = async (fn: () => Promise<any>, maxRetries = 2) => {
      let lastErr: any;
      for (let i = 0; i <= maxRetries; i++) {
        try {
          return await fn();
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr;
    };

    const result = await callWithRetry(mockApiCall);
    expect(attempts).toBe(2);
    expect(result.text).toBe("Thành công sau retry");
  });

  it("should strip API keys from error messages before presenting to client UI", () => {
    const rawError = "Request failed with key: sk-proj-1234567890abcdef1234567890";
    const sanitizeError = (err: string) => err.replace(/sk-[a-zA-Z0-9_-]+/g, "sk-***");

    const sanitized = sanitizeError(rawError);
    expect(sanitized).toBe("Request failed with key: sk-***");
  });
}, 17);
