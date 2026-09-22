import { requestAiPromptDirect, type AiSettings } from "../../src/ai/direct-client";
import { defaultModelFor, loadAiSettings, type StorageLike } from "../../src/ai/settings";

describe("Direct AI Client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("OpenAI client", () => {
    it("calls chat/completions endpoint for text prompts (NOT /responses)", async () => {
      let requestedUrl = "";
      let requestedBody: any = null;

      const mockFetch = jest.fn().mockImplementation(async (url: string, init: any) => {
        requestedUrl = url;
        requestedBody = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: { content: "Dự thảo công văn hoàn chỉnh." },
              },
            ],
          }),
        };
      });

      const settings: AiSettings = {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "sk-test-key",
      };

      const result = await requestAiPromptDirect(settings, "Soạn thảo công văn gửi khách hàng", mockFetch as any);

      expect(requestedUrl).toBe("https://api.openai.com/v1/chat/completions");
      expect(requestedBody.model).toBe("gpt-4o-mini");
      expect(requestedBody.messages).toEqual([
        { role: "user", content: "Soạn thảo công văn gửi khách hàng" },
      ]);
      expect(result).toBe("Dự thảo công văn hoàn chỉnh.");
    });
  });

  describe("Gemini client", () => {
    it("sends the selected Gemini model id unchanged and strips only the models/ prefix", async () => {
      let requestedUrl = "";

      const mockFetch = jest.fn().mockImplementation(async (url: string) => {
        requestedUrl = url;
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Bản dự thảo từ Gemini." }],
                },
              },
            ],
          }),
        };
      });

      const settings: AiSettings = {
        provider: "gemini",
        model: "models/gemini-2.5-flash",
        apiKey: "gm-test-key",
      };

      const result = await requestAiPromptDirect(settings, "Soạn thảo biên bản", mockFetch as any);

      expect(requestedUrl).toContain("models/gemini-2.5-flash:generateContent");
      expect(result).toBe("Bản dự thảo từ Gemini.");
    });

    it("throws informative error when safety block reason occurs", async () => {
      const mockFetch = jest.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "SAFETY",
              content: { parts: [] },
            },
          ],
        }),
      }));

      const settings: AiSettings = {
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKey: "gm-test-key",
      };

      await expect(
        requestAiPromptDirect(settings, "Soạn thảo tài liệu", mockFetch as any)
      ).rejects.toThrow("SAFETY");
    });

    it("retries a transient 503 and succeeds when Gemini recovers", async () => {
      let attempts = 0;
      const mockFetch = jest.fn().mockImplementation(async () => {
        attempts += 1;
        if (attempts === 1) return { ok: false, status: 503, json: async () => ({}) };
        return {
          ok: true,
          json: async () => ({ candidates: [{ content: { parts: [{ text: "Đã thử lại thành công." }] } }] }),
        };
      });

      const result = await requestAiPromptDirect(
        { provider: "gemini", model: "gemini-flash-latest", apiKey: "gm-test-key" },
        "Soạn thảo tài liệu",
        mockFetch as any,
      );

      expect(attempts).toBe(2);
      expect(result).toBe("Đã thử lại thành công.");
    });

    it("returns a safe Vietnamese message when Gemini remains unavailable", async () => {
      const mockFetch = jest.fn().mockImplementation(async () => ({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: "high demand" } }),
        clone: undefined,
        headers: new Headers({ "retry-after": "0" }),
      }));

      await expect(
        requestAiPromptDirect(
          { provider: "gemini", model: "gemini-flash-latest", apiKey: "gm-test-key" },
          "Soạn thảo tài liệu",
          mockFetch as any,
        ),
      ).rejects.toThrow("đang quá tải tạm thời");
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("does not hammer Gemini again when 429 has no retry delay", async () => {
      const mockFetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Resource has been exhausted (e.g. check quota).",
          details: [{
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            violations: [{ quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests" }],
          }],
        },
      }), { status: 429, headers: { "Content-Type": "application/json" } }));

      await expect(
        requestAiPromptDirect(
          { provider: "gemini", model: "gemini-flash-latest", apiKey: "gm-test-key" },
          "Soạn thảo tài liệu",
          mockFetch as any,
        ),
      ).rejects.toThrow("đã chạm hạn mức quota");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("honors an explicit Gemini RetryInfo once for a rate limit", async () => {
      let attempts = 0;
      const mockFetch = jest.fn().mockImplementation(async () => {
        attempts += 1;
        if (attempts === 1) return new Response(JSON.stringify({
          error: {
            status: "RESOURCE_EXHAUSTED",
            details: [{
              "@type": "type.googleapis.com/google.rpc.RetryInfo",
              retryDelay: "0s",
            }],
          },
        }), { status: 429 });
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Đã thử lại." }] } }] }), { status: 200 });
      });

      await expect(requestAiPromptDirect(
        { provider: "gemini", model: "gemini-flash-latest", apiKey: "gm-test-key" },
        "Soạn thảo tài liệu",
        mockFetch as any,
      )).resolves.toBe("Đã thử lại.");
      expect(attempts).toBe(2);
    });
  });

  describe("AI Settings & Default Models", () => {
    it("provides gemini-2.0-flash as default model for gemini", () => {
      expect(defaultModelFor("gemini")).toBe("gemini-2.0-flash");
      expect(defaultModelFor("openai")).toBe("gpt-4o-mini");
    });

    it("preserves a stored newer Gemini model in loadAiSettings", () => {
      const store: Record<string, string> = {
        "tvci.wordtools.ai.settings.v1": JSON.stringify({
          provider: "gemini",
          model: "gemini-2.5-flash",
          apiKey: "my-key",
        }),
      };
      const mockStorage: StorageLike = {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => { store[k] = v; },
        removeItem: (k) => { delete store[k]; },
      };

      const loaded = loadAiSettings(mockStorage);
      expect(loaded.model).toBe("gemini-2.5-flash");
    });

    it("uses Gemini as the fresh settings fallback", () => {
      const mockStorage: StorageLike = {
        getItem: () => null,
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };

      expect(loadAiSettings(mockStorage)).toEqual({
        provider: "gemini",
        model: defaultModelFor("gemini"),
        apiKey: "",
      });
    });
  });
});
