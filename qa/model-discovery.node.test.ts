import test from "node:test";
import assert from "node:assert/strict";
import { chooseConfiguredModel, discoverAvailableModels, pickPreferredModel } from "../src/ai/model-discovery.ts";

test("discovers OpenAI models and prefers a general text model", async () => {
  const fakeFetch: typeof fetch = async (input, init) => {
    assert.equal(String(input), "https://api.openai.com/v1/models");
    assert.equal((init?.headers as Record<string,string>).Authorization, "Bearer sk-test");
    return new Response(JSON.stringify({ data: [
      { id: "text-embedding-3-small" },
      { id: "gpt-5.6-luna" },
      { id: "gpt-image-2.5-flare" },
      { id: "gpt-5.6-sol" }
    ]}), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await discoverAvailableModels("openai", "sk-test", fakeFetch);
  assert.deepEqual(result.models, ["gpt-5.6-luna", "gpt-5.6-sol"]);
  assert.equal(result.recommended, "gpt-5.6-luna");
});

test("discovers Gemini models and keeps only generateContent-capable models", async () => {
  const fakeFetch: typeof fetch = async (input, init) => {
    assert.equal(String(input), "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000");
    assert.equal((init?.headers as Record<string,string>)["x-goog-api-key"], "gem-test");
    return new Response(JSON.stringify({ models: [
      { name: "models/gemini-3.6-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-embedding-001", supportedGenerationMethods: ["embedContent"] },
      { name: "models/gemini-3.5-flash-lite", supportedActions: ["generateContent"] }
    ]}), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await discoverAvailableModels("gemini", "gem-test", fakeFetch);
  assert.deepEqual(result.models.sort(), ["gemini-3.6-flash", "gemini-3.5-flash-lite"].sort());
  assert.ok(result.recommended);
});

test("preferred model falls back to first available model", () => {
  assert.equal(pickPreferredModel("openai", ["gpt-4.1-mini", "gpt-4o-mini"]), "gpt-4o-mini");
  assert.equal(pickPreferredModel("gemini", []), "");
});

test("saving AI settings keeps the selected discovered model", () => {
  assert.equal(chooseConfiguredModel("gpt-5.6-sol", ["gpt-5.6-luna", "gpt-5.6-sol"], "gpt-5.6-luna"), "gpt-5.6-sol");
  assert.equal(chooseConfiguredModel("model-khong-ton-tai", ["gpt-5.6-luna"], "gpt-5.6-luna"), "gpt-5.6-luna");
});

test("model discovery timeout is converted to a user-safe error", async () => {
  const fakeFetch: typeof fetch = async () => {
    const error = new Error("request aborted");
    error.name = "AbortError";
    throw error;
  };
  await assert.rejects(
    discoverAvailableModels("gemini", "gem-test", fakeFetch),
    /quá lâu|thời gian|timeout/i,
  );
});
