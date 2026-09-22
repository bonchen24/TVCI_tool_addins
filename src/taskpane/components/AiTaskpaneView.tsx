import React, { useRef, useState } from "react";
import type { ChatMessage, WritingStyleId } from "../../ai/writing-workspace";
import { WRITING_STYLES } from "../../ai/writing-workspace";
import type { ChatConversation } from "../../ai/chat-history";
import type { AiAttachment } from "../../ai/attachment.service";
import { processAttachmentFile } from "../../ai/attachment.service";
import type { DocumentSettings } from "../../models/document-settings";
import type { TemplateRecord } from "../../templates/library";
import { getTemplateFormSchema } from "../../templates/form-schema";
import { mapDraftToFormValues } from "../../ai/template-matcher";

// Kept as a shared preset catalog for SmartDraftingModal; the normal Task Pane
// deliberately does not render these as a form-field dashboard.
export const PRESET_OPTIONS: Record<string, string[]> = {
  DIA_DANH: ["Hà Nội", "Quảng Ninh", "Cẩm Phả", "Uông Bí", "Hạ Long", "Thái Nguyên", "Lạng Sơn"],
  CHUC_VU_NGUOI_KY: ["GIÁM ĐỐC", "PHÓ GIÁM ĐỐC", "VIỆN TRƯỞNG", "PHÓ VIỆN TRƯỞNG", "TRƯỞNG PHÒNG", "PHÓ TRƯỞNG PHÒNG", "BÍ THƯ", "PHÓ BÍ THƯ"],
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

export const REFINE_OPTIONS = [
  { id: "formal", label: "Trang trọng hơn", prompt: "Hãy viết lại theo văn phong trang trọng, chuẩn mực hơn:" },
  { id: "concise", label: "Ngắn gọn hơn", prompt: "Hãy rút gọn, cô đọng nội dung nhưng vẫn giữ đầy đủ ý chính:" },
  { id: "detailed", label: "Chi tiết hơn", prompt: "Hãy diễn giải chi tiết, bổ sung dẫn chứng và lập luận cho nội dung:" },
  { id: "admin", label: "Văn phong hành chính", prompt: "Hãy chuẩn hóa theo chuẩn thể thức và thuật ngữ hành chính nhà nước (Nghị định 30):" },
  { id: "accessible", label: "Dễ hiểu hơn", prompt: "Hãy diễn đạt lại nội dung thật mạch lạc, dễ hiểu, tự nhiên:" },
  { id: "preserve_meaning", label: "Giữ nguyên ý viết lại", prompt: "Hãy viết lại theo cách diễn đạt khác nhưng giữ nguyên 100% ý nghĩa và dữ liệu:" },
];

export interface AiTaskpaneViewProps {
  documentSettings: DocumentSettings;
  activeTemplate?: TemplateRecord | null;
  onOpenAiSettings: () => void;
  messages: ChatMessage[];
  busy: boolean;
  onSendMessage: (text: string, style: WritingStyleId, attachment?: AiAttachment) => Promise<void>;
  onNewConversation: () => void;
  conversations?: ChatConversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onRenameConversation?: (conversation: ChatConversation) => Promise<void> | void;
  onApplyText: (text: string) => Promise<void>;
  onReplaceSelection: (text: string) => Promise<void>;
  onInsertBelow: (text: string) => Promise<void>;
  onCopyText: (text: string) => Promise<void>;
  onSaveToKnowledge: (text: string) => void;
  onRollback: () => void;
  onApplyFieldsToForm?: (fields: Record<string, string>) => Promise<void>;
  onRefineMessage?: (msgIndex: number, instructionPrompt: string, currentText: string) => Promise<string>;
  onVersionChange?: (text: string) => void;
  hasSelection: boolean;
  selectionWordCount: number;
}

function asFormFields(template: TemplateRecord, draft: string): Record<string, string> {
  const schema = getTemplateFormSchema(template);
  if (!schema) return { NOI_DUNG: draft };

  const mapped = mapDraftToFormValues(schema, draft, {});
  return Object.fromEntries(
    Object.entries(mapped).map(([tag, value]) => [tag, Array.isArray(value) ? value.join("\n") : String(value ?? "")])
  );
}

export function AiTaskpaneView({
  documentSettings,
  activeTemplate,
  onOpenAiSettings,
  messages,
  busy,
  onSendMessage,
  onNewConversation,
  conversations,
  activeConversationId,
  onSelectConversation,
  onRenameConversation,
  onApplyText,
  onReplaceSelection,
  onInsertBelow,
  onCopyText,
  onSaveToKnowledge,
  onRollback,
  onApplyFieldsToForm,
  onRefineMessage,
  onVersionChange,
  hasSelection,
  selectionWordCount,
}: AiTaskpaneViewProps): React.ReactElement {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [composerText, setComposerText] = useState("");
  const [writingStyle, setWritingStyle] = useState<WritingStyleId>("administrative");
  const [attachment, setAttachment] = useState<AiAttachment | null>(null);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startConversationRename = (conversation: ChatConversation) => {
    setRenamingConversationId(conversation.id);
    setRenameDraft(conversation.title);
  };

  const submitConversationRename = async (conversation: ChatConversation) => {
    if (!onRenameConversation || !renameDraft.trim()) return;
    await onRenameConversation({ ...conversation, title: renameDraft });
    setRenamingConversationId(null);
    setRenameDraft("");
  };

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachmentBusy(true);
    try {
      setAttachment(await processAttachmentFile(file));
    } finally {
      setAttachmentBusy(false);
      event.target.value = "";
    }
  };

  const handleSend = async () => {
    const text = composerText.trim();
    if (busy || attachmentBusy || (!text && !attachment)) return;
    await onSendMessage(text, writingStyle, attachment ?? undefined);
    setComposerText("");
    setAttachment(null);
  };

  const handlePrimaryAction = async (text: string) => {
    if (activeTemplate && onApplyFieldsToForm) {
      await onApplyFieldsToForm(asFormFields(activeTemplate, text));
      return;
    }
    if (hasSelection) {
      await onReplaceSelection(text);
      return;
    }
    await onApplyText(text);
  };

  const handleRefine = async (messageIndex: number, prompt: string, text: string) => {
    if (!onRefineMessage) return;
    const nextText = await onRefineMessage(messageIndex, prompt, text);
    onVersionChange?.(nextText);
  };

  const primaryActionLabel = activeTemplate && onApplyFieldsToForm
    ? "Áp dụng vào biểu mẫu"
    : hasSelection
      ? "Thay đoạn chọn"
      : "Chèn vào Word";

  return (
    <main className="aiTaskpaneContainer" role="main" aria-label="TVCI AI Chat">
      <header className="aiTaskpaneHeader" style={{ position: "relative" }}>
        <div className="aiBrandRow">
          <div className="aiBrandName">
            <span>TVCI AI</span>
          </div>
          <div className="aiHeaderActions">
            <button type="button" className="aiHeaderBtn" onClick={onNewConversation} title="Mở chat mới">
              ＋ Chat mới
            </button>
            <button type="button" className="aiHeaderBtn" onClick={onOpenAiSettings} title="Cài đặt AI & API Key" aria-label="Cài đặt AI">
              ⚙
            </button>
            <button
              type="button"
              className="aiHeaderBtn"
              onClick={() => setHistoryOpen((open) => !open)}
              title="Mở lịch sử chat"
              aria-label="Lịch sử chat"
              aria-expanded={historyOpen}
            >
              ☰
            </button>
          </div>
        </div>

        <div className="aiContextSubtitleRow" aria-label="Ngữ cảnh tài liệu hiện tại">
          <span className="aiContextDocTitle">
            {activeTemplate ? activeTemplate.name : documentSettings.docType || "Văn bản hành chính"}
          </span>
          {hasSelection && (
            <span className="aiScopeBadge selection">Đang chọn: {selectionWordCount} từ</span>
          )}
        </div>

        {historyOpen && (
          <div className="aiHistoryDrawer" role="dialog" aria-label="Lịch sử chat">
            <div className="aiHistoryHeader">
              <span>Lịch sử chat</span>
              <button type="button" className="aiHistoryCloseBtn" onClick={() => setHistoryOpen(false)} aria-label="Đóng lịch sử chat">✕</button>
            </div>
            <div className="aiHistoryList">
              {!conversations?.length && <div className="aiHistoryItem">Chưa có cuộc chat đã lưu.</div>}
              {conversations?.map((conversation) => (
                <div key={conversation.id} className={`aiHistoryItem${activeConversationId === conversation.id ? " active" : ""}`}>
                  {renamingConversationId === conversation.id ? (
                    <form onSubmit={(event) => { event.preventDefault(); void submitConversationRename(conversation); }} style={{ display: "flex", gap: 3 }}>
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        aria-label="Tên cuộc chat"
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <button type="submit" disabled={!renameDraft.trim()}>Lưu</button>
                      <button type="button" onClick={() => setRenamingConversationId(null)}>Hủy</button>
                    </form>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <button
                        type="button"
                        className="aiHistoryItemTitle"
                        onClick={() => { onSelectConversation?.(conversation.id); setHistoryOpen(false); }}
                        style={{ flex: 1, border: "none", background: "transparent", textAlign: "left", cursor: "pointer" }}
                      >
                        {conversation.title}
                      </button>
                      {onRenameConversation && (
                        <button type="button" onClick={() => startConversationRename(conversation)} title="Đổi tên" aria-label={`Đổi tên ${conversation.title}`}>✎</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <section className="aiChatThread" aria-label="Nội dung hội thoại">
        {messages.length === 0 && (
          <div className="aiEmptyChatState">
            <strong>Tôi có thể giúp gì cho bạn?</strong>
            <span className="aiEmptyPromptText">Yêu cầu soạn thảo, chỉnh sửa hoặc hỏi về nội dung đang làm việc trong Word.</span>
          </div>
        )}

        {messages.map((message, messageIndex) => (
          <article key={`${message.role}-${messageIndex}`} className={`aiMessageBubble ${message.role}`}>
            <span className="aiMessageSender">{message.role === "assistant" ? "TVCI AI" : "Bạn"}</span>
            <div className="aiMessageText">{message.content}</div>
            {message.role === "assistant" && (
              <div className="aiMessageActionToolbar">
                <button type="button" className="aiActionBtn primary" onClick={() => void handlePrimaryAction(message.content)} disabled={busy}>
                  {primaryActionLabel}
                </button>
                <button type="button" className="aiActionBtn outline" onClick={() => void onInsertBelow(message.content)} disabled={busy}>
                  Chèn dưới
                </button>
                <button type="button" className="aiActionBtn iconOnly" onClick={() => void onCopyText(message.content)} title="Sao chép">Sao chép</button>
                <button type="button" className="aiActionBtn iconOnly" onClick={() => onSaveToKnowledge(message.content)} title="Lưu nội dung vào kho kiến thức">Lưu tri thức</button>
                {onRefineMessage && (
                  <select
                    className="aiStyleSelect"
                    defaultValue=""
                    aria-label="Tinh chỉnh câu trả lời AI"
                    onChange={(event) => {
                      const option = REFINE_OPTIONS.find((item) => item.id === event.target.value);
                      if (option) void handleRefine(messageIndex, option.prompt, message.content);
                      event.target.value = "";
                    }}
                    disabled={busy}
                  >
                    <option value="">Tinh chỉnh…</option>
                    {REFINE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                )}
                <button type="button" className="aiActionBtn iconOnly" onClick={onRollback} disabled={busy} title="Hoàn tác thao tác Word">Hoàn tác</button>
              </div>
            )}
          </article>
        ))}

        {busy && (
          <div className="aiMessageBubble assistant" aria-live="polite">
            <span className="aiMessageSender">TVCI AI</span>
            <div className="aiTypingIndicator"><span /><span /><span /></div>
            <span className="aiTypingText">Đang xử lý…</span>
          </div>
        )}
      </section>

      <footer className="aiInputFooter">
        {attachment && (
          <div className="aiAttachmentChips" aria-label="Tệp đính kèm">
            <span className={`aiAttachmentChip ${attachment.type}`}>
              <span className="chipName">{attachment.name}</span>
              <button type="button" className="chipRemove" onClick={() => setAttachment(null)} aria-label={`Bỏ tệp ${attachment.name}`}>✕</button>
            </span>
          </div>
        )}
        <div className="aiInputControlsRow">
          <select className="aiStyleSelect" value={writingStyle} onChange={(event) => setWritingStyle(event.target.value as WritingStyleId)} aria-label="Văn phong AI">
            {WRITING_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
          </select>
        </div>
        <div className="aiComposerBar">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(event) => void handleAttachmentChange(event)}
            style={{ display: "none" }}
          />
          <button type="button" className="aiComposerAttachBtn" onClick={() => fileInputRef.current?.click()} disabled={attachmentBusy} title="Đính kèm tài liệu">＋</button>
          <textarea
            className="aiChatTextarea"
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Nhắn tin cho TVCI AI…"
            rows={1}
            aria-label="Nhập yêu cầu cho TVCI AI"
          />
          <button type="button" className="aiComposerSendBtn" onClick={() => void handleSend()} disabled={busy || attachmentBusy || (!composerText.trim() && !attachment)} title="Gửi yêu cầu">
            {busy ? "…" : "➤"}
          </button>
        </div>
      </footer>
    </main>
  );
}
