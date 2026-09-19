import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage, WritingStyleId } from "../../ai/writing-workspace";
import type { AiAttachment } from "../../ai/attachment.service";
import type { DocumentSettings } from "../../models/document-settings";

export interface AiTaskpaneViewProps {
  documentSettings: DocumentSettings;
  onOpenDocumentSettings: () => void;
  onOpenAiSettings: () => void;
  messages: ChatMessage[];
  busy: boolean;
  onSendMessage: (text: string, style: WritingStyleId, attachment?: AiAttachment) => Promise<void>;
  onNewConversation: () => void;
  onApplyText: (text: string) => Promise<void>;
  onReplaceSelection: (text: string) => Promise<void>;
  onInsertBelow: (text: string) => Promise<void>;
  onCopyText: (text: string) => Promise<void>;
  onSaveToKnowledge: (text: string) => void;
  onRollback: () => void;
  hasSelection: boolean;
  selectionWordCount: number;
}

const QUICK_PROMPTS = [
  { id: "continue", label: "✍️ Soạn tiếp", prompt: "Hãy soạn tiếp nội dung văn bản này một cách liền mạch, chuẩn phong cách hành chính:" },
  { id: "rewrite_formal", label: "🔄 Viết lại trang trọng", prompt: "Hãy viết lại đoạn văn sau theo văn phong hành chính trang trọng, chuẩn mực Nghị định 30:" },
  { id: "shorten", label: "✂️ Rút gọn", prompt: "Hãy tóm lược, rút gọn đoạn văn bản sau ngắn gọn, súc tích nhưng giữ trọn ý chính:" },
  { id: "expand", label: "📝 Mở rộng", prompt: "Hãy phát triển, mở rộng lập luận và diễn đạt chi tiết hơn cho nội dung sau:" },
  { id: "proofread", label: "🔍 Soát lỗi chính tả", prompt: "Hãy kiểm tra và chỉ ra các lỗi chính tả, ngữ pháp, viết hoa và thể thức trong đoạn sau:" },
  { id: "addressee", label: "📌 Tạo Kính gửi", prompt: "Hãy soạn khối Kính gửi chuẩn mực, trang trọng theo thẩm quyền và quy định hành chính:" },
  { id: "recipients", label: "📋 Tạo Nơi nhận", prompt: "Hãy gợi ý danh sách Nơi nhận (nội bộ, cơ quan cấp trên, lưu trữ) đầy đủ và đúng quy cách:" },
  { id: "legal_basis", label: "⚖️ Soạn căn cứ", prompt: "Hãy soạn thảo các căn cứ pháp lý cần thiết và liên quan trực tiếp cho văn bản này:" },
  { id: "missing_info", label: "❓ Kiểm tra thông tin thiếu", prompt: "Hãy rà soát xem văn bản này còn thiếu những thông tin thực tiễn, số liệu hoặc thủ tục nào cần bổ sung:" },
];

