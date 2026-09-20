import React, { useState, useEffect, useMemo, useRef } from "react";
import type { KnowledgeCategory, KnowledgeRecord, KnowledgeScope } from "../../knowledge/models";
import { KNOWLEDGE_CATEGORY_META } from "../../knowledge/models";
import { findDuplicateKnowledge, type DuplicateKnowledgeMatch } from "../../knowledge/similarity";
import { readDocumentText, readSelection } from "../../word/selection.service";
import { requestAiPromptDirect, type AiSettings } from "../../ai/direct-client";
import { processAttachmentFile } from "../../ai/attachment.service";

export interface LearnExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRecords: KnowledgeRecord[];
  onSaveRecord: (record: KnowledgeRecord) => Promise<void>;
  onNotify: (msg: string) => void;
  aiSettings?: AiSettings;
}

type SourceMode = "upload_file" | "current_word";

const CATEGORIES: KnowledgeCategory[] = ["experience", "phrase", "guideline", "mandatory"];
const SCOPES: Array<{ id: KnowledgeScope; label: string }> = [
  { id: "TVCI", label: "Trung tâm TVCI" },
  { id: "IEMM", label: "Viện IEMM" },
  { id: "DANG", label: "Văn bản Đảng" },
  { id: "COMMON", label: "Dùng chung" },
];

