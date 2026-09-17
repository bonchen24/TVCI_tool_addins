import React, { useState, useMemo } from "react";
import type { KnowledgeCategory, KnowledgeRecord, KnowledgeScope } from "../../knowledge/models";
import { KNOWLEDGE_CATEGORY_META } from "../../knowledge/models";
import { searchKnowledge } from "../../knowledge/search";
import { insertBelowSelection } from "../../word/selection.service";

export interface KnowledgeBaseViewProps {
  records: KnowledgeRecord[];
  onSaveRecord: (record: KnowledgeRecord) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onNotify: (msg: string) => void;
}

const CATEGORIES: Array<{ key: KnowledgeCategory | "all"; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "mandatory", label: "🔴 Bắt buộc" },
  { key: "guideline", label: "🔵 Hướng dẫn" },
  { key: "experience", label: "🟡 Kinh nghiệm" },
  { key: "phrase", label: "🟢 Mẫu câu" },
];

export function KnowledgeBaseView({
  records,
  onSaveRecord,
  onDeleteRecord,
  onNotify,
}: KnowledgeBaseViewProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | "all">("all");
  const [selectedScope, setSelectedScope] = useState<KnowledgeScope | "ALL">("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New record form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>("experience");
  const [newScope, setNewScope] = useState<KnowledgeScope>("TVCI");
  const [newSource, setNewSource] = useState("");
  const [newSnippet, setNewSnippet] = useState("");
  const [newTags, setNewTags] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredRecords = useMemo(() => {
    return searchKnowledge(records, {
      query,
      category: selectedCategory,
      scope: selectedScope,
    });
  }, [records, query, selectedCategory, selectedScope]);

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify("Đã sao chép vào bộ nhớ tạm.");
    } catch {
      onNotify("Không thể sao chép tự động.");
    }
  };

  const handleInsertSnippet = async (text: string) => {
    try {
      await insertBelowSelection(text);
      onNotify("Đã chèn mẫu câu vào văn bản Word.");
    } catch (err) {
      onNotify(`Lỗi chèn vào Word: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateRecord = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      onNotify("Vui lòng nhập đầy đủ tiêu đề và nội dung lưu ý.");
      return;
    }

    setBusy(true);
    try {
      const record: KnowledgeRecord = {
        id: `kb-custom-${Date.now()}`,
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        scope: newScope,
        referenceSource: newSource.trim() || undefined,
        exampleSnippet: newSnippet.trim() || undefined,
        tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
        createdAt: new Date().toISOString(),
      };

      await onSaveRecord(record);
      setIsAddModalOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewSnippet("");
      setNewSource("");
      setNewTags("");
      onNotify(`Đã lưu lưu ý nghiệp vụ "${record.title}".`);
    } catch (err) {
      onNotify(`Không thể lưu: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="knowledgeBaseContainer" aria-label="Kho kiến thức nghiệp vụ">
      {/* Search and Action Bar */}
      <div className="kbTopBar">
        <div className="kbSearchBox">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Tìm kiếm quy tắc, lưu ý, kinh nghiệm, mẫu câu..."
          />
          {query && (
            <button type="button" className="clearSearchBtn" onClick={() => setQuery("")}>
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          className="primary kbAddBtn"
          onClick={() => setIsAddModalOpen(true)}
          title="Thêm lưu ý nghiệp vụ mới"
        >
          ➕ Thêm lưu ý
        </button>
      </div>

      {/* Filter Category Pills */}
      <div className="kbCategoryPills">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            className={`categoryPill ${selectedCategory === cat.key ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Scope Filter Bar */}
      <div className="kbScopeBar">
        <span className="kbScopeLabel">Đơn vị:</span>
        {(["ALL", "TVCI", "IEMM", "DANG"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`scopeChip ${selectedScope === s ? "active" : ""}`}
            onClick={() => setSelectedScope(s)}
          >
            {s === "ALL" ? "Tất cả" : s}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="kbCountLabel">{filteredRecords.length} lưu ý</span>
      </div>

      {/* Records List */}
      <div className="kbRecordsList">
        {filteredRecords.length === 0 ? (
          <div className="empty">
            <p>Không tìm thấy lưu ý nghiệp vụ phù hợp với từ khóa hoặc bộ lọc.</p>
          </div>
        ) : (
          filteredRecords.map((item) => {
            const meta = KNOWLEDGE_CATEGORY_META[item.category];
            const isCustom = item.id.startsWith("kb-custom-");

            return (
              <div
                className="knowledgeCard"
                key={item.id}
                style={{
                  borderLeft: `4px solid ${meta.border}`,
                  background: meta.bg,
                }}
              >
                <div className="kbCardHeader">
                  <div className="kbCategoryBadge" style={{ color: meta.color }}>
                    <span>{meta.icon} {meta.label}</span>
                    <span className="kbScopeTag">[{item.scope}]</span>
                  </div>
                  {item.referenceSource && (
                    <span className="kbSourceBadge" title={`Nguồn: ${item.referenceSource}`}>
                      {item.referenceSource}
                    </span>
                  )}
                </div>

                <h4 className="kbCardTitle">{item.title}</h4>
                <p className="kbCardContent">{item.content}</p>

                {item.exampleSnippet && (
                  <div className="kbSnippetBox">
                    <pre>{item.exampleSnippet}</pre>
                    <div className="kbSnippetActions">
                      <button type="button" onClick={() => void handleCopyText(item.exampleSnippet!)}>
                        📋 Sao chép
                      </button>
                      <button type="button" className="primary" onClick={() => void handleInsertSnippet(item.exampleSnippet!)}>
                        ⚡ Chèn vào Word
                      </button>
                    </div>
                  </div>
                )}

                {item.tags.length > 0 && (
                  <div className="kbTagsList">
                    {item.tags.map((tag, idx) => (
                      <span className="tagBadge" key={idx}>#{tag}</span>
                    ))}
                  </div>
                )}

                {isCustom && (
                  <div className="kbCustomActions">
                    <button
                      type="button"
                      className="removeFieldBtn"
                      onClick={() => {
                        if (window.confirm(`Xóa lưu ý "${item.title}"?`)) {
                          void onDeleteRecord(item.id);
                        }
                      }}
                    >
                      Xóa lưu ý này
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Record Modal */}
      {isAddModalOpen && (
        <div className="templateWizardOverlay" role="dialog" aria-modal="true" aria-label="Thêm lưu ý nghiệp vụ">
          <div className="templateWizardModal" style={{ maxWidth: 460 }}>
            <div className="templateWizardHeader">
              <h3>➕ Thêm lưu ý nghiệp vụ mới</h3>
              <button type="button" className="closeBtn" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <div className="templateWizardBody" style={{ display: "grid", gap: 8 }}>
              <label>
                Tiêu đề lưu ý <span style={{ color: "#ef4444" }}>*</span>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Lưu ý viết tắt tên phòng trong báo cáo..."
                />
              </label>

              <div className="grid2">
                <label>
                  Phân loại
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as KnowledgeCategory)}>
                    <option value="mandatory">🔴 Quy tắc bắt buộc</option>
                    <option value="guideline">🔵 Hướng dẫn trình bày</option>
                    <option value="experience">🟡 Kinh nghiệm thực tế</option>
                    <option value="phrase">🟢 Mẫu câu chuẩn</option>
                  </select>
                </label>
                <label>
                  Phạm vi áp dụng
                  <select value={newScope} onChange={(e) => setNewScope(e.target.value as KnowledgeScope)}>
                    <option value="TVCI">Trung tâm TVCI</option>
                    <option value="IEMM">Viện IEMM</option>
                    <option value="DANG">Văn bản Đảng</option>
                    <option value="COMMON">Dùng chung</option>
                  </select>
                </label>
              </div>

              <label>
                Nội dung hướng dẫn / giải thích <span style={{ color: "#ef4444" }}>*</span>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ghi rõ quy định hoặc kinh nghiệm cần lưu ý..."
                />
              </label>

              <label>
                Ví dụ mẫu câu (đoạn văn bản chuẩn để chèn nhanh)
                <textarea
                  rows={2}
                  value={newSnippet}
                  onChange={(e) => setNewSnippet(e.target.value)}
                  placeholder="Đoạn văn mẫu (nếu có)..."
                />
              </label>

              <div className="grid2">
                <label>
                  Nguồn quy định
                  <input
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="Nghị định 30, Quyết định..."
                  />
                </label>
                <label>
                  Từ khóa (phân cách dấu phẩy)
                  <input
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="tiêu đề, nơi nhận..."
                  />
                </label>
              </div>

              <div style={{ marginTop: 8 }}>
                <button type="button" className="primary large" onClick={handleCreateRecord} disabled={busy}>
                  {busy ? "Đang lưu..." : "💾 Lưu vào Kho kiến thức"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
