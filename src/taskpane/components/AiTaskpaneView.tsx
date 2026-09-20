import React, { useState, useRef, useEffect, useMemo } from "react";
import type { ChatMessage, WritingStyleId } from "../../ai/writing-workspace";
import type { AiAttachment } from "../../ai/attachment.service";
import type { DocumentSettings } from "../../models/document-settings";
import type { TemplateRecord } from "../../templates/library";
import type { TemplateFormSchema } from "../../templates/form-schema";
import { getTemplateFormSchema } from "../../templates/form-schema";
import { readSelection } from "../../word/selection.service";
import { readTaggedContentControls } from "../../word/content-control.service";

export interface ActiveContextInfo {
  docType: string;
  templateId?: string;
  templateName?: string;
  department: string;
  organization: string;
}

export const QUICK_PROMPTS = [
  { id: "rewrite", label: "Viết lại", prompt: "Hãy viết lại đoạn văn sau trang trọng, chuẩn thể thức hành chính:" },
  { id: "proofread", label: "Soát lỗi chính tả", prompt: "Hãy soát lỗi chính tả, ngữ pháp và thể thức cho đoạn văn sau:" },
  { id: "shorten", label: "Rút gọn", prompt: "Hãy rút gọn, cô đọng nội dung sau nhưng giữ nguyên đầy đủ ý chính:" },
  { id: "expand", label: "Mở rộng", prompt: "Hãy mở rộng, diễn giải chi tiết và bổ sung lập luận cho nội dung sau:" },
  { id: "admin", label: "Chuẩn NĐ30", prompt: "Hãy chuẩn hóa theo chuẩn thể thức và thuật ngữ hành chính nhà nước (Nghị định 30):" },
];

export const REFINE_OPTIONS = [
  { id: "formal", label: "Trang trọng hơn", prompt: "Hãy viết lại theo văn phong trang trọng, chuẩn mực hơn:" },
  { id: "concise", label: "Ngắn gọn hơn", prompt: "Hãy rút gọn, cô đọng nội dung nhưng vẫn giữ đầy đủ ý chính:" },
  { id: "detailed", label: "Chi tiết hơn", prompt: "Hãy diễn giải chi tiết, bổ sung dẫn chứng và lập luận cho nội dung:" },
  { id: "admin", label: "Văn phong hành chính", prompt: "Hãy chuẩn hóa theo chuẩn thể thức và thuật ngữ hành chính nhà nước (Nghị định 30):" },
  { id: "accessible", label: "Dễ hiểu hơn", prompt: "Hãy diễn đạt lại nội dung thật mạch lạc, dễ hiểu, tự nhiên:" },
  { id: "preserve_meaning", label: "Giữ nguyên ý viết lại", prompt: "Hãy viết lại theo cách diễn đạt khác nhưng giữ nguyên 100% ý nghĩa và dữ liệu:" },
];

export const PRESET_OPTIONS: Record<string, string[]> = {
  DIA_DANH: [
    "Hà Nội",
    "Quảng Ninh",
    "Cẩm Phả",
    "Uông Bí",
    "Hạ Long",
    "Thái Nguyên",
    "Lạng Sơn",
  ],
  CHUC_VU_NGUOI_KY: [
    "GIÁM ĐỐC",
    "PHÓ GIÁM ĐỐC",
    "VIỆN TRƯỞNG",
    "PHÓ VIỆN TRƯỞNG",
    "TRƯỞNG PHÒNG",
    "PHÓ TRƯỞNG PHÒNG",
    "BÍ THƯ",
    "PHÓ BÍ THƯ",
  ],
  NOI_NHAN: [
    "- Như trên;\n- Lưu: VT, TCHC.",
    "- Như trên;\n- Ban Giám đốc (để b/c);\n- Lưu: VT, KHTH.",
    "- Tổng Giám đốc Tập đoàn (để b/c);\n- Ban Kỹ thuật - Công nghệ TKV;\n- Lưu: VT.",
    "- Ban Thường vụ Đảng ủy;\n- Các chi bộ trực thuộc;\n- Lưu: VT.",
  ],
  CAN_CU: [
    "Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ về công tác văn thư;",
    "Căn cứ Quyết định số 123/QĐ-IEMM về việc ban hành Quy chế làm việc của Viện Cơ khí Năng lượng và Mỏ - Vinacomin;",
    "Căn cứ Quy định số 05-QĐi/TW ngày 28/8/2020 của Ban Bí thư về thể thức văn bản của Đảng;",
    "Căn cứ Hợp đồng dịch vụ thử nghiệm, kiểm định an toàn đã ký kết giữa hai bên;",
  ],
  KINH_GUI: [
    "Tổng Giám đốc Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam;",
    "Ban Lãnh đạo Viện Cơ khí Năng lượng và Mỏ - Vinacomin;",
    "Ban Giám đốc Trung tâm Thử nghiệm - Kiểm định Công nghiệp;",
    "Các phòng, ban, phân xưởng trực thuộc;",
  ],
};

