import React, { useState } from "react";
import type { TemplateOrganization, TemplateRecord } from "../../templates/library";
import type { TemplateFormField } from "../../templates/form-schema";
import { validateTemplateCandidate, type TemplateCandidateField, type TemplateValidationResult } from "../../templates/template-validator";
import { makeUserTemplateRecord } from "../../templates/user-template";
import { saveUserTemplate } from "../../templates/storage";
import { readDocumentText } from "../../word/selection.service";
import { readCurrentDocumentAsArrayBuffer } from "../../word/document-export.service";
import { listTaggedContentControls } from "../../word/content-control.service";
import { TVCI_TEMPLATE_TABS } from "../../templates/tvci-tabs";

export interface TemplateWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newTemplate: TemplateRecord) => void;
  onError: (error: string) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const DEFAULT_DEPARTMENTS: Record<TemplateOrganization, string[]> = {
  TVCI: TVCI_TEMPLATE_TABS.filter((t) => t.enabled).map((t) => t.label),
  IEMM: ["Văn bản chung", "Phòng Kỹ thuật", "Phòng Kế hoạch", "Văn phòng"],
  DANG: ["Văn bản Đảng", "Chi bộ", "Đảng ủy"],
  TKV: ["Văn bản Tập đoàn", "Ban chuyên môn"],
};

const COMMON_DOC_TYPES = [
  "Công văn",
  "Tờ trình",
  "Báo cáo",
  "Thông báo",
  "Biên bản",
  "Phiếu yêu cầu",
  "Quyết định",
  "Biểu mẫu nội bộ",
];

