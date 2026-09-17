import React, { useState } from "react";
import type { TemplateRecord } from "../../templates/library";
import type { TemplateFormAiSuggestion } from "../../ai/template-form";
import type { TemplateFormField, TemplateFormSchema, TemplateFormValue, TemplateFormValues } from "../../templates/form-schema";
import { MIN_TEMPLATE_FORM_AI_CONFIDENCE } from "../../ai/template-form";
import { templateFormInputToValue, templateFormInputValue } from "../template-form.service";
import { A4DocumentPreview } from "./A4DocumentPreview";

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
  const [viewMode, setViewMode] = useState<"form" | "preview">("form");

  const requiresReview = suggestions.some(
    (suggestion) => suggestion.confidence < MIN_TEMPLATE_FORM_AI_CONFIDENCE && suggestion.reviewed !== true
  );

  const breadcrumbOrg = template.organization === "TVCI" ? "Trung tâm" : template.organization === "IEMM" ? "Viện Cơ khí" : "Văn bản Đảng";
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

      {/* 2. Responsive View Switcher Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          margin: "8px 0",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "8px",
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode("form")}
          style={{
            flex: 1,
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: viewMode === "form" ? 700 : 500,
            background: viewMode === "form" ? "#0f3f67" : "#f1f5f9",
            color: viewMode === "form" ? "#ffffff" : "#475569",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          📝 Điền thông tin ({schema.fields.length} trường)
        </button>
        <button
          type="button"
          onClick={() => setViewMode("preview")}
          style={{
            flex: 1,
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: viewMode === "preview" ? 700 : 500,
            background: viewMode === "preview" ? "#0f3f67" : "#f1f5f9",
            color: viewMode === "preview" ? "#ffffff" : "#475569",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          👁️ Xem trước A4 (75%)
        </button>
      </div>

      {/* 3. Main Form Fields Workspace OR A4 Preview */}
      {viewMode === "form" ? (
        <div className="formDraftingWorkspace">
          <div className="formFieldsContainer">
            <div className="formFieldsList">
              {schema.fields.map((field) => {
                const value = templateFormInputValue(values[field.tag]);
                return (
                  <label key={field.tag} className="templateFormField">
                    <span className="fieldLabel">
                      {field.label}
                      {field.required ? <span className="reqStar"> *</span> : ""}
                    </span>
                    {fieldControl(field, value, (input) => onChange(field.tag, templateFormInputToValue(field, input)))}
                    {field.helpText && <small className="fieldHelp">{field.helpText}</small>}
                  </label>
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
        </div>
      ) : (
        <div style={{ minHeight: "450px", height: "60vh", width: "100%", marginBottom: "12px" }}>
          <A4DocumentPreview template={template} schema={schema} values={values} />
        </div>
      )}

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
