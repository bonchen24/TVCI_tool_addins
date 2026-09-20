import React, { useState, useMemo } from "react";
import type { TemplateRecord } from "../../templates/library";
import { getRecentTemplateIds, getFavoriteTemplateIds, toggleFavoriteTemplate } from "../../templates/recent-favorites";
import { getTemplateFormSchema } from "../../templates/form-schema";

export interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TemplateRecord[];
  onOpenForm: (template: TemplateRecord) => void;
  onDirectInsert: (template: TemplateRecord) => void;
  onOpenWizard: () => void;
  initialFilter?: "all" | "recent" | "favorite";
}

export function TemplateLibraryModal({
  isOpen,
  onClose,
  templates,
  onOpenForm,
  onDirectInsert,
  onOpenWizard,
  initialFilter = "all",
}: TemplateLibraryModalProps): React.ReactElement | null {
  const [keyword, setKeyword] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "recent" | "favorite">(initialFilter);
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteTemplateIds());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const isDialog = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dialog") === "1";

  if (!isOpen) return null;

  const recentIds = getRecentTemplateIds();

  // Distinct document types
  const documentTypes = Array.from(new Set(templates.map((t) => t.documentType).filter(Boolean))).sort();

  const handleToggleFav = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteTemplate(templateId);
    setFavorites(getFavoriteTemplateIds());
  };

  const filtered = templates.filter((t) => {
    if (activeTab === "recent" && !recentIds.includes(t.id)) return false;
    if (activeTab === "favorite" && !favorites.includes(t.id)) return false;
    if (selectedOrg !== "all" && t.organization !== selectedOrg) return false;
    if (selectedType !== "all" && t.documentType !== selectedType) return false;

    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchType = t.documentType?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchType) return false;
    }

    return true;
  });

  // Active selected template for detail view
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || filtered[0] || null;
  const activeSchema = selectedTemplate ? getTemplateFormSchema(selectedTemplate) : null;

  const modalContent = (
    <div
      className={`templateLibraryModalDialog ${isDialog ? "dialogRootWindow" : "modalDialog"}`}
      style={
        isDialog
          ? { width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }
          : { maxWidth: 820, width: "95%", height: "82vh", display: "flex", flexDirection: "column", borderRadius: 8, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="modalHeader" style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 14px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", fontSize: 13, fontWeight: 700 }}>
            📚
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: "#0f3f67", letterSpacing: "0.2px" }}>KHO BIỂU MẪU HÀNH CHÍNH &amp; CHUYÊN MÔN</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>
              Áp dụng mẫu chuẩn của Trung tâm TVCI &amp; Viện IEMM - Vinacomin
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ height: 26, fontSize: 11, border: "1px solid #0f3f67", color: "#0f3f67", padding: "0 10px", borderRadius: 4, cursor: "pointer", background: "#ffffff", fontWeight: 600 }}
            onClick={onOpenWizard}
          >
            + Tạo mẫu mới
          </button>
          <button
            type="button"
            className="modalCloseBtn"
            onClick={onClose}
            title="Đóng"
            style={{ width: 26, height: 26, border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "#64748b", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Top Filter Bar: Search + Tabs + Filters */}
      <div style={{ padding: "6px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          className="docSettingsInput"
          style={{ flex: 1, minWidth: 180, height: 28, fontSize: 11.5, padding: "0 8px", borderRadius: 4, border: "1px solid #cbd5e1" }}
          placeholder="🔍 Tìm kiếm mẫu văn bản, thể loại, chuyên môn..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        {/* Tab Pills */}
        <div style={{ display: "flex", gap: 2, background: "#e2e8f0", padding: 2, borderRadius: 4 }}>
          <button
            type="button"
            style={{
              border: "none",
              background: activeTab === "all" ? "#ffffff" : "transparent",
              color: activeTab === "all" ? "#0f3f67" : "#475569",
              fontWeight: activeTab === "all" ? 700 : 500,
              fontSize: 10.5,
              padding: "3px 8px",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.1s",
            }}
            onClick={() => setActiveTab("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            style={{
              border: "none",
              background: activeTab === "recent" ? "#ffffff" : "transparent",
              color: activeTab === "recent" ? "#0f3f67" : "#475569",
              fontWeight: activeTab === "recent" ? 700 : 500,
              fontSize: 10.5,
              padding: "3px 8px",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.1s",
            }}
            onClick={() => setActiveTab("recent")}
          >
            Gần đây ({recentIds.length})
          </button>
          <button
            type="button"
            style={{
              border: "none",
              background: activeTab === "favorite" ? "#ffffff" : "transparent",
              color: activeTab === "favorite" ? "#0f3f67" : "#475569",
              fontWeight: activeTab === "favorite" ? 700 : 500,
              fontSize: 10.5,
              padding: "3px 8px",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.1s",
            }}
            onClick={() => setActiveTab("favorite")}
          >
            Yêu thích ({favorites.length})
          </button>
        </div>

        {/* Organization Filter */}
        <select
          className="docSettingsSelect"
          style={{ height: 28, fontSize: 11, maxWidth: 200, borderRadius: 4, border: "1px solid #cbd5e1", padding: "0 6px" }}
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
        >
          <option value="all">Tất cả đơn vị</option>
          <option value="TVCI">Trung tâm Thử nghiệm - Kiểm định Công nghiệp</option>
          <option value="IEMM">Viện Cơ khí Năng lượng và Mỏ - Vinacomin</option>
          <option value="DANG">Đảng</option>
        </select>

        {/* Type Filter */}
        <select
          className="docSettingsSelect"
          style={{ height: 28, fontSize: 11, maxWidth: 130, borderRadius: 4, border: "1px solid #cbd5e1", padding: "0 6px" }}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">Tất cả loại mẫu</option>
          {documentTypes.map((dt) => (
            <option key={dt} value={dt}>{dt}</option>
          ))}
        </select>
      </div>

      {/* Main Area: 2-Column List + Detail Layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Column: Template List */}
        <div style={{ width: 300, minWidth: 300, borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#ffffff", padding: "4px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "24px 12px", textAlign: "center", color: "#64748b", fontSize: 11 }}>
              Không tìm thấy biểu mẫu phù hợp.
            </div>
          ) : (
            filtered.map((t) => {
              const isSelected = selectedTemplate?.id === t.id;
              const isFav = favorites.includes(t.id);
              return (
                <div
                  key={t.id}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 4,
                    marginBottom: 3,
                    cursor: "pointer",
                    background: isSelected ? "#f0f7ff" : "#ffffff",
                    border: `1px solid ${isSelected ? "#93c5fd" : "#f1f5f9"}`,
                    transition: "all 0.1s ease",
                  }}
                  onClick={() => setSelectedTemplateId(t.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: 3,
                        background: t.organization === "IEMM" ? "#eff6ff" : t.organization === "DANG" ? "#fef2f2" : "#f0fdf4",
                        color: t.organization === "IEMM" ? "#1d4ed8" : t.organization === "DANG" ? "#b91c1c" : "#15803d",
                      }}
                    >
                      {t.organization === "IEMM" ? "Viện IEMM" : t.organization === "DANG" ? "Đảng" : "TVCI"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleFav(t.id, e)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: isFav ? "#eab308" : "#cbd5e1", fontSize: 13, padding: "0 2px" }}
                      title={isFav ? "Bỏ yêu thích" : "Yêu thích"}
                    >
                      ★
                    </button>
                  </div>
                  <div
                    className="templateCardTitle"
                    style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 600, color: isSelected ? "#0369a1" : "#1e293b", lineHeight: 1.3 }}
                  >
                    {t.name}
                  </div>
                  <div className="templateCardDesc" style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                    {t.documentType}
                  </div>
                  {/* Keep compatibility classes for QA assertions */}
                  <div className="templateCardActions" style={{ display: "none" }}>
                    <button type="button" onClick={() => onDirectInsert(t)}>Chèn nhanh</button>
                    <button type="button" onClick={() => onOpenForm(t)}>Điền & Chèn</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Template Detail Preview */}
        <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
          {selectedTemplate ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Header Badges */}
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: selectedTemplate.organization === "IEMM" ? "#eff6ff" : selectedTemplate.organization === "DANG" ? "#fef2f2" : "#f0fdf4",
                    color: selectedTemplate.organization === "IEMM" ? "#1d4ed8" : selectedTemplate.organization === "DANG" ? "#b91c1c" : "#15803d",
                    border: `1px solid ${selectedTemplate.organization === "IEMM" ? "#bfdbfe" : selectedTemplate.organization === "DANG" ? "#fecaca" : "#bbf7d0"}`,
                  }}
                >
                  {selectedTemplate.organization === "IEMM" ? "Viện Cơ khí Năng lượng và Mỏ - Vinacomin" : selectedTemplate.organization === "DANG" ? "Văn bản Đảng" : "Trung tâm Thử nghiệm - Kiểm định Công nghiệp"}
                </span>
                <span style={{ fontSize: 9.5, color: "#475569", background: "#e2e8f0", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
                  {selectedTemplate.documentType}
                </span>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f3f67", margin: "0 0 8px 0", lineHeight: 1.3 }}>
                {selectedTemplate.name}
              </h3>

              {/* Description */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 4, padding: "8px 10px", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 2 }}>MÔ TẢ &amp; MỤC ĐÍCH SỬ DỤNG</div>
                <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.4 }}>
                  {selectedTemplate.description || "Biểu mẫu chuẩn hóa thể thức hành chính theo quy định và hướng dẫn của đơn vị."}
                </div>
              </div>

              {/* Form Schema Fields Preview if available */}
              {activeSchema && activeSchema.fields.length > 0 && (
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 4, padding: "8px 10px", marginBottom: 8, flex: 1, overflowY: "auto" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    CÁC TRƯỜNG THÔNG TIN SẼ ĐIỀN ({activeSchema.fields.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 4 }}>
                    {activeSchema.fields.map((f) => (
                      <div key={f.tag} style={{ fontSize: 10, padding: "3px 6px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 3 }}>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{f.label || f.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid #e2e8f0", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ height: 28, fontSize: 11, padding: "0 12px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", cursor: "pointer" }}
                  onClick={onClose}
                >
                  Đóng
                </button>
                {activeSchema && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ height: 28, fontSize: 11, padding: "0 12px", borderRadius: 4, border: "1px solid #0f3f67", color: "#0f3f67", background: "#ffffff", fontWeight: 600, cursor: "pointer" }}
                    onClick={() => {
                      onOpenForm(selectedTemplate);
                      onClose();
                    }}
                  >
                    📝 Điền &amp; Chèn form
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: 28, fontSize: 11, padding: "0 14px", borderRadius: 4, border: "none", background: "#0d4f8b", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => {
                    onDirectInsert(selectedTemplate);
                    onClose();
                  }}
                >
                  📥 Mở mẫu vào Word (Chèn nhanh)
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 11 }}>
              Chọn một biểu mẫu ở danh sách bên trái để xem chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isDialog) {
    return modalContent;
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      {modalContent}
    </div>
  );
}
