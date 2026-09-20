import React, { useState, useMemo } from "react";
import type { TemplateRecord, TemplateOrganization } from "../../templates/library";
import { getRecentTemplateIds, getFavoriteTemplateIds, toggleFavoriteTemplate } from "../../templates/recent-favorites";

export interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TemplateRecord[];
  onOpenForm: (template: TemplateRecord) => void;
  onDirectInsert: (template: TemplateRecord) => void;
  onOpenWizard: () => void;
  initialFilter?: "all" | "recent" | "favorite";
}

type TabType = "all" | "recent" | "favorite" | "TVCI" | "IEMM" | "DANG";

export function TemplateLibraryModal({
  isOpen,
  onClose,
  templates,
  onOpenForm,
  onDirectInsert,
  onOpenWizard,
  initialFilter = "all",
}: TemplateLibraryModalProps): React.ReactElement | null {
  const [tab, setTab] = useState<TabType>(initialFilter);
  const [keyword, setKeyword] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteTemplateIds());

  if (!isOpen) return null;

  const recentIds = getRecentTemplateIds();

  const handleToggleFav = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteTemplate(templateId);
    setFavorites(getFavoriteTemplateIds());
  };

  const filtered = templates.filter((t) => {
    // Tab filter
    if (tab === "recent") {
      if (!recentIds.includes(t.id)) return false;
    } else if (tab === "favorite") {
      if (!favorites.includes(t.id)) return false;
    } else if (tab === "TVCI" || tab === "IEMM" || tab === "DANG") {
      if (t.organization !== tab) return false;
    }

    // Keyword filter
    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchType = t.documentType?.toLowerCase().includes(q);
      const matchDept = t.department?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchType && !matchDept) return false;
    }

    return true;
  });

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog templateLibraryModalDialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modalHeader">
          <div className="modalTitle">
            <span>📚</span> Kho Biểu Mẫu Hành Chính Chuẩn
          </div>
          <button type="button" className="modalCloseBtn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Filter Toolbar */}
        <div style={{ padding: "12px 14px 0", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              className="docSettingsInput"
              style={{ flex: 1 }}
              placeholder="🔍 Tìm kiếm mẫu văn bản, công văn, quyết định..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline"
              style={{ whiteSpace: "nowrap" }}
              onClick={onOpenWizard}
            >
              ➕ Tạo biểu mẫu mới
            </button>
          </div>

          {/* Tabs */}
          <div className="inspectionFilterBar" style={{ margin: 0, paddingBottom: 8 }}>
            <button
              type="button"
              className={`inspectionFilterBtn ${tab === "all" ? "active" : ""}`}
              onClick={() => setTab("all")}
            >
              Tất cả ({templates.length})
            </button>
            <button
              type="button"
              className={`inspectionFilterBtn ${tab === "recent" ? "active" : ""}`}
              onClick={() => setTab("recent")}
            >
              🕒 Gần đây ({recentIds.length})
            </button>
            <button
              type="button"
              className={`inspectionFilterBtn ${tab === "favorite" ? "active" : ""}`}
              onClick={() => setTab("favorite")}
            >
              ⭐ Yêu thích ({favorites.length})
            </button>
            <button
              type="button"
              className={`inspectionFilterBtn ${tab === "TVCI" ? "active" : ""}`}
              onClick={() => setTab("TVCI")}
            >
              Trung tâm Thử nghiệm - Kiểm định Công nghiệp
            </button>
            <button
              type="button"
              className={`inspectionFilterBtn ${tab === "IEMM" ? "active" : ""}`}
              onClick={() => setTab("IEMM")}
            >
              Viện Cơ khí Năng lượng và Mỏ - Vinacomin
            </button>
            <button
              type="button"
              className={`inspectionFilterBtn ${tab === "DANG" ? "active" : ""}`}
              onClick={() => setTab("DANG")}
            >
              Đảng
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modalBody" style={{ maxHeight: "65vh", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
              Không tìm thấy biểu mẫu nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="templateCardsGrid">
              {filtered.map((tmpl) => {
                const isFav = favorites.includes(tmpl.id);
                return (
                  <div key={tmpl.id} className="templateCardItem">
                    <div className="templateCardHeader">
                      <span className="templateOrgBadge">{tmpl.organization}</span>
                      <button
                        type="button"
                        className={`templateFavBtn ${isFav ? "active" : ""}`}
                        onClick={(e) => handleToggleFav(tmpl.id, e)}
                        title={isFav ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                      >
                        {isFav ? "★" : "☆"}
                      </button>
                    </div>

                    <div className="templateCardTitle">{tmpl.name}</div>
                    {tmpl.description && (
                      <div className="templateCardDesc">{tmpl.description}</div>
                    )}

                    <div className="templateCardMeta">
                      {tmpl.documentType && <span>📄 {tmpl.documentType}</span>}
                      {tmpl.department && <span>🏢 {tmpl.department}</span>}
                    </div>

                    <div className="templateCardActions">
                      <button
                        type="button"
                        className="templateActionBtn outline"
                        onClick={() => {
                          onDirectInsert(tmpl);
                          onClose();
                        }}
                        title="Chèn nguyên mẫu trực tiếp vào Word"
                      >
                        Chèn nhanh
                      </button>
                      <button
                        type="button"
                        className="templateActionBtn primary"
                        onClick={() => {
                          onOpenForm(tmpl);
                          onClose();
                        }}
                        title="Mở form nhập thông tin để tự động điền"
                      >
                        Điền & Chèn
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modalFooter">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