export function TemplateWizardModal({
  isOpen,
  onClose,
  onSaved,
  onError,
}: TemplateWizardModalProps): React.ReactElement | null {
  const [step, setStep] = useState<WizardStep>(1);
  const [sourceType, setSourceType] = useState<"word" | "file" | "blank">("word");
  const [sourceText, setSourceText] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [busy, setBusy] = useState(false);

  // Template Metadata
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState<TemplateOrganization>("TVCI");
  const [department, setDepartment] = useState("Văn bản chung");
  const [documentType, setDocumentType] = useState("Công văn");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");

  // Fields
  const [fields, setFields] = useState<TemplateCandidateField[]>([]);
  const [validation, setValidation] = useState<TemplateValidationResult | null>(null);

  if (!isOpen) return null;

  // Step 1: Read Source
  const handleLoadSourceWord = async () => {
    setBusy(true);
    try {
      const text = await readDocumentText();
      const buffer = await readCurrentDocumentAsArrayBuffer();
      const controls = await listTaggedContentControls();

      setSourceText(text || "");
      setDocxBuffer(buffer);
      setSourceFileName("Tài liệu Word đang mở");
      if (!name) {
        const firstLine = text.trim().split("\n")[0]?.slice(0, 40) || "Biểu mẫu mới";
        setName(firstLine);
      }

      // Prepopulate fields from existing content controls
      const initialFields: TemplateCandidateField[] = controls.map((c) => ({
        tag: c.tag,
        label: c.title || c.tag,
        type: "text",
        wordTarget: "content-control",
        required: false,
      }));
      setFields(initialFields);
      setStep(2);
    } catch (err) {
      onError(`Không thể đọc tài liệu Word: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadSourceFile = async (file: File) => {
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      setDocxBuffer(buffer);
      setSourceFileName(file.name);
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ""));
      }
      setSourceText(`File: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      setStep(2);
    } catch (err) {
      onError(`Không thể đọc file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Auto-detect fields
  const handleAutoScanFields = async () => {
    setBusy(true);
    try {
      const detected: TemplateCandidateField[] = [...fields];
      const existingTags = new Set(detected.map((f) => f.tag));

      // Regex scan for [Tag_Name], {{Tag_Name}}, <Tag_Name>
      const regex = /\[([A-Z0-9_]{3,30})\]|\{\{([A-Z0-9_]{3,30})\}\}|<([A-Z0-9_]{3,30})>/g;
      let match;
      while ((match = regex.exec(sourceText)) !== null) {
        const tag = match[1] || match[2] || match[3];
        if (tag && !existingTags.has(tag)) {
          detected.push({
            tag,
            label: tag.replace(/_/g, " "),
            type: tag.includes("NGAY") ? "date" : tag.includes("NOI_DUNG") ? "textarea" : "text",
            wordTarget: "content-control",
            required: false,
          });
          existingTags.add(tag);
        }
      }

      // If AI is configured, also try AI scan
      try {
        const { loadAiSettings } = await import('../../ai/settings');
        const { requestAiPromptDirect } = await import('../../ai/direct-client');
        const { buildTemplateFieldPrompt, parseTemplateFieldSuggestions } = await import('../../ai/template-field-analysis');
        const settings = loadAiSettings();
        if (settings.apiKey) {
          const raw = await requestAiPromptDirect(settings, buildTemplateFieldPrompt(sourceText.substring(0, 4000))); // limit to avoid token issues
          const aiSuggestions = parseTemplateFieldSuggestions(raw);
          for (const sug of aiSuggestions) {
            if (!existingTags.has(sug.tag)) {
              detected.push({
                tag: sug.tag,
                label: sug.title,
                type: sug.tag.includes("NGAY") ? "date" : "text",
                wordTarget: "content-control",
                required: false,
              });
              existingTags.add(sug.tag);
            }
          }
        }
      } catch (err) {
        console.warn("AI scan failed or not configured", err);
      }

      if (detected.length === fields.length && detected.length === 0) {
        // Add default common fields if nothing found
        detected.push(
          { tag: "TEN_KHACH_HANG", label: "Tên khách hàng / Đối tác", type: "text", wordTarget: "content-control" },
          { tag: "NGAY_BAN_HANH", label: "Ngày ban hành", type: "date", wordTarget: "content-control" },
          { tag: "NGUOI_KY", label: "Người ký", type: "text", wordTarget: "content-control" },
        );
      }

      setFields(detected);
    } finally {
      setBusy(false);
    }
  };

  // Step 3: Field Management
  const handleAddField = () => {
    const newIndex = fields.length + 1;
    const newField: TemplateCandidateField = {
      tag: `TRUONG_${newIndex}`,
      label: `Trường mới ${newIndex}`,
      type: "text",
      wordTarget: "content-control",
      required: false,
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (index: number, patch: Partial<TemplateCandidateField>) => {
    const updated = [...fields];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, ...patch };
      setFields(updated);
    }
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // Step 4: Run Validation
  const handleRunValidation = () => {
    const candidate = {
      name,
      organization,
      department,
      documentType,
      fields,
      docxBuffer: docxBuffer ?? undefined,
      description,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
    };
    const res = validateTemplateCandidate(candidate);
    setValidation(res);
  };

  // Step 5: Save & Finish
  const handleSave = async () => {
    setBusy(true);
    try {
      const candidate = {
        name,
        organization,
        department,
        documentType,
        fields,
        docxBuffer: docxBuffer ?? undefined,
        description,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      };

      const res = validateTemplateCandidate(candidate);
      if (!res.valid) {
        setValidation(res);
        setStep(4);
        throw new Error("Biểu mẫu còn lỗi thể thức hoặc dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại bước 4.");
      }

      const record = makeUserTemplateRecord({
        name,
        organization,
        department,
        documentType,
        keywords,
      });

      // Save to IndexedDB
      const dataToSave = docxBuffer ?? new ArrayBuffer(0);
      await saveUserTemplate(record, dataToSave);

      onSaved(record);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="templateWizardOverlay" role="dialog" aria-modal="true" aria-label="Tạo biểu mẫu mới">
      <div className="templateWizardModal">
        {/* Header */}
        <div className="templateWizardHeader">
          <div>
            <h3>➕ Wizard Tạo Biểu Mẫu Mới</h3>
            <span className="templateWizardSub">Bước {step}/5: {
              step === 1 ? "Chọn nguồn biểu mẫu" :
              step === 2 ? "Quét trường thông tin" :
              step === 3 ? "Thiết kế form điền" :
              step === 4 ? "Kiểm tra & Xem trước" : "Hoàn tất & Lưu"
            }</span>
          </div>
          <button type="button" className="closeBtn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {/* Progress Bar */}
        <div className="wizardProgressBar">
          <div className={`stepDot ${step >= 1 ? "active" : ""}`}>1</div>
          <div className={`stepLine ${step >= 2 ? "active" : ""}`} />
          <div className={`stepDot ${step >= 2 ? "active" : ""}`}>2</div>
          <div className={`stepLine ${step >= 3 ? "active" : ""}`} />
          <div className={`stepDot ${step >= 3 ? "active" : ""}`}>3</div>
          <div className={`stepLine ${step >= 4 ? "active" : ""}`} />
          <div className={`stepDot ${step >= 4 ? "active" : ""}`}>4</div>
          <div className={`stepLine ${step >= 5 ? "active" : ""}`} />
          <div className={`stepDot ${step >= 5 ? "active" : ""}`}>5</div>
        </div>

        {/* Body Steps */}
        <div className="templateWizardBody">
          {/* STEP 1: CHỌN NGUỒN */}
          {step === 1 && (
            <div className="wizardStepContent">
              <h4>1. Chọn nguồn dữ liệu biểu mẫu</h4>
              <p className="stepDesc">Bạn muốn tạo biểu mẫu từ tài liệu Word đang mở, từ một tệp .docx có sẵn, hay soạn từ đầu?</p>

              <div className="sourceOptionsGrid">
                <button
                  type="button"
                  className={`sourceOptionCard ${sourceType === "word" ? "selected" : ""}`}
                  onClick={() => setSourceType("word")}
                >
                  <span className="sourceIcon">📄</span>
                  <strong>Tài liệu Word đang mở</strong>
                  <small>Lấy nội dung văn bản và trường Content Control từ trang Word hiện tại.</small>
                </button>

                <button
                  type="button"
                  className={`sourceOptionCard ${sourceType === "file" ? "selected" : ""}`}
                  onClick={() => setSourceType("file")}
                >
                  <span className="sourceIcon">📁</span>
                  <strong>Tải tệp .docx</strong>
                  <small>Chọn một file Word mẫu đã được phê duyệt từ máy tính của bạn.</small>
                </button>

                <button
                  type="button"
                  className={`sourceOptionCard ${sourceType === "blank" ? "selected" : ""}`}
                  onClick={() => setSourceType("blank")}
                >
                  <span className="sourceIcon">✍️</span>
                  <strong>Soạn mới từ đầu</strong>
                  <small>Thiết lập form trường dữ liệu và mẫu văn bản thủ công.</small>
                </button>
              </div>

              {sourceType === "word" && (
                <div className="sourceActionBox">
                  <button type="button" className="primary" onClick={handleLoadSourceWord} disabled={busy}>
                    {busy ? "Đang đọc văn bản..." : "⚡ Đọc văn bản từ Word & Tiếp tục"}
                  </button>
                </div>
              )}

              {sourceType === "file" && (
                <div className="sourceActionBox">
                  <label className="fileInputLabel">
                    <span>Chọn file .docx</span>
                    <input
                      type="file"
                      accept=".docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleLoadSourceFile(file);
                      }}
                    />
                  </label>
                  {sourceFileName && <small>Đã chọn: {sourceFileName}</small>}
                </div>
              )}

              {sourceType === "blank" && (
                <div className="sourceActionBox">
                  <button type="button" className="primary" onClick={() => setStep(2)}>
                    Tiếp tục thiết lập &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PHÁT HIỆN TRƯỜNG */}
          {step === 2 && (
            <div className="wizardStepContent">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4>2. Quét &amp; Phát hiện trường thông tin động</h4>
                <button type="button" onClick={handleAutoScanFields}>🔍 Quét lại văn bản</button>
              </div>
              <p className="stepDesc">
                Hệ thống tìm kiếm các ký hiệu trường như <code>[TEN_TRUONG]</code>, <code>&#123;&#123;TRUONG&#125;&#125;</code> hoặc các Content Control trong văn bản.
              </p>

              <div className="detectedFieldsList">
                {fields.length === 0 ? (
                  <div className="emptyFields">
                    <p>Chưa có trường nào được thêm. Bấm "🔍 Quét lại văn bản" hoặc thêm trường ở bước tiếp theo.</p>
                  </div>
                ) : (
                  fields.map((field, idx) => (
                    <div className="detectedFieldRow" key={idx}>
                      <span className="fieldTagBadge">[{field.tag}]</span>
                      <span className="fieldLabelText">{field.label || "Chưa có nhãn"}</span>
                      <span className="fieldTypeBadge">{field.type || "text"}</span>
                      <button type="button" className="removeFieldBtn" onClick={() => handleRemoveField(idx)}>✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: THIẾT KẾ FORM */}
          {step === 3 && (
            <div className="wizardStepContent">
              <h4>3. Thiết kế Form &amp; Thông tin Biểu Mẫu</h4>
              <p className="stepDesc">Điền thông tin định danh mẫu và điều chỉnh các trường nhập liệu.</p>

              <div className="grid2" style={{ marginBottom: 10 }}>
                <label>
                  Tên biểu mẫu <span style={{ color: "#ef4444" }}>*</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Phiếu yêu cầu thử nghiệm mẫu..." />
                </label>
                <label>
                  Đơn vị ban hành
                  <select value={organization} onChange={(e) => setOrganization(e.target.value as TemplateOrganization)}>
                    <option value="TVCI">Trung tâm Thử nghiệm - TVCI</option>
                    <option value="IEMM">Viện Cơ khí Năng lượng và Mỏ - IEMM</option>
                    <option value="DANG">Văn bản Đảng</option>
                  </select>
                </label>
              </div>

              <div className="grid2" style={{ marginBottom: 10 }}>
                <label>
                  Phòng ban / Nhóm
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    {DEFAULT_DEPARTMENTS[organization].map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Loại văn bản
                  <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                    {COMMON_DOC_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 6 }}>
                <strong>Danh sách trường nhập liệu ({fields.length}):</strong>
                <button type="button" onClick={handleAddField}>➕ Thêm trường mới</button>
              </div>

              <div className="fieldsEditorList">
                {fields.map((field, idx) => (
                  <div className="fieldEditorCard" key={idx}>
                    <div className="grid3">
                      <label>
                        Mã tag (chữ hoa)
                        <input
                          value={field.tag}
                          onChange={(e) => handleUpdateField(idx, { tag: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                          placeholder="TEN_TRUONG"
                        />
                      </label>
                      <label>
                        Nhãn tiếng Việt
                        <input
                          value={field.label || ""}
                          onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                          placeholder="VD: Họ và tên"
                        />
                      </label>
                      <label>
                        Kiểu dữ liệu
                        <select
                          value={field.type || "text"}
                          onChange={(e) => handleUpdateField(idx, { type: e.target.value as TemplateFormField["type"] })}
                        >
                          <option value="text">Văn bản 1 dòng</option>
                          <option value="textarea">Văn bản nhiều dòng</option>
                          <option value="date">Ngày tháng</option>
                          <option value="select">Danh sách chọn</option>
                        </select>
                      </label>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <label className="checkRow" style={{ fontSize: "11px" }}>
                        <input
                          type="checkbox"
                          checked={field.required ?? false}
                          onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                        />
                        Bắt buộc nhập
                      </label>
                      <button type="button" className="removeFieldBtn" onClick={() => handleRemoveField(idx)}>Xóa trường</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: KIỂM TRA & XEM TRƯỚC */}
          {step === 4 && (
            <div className="wizardStepContent">
              <h4>4. Kiểm tra hợp lệ &amp; Xem trước Form</h4>
              <p className="stepDesc">Hệ thống thẩm định các trường và mô phỏng trải nghiệm điền form.</p>

              {validation && (
                <div className={`validationResultCard ${validation.valid ? "valid" : "invalid"}`}>
                  {validation.valid ? (
                    <div className="validBadge">✅ Biểu mẫu hợp lệ và sẵn sàng lưu vào hệ thống.</div>
                  ) : (
                    <div className="errorList">
                      <strong>⚠️ Cần chỉnh sửa các vấn đề sau:</strong>
                      <ul>
                        {validation.errors.map((err, i) => (
                          <li key={i}>{err.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validation.warnings.length > 0 && (
                    <div className="warningList">
                      <small>💡 Góp ý hoàn thiện:</small>
                      <ul>
                        {validation.warnings.map((warn, i) => (
                          <li key={i}>{warn.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="wizardFormPreview">
                <h5>Mô phỏng Form: {name || "Chưa đặt tên"}</h5>
                <div className="previewFieldsGrid">
                  {fields.map((f, i) => (
                    <div className="previewField" key={i}>
                      <label>
                        {f.label || f.tag} {f.required ? <span style={{ color: "#ef4444" }}>*</span> : ""}
                      </label>
                      <input placeholder={`[${f.tag}]`} disabled />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: LƯU & XUẤT BẢN */}
          {step === 5 && (
            <div className="wizardStepContent">
              <h4>5. Hoàn tất &amp; Lưu vào Kho biểu mẫu</h4>
              <p className="stepDesc">Xác nhận thông tin cuối cùng để đưa mẫu vào sử dụng ngay trên Microsoft Word.</p>

              <div className="summaryCard">
                <div className="summaryRow"><strong>Tên mẫu:</strong> <span>{name}</span></div>
                <div className="summaryRow"><strong>Đơn vị:</strong> <span>{organization}</span></div>
                <div className="summaryRow"><strong>Bộ phận / Tab:</strong> <span>{department}</span></div>
                <div className="summaryRow"><strong>Loại văn bản:</strong> <span>{documentType}</span></div>
                <div className="summaryRow"><strong>Số lượng trường:</strong> <span>{fields.length} trường</span></div>
                <div className="summaryRow"><strong>Nguồn tệp Word:</strong> <span>{sourceFileName || "Tạo mới"}</span></div>
              </div>

              <div className="saveActions">
                <button type="button" className="primary large" onClick={handleSave} disabled={busy}>
                  {busy ? "Đang lưu..." : "💾 Lưu vào Kho biểu mẫu cá nhân"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="templateWizardFooter">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              disabled={busy}
            >
              &larr; Quay lại
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 5 && step !== 1 && (
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (step === 3) handleRunValidation();
                setStep((s) => (s + 1) as WizardStep);
              }}
              disabled={busy}
            >
              Tiếp theo &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