const DEFAULT_FORM_FIELDS = [
  { tag: "SO_KY_HIEU", label: "Số và ký hiệu", placeholder: "Ví dụ: 125/TVCI-KĐ", type: "text" },
  { tag: "DIA_DANH", label: "Địa danh", placeholder: "Ví dụ: Quảng Ninh", type: "text" },
  { tag: "NGAY_BAN_HANH", label: "Ngày ban hành", placeholder: "Ví dụ: 20/09/2026", type: "date" },
  { tag: "TRICH_YEU", label: "Trích yếu nội dung", placeholder: "V/v thực hiện kiểm định an toàn thiết bị...", type: "textarea" },
  { tag: "KINH_GUI", label: "Kính gửi", placeholder: "Kính gửi các cơ quan, đơn vị...", type: "textarea" },
  { tag: "CAN_CU", label: "Căn cứ ban hành", placeholder: "Căn cứ các văn bản, quy định...", type: "textarea" },
  { tag: "NOI_DUNG", label: "Nội dung văn bản", placeholder: "Nội dung chi tiết của văn bản...", type: "textarea" },
  { tag: "CHUC_VU_NGUOI_KY", label: "Chức vụ người ký", placeholder: "GIÁM ĐỐC", type: "text" },
  { tag: "NGUOI_KY", label: "Họ và tên người ký", placeholder: "Họ và tên", type: "text" },
  { tag: "NOI_NHAN", label: "Nơi nhận", placeholder: "- Như trên;\n- Lưu: VT.", type: "textarea" },
];

