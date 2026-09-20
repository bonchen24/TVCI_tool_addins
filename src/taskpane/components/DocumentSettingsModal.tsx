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

type SettingsTab = "general" | "agency" | "symbol" | "margins" | "typography" | "signer" | "presets";

export function DocumentSettingsModal({
  isOpen,
  onClose,
  onApply,
  onSaveDefault,
  onSaveAndApply,
}: DocumentSettingsModalProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<DocumentSettings>(() => loadSavedSettings());
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

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

  const handleSaveDefaultOnly = () => {
    const val = validateDocumentSettings(settings);
    if (!val.isValid) {
      setStatusMsg({ type: "error", text: val.errors.join("; ") });
      return;
    }
    onSaveDefault(settings);
    setStatusMsg({ type: "success", text: "Đã lưu làm thiết lập mặc định cho các tài liệu mới!" });
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
      setStatusMsg({ type: "success", text: "Đã lưu mặc định và áp dụng vào văn bản thành công!" });
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="docSettingsModalBackdrop" onClick={onClose}>
      <div className="docSettingsModalDialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="docSettingsModalHeader">
          <div className="docSettingsModalTitle">
            <span className="docSettingsIcon">📄</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>THIẾT LẬP VĂN BẢN CHUẨN HÀNH CHÍNH</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>
                Quy cách thể thức Nghị định 30/2020/NĐ-CP & Thể thức TKV / Viện / Đảng
              </div>
            </div>
          </div>
          <button type="button" className="modalCloseBtn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Modal Body: Left Sidebar + Center Config + Right Preview */}
        <div className="docSettingsModalBody">
          {/* Vertical Menu Sidebar */}
          <div className="docSettingsSidebar">
            <button
              type="button"
              className={`docSettingsTabBtn ${activeTab === "general" ? "active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <span>📋</span> Thông tin chung
            </button>
            <button
              type="button"
              className={`docSettingsTabBtn ${activeTab === "agency" ? "active" : ""}`}
              onClick={() => setActiveTab("agency")}
            >
              <span>🏛️</span> Cơ quan ban hành
            </button>
            <button
              type="button"
              className={`docSettingsTabBtn ${activeTab === "symbol" ? "active" : ""}`}
              onClick={() => setActiveTab("symbol")}
            >
              <span>🔢</span> Số/Ký hiệu & Địa danh
            </button>
            <button
              type="button"
              className={`docSettingsTabBtn ${activeTab === "margins" ? "active" : ""}`}
              onClick={() => setActiveTab("margins")}
            >
              <span>📐</span> Căn lề & Đoạn văn
            </button>
            <button
              type="button"
              className={`docSettingsTabBtn ${activeTab === "typography" ? "active" : ""}`}
              onClick={() => setActiveTab("typography")}
            >
              <span>🔤</span> Cỡ chữ & Thể thức
            </button>
            <button
              type="button"
              className={`docSettingsTabBtn ${activeTab === "signer" ? "active" : ""}`}
              onClick={() => setActiveTab("signer")}
            >
              <span>✒️</span> Người ký & Nơi nhận
            </button>
            <button
              type="button"
              className={`docSettingsTabBtn ${activeTab === "presets" ? "active" : ""}`}
              onClick={() => setActiveTab("presets")}
            >
              <span>⭐</span> Mẫu thiết lập (Presets)
            </button>
          </div>

          {/* Center Configuration Area */}
          <div className="docSettingsContent">
            {statusMsg && (
              <div className={`docSettingsStatusBanner ${statusMsg.type}`}>
                {statusMsg.text}
              </div>
            )}

            {/* TAB: GENERAL */}
            {activeTab === "general" && (
              <div className="docSettingsSection">
                <h4 className="docSettingsSectionTitle">Thông tin chung về văn bản</h4>
                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Loại văn bản hành chính:</label>
                  <select
                    className="docSettingsSelect"
                    value={settings.docType}
                    onChange={(e) => setSettings({ ...settings, docType: e.target.value })}
                  >
                    <option value="CÔNG VĂN">Công văn</option>
                    <option value="QUYẾT ĐỊNH">Quyết định (Cá biệt / Quy định)</option>
                    <option value="TỜ TRÌNH">Tờ trình</option>
                    <option value="BÁO CÁO">Báo cáo</option>
                    <option value="THÔNG BÁO">Thông báo</option>
                    <option value="GIẤY MỜI">Giấy mời</option>
                    <option value="KẾ HOẠCH">Kế hoạch</option>
                    <option value="NGHỊ QUYẾT">Nghị quyết (Đảng / HĐTV)</option>
                    <option value="QUY ĐỊNH">Quy định</option>
                    <option value="BIÊN BẢN">Biên bản</option>
                  </select>
                </div>

                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Trích yếu nội dung (Tiêu đề văn bản):</label>
                  <textarea
                    className="docSettingsTextarea"
                    rows={3}
                    value={settings.docTitle}
                    placeholder="V/v triển khai công tác..."
                    onChange={(e) => setSettings({ ...settings, docTitle: e.target.value })}
                  />
                  <span className="docSettingsHint">Trích yếu cần ngắn gọn, rõ ràng, bắt đầu bằng "V/v ..." đối với công văn.</span>
                </div>

                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Chọn nhanh cấu hình mẫu (Preset):</label>
                  <div className="docSettingsPresetChips">
                    {(["TVCI", "IEMM", "TKV", "ND30", "PARTY"] as DocumentSettingsPresetId[]).map((pid) => (
                      <button
                        key={pid}
                        type="button"
                        className={`docSettingsPresetChip ${settings.presetId === pid ? "active" : ""}`}
                        onClick={() => handleSelectPreset(pid)}
                      >
                        {pid === "TVCI" && "Trung tâm Thử nghiệm - Kiểm định Công nghiệp"}
                        {pid === "IEMM" && "Viện Cơ khí Năng lượng và Mỏ - Vinacomin"}
                        {pid === "TKV" && "Tập đoàn TKV"}
                        {pid === "ND30" && "Nghị định 30 Chuẩn"}
                        {pid === "PARTY" && "Đảng Cộng sản"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Dữ liệu chèn nhanh (mỗi dòng một mục):</label>
                  <textarea
                    className="docSettingsTextarea"
                    rows={3}
                    value={(settings.quickInsert?.addressee ?? []).join("\n")}
                    placeholder="Kính gửi: nhập nội dung đã được phê duyệt"
                    onChange={(e) => setSettings({
                      ...settings,
                      quickInsert: { ...settings.quickInsert, addressee: e.target.value.split("\n").filter((line) => line.trim()) },
                    })}
                  />
                  <textarea
                    className="docSettingsTextarea"
                    rows={3}
                    value={(settings.quickInsert?.legalBasis ?? []).join("\n")}
                    placeholder="Căn cứ: nhập nội dung pháp lý đã được phê duyệt"
                    onChange={(e) => setSettings({
                      ...settings,
                      quickInsert: { ...settings.quickInsert, legalBasis: e.target.value.split("\n").filter((line) => line.trim()) },
                    })}
                  />
                  <input
                    type="text"
                    className="docSettingsInput"
                    value={settings.quickInsert?.appendixTitle ?? ""}
                    placeholder="Tên phụ lục đã được phê duyệt (nếu có)"
                    onChange={(e) => setSettings({
                      ...settings,
                      quickInsert: { ...settings.quickInsert, appendixTitle: e.target.value },
                    })}
                  />
                  <span className="docSettingsHint">Ribbon chỉ chèn các nội dung bạn đã cấu hình ở đây, trong hồ sơ, hoặc đang chọn trong Word.</span>
                </div>
              </div>
            )}

            {/* TAB: AGENCY */}
            {activeTab === "agency" && (
              <div className="docSettingsSection">
                <h4 className="docSettingsSectionTitle">Tên cơ quan, tổ chức ban hành văn bản</h4>
                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Cơ quan chủ quản cấp trên (nếu có):</label>
                  <input
                    type="text"
                    className="docSettingsInput"
                    value={settings.agency.parentAgency}
                    placeholder="VÍ DỤ: TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM"
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        agency: { ...settings.agency, parentAgency: e.target.value.toUpperCase() },
                      })
                    }
                  />
                  <span className="docSettingsHint">Trình bày chữ in hoa, đứng, cỡ 12-13pt.</span>
                </div>

                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Tên cơ quan, đơn vị ban hành trực tiếp:</label>
                  <input
                    type="text"
                    className="docSettingsInput"
                    value={settings.agency.issuingAgency}
                    placeholder="VÍ DỤ: VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        agency: { ...settings.agency, issuingAgency: e.target.value.toUpperCase() },
                      })
                    }
                  />
                  <span className="docSettingsHint">Trình bày chữ in hoa, đậm, cỡ 12-13pt.</span>
                </div>

                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Tên viết tắt đơn vị:</label>
                  <input
                    type="text"
                    className="docSettingsInput"
                    style={{ maxWidth: 160 }}
                    value={settings.agency.agencyAbbr}
                    placeholder="TVCI / CĐM / TKV"
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        agency: { ...settings.agency, agencyAbbr: e.target.value.toUpperCase() },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* TAB: SYMBOL */}
            {activeTab === "symbol" && (
              <div className="docSettingsSection">
                <h4 className="docSettingsSectionTitle">Số, ký hiệu và địa danh ban hành</h4>
                <div style={{ display: "flex", gap: 12 }}>
                  <div className="docSettingsFieldGroup" style={{ flex: 1 }}>
                    <label className="docSettingsLabel">Số văn bản:</label>
                    <input
                      type="text"
                      className="docSettingsInput"
                      value={settings.symbol.number}
                      placeholder="01"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          symbol: { ...settings.symbol, number: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="docSettingsFieldGroup" style={{ flex: 2 }}>
                    <label className="docSettingsLabel">Ký hiệu (Prefix / Loại văn bản):</label>
                    <input
                      type="text"
                      className="docSettingsInput"
                      value={settings.symbol.prefix}
                      placeholder="TVCI-VP hoặc CĐM-KHCN"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          symbol: { ...settings.symbol, prefix: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div className="docSettingsFieldGroup" style={{ flex: 1 }}>
                    <label className="docSettingsLabel">Địa danh ban hành:</label>
                    <input
                      type="text"
                      className="docSettingsInput"
                      value={settings.symbol.location}
                      placeholder="Hà Nội / Cẩm Phả / Hạ Long"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          symbol: { ...settings.symbol, location: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="docSettingsFieldGroup" style={{ flex: 1 }}>
                    <label className="docSettingsLabel">Ngày tháng năm (tùy chọn):</label>
                    <input
                      type="text"
                      className="docSettingsInput"
                      value={settings.symbol.date}
                      placeholder="ngày ... tháng ... năm 2026"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          symbol: { ...settings.symbol, date: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MARGINS */}
            {activeTab === "margins" && (
              <div className="docSettingsSection">
                <h4 className="docSettingsSectionTitle">Căn lề trang A4 và quy cách đoạn văn</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Lề trên (Top) - mm:</label>
                    <input
                      type="number"
                      className="docSettingsInput"
                      min={10}
                      max={50}
                      value={settings.margins.top}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          margins: { ...settings.margins, top: Number(e.target.value) },
                        })
                      }
                    />
                    <span className="docSettingsHint">Chuẩn NĐ30: 20 - 25 mm</span>
                  </div>

                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Lề dưới (Bottom) - mm:</label>
                    <input
                      type="number"
                      className="docSettingsInput"
                      min={10}
                      max={50}
                      value={settings.margins.bottom}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          margins: { ...settings.margins, bottom: Number(e.target.value) },
                        })
                      }
                    />
                    <span className="docSettingsHint">Chuẩn NĐ30: 20 - 25 mm</span>
                  </div>

                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Lề trái (Left) - mm:</label>
                    <input
                      type="number"
                      className="docSettingsInput"
                      min={15}
                      max={60}
                      value={settings.margins.left}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          margins: { ...settings.margins, left: Number(e.target.value) },
                        })
                      }
                    />
                    <span className="docSettingsHint">Chuẩn NĐ30: 30 - 35 mm (để đóng gáy)</span>
                  </div>

                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Lề phải (Right) - mm:</label>
                    <input
                      type="number"
                      className="docSettingsInput"
                      min={10}
                      max={40}
                      value={settings.margins.right}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          margins: { ...settings.margins, right: Number(e.target.value) },
                        })
                      }
                    />
                    <span className="docSettingsHint">Chuẩn NĐ30: 15 - 20 mm</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Giãn dòng (Line spacing):</label>
                    <input
                      type="number"
                      step={0.05}
                      className="docSettingsInput"
                      min={1.0}
                      max={2.0}
                      value={settings.paragraph.lineSpacing}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          paragraph: { ...settings.paragraph, lineSpacing: Number(e.target.value) },
                        })
                      }
                    />
                    <span className="docSettingsHint">Chuẩn NĐ30: 1.2 - 1.5 dòng</span>
                  </div>

                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Thụt dòng đầu (First line indent) - mm:</label>
                    <input
                      type="number"
                      step={0.5}
                      className="docSettingsInput"
                      min={0}
                      max={25}
                      value={settings.paragraph.firstLineIndent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          paragraph: { ...settings.paragraph, firstLineIndent: Number(e.target.value) },
                        })
                      }
                    />
                    <span className="docSettingsHint">Chuẩn NĐ30: 10 - 12.7 mm</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TYPOGRAPHY */}
            {activeTab === "typography" && (
              <div className="docSettingsSection">
                <h4 className="docSettingsSectionTitle">Phông chữ và cỡ chữ các thành phần thể thức</h4>
                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Phông chữ chuẩn (Font Name):</label>
                  <input
                    type="text"
                    className="docSettingsInput"
                    value={settings.typography.fontName}
                    disabled
                  />
                  <span className="docSettingsHint">Bắt buộc Times New Roman theo Nghị định 30/2020/NĐ-CP.</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Cỡ chữ nội dung (Body):</label>
                    <select
                      className="docSettingsSelect"
                      value={settings.typography.bodySize}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          typography: { ...settings.typography, bodySize: Number(e.target.value) },
                        })
                      }
                    >
                      <option value={13}>13 pt</option>
                      <option value={14}>14 pt (Phổ biến)</option>
                    </select>
                  </div>

                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Cỡ chữ Tiêu đề / Tên loại:</label>
                    <select
                      className="docSettingsSelect"
                      value={settings.typography.titleSize}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          typography: { ...settings.typography, titleSize: Number(e.target.value) },
                        })
                      }
                    >
                      <option value={13}>13 pt (Đậm)</option>
                      <option value={14}>14 pt (Đậm)</option>
                      <option value={15}>15 pt (Đậm)</option>
                    </select>
                  </div>

                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Cỡ chữ Cơ quan & Số hiệu:</label>
                    <select
                      className="docSettingsSelect"
                      value={settings.typography.headerSize}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          typography: { ...settings.typography, headerSize: Number(e.target.value) },
                        })
                      }
                    >
                      <option value={12}>12 pt</option>
                      <option value={13}>13 pt</option>
                    </select>
                  </div>

                  <div className="docSettingsFieldGroup">
                    <label className="docSettingsLabel">Cỡ chữ Nơi nhận:</label>
                    <select
                      className="docSettingsSelect"
                      value={settings.typography.recipientSize}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          typography: { ...settings.typography, recipientSize: Number(e.target.value) },
                        })
                      }
                    >
                      <option value={11}>11 pt (Nghiêng)</option>
                      <option value={12}>12 pt (Nghiêng)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SIGNER */}
            {activeTab === "signer" && (
              <div className="docSettingsSection">
                <h4 className="docSettingsSectionTitle">Thông tin người ký và nơi nhận</h4>
                <div style={{ display: "flex", gap: 12 }}>
                  <div className="docSettingsFieldGroup" style={{ flex: 1 }}>
                    <label className="docSettingsLabel">Chức vụ người ký:</label>
                    <input
                      type="text"
                      className="docSettingsInput"
                      value={settings.signer.title}
                      placeholder="GIÁM ĐỐC / VIỆN TRƯỞNG"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          signer: { ...settings.signer, title: e.target.value.toUpperCase() },
                        })
                      }
                    />
                  </div>
                  <div className="docSettingsFieldGroup" style={{ flex: 1 }}>
                    <label className="docSettingsLabel">Họ và tên người ký:</label>
                    <input
                      type="text"
                      className="docSettingsInput"
                      value={settings.signer.fullName}
                      placeholder="Nhập họ và tên người ký"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          signer: { ...settings.signer, fullName: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="docSettingsFieldGroup">
                  <label className="docSettingsLabel">Danh sách Nơi nhận (mỗi dòng một nơi nhận):</label>
                  <textarea
                    className="docSettingsTextarea"
                    rows={4}
                    value={settings.recipients.join("\n")}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        recipients: e.target.value.split("\n").filter((l) => l.trim().length > 0),
                      })
                    }
                  />
                  <span className="docSettingsHint">Ví dụ: Như Kính gửi; Các phòng ban; Lưu: VT, TVCI.</span>
                </div>
              </div>
            )}

            {/* TAB: PRESETS */}
            {activeTab === "presets" && (
              <div className="docSettingsSection">
                <h4 className="docSettingsSectionTitle">Các mẫu cấu hình sẵn theo quy định</h4>
                <div className="docSettingsPresetGrid">
                  <div
                    className={`docSettingsPresetCard ${settings.presetId === "ND30" ? "active" : ""}`}
                    onClick={() => handleSelectPreset("ND30")}
                  >
                    <div className="docSettingsPresetCardTitle">📜 Nghị định 30/2020/NĐ-CP</div>
                    <div className="docSettingsPresetCardDesc">
                      Chuẩn thể thức hành chính Nhà nước tổng quát, phông Times New Roman 13-14pt.
                    </div>
                  </div>

                  <div
                    className={`docSettingsPresetCard ${settings.presetId === "TKV" ? "active" : ""}`}
                    onClick={() => handleSelectPreset("TKV")}
                  >
                    <div className="docSettingsPresetCardTitle">⛏️ Tập đoàn TKV</div>
                    <div className="docSettingsPresetCardDesc">
                      Cấp trên: Ủy ban Quản lý vốn. Đơn vị: TKV. Ký hiệu: TKV-VP.
                    </div>
                  </div>

                  <div
                    className={`docSettingsPresetCard ${settings.presetId === "IEMM" ? "active" : ""}`}
                    onClick={() => handleSelectPreset("IEMM")}
                  >
                    <div className="docSettingsPresetCardTitle">🏛️ Viện Cơ khí Năng lượng và Mỏ - Vinacomin</div>
                    <div className="docSettingsPresetCardDesc">
                      Cơ quan cấp trên: TKV. Đơn vị: Viện Cơ khí Năng lượng và Mỏ - Vinacomin. Ký hiệu: CĐM. Cỡ chữ 14pt.
                    </div>
                  </div>

                  <div
                    className={`docSettingsPresetCard ${settings.presetId === "TVCI" ? "active" : ""}`}
                    onClick={() => handleSelectPreset("TVCI")}
                  >
                    <div className="docSettingsPresetCardTitle">🏢 Trung tâm Thử nghiệm - Kiểm định Công nghiệp</div>
                    <div className="docSettingsPresetCardDesc">
                      Cơ quan: Trung tâm Thử nghiệm - Kiểm định Công nghiệp. Ký hiệu: TVCI. Cỡ chữ 14pt, lề A4 chuẩn 20-20-30-15 mm.
                    </div>
                  </div>

                  <div
                    className={`docSettingsPresetCard ${settings.presetId === "PARTY" ? "active" : ""}`}
                    onClick={() => handleSelectPreset("PARTY")}
                  >
                    <div className="docSettingsPresetCardTitle">🚩 Đảng Cộng sản Việt Nam</div>
                    <div className="docSettingsPresetCardDesc">
                      Theo Hướng dẫn 36-HD/VPTW. Cơ quan: ĐẢNG CỘNG SẢN VIỆT NAM. Không có tiêu ngữ.
                    </div>
                  </div>

                  <div
                    className={`docSettingsPresetCard ${settings.presetId === "PERSONAL" ? "active" : ""}`}
                    onClick={() => handleSelectPreset("PERSONAL")}
                  >
                    <div className="docSettingsPresetCardTitle">👤 Tùy chỉnh cá nhân</div>
                    <div className="docSettingsPresetCardDesc">
                      Thiết lập linh hoạt cho các loại văn bản cá nhân hoặc đơn vị đặc thù khác.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Area: Live A4 Visual Preview */}
          <div className="docSettingsPreviewArea">
            <div className="docSettingsPreviewLabel">Xem trước trực quan A4:</div>
            <div className="a4LiveSheet">
              {/* Header block: 2 columns */}
              <div className="a4HeaderGrid">
                <div className="a4HeaderLeft">
                  <div className="a4TextSmall">{settings.agency.parentAgency || "TÊN CƠ QUAN CẤP TRÊN"}</div>
                  <div className="a4TextBold">{settings.agency.issuingAgency || "TÊN CƠ QUAN BAN HÀNH"}</div>
                  <div className="a4RuleShort"></div>
                  <div className="a4TextSmall" style={{ marginTop: 2 }}>
                    Số: {settings.symbol.number || "..."}/{settings.symbol.prefix || "..."}
                  </div>
                </div>
                <div className="a4HeaderRight">
                  {settings.presetId === "PARTY" ? (
                    <div className="a4TextBold">ĐẢNG CỘNG SẢN VIỆT NAM</div>
                  ) : (
                    <>
                      <div className="a4TextBold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="a4TextMotto">Độc lập - Tự do - Hạnh phúc</div>
                      <div className="a4RuleMedium"></div>
                    </>
                  )}
                  <div className="a4TextItalic" style={{ marginTop: 2 }}>
                    {settings.symbol.location || "Địa danh"}, {settings.symbol.date || "ngày ... tháng ... năm ..."}
                  </div>
                </div>
              </div>

              {/* Document Subject / Title */}
              <div className="a4TitleBlock">
                <div className="a4DocType">{settings.docType}</div>
                <div className="a4DocSubject">{settings.docTitle || "Trích yếu nội dung văn bản..."}</div>
              </div>

              {/* Simulated Body Text */}
              <div className="a4BodyLines">
                <div className="a4Line" style={{ width: "90%", marginLeft: `${Math.min(12, settings.paragraph.firstLineIndent)}px` }}></div>
                <div className="a4Line" style={{ width: "98%" }}></div>
                <div className="a4Line" style={{ width: "95%" }}></div>
                <div className="a4Line" style={{ width: "70%" }}></div>
                <div className="a4Line" style={{ width: "92%", marginLeft: `${Math.min(12, settings.paragraph.firstLineIndent)}px`, marginTop: 6 }}></div>
                <div className="a4Line" style={{ width: "96%" }}></div>
                <div className="a4Line" style={{ width: "60%" }}></div>
              </div>

              {/* Footer block: Recipients on left, Signer on right */}
              <div className="a4FooterGrid">
                <div className="a4RecipientsBox">
                  <div className="a4TextBold" style={{ fontSize: 7 }}>Nơi nhận:</div>
                  {settings.recipients.slice(0, 3).map((r, idx) => (
                    <div key={idx} className="a4TextMicro">- {r}</div>
                  ))}
                  {settings.recipients.length > 3 && <div className="a4TextMicro">...</div>}
                </div>
                <div className="a4SignerBox">
                  <div className="a4TextBold">{settings.signer.title || ""}</div>
                  <div className="a4SignatureSpace">&nbsp;</div>
                  <div className="a4TextBold">{settings.signer.fullName || ""}</div>
                </div>
              </div>

              {/* Margin indicators */}
              <div className="a4MarginInfo">
                Lề: T{settings.margins.top} · D{settings.margins.bottom} · T{settings.margins.left} · P{settings.margins.right} (mm)
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer with 3 distinct actions */}
        <div className="docSettingsModalFooter">
          <button
            type="button"
            className="docSettingsBtnSecondary"
            onClick={handleSaveDefaultOnly}
            disabled={busy}
            title="Lưu các thông số này để áp dụng cho các tài liệu mới về sau"
          >
            💾 Lưu mặc định
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="docSettingsBtnOutline"
              onClick={handleApplyOnly}
              disabled={busy}
              title="Áp dụng căn lề và định dạng cho tài liệu Word đang mở"
            >
              📄 Áp dụng cho văn bản này
            </button>
            <button
              type="button"
              className="docSettingsBtnPrimary"
              onClick={handleSaveAndApplyAll}
              disabled={busy}
              title="Vừa lưu làm mặc định, vừa áp dụng ngay vào tài liệu này"
            >
              ✨ Lưu & Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
