import test from "node:test";
import assert from "node:assert/strict";
import { requestAiDirect } from "../src/ai/direct-client.ts";
import { defaultModelFor, loadAiSettings, saveAiSettings } from "../src/ai/settings.ts";

const request = { action: "formal" as const, text: "Đề nghị bổ sung hồ sơ." };

test("OpenAI direct client uses Responses API and bearer auth", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ choices: [{ message: { content: "Nội dung đã sửa" } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const output = await requestAiDirect({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-test" }, request, fakeFetch);
  assert.equal(output, "Nội dung đã sửa");
  assert.equal(capturedUrl, "https://api.openai.com/v1/chat/completions");
  assert.equal((capturedInit?.headers as Record<string,string>).Authorization, "Bearer sk-test");
  assert.match(String(capturedInit?.body), /gpt-4o-mini/);
});

test("Gemini direct client uses x-goog-api-key and generateContent", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Đã hiệu chỉnh" }] } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const output = await requestAiDirect({ provider: "gemini", model: "gemini-3.5-flash", apiKey: "gem-test" }, request, fakeFetch);
  assert.equal(output, "Đã hiệu chỉnh");
  assert.equal(capturedUrl, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent");
  assert.equal((capturedInit?.headers as Record<string,string>)["x-goog-api-key"], "gem-test");
});

test("AI timeout is converted to a user-safe Vietnamese error", async () => {
  const fakeFetch: typeof fetch = async () => {
    const error = new Error("request aborted");
    error.name = "AbortError";
    throw error;
  };
  await assert.rejects(
    requestAiDirect({ provider: "openai", model: "gpt-5.6-luna", apiKey: "sk-test" }, request, fakeFetch),
    /quá lâu|thời gian|timeout/i,
  );
});

test("AI settings round-trip in local storage compatible storage", () => {
  const map = new Map<string,string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  };
  saveAiSettings({ provider: "gemini", model: "gemini-3.5-flash", apiKey: "secret" }, storage);
  assert.deepEqual(loadAiSettings(storage), { provider: "gemini", model: "gemini-3.5-flash", apiKey: "secret" });
  assert.equal(defaultModelFor("openai"), "gpt-4o-mini");
});

import { requestAiPromptDirect } from "../src/ai/direct-client.ts";

test("generic direct prompt reuses provider transport for template analysis", async () => {
  let body = "";
  const fakeFetch: typeof fetch = async (_input, init) => {
    body = String(init?.body ?? "");
    return new Response(JSON.stringify({ output_text: '{"fields":[]}' }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const output = await requestAiPromptDirect({ provider: "openai", model: "gpt-5.6-luna", apiKey: "sk-test" }, "ANALYZE_TEMPLATE", fakeFetch);
  assert.equal(output, '{"fields":[]}');
  assert.match(body, /ANALYZE_TEMPLATE/);
});
