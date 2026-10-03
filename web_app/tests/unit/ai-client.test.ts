import { describe, it, expect, vi } from 'vitest';
import {
  DirectAiClient,
  normalizeAiError,
  fetchWithRetry,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_GEMINI_MODEL,
} from '@/ai/direct-client';
import { maskApiKey } from '@/ai/sanitizer';
import { AiClientConfig, AiServiceError } from '@/ai/types';

describe('AI Client Module (direct-client)', () => {
  it('should configure OpenAI client with gpt-4o-mini and 45s default timeout', () => {
    const config: AiClientConfig = {
      provider: 'openai',
      apiKey: 'sk-mock-test-key-12345',
      model: DEFAULT_OPENAI_MODEL,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      maxRetries: 2,
    };

    const client = new DirectAiClient(config);
    const resolvedConfig = client.getConfig();

    expect(resolvedConfig.provider).toBe('openai');
    expect(resolvedConfig.model).toBe('gpt-4o-mini');
    expect(resolvedConfig.timeoutMs).toBe(45000);
    expect(resolvedConfig.maxRetries).toBe(2);
  });

  it('should configure Gemini client with gemini-2.0-flash', () => {
    const config: AiClientConfig = {
      provider: 'gemini',
      apiKey: 'AIzaSyMockKeyTest',
      model: DEFAULT_GEMINI_MODEL,
      timeoutMs: 45000,
      maxRetries: 2,
    };

    const client = new DirectAiClient(config);
    const resolvedConfig = client.getConfig();

    expect(resolvedConfig.provider).toBe('gemini');
    expect(resolvedConfig.model).toBe('gemini-2.0-flash');
  });

  it('should normalize provider errors into standardized format', () => {
    expect(normalizeAiError(401).code).toBe('AUTH_ERROR');
    expect(normalizeAiError(403).code).toBe('AUTH_ERROR');
    expect(normalizeAiError(429).code).toBe('RATE_LIMIT');
    expect(normalizeAiError(408).code).toBe('TIMEOUT');
    expect(normalizeAiError(504).code).toBe('TIMEOUT');
    expect(normalizeAiError(500).code).toBe('INVALID_RESPONSE');
    expect(normalizeAiError(503).code).toBe('INVALID_RESPONSE');
  });

  it('should strip API keys from error messages before presenting to client', () => {
    const rawError = 'Request failed with key: sk-proj-1234567890abcdef1234567890';
    const sanitized = maskApiKey(rawError);
    expect(sanitized).toBe('Request failed with key: sk-***');

    const geminiError = 'Failed to connect using AIzaSyMockKey12345';
    const sanitizedGemini = maskApiKey(geminiError);
    expect(sanitizedGemini).toBe('Failed to connect using AIzaSy***');
  });

  it('should execute retry logic on transient network or 503 errors and succeed', async () => {
    let attempts = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        return new Response('503 Service Unavailable', { status: 503 });
      }
      return new Response(JSON.stringify({ text: 'Thành công sau retry' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const response = await fetchWithRetry(
      'https://example.com/api',
      { method: 'POST' },
      { timeoutMs: 5000, maxRetries: 2, fetchImpl: mockFetch as any }
    );

    expect(attempts).toBe(2);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.text).toBe('Thành công sau retry');
  });

  it('should throw AiServiceError with normalized code on 401 unauthorized', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
        status: 401,
      });
    });

    await expect(
      fetchWithRetry(
        'https://example.com/api',
        { method: 'POST' },
        { timeoutMs: 5000, maxRetries: 1, fetchImpl: mockFetch as any }
      )
    ).rejects.toThrow(AiServiceError);
  });

  it('should generate text directly using mock configuration without network calls', async () => {
    const client = new DirectAiClient({
      provider: 'mock',
      apiKey: 'mock',
    });

    const output = await client.generateText('Văn bản hành chính kiểm tra');
    expect(output).toBe('Văn bản hành chính kiểm tra');
  });
});
