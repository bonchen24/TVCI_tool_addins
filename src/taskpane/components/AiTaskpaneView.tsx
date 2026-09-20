import React, { useState, useRef, useEffect, useMemo } from "react";
import type { ChatMessage, WritingStyleId } from "../../ai/writing-workspace";
import type { AiAttachment } from "../../ai/attachment.service";
import type { DocumentSettings } from "../../models/document-settings";
import type { TemplateRecord } from "../../templates/library";
import type { TemplateFormSchema } from "../../templates/form-schema";
import { getTemplateFormSchema } from "../../templates/form-schema";
import { decomposeDraftIntoFormFields } from "../../ai/template-matcher";
import type { ChatConversation } from "../../ai/chat-history";
import { readSelection } from "../../word/selection.service";

export interface ActiveContextInfo {
  docType: string;
  templateId?: string;
  templateName?: string;
  department: string;
  organization: string;
}

export const QUICK_PROMPTS = [
  { id: "rewrite", label: "Viết lại", prompt: "Hãy viết lại đoạn văn sau trang trọng, chuẩn thể thức" },
  { id: "proofread", label: "Soát lỗi chính tả", prompt: "Hãy soát lỗi chính tả, ngữ pháp và thể thức cho" },
  { id: "shorten", label: "Rút gọn", prompt: "Hãy rút gọn, cô đọng nội dung sau" },
  { id: "expand", label: "Mở rộng", prompt: "Hãy mở rộng và bổ sung chi tiết cho nội dung sau" },
  { id: "summary", label: "Tóm tắt ý chính", prompt: "Hãy tóm tắt ngắn gọn các ý chính của" },
];

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
  onOpenTemplateLibrary?: () => void;
  messages: ChatMessage[];
  busy: boolean;
  onSendMessage: (text: string, style: WritingStyleId, attachment?: AiAttachment) => Promise<void>;
  onNewConversation: () => void;
  conversations?: ChatConversation[];
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

interface MappingProposal {
  tag: string;
  label: string;
  value: string;
  selected: boolean;
}

