import type { ChatMessage } from "./writing-workspace";

export interface ChatStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ChatConversation {
  id: string;
  title: string;
  titleMode?: "auto" | "custom";
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = "tvci.wordtools.ai.chats.v1";

function redactSensitiveTokens(text: string): string {
  return text
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g, "[API key đã ẩn]")
    .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, "[API key đã ẩn]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi, "Bearer [API key đã ẩn]");
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
}

function parseStoredConversation(value: unknown): ChatConversation | null {
  if (!value || typeof value !== "object") return null;
  const conversation = value as Partial<ChatConversation>;
  if (
    typeof conversation.id !== "string"
    || typeof conversation.title !== "string"
    || typeof conversation.createdAt !== "string"
    || typeof conversation.updatedAt !== "string"
    || !Array.isArray(conversation.messages)
    || !conversation.messages.every(isChatMessage)
  ) return null;

  return {
    id: conversation.id,
    title: redactSensitiveTokens(conversation.title),
    titleMode: conversation.titleMode === "custom" ? "custom" : "auto",
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map(({ role, content }) => ({ role, content: redactSensitiveTokens(content) })),
  };
}

export function inferChatTitle(messages: ChatMessage[]): string {
  const first = messages.find((item) => item.role === "user")?.content.trim() || "Cuộc chat mới";
  const compact = first.replace(/\s+/g, " ");
  return compact.length > 58 ? `${compact.slice(0, 55)}...` : compact;
}

export function createChatConversation(messages: ChatMessage[] = [], now = new Date().toISOString()): ChatConversation {
  const title = inferChatTitle(messages);
  const safeId = `${now.replace(/[^0-9]/g, "").slice(0, 17)}-${redactSensitiveTokens(title).toLowerCase().replace(/[^a-z0-9à-ỹ]+/gi, "-").replace(/^-|-$/g, "").slice(0, 24) || "chat"}`;
  return { id: safeId, title, titleMode: "auto", createdAt: now, updatedAt: now, messages: [...messages] };
}

export function loadChatConversations(storage: ChatStorageLike = localStorage): ChatConversation[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.map(parseStoredConversation).filter((item): item is ChatConversation => item !== null).slice(0, 30);
  } catch {
    return [];
  }
}

export function saveChatConversations(conversations: ChatConversation[], storage: ChatStorageLike = localStorage): void {
  const sanitized = conversations.slice(0, 30).map((conversation) => ({
    id: conversation.id,
    title: redactSensitiveTokens(conversation.title),
    titleMode: conversation.titleMode ?? "auto",
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map(({ role, content }) => ({ role, content: redactSensitiveTokens(content) })),
  }));
  storage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
}

export function updateChatConversation(conversation: ChatConversation, messages: ChatMessage[], now = new Date().toISOString()): ChatConversation {
  const titleMode = conversation.titleMode ?? "auto";
  return {
    ...conversation,
    title: titleMode === "custom" ? conversation.title : inferChatTitle(messages),
    titleMode,
    messages: [...messages],
    updatedAt: now,
  };
}

export function upsertChatConversation(conversations: ChatConversation[], conversation: ChatConversation): ChatConversation[] {
  return [conversation, ...conversations.filter((item) => item.id !== conversation.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 30);
}

export function renameChatConversation(
  conversations: ChatConversation[],
  id: string,
  title: string,
  now = new Date().toISOString(),
): ChatConversation[] {
  const compactTitle = title.trim().replace(/\s+/g, " ");
  if (!compactTitle) return conversations;
  const nextTitle = compactTitle.length > 58 ? `${compactTitle.slice(0, 55)}...` : compactTitle;
  return conversations
    .map((conversation) => conversation.id === id ? { ...conversation, title: nextTitle, titleMode: "custom" as const, updatedAt: now } : conversation)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 30);
}

export function deleteChatConversation(conversations: ChatConversation[], id: string): ChatConversation[] {
  return conversations.filter((item) => item.id !== id);
}

export function clearChatConversations(storage: ChatStorageLike = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}