export function LearnExperienceModal({
  isOpen,
  onClose,
  existingRecords,
  onSaveRecord,
  onNotify,
  aiSettings,
}: LearnExperienceModalProps): React.ReactElement | null {
  const [sourceMode, setSourceMode] = useState<SourceMode>("upload_file");
  const [sourceDocText, setSourceDocText] = useState("");
  const [isSelectionOnly, setIsSelectionOnly] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // File dropzone states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [targetId, setTargetId] = useState<string | null>(null); // null: new record, string: update existing
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>("experience");
  const [scope, setScope] = useState<KnowledgeScope>("TVCI");
  const [tagsInput, setTagsInput] = useState("");
  const [exampleSnippet, setExampleSnippet] = useState("");
  const [referenceSource, setReferenceSource] = useState("");
  const [forceNew, setForceNew] = useState(false);

  // Real-time duplicate check
  const duplicateMatches: DuplicateKnowledgeMatch[] = useMemo(() => {
    if (!title.trim() && !content.trim()) return [];
    return findDuplicateKnowledge(
      { title: title.trim(), content: content.trim(), id: targetId || undefined },
      existingRecords,
      0.65
    );
  }, [title, content, targetId, existingRecords]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSourceDocText("");
      setUploadedFile(null);
      setTitle("");
      setContent("");
      setTagsInput("");
      setExampleSnippet("");
      setReferenceSource("");
      setTargetId(null);
      setForceNew(false);
      setSourceMode("upload_file");
    }
  }, [isOpen]);

  // Read active Word doc if user switches to "current_word"
  const loadWordDocument = async () => {
    setIsAnalyzing(true);
    try {
      let text = "";
      let isSel = false;
      try {
        const sel = (await readSelection()).trim();
        if (sel.length >= 20) {
          text = sel;
          isSel = true;
        }
      } catch {}

      if (!text) {
        try {
          text = (await readDocumentText()).trim();
        } catch {}
      }

      setSourceDocText(text);
      setIsSelectionOnly(isSel);
      setUploadedFile(null);

      if (text) {
        heuristicExtract(text, isSel, isSel ? "Đoạn văn bôi đen trong Word" : "Tài liệu Word đang mở");
        if (aiSettings?.apiKey?.trim()) {
          await aiExtract(text, aiSettings);
        }
      }
    } catch (err) {
      console.warn("Lỗi đọc văn bản Word:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setIsAnalyzing(true);
    try {
      let text = "";
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
        const attachment = await processAttachmentFile(file);
        text = attachment.extractedText || "";
      } else if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".json")) {
        text = await file.text();
      } else {
        const attachment = await processAttachmentFile(file);
        text = attachment.extractedText || "";
      }

      setSourceDocText(text);
      setReferenceSource(file.name);

      if (text.trim()) {
        heuristicExtract(text, false, file.name);
        if (aiSettings?.apiKey?.trim()) {
          await aiExtract(text, aiSettings);
        }
        onNotify(`Đã trích xuất nội dung từ tệp "${file.name}"`);
      } else {
        onNotify(`Đã tải tệp "${file.name}". Không thể trích xuất văn bản thô tự động.`);
        setTitle(`Kinh nghiệm từ: ${file.name.replace(/\.[^/.]+$/, "")}`);
        setReferenceSource(file.name);
      }
    } catch (err) {
      console.error("Lỗi đọc tệp:", err);
      onNotify(`Lỗi khi đọc tệp: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const heuristicExtract = (text: string, isSel: boolean, sourceName: string) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "Kinh nghiệm soạn thảo";
    const snippet = lines.slice(0, 3).join(" ").slice(0, 250);

    let detectedScope: KnowledgeScope = "COMMON";
    if (/TVCI|Thử nghiệm|Kiểm định/i.test(text)) detectedScope = "TVCI";
    else if (/IEMM|Viện Cơ điện/i.test(text)) detectedScope = "IEMM";
    else if (/Chi bộ|Đảng ủy|Nghị quyết/i.test(text)) detectedScope = "DANG";

    let detectedCategory: KnowledgeCategory = "experience";
    if (/Căn cứ|Điều|Khoản|bắt buộc|phải/i.test(text)) detectedCategory = "mandatory";
    else if (/Kính gửi|Trân trọng|Xin ý kiến|đề nghị/i.test(text)) detectedCategory = "phrase";

    const titlePrefix = isSel ? "Mẫu câu / Cách dùng: " : "Kinh nghiệm từ: ";
    const cleanTitle = (titlePrefix + firstLine.replace(/[\r\n\t]+/g, " ")).slice(0, 60);

    setTitle(cleanTitle);
    setContent(snippet ? `Quy chuẩn áp dụng: ${snippet}` : "Đúc kết kinh nghiệm văn phong và thể thức chuẩn từ văn bản.");
    setExampleSnippet(snippet);
    setCategory(detectedCategory);
    setScope(detectedScope);
    setReferenceSource(sourceName);
    setTagsInput("kinh-nghiem, quy-chuan, van-phong");
  };

  const aiExtract = async (text: string, settings: AiSettings) => {
    try {
      const prompt = `Bạn là chuyên gia thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP).
Hãy phân tích đoạn văn kiện sau và đúc kết thành 1 mục KINH NGHIỆM / TRI THỨC NGẮN GỌN (Knowledge Record) để lưu vào kho tri thức của đơn vị.

Văn bản:
"""
${text.slice(0, 1500)}
"""

Yêu cầu trả về DUY NHẤT một JSON hợp lệ dạng:
{
  "title": "Tên kinh nghiệm ngắn gọn (dưới 60 ký tự)",
  "content": "Nội dung mô tả ngắn gọn (2-3 câu, súc tích, dễ nhớ)",
  "category": "experience" | "phrase" | "guideline" | "mandatory",
  "scope": "TVCI" | "IEMM" | "DANG" | "COMMON",
  "tags": ["tag1", "tag2", "tag3"],
  "exampleSnippet": "1 câu hoặc đoạn tiêu biểu trích từ văn bản"
}`;

      const res = await requestAiPromptDirect(settings, prompt);
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.content) setContent(parsed.content);
        if (parsed.category && CATEGORIES.includes(parsed.category)) setCategory(parsed.category);
        if (parsed.scope && ["TVCI", "IEMM", "DANG", "COMMON"].includes(parsed.scope)) setScope(parsed.scope);
        if (Array.isArray(parsed.tags)) setTagsInput(parsed.tags.join(", "));
        if (parsed.exampleSnippet) setExampleSnippet(parsed.exampleSnippet);
      }
    } catch (err) {
      console.warn("AI extraction fallback to heuristic:", err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      onNotify("Vui lòng nhập Tên kinh nghiệm.");
      return;
    }
    if (!content.trim()) {
      onNotify("Vui lòng nhập Nội dung mô tả ngắn gọn.");
      return;
    }

    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(/[,;]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const recordToSave: KnowledgeRecord = {
        id: targetId || `kb-exp-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        category,
        scope,
        tags: tags.length > 0 ? tags : ["kinh-nghiem"],
        referenceSource: referenceSource.trim() || undefined,
        exampleSnippet: exampleSnippet.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await onSaveRecord(recordToSave);
      onNotify(targetId ? `Đã cập nhật tri thức: "${recordToSave.title}"` : `Đã lưu kinh nghiệm mới vào Kho tri thức!`);
      onClose();
    } catch (err) {
      onNotify(`Không thể lưu tri thức: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isDialog = typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("dialog") === "1" || window.location.pathname.endsWith("dialog.html"));

  const primaryDuplicate = duplicateMatches[0];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const modalContent = (
    <div
      style={{
        width: "100%",
        height: isDialog ? "100vh" : "640px",
        maxHeight: isDialog ? "100vh" : "90vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          borderBottom: "1px solid #e2e8f0",
          background: "linear-gradient(to right, #f8fafc, #ffffff)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            🧠
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>
              Đúc Kết Tri Thức &amp; Nhận Kinh Nghiệm
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>
              Tải tệp văn kiện lên Dropzone hoặc lấy từ tài liệu Word để AI trích xuất trường tương ứng
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 6,
            borderRadius: 6,
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
          title="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Source Selector Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          background: "#f1f5f9",
          padding: "6px 18px 0",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setSourceMode("upload_file")}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: sourceMode === "upload_file" ? 700 : 500,
            color: sourceMode === "upload_file" ? "#2563eb" : "#64748b",
            background: sourceMode === "upload_file" ? "#ffffff" : "transparent",
            border: "1px solid",
            borderColor: sourceMode === "upload_file" ? "#e2e8f0 #e2e8f0 #ffffff" : "transparent",
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            marginBottom: -1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>📁</span> Tải tệp văn kiện lên (Dropzone)
        </button>

        <button
          type="button"
          onClick={() => {
            setSourceMode("current_word");
            void loadWordDocument();
          }}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: sourceMode === "current_word" ? 700 : 500,
            color: sourceMode === "current_word" ? "#2563eb" : "#64748b",
            background: sourceMode === "current_word" ? "#ffffff" : "transparent",
            border: "1px solid",
            borderColor: sourceMode === "current_word" ? "#e2e8f0 #e2e8f0 #ffffff" : "transparent",
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            marginBottom: -1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>📄</span> Đọc từ tài liệu Word hiện tại
        </button>
      </div>

      {/* Main Body Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        {/* Source Mode: Upload File Dropzone */}
        {sourceMode === "upload_file" && (
          <div style={{ marginBottom: 16 }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".docx,.doc,.pdf,.txt,.md,.json"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  void handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {!uploadedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    void handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? "2px dashed #2563eb" : "2px dashed #cbd5e1",
                  backgroundColor: isDragging ? "#eff6ff" : "#f8fafc",
                  borderRadius: 10,
                  padding: "24px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                  Kéo thả tệp văn kiện vào đây, hoặc <span style={{ color: "#2563eb", textDecoration: "underline" }}>bấm để chọn tệp</span>
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  Hỗ trợ định dạng .docx, .doc, .pdf, .txt. AI sẽ tự động đọc và đúc kết thành các trường tương ứng để lưu lại.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {uploadedFile.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      Kích thước: {formatFileSize(uploadedFile.size)} • <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Đã nạp dữ liệu</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  Chọn tệp khác
                </button>
              </div>
            )}
          </div>
        )}

        {/* Source Mode: Current Word Notice */}
        {sourceMode === "current_word" && (
          <div
            style={{
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 12,
              color: "#334155",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span>📄 Nguồn: </span>
              <strong>{isSelectionOnly ? "Đoạn văn bôi đen trong Word" : "Toàn bộ tài liệu Word đang mở"}</strong>
            </div>
            <button
              type="button"
              onClick={() => void loadWordDocument()}
              style={{
                padding: "3px 8px",
                fontSize: 11,
                borderRadius: 4,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              🔄 Quét lại Word
            </button>
          </div>
        )}

        {/* Analyzing banner */}
        {isAnalyzing && (
          <div
            style={{
              padding: "10px 14px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              color: "#1d4ed8",
              fontSize: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⏳</span> Đang đọc và AI phân tích trích xuất thành các trường dữ liệu...
          </div>
        )}

        {/* Duplicate Warning Guard */}
        {!forceNew && primaryDuplicate && (
          <div
            style={{
              padding: "12px 14px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                  Phát hiện tri thức tương tự trong kho: &ldquo;{primaryDuplicate.record.title}&rdquo;
                </div>
                <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
                  Mức độ tương đồng: <strong>{Math.round(primaryDuplicate.score * 100)}%</strong> (trùng khớp{" "}
                  {primaryDuplicate.matchReason === "title"
                    ? "tiêu đề"
                    : primaryDuplicate.matchReason === "content"
                    ? "nội dung"
                    : "cả tiêu đề và nội dung"}
                  ).
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetId(primaryDuplicate.record.id);
                      setTitle(primaryDuplicate.record.title);
                      setCategory(primaryDuplicate.record.category);
                      setScope(primaryDuplicate.record.scope);
                    }}
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      background: "#d97706",
                      color: "#ffffff",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cập nhật vào tri thức này
                  </button>
                  <button
                    type="button"
                    onClick={() => setForceNew(true)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 500,
                      borderRadius: 6,
                      background: "#ffffff",
                      color: "#92400e",
                      border: "1px solid #d97706",
                      cursor: "pointer",
                    }}
                  >
                    Vẫn lưu bản ghi mới
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {targetId && (
          <div
            style={{
              padding: "8px 12px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 6,
              color: "#166534",
              fontSize: 12,
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              Đang ở chế độ: <strong>Cập nhật tri thức đã có</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setTargetId(null);
                setForceNew(true);
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#15803d",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Hủy, chuyển sang tạo mới
            </button>
          </div>
        )}

        {/* 1. Tên tri thức */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            Tên kinh nghiệm / Tiêu đề tri thức <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Quy chuẩn căn cứ pháp lý cho Quyết định khen thưởng..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              fontWeight: 500,
              color: "#0f172a",
            }}
          />
        </div>

        {/* 2. Phân loại & Phạm vi */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Phân loại tri thức
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {CATEGORIES.map((cat) => {
                const meta = KNOWLEDGE_CATEGORY_META[cat];
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: active ? `2px solid ${meta.border}` : "1px solid #e2e8f0",
                      background: active ? meta.bg : "#ffffff",
                      color: active ? meta.color : "#475569",
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>{meta.icon}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Đơn vị áp dụng
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as KnowledgeScope)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 12,
                color: "#0f172a",
                background: "#ffffff",
              }}
            >
              {SCOPES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Nội dung mô tả ngắn gọn */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            Nội dung mô tả ngắn gọn (2-4 câu đúc kết) <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tóm tắt ngắn gọn bài học, nguyên tắc, quy định hoặc kinh nghiệm cần nhớ..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "#1e293b",
              resize: "vertical",
            }}
          />
        </div>

        {/* 4. Đoạn trích mẫu */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            Đoạn văn mẫu thực tế (Trích dẫn minh họa)
          </label>
          <textarea
            rows={2}
            value={exampleSnippet}
            onChange={(e) => setExampleSnippet(e.target.value)}
            placeholder="Câu văn thực tế trích từ văn bản làm minh họa..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 12,
              color: "#475569",
              background: "#f8fafc",
              resize: "vertical",
            }}
          />
        </div>

        {/* 5. Từ khóa & Nguồn tham chiếu */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Từ khóa tìm kiếm (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="quy-chuan, can-cu, nghiem-thu"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 12,
                color: "#0f172a",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Nguồn văn bản tham chiếu
            </label>
            <input
              type="text"
              value={referenceSource}
              onChange={(e) => setReferenceSource(e.target.value)}
              placeholder="Tên hoặc số hiệu văn bản..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 12,
                color: "#0f172a",
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: "12px 18px",
          borderTop: "1px solid #e2e8f0",
          background: "#f8fafc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#475569",
            fontWeight: 500,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Hủy bỏ
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isAnalyzing}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 13,
              cursor: isSaving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>💾</span>
            {isSaving ? "Đang lưu..." : targetId ? "Lưu cập nhật tri thức" : "Lưu vào Kho tri thức"}
          </button>
        </div>
      </div>
    </div>
  );

  if (isDialog) {
    return modalContent;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {modalContent}
      </div>
    </div>
  );
}
