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
      style={isDialog ? { width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" } : { maxWidth: 720, width: "95%", height: "80vh", display: "flex", flexDirection: "column" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="docSettingsModalHeader" style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f3f67" }}>THIẾT LẬP VĂN BẢN</div>
          <div style={{ fontSize: 10.5, color: "#64748b" }}>
            Trung tâm Thử nghiệm - Kiểm định Công nghiệp (Thuộc Viện Cơ khí Năng lượng và Mỏ - Vinacomin)
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
            Quy chuẩn:
            <select
              value={settings.presetId || "TVCI"}
              onChange={(e) => handleSelectPreset(e.target.value as DocumentSettingsPresetId)}
              className="docSettingsSelect"
              style={{ height: 26, fontSize: 11, padding: "0 6px" }}
            >
              <option value="TVCI">Trung tâm TVCI</option>
              <option value="IEMM">Viện IEMM</option>
              <option value="ND30">Nghị định 30 chuẩn</option>
              <option value="PARTY">Văn bản Đảng</option>
            </select>
          </label>
          <button type="button" className="modalCloseBtn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>
      </div>

      {/* Body: 4-Section Property Sheet */}
      <div className="docSettingsModalBody" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar Navigation: 4 Clean Tabs */}
        <div className="docSettingsSidebar" style={{ width: 140, borderRight: "1px solid #e2e8f0", background: "#f8fafc", padding: "8px 4px", display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            type="button"
            className={`docSettingsTabBtn ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            📄 Thông tin
          </button>
          <button
            type="button"
            className={`docSettingsTabBtn ${activeTab === "page_format" ? "active" : ""}`}
            onClick={() => setActiveTab("page_format")}
          >
            📐 Trang &amp; định dạng
          </button>
          <button
            type="button"
            className={`docSettingsTabBtn ${activeTab === "signer_recipients" ? "active" : ""}`}
            onClick={() => setActiveTab("signer_recipients")}
          >
            ✍️ Người ký &amp; nơi nhận
          </button>
          <button
            type="button"
            className={`docSettingsTabBtn ${activeTab === "defaults" ? "active" : ""}`}
            onClick={() => setActiveTab("defaults")}
          >
            ⚙️ Mặc định
          </button>
        </div>

        {/* Configuration Area */}
        <div className="docSettingsContent" style={{ flex: 1, padding: "16px 20px", overflowY: "auto", background: "#ffffff" }}>
          {statusMsg && (
            <div className={`docSettingsStatusBanner ${statusMsg.type}`} style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 4, fontSize: 11.5 }}>
              {statusMsg.text}
            </div>
          )}

          {/* SECTION 1: THÔNG TIN */}
          {activeTab === "info" && (
            <div className="docSettingsSection">
              <h4 className="docSettingsSectionTitle" style={{ fontSize: 12.5, fontWeight: 700, color: "#0f3f67", margin: "0 0 12px 0", paddingBottom: 6, borderBottom: "1px solid #e2e8f0" }}>
                Thông tin văn bản &amp; Ký hiệu
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Loại văn bản</label>
                  <select
                    className="docSettingsSelect"
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
                  <label className="docSettingsLabel">Số hiệu văn bản</label>
                  <input
                    type="text"
                    className="docSettingsInput"
                    placeholder="VD: 125"
                    value={settings.symbol?.number || ""}
                    onChange={(e) => setSettings({ ...settings, symbol: { ...settings.symbol, number: e.target.value } })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Ký hiệu viết tắt</label>
                  <select
                    className="docSettingsSelect"
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
                  <label className="docSettingsLabel">Địa danh ban hành</label>
                  <select
                    className="docSettingsSelect"
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

              <div className="docSettingsField" style={{ marginBottom: 12 }}>
                <label className="docSettingsLabel">Trích yếu nội dung (Tiêu đề tóm tắt)</label>
                <textarea
                  className="docSettingsInput"
                  rows={2}
                  placeholder="Về việc thực hiện kế hoạch kiểm định và thử nghiệm..."
                  value={settings.docTitle || ""}
                  onChange={(e) => setSettings({ ...settings, docTitle: e.target.value })}
                />
              </div>

              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 11, color: "#475569" }}>
                <strong>Cơ quan ban hành:</strong> TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP<br />
                <strong>Cơ quan cấp trên:</strong> VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN
              </div>
            </div>
          )}

          {/* SECTION 2: TRANG & ĐỊNH DẠNG */}
          {activeTab === "page_format" && (
            <div className="docSettingsSection">
              <h4 className="docSettingsSectionTitle" style={{ fontSize: 12.5, fontWeight: 700, color: "#0f3f67", margin: "0 0 12px 0", paddingBottom: 6, borderBottom: "1px solid #e2e8f0" }}>
                Khổ giấy, Căn lề &amp; Phông chữ
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Khổ giấy</label>
                  <select className="docSettingsSelect" value="A4" disabled>
                    <option value="A4">A4 (210 x 297 mm) - Chuẩn Nghị định 30</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Phông chữ chính</label>
                  <select className="docSettingsSelect" value={settings.typography?.fontName || "Times New Roman"} disabled>
                    <option value="Times New Roman">Times New Roman (Chuẩn bắt buộc)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Lề trên</label>
                  <select
                    className="docSettingsSelect"
                    value={settings.margins?.top || 20}
                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, top: Number(e.target.value) } })}
                  >
                    <option value={20}>20 mm (Chuẩn NĐ30)</option>
                    <option value={25}>25 mm</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Lề dưới</label>
                  <select
                    className="docSettingsSelect"
                    value={settings.margins?.bottom || 20}
                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, bottom: Number(e.target.value) } })}
                  >
                    <option value={20}>20 mm (Chuẩn NĐ30)</option>
                    <option value={25}>25 mm</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Lề trái</label>
                  <select
                    className="docSettingsSelect"
                    value={settings.margins?.left || 30}
                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, left: Number(e.target.value) } })}
                  >
                    <option value={30}>30 mm (Chuẩn NĐ30)</option>
                    <option value={35}>35 mm</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Lề phải</label>
                  <select
                    className="docSettingsSelect"
                    value={settings.margins?.right || 15}
                    onChange={(e) => setSettings({ ...settings, margins: { ...settings.margins, right: Number(e.target.value) } })}
                  >
                    <option value={15}>15 mm (Chuẩn NĐ30)</option>
                    <option value={20}>20 mm</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Cỡ chữ nội dung</label>
                  <select
                    className="docSettingsSelect"
                    value={settings.typography?.bodySize || 13}
                    onChange={(e) => setSettings({ ...settings, typography: { ...settings.typography, bodySize: Number(e.target.value) } })}
                  >
                    <option value={13}>13 pt (Khuyên dùng văn bản dài)</option>
                    <option value={14}>14 pt (Chuẩn trang trọng)</option>
                  </select>
                </div>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Giãn dòng (Line spacing)</label>
                  <select
                    className="docSettingsSelect"
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
              <h4 className="docSettingsSectionTitle" style={{ fontSize: 12.5, fontWeight: 700, color: "#0f3f67", margin: "0 0 12px 0", paddingBottom: 6, borderBottom: "1px solid #e2e8f0" }}>
                Người ký văn bản &amp; Nơi nhận
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div className="docSettingsField">
                  <label className="docSettingsLabel">Chức vụ người ký</label>
                  <select
                    className="docSettingsSelect"
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
                  <label className="docSettingsLabel">Họ và tên người ký</label>
                  <input
                    type="text"
                    className="docSettingsInput"
                    placeholder="Họ và tên..."
                    value={settings.signer?.fullName || ""}
                    onChange={(e) => setSettings({ ...settings, signer: { ...settings.signer, fullName: e.target.value } })}
                  />
                </div>
              </div>

              <div className="docSettingsField">
                <label className="docSettingsLabel">Danh sách nơi nhận (mỗi dòng một nơi nhận)</label>
                <textarea
                  className="docSettingsInput"
                  rows={4}
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
              <h4 className="docSettingsSectionTitle" style={{ fontSize: 12.5, fontWeight: 700, color: "#0f3f67", margin: "0 0 12px 0", paddingBottom: 6, borderBottom: "1px solid #e2e8f0" }}>
                Mặc định hệ thống &amp; Khôi phục
              </h4>
              <p style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.5, marginBottom: 14 }}>
                Lưu cấu hình hiện tại làm mẫu mặc định cho tất cả các văn bản mới được tạo từ Ribbon, hoặc khôi phục lại các thông số chuẩn ban đầu theo Nghị định 30/2020/NĐ-CP.
              </p>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: 11.5, padding: "8px 14px" }}
                  onClick={handleResetToDefault}
                >
                  ↺ Khôi phục chuẩn TVCI ban đầu
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 11.5, padding: "8px 14px" }}
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
      <div style={{ padding: "10px 16px", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ height: 32, fontSize: 11.5, padding: "0 14px" }}
          onClick={onClose}
          disabled={busy}
        >
          Hủy
        </button>
        <button
          type="button"
          className="btn btn-outline"
          style={{ height: 32, fontSize: 11.5, padding: "0 14px", borderColor: "#0d4f8b", color: "#0d4f8b" }}
          onClick={() => void handleApplyOnly()}
          disabled={busy}
        >
          {busy ? "Đang xử lý..." : "Áp dụng cho văn bản này"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: 32, fontSize: 11.5, padding: "0 16px", background: "#0d4f8b" }}
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
