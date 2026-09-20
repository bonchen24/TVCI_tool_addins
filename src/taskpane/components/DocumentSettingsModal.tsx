import React, { useState, useEffect } from "react";
import {
  type DocumentSettings,
  type DocumentSettingsPresetId,
  getDefaultSettings,
  loadSavedSettings,
  validateDocumentSettings,
} from "../../models/document-settings";

export interface DocumentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: DocumentSettings) => Promise<void>;
  onSaveDefault: (settings: DocumentSettings) => void;
  onSaveAndApply: (settings: DocumentSettings) => Promise<void>;
}

type SettingsSection = "info" | "page_format" | "signer_recipients" | "defaults";

export function DocumentSettingsModal({
  isOpen,
  onClose,
  onApply,
  onSaveDefault,
  onSaveAndApply,
}: DocumentSettingsModalProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<SettingsSection>("info");
  const [settings, setSettings] = useState<DocumentSettings>(() => loadSavedSettings());
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const isDialog = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dialog") === "1";

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSavedSettings());
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: DocumentSettingsPresetId) => {
    const s = getDefaultSettings(presetId);
    setSettings(s);
    setStatusMsg({ type: "info", text: `Đã nạp thiết lập mẫu: ${presetId}` });
  };

  const handleApplyOnly = async () => {
    const val = validateDocumentSettings(settings);
    if (!val.isValid) {
      setStatusMsg({ type: "error", text: val.errors.join("; ") });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      await onApply(settings);
      setStatusMsg({ type: "success", text: "Đã áp dụng định dạng vào văn bản hiện tại!" });
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleResetToDefault = () => {
    const s = getDefaultSettings("TVCI");
    setSettings(s);
    setStatusMsg({ type: "info", text: "Đã khôi phục thiết lập chuẩn TVCI ban đầu." });
  };

  const handleSaveAndApplyAll = async () => {
    const val = validateDocumentSettings(settings);
    if (!val.isValid) {
      setStatusMsg({ type: "error", text: val.errors.join("; ") });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      await onSaveAndApply(settings);
      setStatusMsg({ type: "success", text: "Đã lưu mặc định và áp dụng thành công!" });
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const modalContent = (
    <div
      className={`docSettingsModalDialog ${isDialog ? "dialogRootWindow" : ""}`}
      style={
        isDialog
          ? { width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }
          : { maxWidth: 640, width: "95%", height: "82vh", display: "flex", flexDirection: "column", borderRadius: 8, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="docSettingsModalHeader" style={{ padding: "8px 14px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0369a1", fontSize: 13, fontWeight: 700 }}>
            ⚙
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: "#0f3f67", letterSpacing: "0.2px" }}>THIẾT LẬP VĂN BẢN</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>
              Trung tâm TVCI (Viện Cơ khí Năng lượng và Mỏ - Vinacomin)
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 10.5, color: "#475569", display: "flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
            Mẫu quy chuẩn:
            <select
              value={settings.presetId || "TVCI"}
              onChange={(e) => handleSelectPreset(e.target.value as DocumentSettingsPresetId)}
              className="docSettingsSelect"
              style={{ height: 26, fontSize: 11, padding: "0 6px", borderRadius: 4, borderColor: "#cbd5e1", background: "#f8fafc" }}
            >
              <option value="TVCI">Trung tâm TVCI</option>
              <option value="IEMM">Viện IEMM</option>
              <option value="ND30">Nghị định 30</option>
              <option value="PARTY">Văn bản Đảng</option>
            </select>
          </label>
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

      {/* Body: 4-Section Property Sheet */}
      <div className="docSettingsModalBody" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar Navigation */}
        <div className="docSettingsSidebar" style={{ width: 135, borderRight: "1px solid #e2e8f0", background: "#f8fafc", padding: "8px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
          <button
            type="button"
            className={`docSettingsTabBtn ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
            style={{
              padding: "7px 10px",
              fontSize: 11.5,
              fontWeight: activeTab === "info" ? 700 : 500,
              borderRadius: 5,
              textAlign: "left",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "info" ? "#0f3f67" : "transparent",
              color: activeTab === "info" ? "#ffffff" : "#475569",
              transition: "all 0.12s ease",
            }}
          >
            <span>📄</span> Thông tin
          </button>
          <button
            type="button"
            className={`docSettingsTabBtn ${activeTab === "page_format" ? "active" : ""}`}
            onClick={() => setActiveTab("page_format")}
            style={{
              padding: "7px 10px",
              fontSize: 11.5,
              fontWeight: activeTab === "page_format" ? 700 : 500,
              borderRadius: 5,
              textAlign: "left",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "page_format" ? "#0f3f67" : "transparent",
              color: activeTab === "page_format" ? "#ffffff" : "#475569",
              transition: "all 0.12s ease",
            }}
          >
            <span>📐</span> Khổ &amp; Định dạng
          </button>
          <button
            type="button"
            className={`docSettingsTabBtn ${activeTab === "signer_recipients" ? "active" : ""}`}
            onClick={() => setActiveTab("signer_recipients")}
            style={{
              padding: "7px 10px",
              fontSize: 11.5,
              fontWeight: activeTab === "signer_recipients" ? 700 : 500,
              borderRadius: 5,
              textAlign: "left",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "signer_recipients" ? "#0f3f67" : "transparent",
              color: activeTab === "signer_recipients" ? "#ffffff" : "#475569",
              transition: "all 0.12s ease",
            }}
          >
            <span>✍️</span> Người ký
          </button>
          <button
            type="button"
            className={`docSettingsTabBtn ${activeTab === "defaults" ? "active" : ""}`}
            onClick={() => setActiveTab("defaults")}
            style={{
              padding: "7px 10px",
              fontSize: 11.5,
              fontWeight: activeTab === "defaults" ? 700 : 500,
              borderRadius: 5,
              textAlign: "left",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "defaults" ? "#0f3f67" : "transparent",
              color: activeTab === "defaults" ? "#ffffff" : "#475569",
              transition: "all 0.12s ease",
            }}
          >
            <span>⚙️</span> Mặc định
          </button>
        </div>

        {/* Configuration Area */}
        <div className="docSettingsContent" style={{ flex: 1, padding: "12px 16px", overflowY: "auto", background: "#ffffff" }}>
          {statusMsg && (
            <div
              className={`docSettingsStatusBanner ${statusMsg.type}`}
              style={{
                marginBottom: 10,
                padding: "6px 10px",
                borderRadius: 4,
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: statusMsg.type === "success" ? "#f0fdf4" : statusMsg.type === "error" ? "#fef2f2" : "#f0f9ff",
                color: statusMsg.type === "success" ? "#166534" : statusMsg.type === "error" ? "#991b1b" : "#0369a1",
                border: `1px solid ${statusMsg.type === "success" ? "#bbf7d0" : statusMsg.type === "error" ? "#fecaca" : "#bae6fd"}`,
              }}
            >
              <span>{statusMsg.type === "success" ? "✓" : statusMsg.type === "error" ? "⚠" : "ℹ"}</span>
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* SECTION 1: THÔNG TIN */}
          {activeTab === "info" && (
            <div className="docSettingsSection">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f3f67" }}>Thông tin văn bản &amp; Ký hiệu</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>Chuẩn NĐ 30/2020/NĐ-CP</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>
                    Loại văn bản
                  </label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.docType || "Công văn"}
                    onChange={(e) => setSettings({ ...settings, docType: e.target.value })}
                  >
                    <option value="Công văn">Công văn</option>
                    <option value="Quyết định">Quyết định</option>
                    <option value="Thông báo">Thông báo</option>
                    <option value="Tờ trình">Tờ trình</option>
                    <option value="Báo cáo">Báo cáo</option>
                    <option value="Kế hoạch">Kế hoạch</option>
                    <option value="Biên bản">Biên bản</option>
                    <option value="Giấy mời">Giấy mời</option>
                    <option value="Phiếu">Phiếu yêu cầu / thử nghiệm</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>
                    Số hiệu văn bản
                  </label>
                  <input
                    type="text"
                    className="docSettingsInput"
                    style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    placeholder="VD: 125"
                    value={settings.symbol?.number || ""}
                    onChange={(e) => setSettings({ ...settings, symbol: { ...settings.symbol, number: e.target.value } })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>
                    Ký hiệu viết tắt
                  </label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.symbol?.prefix || "TVCI"}
                    onChange={(e) => setSettings({ ...settings, symbol: { ...settings.symbol, prefix: e.target.value } })}
                  >
                    <option value="TVCI">TVCI (Trung tâm)</option>
                    <option value="IEMM">IEMM (Viện)</option>
                    <option value="CV-TVCI">CV-TVCI</option>
                    <option value="QĐ-TVCI">QĐ-TVCI</option>
                    <option value="TB-TVCI">TB-TVCI</option>
                    <option value="TTr-TVCI">TTr-TVCI</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>
                    Địa danh ban hành
                  </label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.symbol?.location || "Hà Nội"}
                    onChange={(e) => setSettings({ ...settings, symbol: { ...settings.symbol, location: e.target.value } })}
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Quảng Ninh">Quảng Ninh</option>
                    <option value="Cẩm Phả">Cẩm Phả</option>
                    <option value="Hạ Long">Hạ Long</option>
                  </select>
                </div>
              </div>

              <div className="docSettingsField" style={{ marginBottom: 10 }}>
                <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>
                  Trích yếu nội dung (Tiêu đề tóm tắt)
                </label>
                <textarea
                  className="docSettingsInput"
                  rows={2}
                  style={{ fontSize: 11.5, padding: "6px 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1", resize: "vertical" }}
                  placeholder="Về việc thực hiện kế hoạch kiểm định và thử nghiệm..."
                  value={settings.docTitle || ""}
                  onChange={(e) => setSettings({ ...settings, docTitle: e.target.value })}
                />
              </div>

              <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 10.5, color: "#475569", lineHeight: 1.4 }}>
                <strong>Cơ quan ban hành:</strong> TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP<br />
                <strong>Cơ quan cấp trên:</strong> VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN
              </div>
            </div>
          )}

          {/* SECTION 2: TRANG & ĐỊNH DẠNG */}
          {activeTab === "page_format" && (
            <div className="docSettingsSection">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f3f67" }}>Khổ giấy, Căn lề &amp; Phông chữ</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>Đơn vị đo: milimét (mm)</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Khổ giấy</label>
                  <select className="docSettingsSelect" value="A4" disabled style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569" }}>
                    <option value="A4">A4 (210 × 297 mm) - Chuẩn bắt buộc</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Phông chữ chính</label>
                  <select className="docSettingsSelect" value={settings.typography?.fontName || "Times New Roman"} disabled style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569" }}>
                    <option value="Times New Roman">Times New Roman (Chuẩn NĐ30)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 10.5, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Lề trên</label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11, padding: "0 4px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.margins?.top || 20}
                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, top: Number(e.target.value) } })}
                  >
                    <option value={20}>20 mm</option>
                    <option value={25}>25 mm</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 10.5, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Lề dưới</label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11, padding: "0 4px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.margins?.bottom || 20}
                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, bottom: Number(e.target.value) } })}
                  >
                    <option value={20}>20 mm</option>
                    <option value={25}>25 mm</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 10.5, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Lề trái</label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11, padding: "0 4px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.margins?.left || 30}
                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, left: Number(e.target.value) } })}
                  >
                    <option value={30}>30 mm</option>
                    <option value={35}>35 mm</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 10.5, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Lề phải</label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11, padding: "0 4px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.margins?.right || 15}
                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, right: Number(e.target.value) } })}
                  >
                    <option value={15}>15 mm</option>
                    <option value={20}>20 mm</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Cỡ chữ nội dung</label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.typography?.bodySize || 13}
                    onChange={(e) => setSettings({ ...settings, typography: { ...settings.typography, bodySize: Number(e.target.value) } })}
                  >
                    <option value={13}>13 pt (Khuyên dùng văn bản dài)</option>
                    <option value={14}>14 pt (Chuẩn trang trọng)</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Giãn dòng (Line spacing)</label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.paragraph?.lineSpacing || 1.2}
                    onChange={(e) => setSettings({ ...settings, paragraph: { ...settings.paragraph, lineSpacing: Number(e.target.value) } })}
                  >
                    <option value={1.15}>1.15 dòng</option>
                    <option value={1.2}>1.2 dòng (Chuẩn NĐ30)</option>
                    <option value={1.3}>1.3 dòng</option>
                    <option value={1.5}>1.5 dòng</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: NGƯỜI KÝ & NƠI NHẬN */}
          {activeTab === "signer_recipients" && (
            <div className="docSettingsSection">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f3f67" }}>Người ký văn bản &amp; Nơi nhận</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>Thẩm quyền ký &amp; phân phối</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Chức vụ người ký</label>
                  <select
                    className="docSettingsSelect"
                    style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    value={settings.signer?.title || "GIÁM ĐỐC"}
                    onChange={(e) => setSettings({ ...settings, signer: { ...settings.signer, title: e.target.value } })}
                  >
                    <option value="GIÁM ĐỐC">GIÁM ĐỐC</option>
                    <option value="PHÓ GIÁM ĐỐC">PHÓ GIÁM ĐỐC</option>
                    <option value="KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC">KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC</option>
                    <option value="VIỆN TRƯỞNG">VIỆN TRƯỞNG</option>
                    <option value="PHÓ VIỆN TRƯỞNG">PHÓ VIỆN TRƯỞNG</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>Họ và tên người ký</label>
                  <input
                    type="text"
                    className="docSettingsInput"
                    style={{ height: 28, fontSize: 11.5, padding: "0 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1" }}
                    placeholder="Họ và tên..."
                    value={settings.signer?.fullName || ""}
                    onChange={(e) => setSettings({ ...settings, signer: { ...settings.signer, fullName: e.target.value } })}
                  />
                </div>
              </div>

              <div className="docSettingsField">
                <label className="docSettingsLabel" style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>
                  Danh sách nơi nhận (mỗi dòng một nơi nhận)
                </label>
                <textarea
                  className="docSettingsInput"
                  rows={3}
                  style={{ fontSize: 11.5, padding: "6px 8px", width: "100%", borderRadius: 4, border: "1px solid #cbd5e1", resize: "vertical" }}
                  placeholder="Như Điều 3;&#10;Ban Giám đốc (để b/c);&#10;Lưu: VT, TVCI."
                  value={Array.isArray(settings.recipients) ? settings.recipients.join("\n") : ""}
                  onChange={(e) => setSettings({ ...settings, recipients: e.target.value.split("\n") })}
                />
              </div>
            </div>
          )}

          {/* SECTION 4: MẶC ĐỊNH & QUY CHUẨN */}
          {activeTab === "defaults" && (
            <div className="docSettingsSection">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f3f67" }}>Mặc định hệ thống &amp; Khôi phục</span>
              </div>
              <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.45, marginBottom: 12 }}>
                Lưu cấu hình hiện tại làm mẫu mặc định cho tất cả các văn bản mới được tạo từ Ribbon, hoặc khôi phục lại các thông số chuẩn ban đầu theo Nghị định 30/2020/NĐ-CP.
              </p>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: "1px solid #cbd5e1", cursor: "pointer", background: "#ffffff" }}
                  onClick={handleResetToDefault}
                >
                  ↺ Khôi phục chuẩn TVCI ban đầu
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 11, padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer", background: "#0d4f8b", color: "#ffffff", fontWeight: 600 }}
                  onClick={() => {
                    onSaveDefault(settings);
                    setStatusMsg({ type: "success", text: "Đã lưu thiết lập hiện tại làm mặc định!" });
                  }}
                >
                  💾 Lưu làm mặc định
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div style={{ padding: "8px 14px", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ height: 28, fontSize: 11, padding: "0 12px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", cursor: "pointer" }}
          onClick={onClose}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className="btn btn-outline"
          style={{ height: 28, fontSize: 11, padding: "0 12px", borderRadius: 4, border: "1px solid #0d4f8b", color: "#0d4f8b", background: "#ffffff", fontWeight: 600, cursor: "pointer" }}
          onClick={() => void handleApplyOnly()}
          disabled={busy}
        >
          {busy ? "Đang xử lý..." : "Áp dụng vào văn bản"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: 28, fontSize: 11, padding: "0 14px", borderRadius: 4, border: "none", background: "#0d4f8b", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}
          onClick={() => void handleSaveAndApplyAll()}
          disabled={busy}
        >
          {busy ? "Đang lưu..." : "Lưu & Áp dụng"}
        </button>
      </div>
    </div>
  );

  if (isDialog) {
    return modalContent;
  }

  return (
    <div className="docSettingsModalBackdrop" onClick={onClose}>
      {modalContent}
    </div>
  );
}
