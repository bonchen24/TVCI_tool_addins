import React, { useState } from "react";
import type { AiProviderName } from "../../ai/direct-client";
import { defaultModelFor, type StoredAiSettings } from "../../ai/settings";
import { KNOWN_MODELS } from "../../ai/model-discovery";

export interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiProvider: AiProviderName;
  onProviderChange: (provider: AiProviderName) => void;
  aiModel: string;
  onModelChange: (model: string) => void;
  aiApiKey: string;
  onApiKeyChange: (key: string) => void;
  availableModels: string[];
  recommendedModel?: string;
  onDiscoverModels: () => void;
  onSaveAiSettings: () => Promise<StoredAiSettings | void> | void;
  onClearAiSettings: () => void;
  status?: string;
  busy: boolean;
}

export function AiSettingsModal({
  isOpen,
  onClose,
  aiProvider,
  onProviderChange,
  aiModel,
  onModelChange,
  aiApiKey,
  onApiKeyChange,
  availableModels,
  recommendedModel,
  onDiscoverModels,
  onSaveAiSettings,
  onClearAiSettings,
  status,
  busy,
}: AiSettingsModalProps): React.ReactElement | null {
  const [localFeedback, setLocalFeedback] = useState("");
  if (!isOpen) return null;

  const isDialog = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dialog") === "1";
  const modelOptions = availableModels.length > 0 ? availableModels : KNOWN_MODELS[aiProvider];
  const selectedModelValue = modelOptions.includes(aiModel) ? aiModel : "__custom__";
  const recommended = recommendedModel || defaultModelFor(aiProvider);

  const handleSave = async () => {
    setLocalFeedback("");
    try {
      const saved = await onSaveAiSettings();
      if (!saved) return;
      if (isDialog) {
        if (typeof Office === "undefined" || !Office.context?.ui?.messageParent) {
          throw new Error("Không thể gửi cài đặt AI tới Task Pane.");
        }
        Office.context.ui.messageParent(JSON.stringify({ type: "ai_settings_saved", settings: saved }));
        setLocalFeedback("✓ Đã gửi yêu cầu lưu cài đặt tới Task Pane.");
      } else {
        setLocalFeedback("✓ Đã lưu cài đặt AI.");
      }
    } catch (error) {
      setLocalFeedback(`Lỗi lưu cài đặt AI: ${error instanceof Error ? error.message : "Không thể lưu cấu hình."}`);
    }
  };

  const content = (
    <div
      className={`aiSettingsModalDialog ${isDialog ? "dialogRootWindow" : "modalDialog"}`}
      style={isDialog ? { width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modalHeader">
        <div className="modalTitle">
          <span>⚙️</span> Cài đặt Kết nối AI
        </div>
        <button type="button" className="modalCloseBtn" onClick={onClose}>
          ✕
        </button>
      </div>

        <div className="modalBody">
          <div className="warning" style={{ margin: "0 0 12px", fontSize: "11px" }}>
            🔒 <strong>Bảo mật:</strong> Khóa API được lưu trữ cục bộ trên máy tính của bạn và chỉ kết nối trực tiếp đến nhà cung cấp AI khi bạn gửi yêu cầu.
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 600, fontSize: "11.5px", display: "block", marginBottom: 4 }}>
              Nhà cung cấp AI:
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="aiProvider"
                  value="gemini"
                  checked={aiProvider === "gemini"}
                  onChange={() => onProviderChange("gemini")}
                />
                Google Gemini (Khuyên dùng)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="aiProvider"
                  value="openai"
                  checked={aiProvider === "openai"}
                  onChange={() => onProviderChange("openai")}
                />
                OpenAI (ChatGPT)
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 600, fontSize: "11.5px", display: "block", marginBottom: 4 }}>
              Mô hình (Model):
            </label>
            <select
              value={selectedModelValue}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  onModelChange("");
                } else {
                  onModelChange(e.target.value);
                }
              }}
              style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: 6 }}
            >
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m} {m === recommended ? "★ (Khuyên dùng)" : ""}
                </option>
              ))}
              <option value="__custom__">-- Nhập tên mô hình khác... --</option>
            </select>
            {selectedModelValue === "__custom__" && (
              <input
                type="text"
                value={aiModel}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder="Nhập chính xác model id"
                aria-label="Model id tùy chọn"
                style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: "6px 8px", fontSize: "12px", borderRadius: 6 }}
              />
            )}
            <div style={{ marginTop: 4, fontSize: "10.5px", color: "#475569" }}>
              Khuyến nghị: <code>{recommended}</code> · Model đang chọn: <code>{aiModel || "chưa nhập"}</code>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: "11.5px" }}>Khóa API (API Key):</span>
              <a
                href={aiProvider === "gemini" ? "https://aistudio.google.com/app/apikey" : "https://platform.openai.com/api-keys"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "11px",
                  color: "#0284c7",
                  textDecoration: "underline",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
                title={`Mở trang web chính thức của ${aiProvider === "gemini" ? "Google AI Studio" : "OpenAI Platform"} để lấy khóa`}
              >
                🔗 Lấy API Key {aiProvider === "gemini" ? "Gemini (Miễn phí)" : "OpenAI"} ↗
              </a>
            </div>
            <input
              type="password"
              value={aiApiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={aiProvider === "gemini" ? "Dán khóa AIzaSy... tại đây" : "Dán khóa sk-... tại đây"}
              autoComplete="off"
              style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: "12px", borderRadius: 6 }}
            />
          </div>

          {availableModels.length > 0 && (
            <div style={{ fontSize: "11px", color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px", borderRadius: 6, marginBottom: 12 }}>
              ✓ Đã xác thực kết nối thành công! Đang có {availableModels.length} mô hình khả dụng.
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onDiscoverModels}
              disabled={busy || !aiApiKey.trim()}
              title="Kết nối API và tải danh sách các mô hình hợp lệ"
              style={{ fontSize: "11.5px", padding: "6px 12px" }}
            >
              ⚡ Kiểm tra & Lấy model
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => { void handleSave(); }}
              disabled={busy}
              style={{ fontSize: "11.5px", padding: "6px 14px", fontWeight: 600 }}
            >
              💾 Lưu cài đặt
            </button>
            <button
              type="button"
              onClick={onClearAiSettings}
              disabled={busy || !aiApiKey}
              style={{ fontSize: "11.5px", padding: "6px 10px", color: "#b91c1c" }}
            >
              🗑️ Xóa key
            </button>
          </div>

          {(localFeedback || status) && (
            <div role="status" aria-live="polite" style={{ marginTop: 10, fontSize: "11px", color: (localFeedback || status || "").toLowerCase().includes("lỗi") ? "#b91c1c" : "#166534" }}>
              {localFeedback || status}
            </div>
          )}
        </div>

        <div className="modalFooter">
          <button type="button" onClick={onClose} style={{ minWidth: 80, padding: "6px 14px" }}>
            Đóng
          </button>
        </div>
      </div>
  );

  if (isDialog) {
    return content;
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      {content}
    </div>
  );
}
