import type { AiAction, AiRequest } from "./direct-client";

export function buildAiRequest(action: AiAction, selectedText: string, instruction?: string): AiRequest {
  const text = selectedText.trim();
  if (!text) throw new Error("Chưa có văn bản được chọn.");
  return instruction?.trim() ? { action, text, instruction: instruction.trim() } : { action, text };
}
