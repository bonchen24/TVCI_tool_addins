import test from "node:test";
import assert from "node:assert/strict";
import { createChatConversation, loadChatConversations, saveChatConversations, upsertChatConversation, updateChatConversation, type ChatConversation } from "../src/ai/chat-history.ts";
import { renameChatConversation } from "../src/ai/chat-history.ts";
import fs from "node:fs";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

test("chat history persists conversations without any API settings", () => {
  const storage = new MemoryStorage();
  const conversation = createChatConversation([{ role: "user", content: "Soạn công văn trả lời Công ty ABC" }], "2026-09-15T01:00:00.000Z");
  saveChatConversations([conversation], storage);
  const raw = [...storage.data.values()].join(" ");
  assert.doesNotMatch(raw, /apiKey|sk-|AIza/);
  assert.deepEqual(loadChatConversations(storage), [conversation]);
});

test("chat history ignores conversations with malformed message payloads", () => {
  const storage = new MemoryStorage();
  storage.setItem("tvci.wordtools.ai.chats.v1", JSON.stringify([
    {
      id: "bad",
      title: "Dữ liệu lỗi",
      createdAt: "2026-09-15T01:00:00.000Z",
      updatedAt: "2026-09-15T01:00:00.000Z",
      messages: [{ role: "assistant", content: 42 }],
    },
    {
      id: "good",
      title: "Cuộc chat hợp lệ",
      createdAt: "2026-09-15T01:00:00.000Z",
      updatedAt: "2026-09-15T01:00:00.000Z",
      messages: [{ role: "user", content: "Soạn báo cáo" }],
    },
  ]));

  assert.deepEqual(loadChatConversations(storage).map((item) => item.id), ["good"]);
});

test("chat history redacts pasted API key patterns before local persistence", () => {
  const storage = new MemoryStorage();
  const conversation = createChatConversation([
    { role: "user", content: "OpenAI sk-proj-abcdefghijklmnopqrstuvwxyz1234567890" },
    { role: "assistant", content: "Gemini AIza1234567890abcdefghijklmnopqrstuvwxyz" },
  ], "2026-09-15T01:00:00.000Z");
  saveChatConversations([conversation], storage);
  const raw = [...storage.data.values()].join(" ");
  assert.doesNotMatch(raw, /sk-proj-abcdefghijklmnopqrstuvwxyz1234567890/);
  assert.doesNotMatch(raw, /AIza1234567890abcdefghijklmnopqrstuvwxyz/);
  assert.match(raw, /API key đã ẩn/);
});

test("chat conversation title is inferred from first user message and upsert keeps newest first", () => {
  const a = createChatConversation([{ role: "user", content: "Soạn công văn trả lời Công ty ABC về hồ sơ thử nghiệm" }], "2026-09-15T01:00:00.000Z");
  assert.match(a.title, /Công ty ABC/i);
  const b: ChatConversation = { ...a, id: "b", title: "Khác", updatedAt: "2026-09-15T02:00:00.000Z" };
  const result = upsertChatConversation([a], b);
  assert.equal(result[0].id, "b");
});

test("chat conversation can be renamed without changing its messages", () => {
  const conversation = createChatConversation([{ role: "user", content: "Soạn báo cáo" }], "2026-09-15T01:00:00.000Z");
  const result = renameChatConversation([conversation], conversation.id, "  Báo cáo   tháng 9  ", "2026-09-15T03:00:00.000Z");

  assert.equal(result[0].title, "Báo cáo tháng 9");
  assert.equal(result[0].updatedAt, "2026-09-15T03:00:00.000Z");
  assert.deepEqual(result[0].messages, conversation.messages);
});

test("manual chat title remains stable when new messages are added", () => {
  const conversation = createChatConversation([{ role: "user", content: "Soạn báo cáo" }], "2026-09-15T01:00:00.000Z");
  const renamed = renameChatConversation([conversation], conversation.id, "Báo cáo tháng 9", "2026-09-15T02:00:00.000Z")[0];
  const updated = updateChatConversation(renamed, [
    ...renamed.messages,
    { role: "user", content: "Bổ sung phần kiến nghị cho lãnh đạo" },
    { role: "assistant", content: "Dự thảo phần kiến nghị" },
  ], "2026-09-15T03:00:00.000Z");

  assert.equal(updated.title, "Báo cáo tháng 9");
  assert.equal(updated.messages.length, 3);
});

test("chat history UI exposes rename and delete actions for individual conversations", () => {
  const appSource = fs.readFileSync("src/taskpane/App.tsx", "utf8");
  assert.match(appSource, /handleRenameConversation/);
  assert.match(appSource, /handleDeleteConversation/);
  assert.match(appSource, /đổi tên/i);
  assert.match(appSource, /Xóa/);
});

test("clearing all chat history requires an explicit confirmation", () => {
  const appSource = fs.readFileSync("src/taskpane/App.tsx", "utf8");
  const start = appSource.indexOf("const handleClearStoredChats");
  const end = appSource.indexOf("const handleAnalyzeTemplateFill");
  assert.match(appSource.slice(start, end), /window\.confirm/);
});