export function AiTaskpaneView({
  documentSettings,
  activeTemplate,
  onOpenAiSettings,
  onOpenTemplateLibrary,
  onStandardizeQuick,
  onApplyA4Quick,
  onCheckQuick,
  messages,
  busy,
  onSendMessage,
  onNewConversation,
  conversations = [],
  activeConversationId,
  onSelectConversation,
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
  const [inputText, setInputText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [writingStyle, setWritingStyle] = useState<WritingStyleId>("administrative");
  const [attachment, setAttachment] = useState<AiAttachment | undefined>();
  
  // Popover UI states
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeRefineIndex, setActiveRefineIndex] = useState<number | null>(null);
  const [activeMoreIndex, setActiveMoreIndex] = useState<number | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  // In-place refinement version tracking per assistant message index
  const [versionsMap, setVersionsMap] = useState<Record<number, string[]>>({});
  const [versionIdxMap, setVersionIdxMap] = useState<Record<number, number>>({});
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Close open popovers when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHeaderMenuOpen(false);
        setActiveRefineIndex(null);
        setActiveMoreIndex(null);
        setAttachMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [fieldReviewModal, setFieldReviewModal] = useState<{ isOpen: boolean; proposals: MappingProposal[] }>({
    isOpen: false,
    proposals: [],
  });

  // Read synchronized context from storage or props
  const [syncedContext, setSyncedContext] = useState<ActiveContextInfo>(() => {
    try {
      const raw = localStorage.getItem("tvci_active_document_context");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      docType: documentSettings.docType || "Công văn",
      department: "Trung tâm TVCI",
      organization: documentSettings.agency?.agencyAbbr || "TVCI",
    };
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const raw = localStorage.getItem("tvci_active_document_context");
        if (raw) setSyncedContext(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(handleStorage, 1500);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const activeSchema: TemplateFormSchema | null = useMemo(() => {
    if (activeTemplate) return getTemplateFormSchema(activeTemplate);
    return null;
  }, [activeTemplate]);

  const isTemplateActive = Boolean(activeTemplate || syncedContext.templateId);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || busy) return;
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const att = attachment;
    setAttachment(undefined);
    await onSendMessage(textToSend, writingStyle, att);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
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

  // Safe field mapping review before applying to form template
  const handleOpenFieldReview = (aiContent: string) => {
    if (!activeSchema) {
      void onApplyText(aiContent);
      return;
    }

    const decomposed = decomposeDraftIntoFormFields(activeSchema, aiContent, {});
    const proposals: MappingProposal[] = [];

    for (const field of activeSchema.fields) {
      const val = decomposed[field.tag];
      if (val !== undefined && val !== null && String(val).trim()) {
        proposals.push({
          tag: field.tag,
          label: field.label || field.tag,
          value: Array.isArray(val) ? val.join("; ") : String(val),
          selected: true,
        });
      }
    }

    if (proposals.length === 0) {
      proposals.push({
        tag: "NOI_DUNG",
        label: "Nội dung văn bản",
        value: aiContent,
        selected: true,
      });
    }

    setFieldReviewModal({ isOpen: true, proposals });
  };

  const handleConfirmApplyFields = async () => {
    const fieldsToApply: Record<string, string> = {};
    for (const p of fieldReviewModal.proposals) {
      if (p.selected && p.value.trim()) {
        fieldsToApply[p.tag] = p.value;
      }
    }
    setFieldReviewModal({ isOpen: false, proposals: [] });
    if (onApplyFieldsToForm) {
      await onApplyFieldsToForm(fieldsToApply);
    } else {
      await onApplyText(Object.values(fieldsToApply).join("\n\n"));
    }
  };

  // Refine handler: in-place versioning (‹ 1/2 ›) without polluting the chat log
  const handleRefine = async (msgIndex: number, option: typeof REFINE_OPTIONS[number], currentText: string) => {
    setActiveRefineIndex(null);
    if (!onRefineMessage) {
      const existing = versionsMap[msgIndex] || [currentText];
      setVersionsMap((prev) => ({ ...prev, [msgIndex]: existing }));
      void handleSend(`${option.prompt}\n"${currentText}"`);
      return;
    }

    setRefiningIndex(msgIndex);
    try {
      const existing = versionsMap[msgIndex] || [currentText];
      const newText = await onRefineMessage(msgIndex, option.prompt, currentText);
      if (newText && newText.trim()) {
        const nextVersions = [...existing, newText.trim()];
        const nextIdx = nextVersions.length - 1;
        setVersionsMap((prev) => ({ ...prev, [msgIndex]: nextVersions }));
        setVersionIdxMap((prev) => ({ ...prev, [msgIndex]: nextIdx }));
        if (onVersionChange) onVersionChange(nextVersions[nextIdx]);
      }
    } catch (err) {
      console.error("Refine error:", err);
    } finally {
      setRefiningIndex(null);
    }
  };

  const handleRegenerate = async (msgIndex: number, currentText: string) => {
    setActiveMoreIndex(null);
    if (!onRefineMessage) {
      void handleSend(`Hãy tạo lại một phiên bản mới, tối ưu hơn cho nội dung sau:\n"${currentText}"`);
      return;
    }

    setRefiningIndex(msgIndex);
    try {
      const existing = versionsMap[msgIndex] || [currentText];
      const newText = await onRefineMessage(
        msgIndex,
        "Hãy tạo lại một phiên bản mới với diễn đạt trau chuốt, gãy gọn, chuẩn xác thể thức hành chính hơn cho nội dung sau:",
        currentText
      );
      if (newText && newText.trim()) {
        const nextVersions = [...existing, newText.trim()];
        const nextIdx = nextVersions.length - 1;
        setVersionsMap((prev) => ({ ...prev, [msgIndex]: nextVersions }));
        setVersionIdxMap((prev) => ({ ...prev, [msgIndex]: nextIdx }));
        if (onVersionChange) onVersionChange(nextVersions[nextIdx]);
      }
    } catch (err) {
      console.error("Regenerate error:", err);
    } finally {
      setRefiningIndex(null);
    }
  };

  const handleCopy = (index: number, text: string) => {
    setActiveMoreIndex(null);
    void onCopyText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="aiTaskpaneContainer" onClick={() => {
      if (headerMenuOpen) setHeaderMenuOpen(false);
      if (activeRefineIndex !== null) setActiveRefineIndex(null);
      if (activeMoreIndex !== null) setActiveMoreIndex(null);
      if (attachMenuOpen) setAttachMenuOpen(false);
    }}>
      {/* 1. Header with New Chat [+] and More [•••] */}
      <div className="aiTaskpaneHeader">
        <div className="aiBrandRow">
          <div className="aiBrandName">TVCI AI</div>
          <div className="aiHeaderActions">
            <button
              type="button"
              className="aiHeaderBtn"
              onClick={onNewConversation}
              title="Bắt đầu phiên hỏi đáp mới"
            >
              +
            </button>
            <div className="aiHeaderMoreContainer" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="aiHeaderBtn"
                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                title="Tùy chọn khác"
              >
                •••
              </button>
              {headerMenuOpen && (
                <div className="aiHeaderDropdownMenu">
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      setHistoryOpen(true);
                    }}
                  >
                    📜 Lịch sử hội thoại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      onOpenAiSettings();
                    }}
                  >
                    ⚙ Cài đặt AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Compact Context Line (Document title + Organization subtitle) */}
        <div className="aiContextSubtitleRow">
          <span className="aiContextDocTitle">
            {activeTemplate ? activeTemplate.name : syncedContext.templateName || syncedContext.docType || "Công văn"}
          </span>
          <span className="aiContextOrgSubtitle">
            Trung tâm Thử nghiệm - Kiểm định Công nghiệp
          </span>
        </div>
      </div>

      {/* History Drawer Popover */}
      {historyOpen && (
        <div className="aiHistoryDrawer" onClick={(e) => e.stopPropagation()}>
          <div className="aiHistoryHeader">
            <span>Hội thoại gần đây</span>
            <button type="button" className="aiHistoryCloseBtn" onClick={() => setHistoryOpen(false)}>✕</button>
          </div>
          <div className="aiHistoryList">
            {conversations.length === 0 ? (
              <div style={{ padding: "12px", fontSize: "11px", color: "#64748b", textAlign: "center" }}>
                Chưa có lịch sử hội thoại
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className={`aiHistoryItem ${c.id === activeConversationId ? "active" : ""}`}
                  onClick={() => {
                    onSelectConversation?.(c.id);
                    setHistoryOpen(false);
                  }}
                >
                  <div className="aiHistoryItemTitle">{c.title || "Cuộc trò chuyện"}</div>
                  <div className="aiHistoryItemDate">{new Date(c.updatedAt).toLocaleDateString("vi-VN")}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selection Scope Indicator */}
      <div className="aiScopeBanner">
        <span className={`aiScopeBadge ${hasSelection ? "selection" : "document"}`}>
          {hasSelection ? `Vùng chọn (${selectionWordCount} từ)` : "Toàn văn bản"}
        </span>
        {attachment && (
          <span className="aiScopeAttachmentBadge" title={attachment.name}>
            📎 {attachment.name}
            <button type="button" className="aiRemoveAttachmentBtn" onClick={() => setAttachment(undefined)}>✕</button>
          </span>
        )}
      </div>

      {/* 3. Chat Thread */}
      <div className="aiChatThread">
        {messages.length === 0 ? (
          <div className="aiBotWelcomeCard">
            <div className="aiBotWelcomeHeader">
              <div className="aiBotAvatar">🤖</div>
              <div className="aiBotWelcomeTitleArea">
                <div className="aiBotWelcomeName">Trợ lý AI TVCI</div>
                <div className="aiBotWelcomeStatus">● Sẵn sàng hỗ trợ</div>
              </div>
            </div>
            <div className="aiBotWelcomeMsg">
              Xin chào! Tôi là trợ lý AI soạn thảo của Trung tâm TVCI. Tôi có thể hỗ trợ bạn soạn thảo văn bản, soát lỗi chính tả &amp; văn phong, hoặc áp dụng biểu mẫu. Hãy chọn nhanh hoặc gõ yêu cầu:
            </div>

            {/* Quick Starter Prompts */}
            <div className="aiBotInlineSection">
              <div className="aiBotInlineCategory">GỢI Ý SOẠN THẢO</div>
              <div className="aiBotInlineGrid">
                <button
                  type="button"
                  className="aiBotInlineBtn highlight"
                  onClick={() => {
                    setInputText("Hãy soạn thảo một Công văn hành chính chuẩn quy định về việc: ");
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                >
                  <span className="aiBtnIcon">📝</span>
                  <span>Soạn thảo công văn...</span>
                </button>
                <button
                  type="button"
                  className="aiBotInlineBtn"
                  onClick={() => {
                    setInputText("Hãy soạn thảo Phiếu yêu cầu thử nghiệm / kiểm định cho thiết bị: ");
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                >
                  <span className="aiBtnIcon">📋</span>
                  <span>Soạn phiếu yêu cầu...</span>
                </button>
                <button
                  type="button"
                  className="aiBotInlineBtn"
                  onClick={() => {
                    setInputText("Hãy tóm tắt ngắn gọn các ý chính của văn bản sau: ");
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                >
                  <span className="aiBtnIcon">📊</span>
                  <span>Tóm tắt văn bản...</span>
                </button>
                <button
                  type="button"
                  className="aiBotInlineBtn"
                  onClick={() => {
                    const prefix = hasSelection
                      ? "Hãy soát lỗi chính tả, dấu câu và thể thức văn bản cho đoạn đang chọn:"
                      : "Hãy soát lỗi chính tả và chuẩn hóa văn phong hành chính cho nội dung sau:";
                    setInputText(prefix);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                >
                  <span className="aiBtnIcon">🔍</span>
                  <span>Soát lỗi chính tả &amp; văn phong...</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            const versions = versionsMap[index] || [msg.content];
            const currentIdx = versionIdxMap[index] ?? 0;
            const displayContent = versions[currentIdx] || msg.content;

            return (
              <div key={index} className={`aiMessageBubble ${isUser ? "user" : "assistant"}`}>
                <div className="aiMessageSender">
                  {isUser ? (
                    "Bạn"
                  ) : (
                    <span className="aiAssistantSender">
                      <span className="aiSenderAvatar">🤖</span> Trợ lý AI
                    </span>
                  )}
                </div>
                <div className="aiMessageText">{displayContent}</div>

                {/* In-place refining indicator */}
                {refiningIndex === index && (
                  <div className="aiRefiningIndicator">
                    <span className="aiRefiningSpinner">🔄</span>
                    <span>Đang tinh chỉnh phiên bản mới...</span>
                  </div>
                )}

                {/* Assistant Inline Actions Toolbar */}
                {!isUser && (
                  <div className="aiInlineActionGroup" onClick={(e) => e.stopPropagation()}>
                    {/* 1. Primary Action */}
                    {isTemplateActive ? (
                      <button
                        type="button"
                        className="aiInlineBtn primary"
                        disabled={busy || refiningIndex !== null}
                        onClick={() => handleOpenFieldReview(displayContent)}
                        title="Điền vào các trường của biểu mẫu đang dùng"
                      >
                        📋 Áp dụng vào biểu mẫu
                      </button>
                    ) : hasSelection ? (
                      <button
                        type="button"
                        className="aiInlineBtn primary"
                        disabled={busy || refiningIndex !== null}
                        onClick={() => void onReplaceSelection(displayContent)}
                        title="Thay thế đoạn đang chọn"
                      >
                        🔄 Thay đoạn chọn
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="aiInlineBtn primary"
                        disabled={busy || refiningIndex !== null}
                        onClick={() => void onApplyText(displayContent)}
                        title="Chèn nội dung vào văn bản Word"
                      >
                        📥 Chèn vào Word
                      </button>
                    )}

                    {/* 2. Tinh chỉnh Popover */}
                    <div className="aiRefineContainer">
                      <button
                        type="button"
                        className="aiInlineBtn refine"
                        disabled={busy || refiningIndex !== null}
                        onClick={() => setActiveRefineIndex(activeRefineIndex === index ? null : index)}
                        title="Tinh chỉnh văn phong nội dung"
                      >
                        Tinh chỉnh ▾
                      </button>
                      {activeRefineIndex === index && (
                        <div className="aiRefinePopover">
                          {REFINE_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => void handleRefine(index, opt, displayContent)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Version indicator if multiple versions exist */}
                    {versions.length > 1 && (
                      <div className="aiVersionNav">
                        <button
                          type="button"
                          className="aiVersionBtn"
                          disabled={currentIdx === 0 || refiningIndex !== null}
                          onClick={() => {
                            const nextIdx = currentIdx - 1;
                            setVersionIdxMap({ ...versionIdxMap, [index]: nextIdx });
                            if (onVersionChange) onVersionChange(versions[nextIdx]);
                          }}
                          title="Phiên bản trước"
                        >
                          ‹
                        </button>
                        <span>{currentIdx + 1}/{versions.length}</span>
                        <button
                          type="button"
                          className="aiVersionBtn"
                          disabled={currentIdx === versions.length - 1 || refiningIndex !== null}
                          onClick={() => {
                            const nextIdx = currentIdx + 1;
                            setVersionIdxMap({ ...versionIdxMap, [index]: nextIdx });
                            if (onVersionChange) onVersionChange(versions[nextIdx]);
                          }}
                          title="Phiên bản sau"
                        >
                          ›
                        </button>
                      </div>
                    )}

                    {copiedIndex === index && (
                      <span className="aiCopiedFeedback">✓ Đã chép</span>
                    )}

                    {/* 3. More Popover ••• */}
                    <div className="aiHeaderMoreContainer">
                      <button
                        type="button"
                        className="aiInlineBtn more"
                        disabled={busy || refiningIndex !== null}
                        onClick={() => setActiveMoreIndex(activeMoreIndex === index ? null : index)}
                        title="Tùy chọn khác"
                      >
                        •••
                      </button>
                      {activeMoreIndex === index && (
                        <div className="aiHeaderDropdownMenu">
                          <button
                            type="button"
                            onClick={() => void handleRegenerate(index, displayContent)}
                          >
                            ↺ Tạo lại
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMoreIndex(null);
                              void onInsertBelow(displayContent);
                            }}
                          >
                            📥 Chèn dưới con trỏ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(index, displayContent)}
                          >
                            📋 Sao chép
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMoreIndex(null);
                              onSaveToKnowledge(displayContent);
                            }}
                          >
                            💾 Lưu Knowledge
                          </button>
                        </div>
                      )}
                    </div>
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
            <div className="aiTypingText">Trợ lý TVCI đang soạn thảo...</div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* 4. Sticky Bottom Composer */}
      <div className="aiInputFooter">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept=".txt,.docx,.md,.json"
          onChange={handleFileUpload}
        />

        <div className="aiComposerBar">
          {/* [+] Attachment and context trigger */}
          <div className="aiComposerAttachContainer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="aiComposerAttachBtn"
              onClick={() => setAttachMenuOpen(!attachMenuOpen)}
              title="Đính kèm tệp hoặc lấy ngữ cảnh"
            >
              ＋
            </button>
            {attachMenuOpen && (
              <div className="aiAttachDropdownMenu">
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  📎 Đính kèm file...
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setAttachMenuOpen(false);
                    try {
                      const sel = await readSelection();
                      if (sel?.trim()) {
                        setAttachment({
                          id: `sel-${Date.now()}`,
                          name: "Đoạn đang chọn trong Word",
                          type: "word",
                          mimeType: "text/plain",
                          size: sel.length,
                          extractedText: sel,
                        });
                      }
                    } catch {}
                  }}
                >
                  ✂️ Dùng đoạn đang chọn
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setAttachMenuOpen(false);
                    try {
                      await Word.run(async (context) => {
                        const body = context.document.body;
                        body.load("text");
                        await context.sync();
                        if (body.text?.trim()) {
                          setAttachment({
                            id: `doc-${Date.now()}`,
                            name: "Toàn bộ văn bản Word",
                            type: "word",
                            mimeType: "text/plain",
                            size: body.text.length,
                            extractedText: body.text,
                          });
                        }
                      });
                    } catch {}
                  }}
                >
                  📄 Dùng toàn văn bản
                </button>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            className="aiChatTextarea"
            rows={1}
            value={inputText}
            placeholder={
              hasSelection
                ? "Yêu cầu xử lý đoạn đang chọn..."
                : "Hỏi AI hoặc yêu cầu soạn thảo văn bản..."
            }
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
            }}
            onKeyDown={handleKeyDown}
            disabled={busy}
          />

          <button
            type="button"
            className="aiComposerSendBtn"
            onClick={() => void handleSend()}
            disabled={busy || !inputText.trim()}
            title="Gửi yêu cầu (Enter)"
          >
            {busy ? "…" : "↑"}
          </button>
        </div>
      </div>

      {/* 5. Safe Field Mapping Review Modal */}
      {fieldReviewModal.isOpen && (
        <div className="aiFieldReviewBackdrop" onClick={() => setFieldReviewModal({ isOpen: false, proposals: [] })}>
          <div className="aiFieldReviewDialog" onClick={(e) => e.stopPropagation()}>
            <div className="aiFieldReviewHeader">
              <div className="aiFieldReviewTitle">Áp dụng vào biểu mẫu</div>
              <button
                type="button"
                className="aiFieldReviewCloseBtn"
                onClick={() => setFieldReviewModal({ isOpen: false, proposals: [] })}
              >
                ✕
              </button>
            </div>
            <div className="aiFieldReviewDesc">
              AI đã trích xuất các trường thông tin. Kiểm tra trước khi điền vào Word:
            </div>
            <div className="aiFieldReviewList">
              {fieldReviewModal.proposals.map((p, idx) => (
                <div key={p.tag} className="aiFieldReviewItem">
                  <label className="aiFieldReviewCheckLabel">
                    <input
                      type="checkbox"
                      checked={p.selected}
                      onChange={(e) => {
                        const updated = [...fieldReviewModal.proposals];
                        updated[idx].selected = e.target.checked;
                        setFieldReviewModal({ ...fieldReviewModal, proposals: updated });
                      }}
                    />
                    <span className="aiFieldReviewItemName">{p.label}</span>
                  </label>
                  <input
                    type="text"
                    className="aiFieldReviewItemInput"
                    value={p.value}
                    onChange={(e) => {
                      const updated = [...fieldReviewModal.proposals];
                      updated[idx].value = e.target.value;
                      setFieldReviewModal({ ...fieldReviewModal, proposals: updated });
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="aiFieldReviewFooter">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setFieldReviewModal({ isOpen: false, proposals: [] })}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleConfirmApplyFields()}
              >
                Áp dụng {fieldReviewModal.proposals.filter((p) => p.selected).length} trường
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
