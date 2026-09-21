import React, { useState, useEffect, useMemo } from "react";
import type { TemplateRecord, TemplateOrganization } from "../../templates/library";
import { getTemplateFormSchema, isMainContentField, type TemplateFormSchema, type TemplateFormValues } from "../../templates/form-schema";
import { decomposeDraftIntoFormFields } from "../../ai/template-matcher";
import { requestAiPromptDirect, type AiSettings } from "../../ai/direct-client";
import { PRESET_OPTIONS } from "./AiTaskpaneView";

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
  </svg>
);

const EditDocIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const GearIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const DRAFT_PROMPT_PILLS = [
  { label: "Chuẩn NĐ30", prompt: "Chuẩn hóa theo đúng quy cách thể thức hành chính của Chính phủ và thuật ngữ chuẩn mực theo Nghị định 30/2020/NĐ-CP:" },
  { label: "Trang trọng hơn", prompt: "Hãy viết lại câu từ thật trang trọng, uy nghiêm, đúng chuẩn văn phong công vụ nhà nước:" },
  { label: "Soát lỗi chính tả", prompt: "Hãy kiểm tra và soát toàn bộ lỗi chính tả, ngữ pháp, dấu câu và thể thức văn bản:" },
  { label: "Rút gọn súc tích", prompt: "Hãy rút gọn, cô đọng nội dung nhưng giữ nguyên đầy đủ ý chính, số liệu và lập luận:" },
  { label: "Mở rộng diễn giải", prompt: "Hãy mở rộng, diễn giải chi tiết, bổ sung lập luận và căn cứ thuyết phục cho nội dung:" },
];

export interface SmartDraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TemplateRecord[];
  initialTemplate?: TemplateRecord | null;
  aiSettings: AiSettings;
  onOpenAiSettings: () => void;
  onCompleteAndFill: (template: TemplateRecord, values: TemplateFormValues) => Promise<void>;
}

type StepNumber = 1 | 2 | 3; // 1: Chọn mẫu, 2: Dán nội dung & AI viết lại, 3: Phân mảnh & Xem sửa trường -> Điền Word