export function AiTaskpaneView({
  documentSettings,
  onOpenDocumentSettings,
  onOpenAiSettings,
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
  hasSelection,
  selectionWordCount,
}: AiTaskpaneViewProps): React.ReactElement {
  const [inputText, setInputText] = useState("");
  const [writingStyle, setWritingStyle] = useState<WritingStyleId>("administrative");
  const [attachment, setAttachment] = useState<AiAttachment | undefined>();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const handleSend = async () => {
    if (!inputText.trim() || busy) return;
    const text = inputText;
    setInputText("");
    const att = attachment;
    setAttachment(undefined);
    await onSendMessage(text, writingStyle, att);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleQuickPromptClick = (promptPrefix: string) => {
    setInputText(promptPrefix + (hasSelection ? " (áp dụng cho đoạn đang chọn)" : ""));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachment({
        id: `att-${Date.now()}`,
        name: file.name,
        type: file.name.toLowerCase().endsWith(".docx") ? "word" : file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "unknown",
        mimeType: file.type || "text/plain",
        size: file.size,
        extractedText: content || "",
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="aiTaskpaneContainer">
      {/* Header with Context Chip */}
      <div className="aiTaskpaneHeader">
        <div className="aiBrandRow">
          <div className="aiBrandName">
            <span className="aiSparkleIcon">✨</span> TVCI AI Soạn Thảo
          </div>
          <div className="aiHeaderActions">
            <button
              type="button"
              className="aiHeaderBtn"
              onClick={onNewConversation}
              title="Tạo cuộc hội thoại mới"
            >
              ➕ Mới
            </button>
            <button
              type="button"
              className="aiHeaderBtn"
              onClick={onOpenAiSettings}
              title="Cài đặt kết nối AI"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Interactive Context Chip */}
        <div className="aiContextChipRow">
          <button
            type="button"
            className="aiContextChipBtn"
            onClick={onOpenDocumentSettings}
            title="Bấm để mở Thiết lập Văn bản"
          >
            <span className="aiContextChipDot">●</span>
            <span className="aiContextChipOrg">{documentSettings.agency.agencyAbbr || "TVCI"}</span>
            <span className="aiContextChipDivider">·</span>
            <span className="aiContextChipType">{documentSettings.docType || "Công văn"}</span>
            <span className="aiContextChipEdit">⚙️ Thiết lập</span>
          </button>
        </div>
      </div>

      {/* Scope Info Banner */}
      <div className="aiScopeBanner">
        <div className="aiScopeLeft">
          <span className={`aiScopeBadge ${hasSelection ? "selection" : "document"}`}>
            {hasSelection ? `Đoạn đang chọn (${selectionWordCount} từ)` : "Toàn bộ tài liệu"}
          </span>
          {attachment && (
            <span className="aiScopeAttachmentBadge" title={attachment.name}>
              📎 {attachment.name}
              <button
                type="button"
                className="aiRemoveAttachmentBtn"
                onClick={() => setAttachment(undefined)}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Quick Prompts Carousel Bar */}
      <div className="aiQuickPromptsBar">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.id}
            type="button"
            className="aiQuickPromptChip"
            onClick={() => handleQuickPromptClick(qp.prompt)}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Thread Messages */}
      <div className="aiChatThread">
        {messages.length === 0 ? (
          <div className="aiEmptyChatState">
            <div className="aiEmptyChatIcon">🤖</div>
            <div className="aiEmptyChatTitle">Trợ lý AI đã sẵn sàng</div>
            <div className="aiEmptyChatDesc">
              Hãy chọn gợi ý nhanh bên trên hoặc nhập yêu cầu để bắt đầu soạn thảo, sửa lỗi, viết tiếp nội dung văn bản.
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div key={index} className={`aiMessageBubble ${isUser ? "user" : "assistant"}`}>
                <div className="aiMessageSender">
                  {isUser ? "👤 Bạn" : "✨ Trợ lý TVCI AI"}
                </div>
                <div className="aiMessageText" style={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </div>

                {/* Action buttons for assistant output */}
                {!isUser && (
                  <div className="aiMessageActionToolbar">
                    <button
                      type="button"
                      className="aiActionBtn primary"
                      onClick={() => void onApplyText(msg.content)}
                      title="Chèn văn bản này vào vị trí con trỏ trong Word"
                    >
                      📥 Áp dụng
                    </button>
                    {hasSelection && (
                      <button
                        type="button"
                        className="aiActionBtn outline"
                        onClick={() => void onReplaceSelection(msg.content)}
                        title="Thay thế đoạn đang chọn bằng văn bản này"
                      >
                        🔄 Thay đoạn chọn
                      </button>
                    )}
                    <button
                      type="button"
                      className="aiActionBtn outline"
                      onClick={() => void onInsertBelow(msg.content)}
                      title="Chèn nội dung bên dưới đoạn đang chọn"
                    >
                      ⬇️ Chèn dưới
                    </button>
                    <button
                      type="button"
                      className="aiActionBtn secondary"
                      onClick={() => void onCopyText(msg.content)}
                      title="Sao chép vào bộ nhớ tạm"
                    >
                      📋 Copy
                    </button>
                    <button
                      type="button"
                      className="aiActionBtn secondary"
                      onClick={() => onSaveToKnowledge(msg.content)}
                      title="Lưu vào Kho Kiến thức nghiệp vụ"
                    >
                      🧠 Lưu kinh nghiệm
                    </button>
                    <button
                      type="button"
                      className="aiActionBtn secondary"
                      onClick={onRollback}
                      title="Hoàn tác lần thay đổi gần nhất"
                    >
                      ↩️ Hoàn tác
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {busy && (
          <div className="aiMessageBubble assistant typing">
            <div className="aiTypingIndicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              TVCI AI đang xử lý văn bản theo thể thức...
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Area */}
      <div className="aiInputFooter">
        <div className="aiInputControlsRow">
          <select
            className="aiStyleSelect"
            value={writingStyle}
            onChange={(e) => setWritingStyle(e.target.value as WritingStyleId)}
            title="Phong cách soạn thảo"
          >
            <option value="administrative">🏛️ Hành chính trang trọng</option>
            <option value="concise">✂️ Ngắn gọn, súc tích</option>
            <option value="nd30">📜 Chuẩn Nghị định 30</option>
            <option value="persuasive">💡 Thuyết phục, lập luận</option>
          </select>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".txt,.docx,.md,.json"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            className="aiAttachBtn"
            onClick={() => fileInputRef.current?.click()}
            title="Đính kèm tệp văn bản tham khảo"
          >
            📎 Đính kèm
          </button>
        </div>

        <div className="aiTextareaWrapper">
          <textarea
            className="aiChatTextarea"
            rows={2}
            value={inputText}
            placeholder={
              hasSelection
                ? "Nhập yêu cầu AI (sẽ áp dụng cho đoạn đang bôi đen)..."
                : "Hỏi hoặc yêu cầu AI soạn thảo văn bản..."
            }
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
          />
          <button
            type="button"
            className="aiSendBtn"
            onClick={() => void handleSend()}
            disabled={busy || !inputText.trim()}
            title="Gửi yêu cầu (Enter)"
          >
            {busy ? "..." : "➤"}
          </button>
        </div>
      </div>
    </div>
  );
}
