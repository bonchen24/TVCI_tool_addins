import React from "react";
import type { TemplateRecord } from "../../templates/library";
import type { TemplateFormAiSuggestion } from "../../ai/template-form";
import {
  isMainContentField,
  type TemplateFormField,
  type TemplateFormSchema,
  type TemplateFormValue,
  type TemplateFormValues,
} from "../../templates/form-schema";
import { MIN_TEMPLATE_FORM_AI_CONFIDENCE } from "../../ai/template-form";
import { templateFormInputToValue, templateFormInputValue } from "../template-form.service";
import { A4DocumentPreview } from "./A4DocumentPreview";

const PRESET_OPTIONS: Record<string, string[]> = {
  CO_QUAN_BAN_HANH: [
    "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN",
    "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP",
    "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM",
  ],
  DON_VI_BAN_HANH: [
    "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP",
    "PHÒNG THỬ NGHIỆM & ĐO LƯỜNG CHẤT LƯỢNG",
    "PHÒNG KIỂM ĐỊNH AN TOÀN THIẾT BỊ",
  ],
  DIA_DANH: ["Hà Nội", "Quảng Ninh", "Thái Nguyên", "Lào Cai"],
  CHUC_VU_NGUOI_KY: [
    "GIÁM ĐỐC",
    "PHÓ GIÁM ĐỐC",
    "VIỆN TRƯỞNG",
    "PHÓ VIỆN TRƯỞNG",
    "TRƯỞNG PHÒNG",
    "PHÓ TRƯỞNG PHÒNG",
  ],
  CAN_CU: [
    "Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ về công tác văn thư;",
    "Căn cứ Điều lệ tổ chức và hoạt động của Viện Cơ khí Năng lượng và Mỏ - Vinacomin;",
    "Căn cứ Quy chế làm việc của Trung tâm Thử nghiệm - Kiểm định Công nghiệp;",
    "Theo đề nghị của Trưởng phòng Thử nghiệm và Đo lường chất lượng,",
  ],
  NOI_NHAN: [
    "- Như trên;\n- Lưu: VT, TVCI.",
    "- Lãnh đạo Viện (để b/c);\n- Các đơn vị liên quan (để t/h);\n- Lưu: VT, hồ sơ.",
    "- Ban Giám đốc TVCI;\n- Các phòng nghiệp vụ;\n- Lưu: VT.",
  ],
  KY_BAO_CAO: [
    "Tháng " + (new Date().getMonth() + 1) + " năm " + new Date().getFullYear(),
    "Quý " + Math.floor((new Date().getMonth() + 3) / 3) + " năm " + new Date().getFullYear(),
    "6 tháng đầu năm " + new Date().getFullYear(),
    "Năm " + new Date().getFullYear(),
  ],
};


export interface FormDraftingViewProps {
  template: TemplateRecord;
  schema: TemplateFormSchema;
  values: TemplateFormValues;
  sourceText: string;
  suggestions: TemplateFormAiSuggestion[];
  busy: boolean;
  syncMessage?: string;
  relatedKnowledgeCount?: number;
  onOpenRelatedKnowledge?: () => void;
  onChange: (tag: string, value: TemplateFormValue) => void;
  onClose: () => void;
  onInsertBlank: () => void;
  onInsertAndFill: () => void;
  onApplyToWord: () => void;
  onSaveDraft: () => void;
  onChangeTemplate: () => void;
  onSourceTextChange: (value: string) => void;
  onSuggestAi: () => void;
  onAcceptAi: () => void;
  onReviewAi: (tag: string) => void;
  onAiValueChange: (tag: string, value: string) => void;
}

function fieldControl(field: TemplateFormField, value: string, onChange: (value: string) => void): React.ReactNode {
  if (field.type === "select") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">-- Chọn một giá trị --</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea" || field.type === "multi-line" || field.type === "repeatable") {
    return (
      <textarea
        value={value}
        rows={field.type === "textarea" ? 4 : 3}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
      />
    );
  }
  return (
    <input
      type={field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
    />
  );
}

