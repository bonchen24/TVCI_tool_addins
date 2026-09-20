import React from "react";
import type { AiProviderName } from "../../ai/direct-client";
import { defaultModelFor } from "../../ai/settings";
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
  onDiscoverModels: () => void;
  onSaveAiSettings: () => void;
  onClearAiSettings: () => void;
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
  onDiscoverModels,
  onSaveAiSettings,
  onClearAiSettings,
  busy,
}: AiSettingsModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  const isDialog = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dialog") === "1";

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
              value={aiModel}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  const custom = window.prompt("Nhập tên model tùy chọn (ví dụ: gemini-2.0-flash):", aiModel);
                  if (custom && custom.trim()) onModelChange(custom.trim());
                } else {
                  onModelChange(e.target.value);
                }
              }}
              style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: 6 }}
            >
              {(availableModels.length > 0 ? availableModels : KNOWN_MODELS[aiProvider]).map((m) => (
                <option key={m} value={m}>
                  {m} {m === defaultModelFor(aiProvider) ? "★ (Khuyên dùng)" : ""}
                </option>
              ))}
              <option value="__custom__">-- Nhập tên mô hình khác... --</option>
            </select>
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
              onClick={onSaveAiSettings}
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