export interface AiTaskpaneViewProps {
  documentSettings: DocumentSettings;
  activeTemplate?: TemplateRecord | null;
  onOpenAiSettings: () => void;
  onOpenTemplateLibrary?: () => void;
  messages: ChatMessage[];
  busy: boolean;
  onSendMessage: (text: string, style: WritingStyleId, attachment?: AiAttachment) => Promise<void>;
  onNewConversation: () => void;
  conversations?: any[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onApplyText: (text: string) => Promise<void>;
  onReplaceSelection: (text: string) => Promise<void>;
  onInsertBelow: (text: string) => Promise<void>;
  onCopyText: (text: string) => Promise<void>;
  onSaveToKnowledge: (text: string) => void;
  onRollback: () => void;
  onApplyFieldsToForm?: (fields: Record<string, string>) => Promise<void>;
  onStandardizeQuick?: () => Promise<void> | void;
  onApplyA4Quick?: () => Promise<void> | void;
  onCheckQuick?: () => Promise<void> | void;
  onRefineMessage?: (msgIndex: number, instructionPrompt: string, currentText: string) => Promise<string>;
  onVersionChange?: (text: string) => void;
  hasSelection: boolean;
  selectionWordCount: number;
}

export function AiTaskpaneView({
  documentSettings,
  activeTemplate,
  onOpenAiSettings,
  onOpenTemplateLibrary,
  messages,
  busy,
  onSendMessage,
  onNewConversation,
  onApplyText,
  onReplaceSelection,
  onInsertBelow,
  onCopyText,
  onSaveToKnowledge,
  onRollback,
  onApplyFieldsToForm,
  onStandardizeQuick,
  onApplyA4Quick,
  onCheckQuick,
  hasSelection,
  selectionWordCount,
}: AiTaskpaneViewProps): React.ReactElement {
  // Selection AI States
  const [selectedText, setSelectedText] = useState("");
  const [selectionPrompt, setSelectionPrompt] = useState("");
  const [isReadingSelection, setIsReadingSelection] = useState(false);
  const [aiRevisedText, setAiRevisedText] = useState("");
  const [copiedStatus, setCopiedStatus] = useState(false);

  // Form Fields State (Parallel editing)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<string>("");

  // Determine active schema
  const activeSchema: TemplateFormSchema | null = useMemo(() => {
    if (activeTemplate) return getTemplateFormSchema(activeTemplate);
    return null;
  }, [activeTemplate]);

  // Fields to display
  const displayFields = useMemo(() => {
    if (activeSchema && activeSchema.fields.length > 0) {
      return activeSchema.fields.map((f) => ({
        tag: f.tag,
        label: f.label || f.tag,
        placeholder: f.placeholder || `Nhập ${f.label || f.tag}...`,
        type: f.type === "textarea" || f.type === "multi-line" || f.tag === "NOI_DUNG" || f.tag === "CAN_CU" || f.tag === "NOI_NHAN" ? "textarea" : f.type || "text",
        options: f.options,
      }));
    }
    return DEFAULT_FORM_FIELDS;
  }, [activeSchema]);

  // Read selection when hasSelection changes or on initial mount
  const handleReadCurrentSelection = async () => {
    setIsReadingSelection(true);
    try {
      const text = await readSelection();
      setSelectedText(text || "");
    } catch {
      // Ignore if outside Word
    } finally {
      setIsReadingSelection(false);
    }
  };

  useEffect(() => {
    if (hasSelection) {
      void handleReadCurrentSelection();
    }
  }, [hasSelection]);

  // Read content controls from Word to populate task pane fields
  const handleRefreshFieldsFromWord = async () => {
    try {
      const controls = await readTaggedContentControls();
      if (controls && Object.keys(controls).length > 0) {
        setFieldValues((prev) => ({ ...prev, ...controls }));
        setSyncStatus(`Đã đọc ${Object.keys(controls).length} trường từ Word.`);
        setTimeout(() => setSyncStatus(""), 3000);
      } else {
        setSyncStatus("Chưa tìm thấy trường dữ liệu nào trong Word.");
        setTimeout(() => setSyncStatus(""), 3000);
      }
    } catch (err) {
      setSyncStatus("Không thể đọc trường dữ liệu từ Word.");
    }
  };

  // Sync state when activeTemplate or messages change
  useEffect(() => {
    void handleRefreshFieldsFromWord();
  }, [activeTemplate]);

  // Handle Selection AI Action (Viết lại, Soát lỗi, Rút gọn...)
  const handleExecuteSelectionAi = async (promptInstruction: string) => {
    const textToProcess = selectedText.trim();
    if (!textToProcess) {
      await handleReadCurrentSelection();
      return;
    }
    const fullPrompt = `${promptInstruction}\n\n"${textToProcess}"`;
    await onSendMessage(fullPrompt, "administrative");
  };

  // Update AI revised text when new assistant message arrives
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        setAiRevisedText(last.content);
      }
    }
  }, [messages]);

  // Save & Apply Fields to Word
  const handleApplyFieldsToWord = async () => {
    if (onApplyFieldsToForm) {
      await onApplyFieldsToForm(fieldValues);
      setSyncStatus("✓ Đã cập nhật tất cả các trường vào Word thành công!");
      setTimeout(() => setSyncStatus(""), 3500);
    } else {
      const combined = Object.entries(fieldValues)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `[${k}]: ${v}`)
        .join("\n\n");
      await onApplyText(combined);
    }
  };

  const handleFieldChange = (tag: string, val: string) => {
    setFieldValues((prev) => ({ ...prev, [tag]: val }));
  };

  const handleApplyPreset = (tag: string, presetVal: string) => {
    setFieldValues((prev) => {
      const current = prev[tag] || "";
      if (tag === "CAN_CU" || tag === "NOI_NHAN") {
        const next = current.trim() ? `${current.trim()}\n${presetVal}` : presetVal;
        return { ...prev, [tag]: next };
      }
      return { ...prev, [tag]: presetVal };
    });
  };

  return (
    <div className="aiTaskpaneContainer" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      {/* 1. Header & Primary Call to Action */}
      <div className="aiTaskpaneHeader" style={{ padding: "8px 12px 6px", background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
        <div className="aiBrandRow" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="aiBrandName" style={{ fontSize: 13, fontWeight: 700, color: "#0d4f8b", display: "flex", alignItems: "center", gap: 6 }}>
            <span>TVCI WORD</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", background: "#e0f2fe", color: "#0369a1", borderRadius: 3 }}>
              {activeTemplate ? activeTemplate.organization : "Bảng điều khiển"}
            </span>
          </div>

          <div className="aiHeaderActions" style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              className="aiHeaderBtn"
              onClick={onOpenAiSettings}
              title="Cài đặt AI & API Key"
              style={{ padding: "2px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer" }}
            >
              ⚙ Cài đặt AI
            </button>
            {onOpenTemplateLibrary && (
              <button
                type="button"
                className="aiHeaderBtn"
                onClick={onOpenTemplateLibrary}
                title="Mở Kho Biểu Mẫu"
                style={{ padding: "2px 6px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer" }}
              >
                📁 Kho mẫu
              </button>
            )}
          </div>
        </div>

        {/* Document Context Subtitle */}
        <div className="aiContextSubtitleRow" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
          <span className="aiContextDocTitle" style={{ fontWeight: 600, color: "#0369a1" }}>
            {activeTemplate ? activeTemplate.name : documentSettings.docType || "Văn bản hành chính"}
          </span>
          <span className="aiContextOrgSubtitle">Trung tâm TVCI</span>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        
        {/* SECTION 1: CONTEXTUAL SELECTION AI (XỬ LÝ ĐOẠN BÔI ĐEN) */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 6,
            border: hasSelection ? "1px solid #93c5fd" : "1px solid #e2e8f0",
            padding: 8,
            boxShadow: hasSelection ? "0 0 0 1px #bfdbfe" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f3f67", display: "flex", alignItems: "center", gap: 4 }}>
              <span>✍️</span>
              <span>XỬ LÝ ĐOẠN BÔI ĐEN (AI)</span>
            </div>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: 3,
                background: hasSelection ? "#dbeafe" : "#f1f5f9",
                color: hasSelection ? "#1d4ed8" : "#64748b",
              }}
            >
              {hasSelection ? `Đang chọn: ${selectionWordCount} từ` : "Chưa chọn vùng"}
            </span>
          </div>

          {/* Quick Prompts Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.id}
                type="button"
                disabled={busy}
                onClick={() => void handleExecuteSelectionAi(qp.prompt)}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  padding: "2px 7px",
                  fontSize: 10,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Prompt input if needed */}
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="text"
              placeholder={hasSelection ? "Yêu cầu AI sửa đoạn đang chọn..." : "Bôi đen đoạn văn bản trong Word rồi nhập yêu cầu..."}
              value={selectionPrompt}
              onChange={(e) => setSelectionPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectionPrompt.trim()) {
                  void handleExecuteSelectionAi(selectionPrompt);
                  setSelectionPrompt("");
                }
              }}
              style={{
                flex: 1,
                height: 26,
                padding: "0 8px",
                fontSize: 11,
                border: "1px solid #cbd5e1",
                borderRadius: 4,
              }}
            />
            <button
              type="button"
              disabled={busy || !selectionPrompt.trim()}
              onClick={() => {
                if (selectionPrompt.trim()) {
                  void handleExecuteSelectionAi(selectionPrompt);
                  setSelectionPrompt("");
                }
              }}
              style={{
                height: 26,
                padding: "0 8px",
                fontSize: 11,
                background: "#0d4f8b",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                cursor: busy || !selectionPrompt.trim() ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "…" : "Gửi"}
            </button>
          </div>

          {/* AI Revised Output Preview & Replace Button */}
          {aiRevisedText && (
            <div style={{ marginTop: 8, padding: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#166534" }}>✓ Kết quả AI xử lý:</span>
                <button
                  type="button"
                  onClick={() => setAiRevisedText("")}
                  style={{ background: "none", border: "none", fontSize: 11, color: "#64748b", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#1e293b", lineHeight: 1.4, maxHeight: 110, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                {aiRevisedText}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {hasSelection ? (
                  <button
                    type="button"
                    onClick={() => void onReplaceSelection(aiRevisedText)}
                    style={{
                      flex: 1,
                      height: 24,
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🔄 Thay đoạn chọn
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onApplyText(aiRevisedText)}
                    style={{
                      flex: 1,
                      height: 24,
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📥 Chèn vào Word
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onInsertBelow(aiRevisedText)}
                  style={{
                    height: 24,
                    padding: "0 6px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    fontSize: 10.5,
                    cursor: "pointer",
                  }}
                >
                  Chèn dưới
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onCopyText(aiRevisedText);
                    setCopiedStatus(true);
                    setTimeout(() => setCopiedStatus(false), 1500);
                  }}
                  style={{
                    height: 24,
                    padding: "0 6px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    fontSize: 10.5,
                    cursor: "pointer",
                  }}
                >
                  {copiedStatus ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: BẢNG ĐIỀU KHIỂN CÁC TRƯỜNG DỮ LIỆU PHÂN MẢNH (FORM FIELDS CONTROLLER) */}
        <div style={{ background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", padding: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f3f67" }}>
                📋 CÁC TRƯỜNG DỮ LIỆU BIỂU MẪU
              </div>
              <div style={{ fontSize: 9.5, color: "#64748b" }}>
                {activeTemplate ? activeTemplate.name : "Văn bản Word hiện hành"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 3 }}>
              <button
                type="button"
                onClick={() => void handleRefreshFieldsFromWord()}
                title="Đọc lại dữ liệu từ các Content Control trên Word"
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 10,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                🔄 Đọc từ Word
              </button>
              <button
                type="button"
                onClick={() => setFieldValues({})}
                title="Xóa trắng các trường"
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 10,
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          </div>

          {/* Sync notification banner */}
          {syncStatus && (
            <div style={{ padding: "3px 6px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, fontSize: 10, color: "#166534", marginBottom: 6 }}>
              {syncStatus}
            </div>
          )}

          {/* Dynamic Fields List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 310px)", overflowY: "auto", paddingRight: 2 }}>
            {displayFields.map((field) => {
              const currentVal = fieldValues[field.tag] || "";
              const presets = PRESET_OPTIONS[field.tag] || null;

              return (
                <div key={field.tag} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: "#334155" }}>
                      {field.label}
                      <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>({field.tag})</span>
                    </label>

                    {/* Quick Dropdown Preset selector if available */}
                    {presets && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleApplyPreset(field.tag, e.target.value);
                        }}
                        style={{
                          fontSize: 9.5,
                          padding: "1px 4px",
                          borderRadius: 3,
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          color: "#0369a1",
                          cursor: "pointer",
                          maxWidth: 110,
                        }}
                      >
                        <option value="">▼ Chọn nhanh</option>
                        {presets.map((p, idx) => (
                          <option key={idx} value={p}>
                            {p.length > 25 ? `${p.slice(0, 25)}...` : p}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {field.type === "textarea" ? (
                    <textarea
                      rows={field.tag === "NOI_DUNG" ? 4 : 2}
                      value={currentVal}
                      placeholder={field.placeholder}
                      onChange={(e) => handleFieldChange(field.tag, e.target.value)}
                      style={{
                        padding: "4px 6px",
                        fontSize: 11,
                        borderRadius: 4,
                        border: "1px solid #cbd5e1",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  ) : (
                    <input
                      type={field.type === "date" ? "date" : "text"}
                      value={currentVal}
                      placeholder={field.placeholder}
                      onChange={(e) => handleFieldChange(field.tag, e.target.value)}
                      style={{
                        height: 25,
                        padding: "0 6px",
                        fontSize: 11,
                        borderRadius: 4,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Apply Button */}
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => void handleApplyFieldsToWord()}
              style={{
                width: "100%",
                height: 30,
                background: "#0d4f8b",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 11.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <span>💾</span>
              <span>Lưu &amp; Cập nhật vào Word</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