export function SmartDraftingModal({
  isOpen,
  onClose,
  templates,
  initialTemplate,
  aiSettings,
  onOpenAiSettings,
  onCompleteAndFill,
}: SmartDraftingModalProps): React.ReactElement | null {
  const [step, setStep] = useState<StepNumber>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord | null>(initialTemplate || null);

  // Filter state for Step 1
  const [orgFilter, setOrgFilter] = useState<"ALL" | TemplateOrganization>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Step 2: Content
  const [rawContent, setRawContent] = useState("");
  const [polishedContent, setPolishedContent] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Step 3: Fields
  const [fieldValues, setFieldValues] = useState<TemplateFormValues>({});
  const [isInserting, setIsInserting] = useState(false);

  useEffect(() => {
    if (initialTemplate) {
      setSelectedTemplate(initialTemplate);
      setStep(2);
    }
  }, [initialTemplate]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setRawContent("");
      setPolishedContent("");
      setFieldValues({});
      setAiError(null);
    }
  }, [isOpen]);

  const activeSchema: TemplateFormSchema | null = useMemo(() => {
    if (!selectedTemplate) return null;
    return getTemplateFormSchema(selectedTemplate);
  }, [selectedTemplate]);

  if (!isOpen) return null;

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (orgFilter !== "ALL" && t.organization !== orgFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.documentType.toLowerCase().includes(q);
    }
    return true;
  });

  // Step 2: Handle AI Polish
  const handleAiPolish = async (customInstruction?: string) => {
    if (!rawContent.trim()) {
      setAiError("Vui lòng nhập hoặc dán nội dung nháp cần soạn thảo.");
      return;
    }
    if (!aiSettings.apiKey || !aiSettings.apiKey.trim()) {
      setAiError("Chưa có API Key. Vui lòng nhấn vào 'Cài đặt AI' để nhập khóa kết nối.");
      return;
    }

    setIsPolishing(true);
    setAiError(null);

    try {
      const orgName = selectedTemplate?.organization === "IEMM"
        ? "Viện Cơ khí Năng lượng và Mỏ - Vinacomin"
        : selectedTemplate?.organization === "DANG"
          ? "Đảng bộ / Chi bộ"
          : "Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI)";

      const instruction = customInstruction || "Hãy viết lại toàn bộ nội dung sau đây thành văn bản hành chính hoàn chỉnh, câu từ trang trọng, gãy gọn, mạch lạc, đúng chuẩn thể thức, giữ nguyên toàn bộ dữ kiện thực tế:";

      const prompt = [
        `Bạn là chuyên gia soạn thảo văn bản hành chính theo Nghị định 30/2020/NĐ-CP cho ${orgName}.`,
        `Biểu mẫu đang áp dụng: "${selectedTemplate?.name || "Văn bản hành chính"}" (Thể loại: ${selectedTemplate?.documentType || "Công văn"}).`,
        instruction,
        "",
        "--- NỘI DUNG NHÁP / YÊU CẦU ---",
        rawContent.trim(),
        "-------------------------------",
        "Chỉ trả về nội dung văn bản hoàn chỉnh đã soạn thảo, không thêm lời chào, không thêm giải thích rườm rà.",
      ].join("\n");

      const result = await requestAiPromptDirect(aiSettings, prompt, fetch, []);
      setPolishedContent(result.trim());
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPolishing(false);
    }
  };

  // Move to Step 3: Decompose into fields
  const handleProceedToStep3 = () => {
    const textToDecompose = polishedContent.trim() || rawContent.trim();
    if (!textToDecompose) {
      setAiError("Vui lòng soạn thảo hoặc dán nội dung trước khi chuyển sang phân mảnh.");
      return;
    }

    if (activeSchema) {
      const decomposed = decomposeDraftIntoFormFields(activeSchema, textToDecompose, fieldValues);
      setFieldValues(decomposed);
    }
    setStep(3);
  };

  // Step 4 & 5: Complete & Insert into Word
  const handleFinalInsert = async () => {
    if (!selectedTemplate) return;
    setIsInserting(true);
    try {
      await onCompleteAndFill(selectedTemplate, fieldValues);
      onClose();
    } catch (err) {
      setAiError(`Lỗi khi điền vào Word: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsInserting(false);
    }
  };

  const isDialog = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dialog") === "1";

  const modalContent = (
    <div
      className={`smartDraftingModalDialog ${isDialog ? "dialogRootWindow" : ""}`}
      style={
        isDialog
          ? {
              width: "100%",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              overflow: "hidden",
            }
          : {
              backgroundColor: "#ffffff",
              width: "100%",
              maxWidth: 780,
              height: "84vh",
              maxHeight: 700,
              borderRadius: 8,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid #cbd5e1",
            }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: "#0d4f8b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              <EditDocIcon />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f3f67", letterSpacing: "0.2px" }}>
                SOẠN THẢO VĂN BẢN THÔNG MINH (AI DRAFTING)
              </div>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                Quy trình 5 bước chuẩn hóa thể thức từ biểu mẫu và nội dung người dùng
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={onOpenAiSettings}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 11,
                color: "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <GearIcon />
              <span>Cài đặt AI</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Đóng cửa sổ"
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
              }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* 5-Step Process Breadcrumb Bar */}
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
          }}
        >
          {[
            { num: 1, label: "1. Chọn mẫu", active: step === 1, done: step > 1, canGo: true, onClick: () => setStep(1) },
            { num: 2, label: "2. Dán & Soạn AI", active: step === 2, done: step > 2, canGo: Boolean(selectedTemplate), onClick: () => selectedTemplate && setStep(2) },
            { num: 3, label: "3. Phân mảnh trường", active: step === 3, done: false, canGo: Boolean(polishedContent || rawContent), onClick: () => (polishedContent || rawContent) && handleProceedToStep3() },
            { num: 4, label: "4. Xem lại & Chỉnh sửa", active: step === 3, done: false, canGo: false },
            { num: 5, label: "5. Điền vào Word", active: false, done: false, canGo: false },
          ].map((st, idx, arr) => (
            <React.Fragment key={st.num}>
              <div
                onClick={st.onClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: st.canGo ? "pointer" : "default",
                  opacity: st.active || st.done ? 1 : 0.65,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor: st.active ? "#0d4f8b" : st.done ? "#16a34a" : "#e2e8f0",
                    color: st.active || st.done ? "#ffffff" : "#64748b",
                    transition: "all 0.15s ease",
                  }}
                >
                  {st.done ? <CheckIcon /> : st.num}
                </div>
                <span
                  style={{
                    fontWeight: st.active ? 700 : 500,
                    color: st.active ? "#0d4f8b" : st.done ? "#16a34a" : "#64748b",
                  }}
                >
                  {st.label}
                </span>
              </div>
              {idx < arr.length - 1 && (
                <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0", margin: "0 8px", maxWidth: 36 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error / Alert banner */}
        {aiError && (
          <div
            style={{
              padding: "6px 14px",
              backgroundColor: "#fef2f2",
              borderBottom: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: 11,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>⚠️ {aiError}</span>
            <button
              type="button"
              onClick={() => setAiError(null)}
              style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", backgroundColor: "#ffffff" }}>
          {/* STEP 1: CHỌN BIỂU MẪU */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 4, backgroundColor: "#e2e8f0", padding: 2, borderRadius: 4 }}>
                  {(["ALL", "TVCI", "IEMM", "DANG"] as const).map((org) => (
                    <button
                      key={org}
                      type="button"
                      onClick={() => setOrgFilter(org)}
                      style={{
                        border: "none",
                        backgroundColor: orgFilter === org ? "#ffffff" : "transparent",
                        color: orgFilter === org ? "#0f3f67" : "#475569",
                        fontWeight: orgFilter === org ? 700 : 500,
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                    >
                      {org === "ALL" ? "Tất cả" : org === "TVCI" ? "Trung tâm TVCI" : org === "IEMM" ? "Viện IEMM" : "Đảng"}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm biểu mẫu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    height: 28,
                    fontSize: 11.5,
                    padding: "0 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: 10,
                }}
              >
                {filteredTemplates.map((t) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: `1px solid ${isSelected ? "#0d4f8b" : "#e2e8f0"}`,
                        backgroundColor: isSelected ? "#f0f7ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.12s",
                        boxShadow: isSelected ? "0 0 0 1px #0d4f8b" : "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 3,
                            backgroundColor: t.organization === "IEMM" ? "#eff6ff" : t.organization === "DANG" ? "#fef2f2" : "#f0fdf4",
                            color: t.organization === "IEMM" ? "#1d4ed8" : t.organization === "DANG" ? "#b91c1c" : "#15803d",
                          }}
                        >
                          {t.organization === "IEMM" ? "Viện IEMM" : t.organization === "DANG" ? "Đảng" : "TVCI"}
                        </span>
                        <span style={{ fontSize: 9.5, color: "#64748b" }}>{t.documentType}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", lineHeight: 1.35, marginBottom: 4 }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.3 }}>
                        {t.description || "Biểu mẫu hành chính chuẩn hóa theo quy định."}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: DÁN NỘI DUNG & AI VIẾT LẠI */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
              {/* Selected template summary */}
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: 6,
                  border: "1px solid #bae6fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: "#0369a1", fontWeight: 600 }}>Biểu mẫu đang chọn: </span>
                  <strong style={{ fontSize: 12, color: "#0c4a6e" }}>{selectedTemplate?.name}</strong>
                  <span style={{ fontSize: 10.5, color: "#0284c7", marginLeft: 8 }}>({selectedTemplate?.documentType})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #93c5fd",
                    borderRadius: 4,
                    padding: "2px 8px",
                    fontSize: 10.5,
                    color: "#0369a1",
                    cursor: "pointer",
                  }}
                >
                  Đổi biểu mẫu
                </button>
              </div>

              {/* 2-Column or Stack: Raw Input vs AI Polished */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1, minHeight: 340 }}>
                {/* Left: Raw Draft Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: "#1e293b" }}>
                      1. Dán nội dung thô / Ghi chú / Ý tưởng của bạn:
                    </label>
                    <button
                      type="button"
                      onClick={() => setRawContent("")}
                      style={{ background: "none", border: "none", color: "#64748b", fontSize: 10.5, cursor: "pointer" }}
                    >
                      Xóa trắng
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    placeholder="Ví dụ:&#10;- Báo cáo kết quả kiểm định an toàn tại mỏ than Cọc Sáu tháng 9/2026.&#10;- Đoàn gồm ông Nguyễn Văn A, kiểm tra 5 thiết bị nâng. Phát hiện 1 tời điện không đạt tiêu chuẩn phanh.&#10;- Đề xuất tạm dừng hoạt động tời số 2 để sửa chữa..."
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    style={{
                      flex: 1,
                      padding: 10,
                      fontSize: 11.5,
                      lineHeight: 1.45,
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontFamily: "inherit",
                      resize: "none",
                    }}
                  />
                  {/* Prompt Pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2, marginBottom: 2 }}>
                    {DRAFT_PROMPT_PILLS.map((pill) => (
                      <button
                        key={pill.label}
                        type="button"
                        disabled={isPolishing || !rawContent.trim()}
                        onClick={() => void handleAiPolish(pill.prompt)}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          borderRadius: 12,
                          padding: "2px 8px",
                          fontSize: 10,
                          color: "#334155",
                          cursor: isPolishing || !rawContent.trim() ? "not-allowed" : "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAiPolish()}
                    disabled={isPolishing || !rawContent.trim()}
                    style={{
                      height: 34,
                      backgroundColor: isPolishing ? "#94a3b8" : "#0d4f8b",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 12,
                      border: "none",
                      borderRadius: 6,
                      cursor: isPolishing || !rawContent.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    {isPolishing ? (
                      <span>⏳ AI đang soạn thảo theo chuẩn Nghị định 30...</span>
                    ) : (
                      <>
                        <SparkleIcon />
                        <span>Bấm để AI Soạn thảo văn bản hoàn chỉnh ➔</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right: AI Polished Result */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: "#1e293b" }}>
                      2. Văn bản AI đã soạn thảo lại (Có thể chỉnh sửa trực tiếp):
                    </label>
                    {polishedContent && (
                      <span style={{ fontSize: 10.5, color: "#16a34a", fontWeight: 600 }}>✓ Đã chuẩn hóa</span>
                    )}
                  </div>
                  <textarea
                    rows={12}
                    placeholder="Nội dung sau khi AI chuẩn hóa sẽ hiển thị tại đây..."
                    value={polishedContent}
                    onChange={(e) => setPolishedContent(e.target.value)}
                    style={{
                      flex: 1,
                      padding: 10,
                      fontSize: 11.5,
                      lineHeight: 1.45,
                      borderRadius: 6,
                      border: `1px solid ${polishedContent ? "#93c5fd" : "#cbd5e1"}`,
                      backgroundColor: polishedContent ? "#ffffff" : "#f8fafc",
                      fontFamily: "inherit",
                      resize: "none",
                    }}
                  />
                  <div style={{ fontSize: 10.5, color: "#64748b", fontStyle: "italic" }}>
                    Mẹo: Bạn có thể sửa trực tiếp câu từ ở ô này trước khi nhấn nút bóc tách thành các trường dữ liệu.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: PHÂN MẢNH & XEM SỬA CÁC TRƯỜNG */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: 6,
                  border: "1px solid #bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>
                    ✓ AI đã tự động phân mảnh văn bản thành {activeSchema?.fields.length || 0} trường dữ liệu.
                  </span>
                  <div style={{ fontSize: 10.5, color: "#15803d" }}>
                    Hãy kiểm tra các trường dưới đây, bổ sung hoặc sửa đổi nếu cần trước khi điền vào Word.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #86efac",
                    borderRadius: 4,
                    padding: "3px 8px",
                    fontSize: 10.5,
                    color: "#166534",
                    cursor: "pointer",
                  }}
                >
                  ← Sửa lại nội dung văn bản
                </button>
              </div>

              {/* Dynamic Field Form Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  maxHeight: 460,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {activeSchema?.fields.map((field) => {
                  const val = fieldValues[field.tag];
                  const strVal = Array.isArray(val) ? val.join("\n") : (val || "");

                  return (
                    <div
                      key={field.tag}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        gridColumn: isMainContentField(field) ? "span 2" : "span 1",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                          {field.label}
                          {field.required && <span style={{ color: "#dc2626" }}> *</span>}
                          <span style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>({field.tag})</span>
                        </label>
                        {PRESET_OPTIONS[field.tag] && (
                          <select
                            value=""
                            onChange={(e) => {
                              const selected = e.target.value;
                              if (!selected) return;
                              setFieldValues((prev) => {
                                const rawVal = prev[field.tag];
                                const current = Array.isArray(rawVal) ? rawVal.join("\n") : (rawVal || "");
                                if (field.tag === "CAN_CU" || field.tag === "NOI_NHAN") {
                                  const next = current.trim() ? `${current.trim()}\n${selected}` : selected;
                                  return { ...prev, [field.tag]: next };
                                }
                                return { ...prev, [field.tag]: selected };
                              });
                            }}
                            style={{
                              fontSize: 10,
                              padding: "1px 5px",
                              borderRadius: 4,
                              border: "1px solid #93c5fd",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              cursor: "pointer",
                              fontWeight: 500,
                              maxWidth: 180,
                            }}
                          >
                            <option value="">⚡ Chọn nhanh {field.label}...</option>
                            {PRESET_OPTIONS[field.tag].map((opt) => (
                              <option key={opt} value={opt}>
                                {opt.length > 35 ? `${opt.slice(0, 35)}...` : opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {field.type === "textarea" || field.type === "multi-line" || field.type === "repeatable" ? (
                        <textarea
                          rows={field.tag === "NOI_DUNG" ? 4 : 2}
                          value={strVal}
                          placeholder={field.placeholder || `Nhập ${field.label}...`}
                          onChange={(e) => setFieldValues({ ...fieldValues, [field.tag]: e.target.value })}
                          style={{
                            padding: "6px 8px",
                            fontSize: 11.5,
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                            fontFamily: "inherit",
                            resize: "vertical",
                          }}
                        />
                      ) : field.type === "select" && field.options ? (
                        <select
                          value={strVal}
                          onChange={(e) => setFieldValues({ ...fieldValues, [field.tag]: e.target.value })}
                          style={{
                            height: 28,
                            padding: "0 6px",
                            fontSize: 11.5,
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          <option value="">-- Chọn một giá trị --</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === "date" ? "date" : "text"}
                          value={strVal}
                          placeholder={field.placeholder || `Nhập ${field.label}...`}
                          onChange={(e) => setFieldValues({ ...fieldValues, [field.tag]: e.target.value })}
                          style={{
                            height: 28,
                            padding: "0 8px",
                            fontSize: 11.5,
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as StepNumber)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  fontSize: 11,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "#475569",
                }}
              >
                ← Quay lại
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 30,
                padding: "0 14px",
                fontSize: 11,
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                cursor: "pointer",
                color: "#475569",
              }}
            >
              Đóng
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selectedTemplate}
                style={{
                  height: 30,
                  padding: "0 16px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  backgroundColor: selectedTemplate ? "#0d4f8b" : "#94a3b8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  cursor: selectedTemplate ? "pointer" : "not-allowed",
                }}
              >
                Tiếp tục: Nhập nội dung ➔
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleProceedToStep3}
                disabled={!rawContent.trim() && !polishedContent.trim()}
                style={{
                  height: 30,
                  padding: "0 16px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  backgroundColor: (rawContent.trim() || polishedContent.trim()) ? "#0d4f8b" : "#94a3b8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  cursor: (rawContent.trim() || polishedContent.trim()) ? "pointer" : "not-allowed",
                }}
              >
                Tiếp tục: Phân mảnh trường dữ liệu ➔
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleFinalInsert}
                disabled={isInserting}
                style={{
                  height: 32,
                  padding: "0 18px",
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: isInserting ? "#15803d" : "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  cursor: isInserting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.25)",
                }}
              >
                {isInserting ? (
                  <span>Đang điền vào Word...</span>
                ) : (
                  <>
                    <CheckIcon />
                    <span>5. Xác nhận &amp; Điền hoàn chỉnh vào Word</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
    </div>
  );

  if (isDialog) {
    return modalContent;
  }

  return (
    <div
      className="smartDraftingModalBackdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      {modalContent}
    </div>
  );
}
