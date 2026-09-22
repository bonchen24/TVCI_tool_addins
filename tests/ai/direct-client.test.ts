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