export function FormDraftingView({
  template,
  schema,
  values,
  sourceText,
  suggestions,
  busy,
  syncMessage,
  relatedKnowledgeCount = 0,
  onOpenRelatedKnowledge,
  onChange,
  onClose,
  onInsertBlank,
  onInsertAndFill,
  onApplyToWord,
  onSaveDraft,
  onChangeTemplate,
  onSourceTextChange,
  onSuggestAi,
  onAcceptAi,
  onReviewAi,
  onAiValueChange,
}: FormDraftingViewProps): React.ReactElement {
  const requiresReview = suggestions.some(
    (suggestion) => suggestion.confidence < MIN_TEMPLATE_FORM_AI_CONFIDENCE && suggestion.reviewed !== true
  );

  const breadcrumbOrg = template.organization === "TVCI"
    ? "Trung tâm Thử nghiệm - Kiểm định Công nghiệp"
    : template.organization === "IEMM"
      ? "Viện Cơ khí Năng lượng và Mỏ - Vinacomin"
      : "Văn bản Đảng";
  const breadcrumbDept = template.department || "Văn bản chung";
  const breadcrumbType = template.documentType;

  return (
    <section className="formDraftingView" aria-label={`Soạn thảo biểu mẫu: ${schema.label}`}>
      {/* 1. Header & Breadcrumb */}
      <div className="formDraftingHeader">
        <div className="formDraftingNavTop">
          <button type="button" className="formDraftingBackBtn" onClick={onClose} disabled={busy}>
            ← Quay lại
          </button>
          <div className="formDraftingActionsTop">
            <button type="button" className="btnText" onClick={onChangeTemplate} disabled={busy} title="Chọn một mẫu khác">
              Đổi mẫu
            </button>
            <button type="button" className="btnText" onClick={onSaveDraft} disabled={busy} title="Lưu nháp vào máy">
              💾 Lưu nháp
            </button>
          </div>
        </div>

        <div className="formDraftingBreadcrumb" aria-label="Đường dẫn biểu mẫu">
          <span>{breadcrumbOrg}</span>
          <span className="bcSep">&gt;</span>
          <span>{breadcrumbDept}</span>
          <span className="bcSep">&gt;</span>
          <span>{breadcrumbType}</span>
        </div>

        <div className="formDraftingTitleRow">
          <h3>{template.name}</h3>
          {schema.compatibility && <span className="badgeNeutral">Tương thích</span>}
        </div>

        {relatedKnowledgeCount > 0 && (
          <div className="formRelatedKnowledgeBanner" onClick={onOpenRelatedKnowledge} role="button" tabIndex={0}>
            <span className="bannerIcon">💡</span>
            <span>
              Có <strong>{relatedKnowledgeCount} lưu ý nghiệp vụ</strong> liên quan đến biểu mẫu này.
            </span>
            <span className="bannerLink">Xem lưu ý →</span>
          </div>
        )}
      </div>

      {/* 2. Unified Workspace: Form Fields (Left) + Live A4 Preview (Right) on 1 Single Tab */}
      <div className="formDraftingWorkspace splitView">
          <div className="formFieldsContainer">
            <div className="formFieldsList">
              {schema.fields.map((field) => {
                const value = templateFormInputValue(values[field.tag]);
                const isMain = isMainContentField(field);
                return (
                  <div
                    key={field.tag}
                    className={`templateFormField ${isMain ? "templateFormFieldFull" : "templateFormFieldHalf"}`}
                  >
                    <div className="fieldLabelRow">
                      <label className="fieldLabel">
                        {field.label}
                        {field.required ? <span className="reqStar"> *</span> : ""}
                        <span className="fieldTagBadge">({field.tag})</span>
                      </label>
                      {PRESET_OPTIONS[field.tag] && (
                        <select
                          className="fieldQuickPreset"
                          value=""
                          title={`Chọn nhanh mẫu cho ${field.label}`}
                          onChange={(e) => {
                            const selected = e.target.value;
                            if (!selected) return;
                            if (field.type === "repeatable" || field.type === "multi-line" || field.tag === "CAN_CU" || field.tag === "NOI_NHAN") {
                              const next = value.trim() ? `${value.trim()}\n${selected}` : selected;
                              onChange(field.tag, templateFormInputToValue(field, next));
                            } else {
                              onChange(field.tag, templateFormInputToValue(field, selected));
                            }
                          }}
                        >
                          <option value="">⚡ Chọn mẫu...</option>
                          {PRESET_OPTIONS[field.tag].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt.length > 32 ? `${opt.slice(0, 32)}...` : opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {fieldControl(field, value, (input) => onChange(field.tag, templateFormInputToValue(field, input)))}
                    {field.helpText && <small className="fieldHelp">{field.helpText}</small>}
                  </div>
                );
              })}
            </div>

            {/* AI Assistant Drawer inline */}
            <details className="templateFormAi">
              <summary>🤖 Gợi ý điền nhanh bằng AI</summary>
              <span className="aiHint">Dán email, tờ trình hoặc ghi chú nghiệp vụ để AI tự động điền các trường:</span>
              <textarea
                value={sourceText}
                rows={3}
                onChange={(e) => onSourceTextChange(e.target.value)}
                placeholder="Dán nội dung văn bản nguồn tại đây..."
              />
              <div className="templateFormAiActions">
                <button type="button" className="btnSecondary btnSmall" onClick={onSuggestAi} disabled={busy || !sourceText.trim()}>
                  ⚡ AI phân tích dữ liệu
                </button>
                {suggestions.length > 0 && (
                  <button type="button" className="btnPrimary btnSmall" onClick={onAcceptAi} disabled={busy || requiresReview}>
                    Áp dụng tất cả ({suggestions.length})
                  </button>
                )}
              </div>
              {suggestions.length > 0 && (
                <div className="templateFormSuggestions">
                  {suggestions.map((suggestion) => {
                    const field = schema.fields.find((f) => f.tag === suggestion.tag);
                    return (
                      <div key={suggestion.tag} className="templateFormSuggestion">
                        <div>
                          <strong>{field?.label || suggestion.tag}:</strong> {suggestion.value}
                        </div>
                        <div className="suggestionActions">
                          <button type="button" className="btnTextSmall" onClick={() => onReviewAi(suggestion.tag)}>
                            {suggestion.reviewed ? "✓ Đã duyệt" : "Xem xét"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </details>
          </div>

          {/* Live A4 Document Preview on the same screen (Single View) */}
          <div className="formPreviewContainer">
            <A4DocumentPreview template={template} schema={schema} values={values} />
          </div>
        </div>

      {/* 4. Sync Message Alert */}
      {syncMessage && <div className="alert syncAlert">{syncMessage}</div>}

      {/* 5. Sticky Bottom Actions */}
      <div className="formDraftingBottomActions">
        <div className="primaryActionsRow">
          <button
            type="button"
            className="btnPrimary mainFillBtn"
            onClick={onInsertAndFill}
            disabled={busy}
            title="Chèn biểu mẫu vào văn bản và tự động điền các nội dung đã nhập"
          >
            ⚡ Chèn vào Word và điền form
          </button>
        </div>
        <div className="secondaryActionsRow">
          <button type="button" className="btnSecondary" onClick={onApplyToWord} disabled={busy} title="Cập nhật vào các ô đã có">
            Áp dụng vào Word hiện tại
          </button>
          <button type="button" className="btnSecondary" onClick={onInsertBlank} disabled={busy} title="Chèn file mẫu sạch">
            Chèn mẫu trống
          </button>
        </div>
      </div>
    </section>
  );
}
