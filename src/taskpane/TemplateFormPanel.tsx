import React from "react";
import type { TemplateRecord } from "../templates/library";
import type { TemplateFormAiSuggestion } from "../ai/template-form";
import type { TemplateFormField, TemplateFormSchema, TemplateFormValue, TemplateFormValues } from "../templates/form-schema";
import { MIN_TEMPLATE_FORM_AI_CONFIDENCE } from "../ai/template-form";
import { buildTemplateFormPreview } from "../templates/form-preview";
import { templateFormInputToValue, templateFormInputValue } from "./template-form.service";

export interface TemplateFormPanelProps {
  template: TemplateRecord;
  schema: TemplateFormSchema;
  values: TemplateFormValues;
  sourceText: string;
  suggestions: TemplateFormAiSuggestion[];
  busy: boolean;
  syncMessage?: string;
  onChange: (tag: string, value: TemplateFormValue) => void;
  onClose: () => void;
  onInsertBlank: () => void;
  onInsertAndFill: () => void;
  onApplyToWord: () => void;
  onSourceTextChange: (value: string) => void;
  onSuggestAi: () => void;
  onAcceptAi: () => void;
  onReviewAi: (tag: string) => void;
  onAiValueChange: (tag: string, value: string) => void;
}

function fieldControl(field: TemplateFormField, value: string, onChange: (value: string) => void): React.ReactNode {
  if (field.type === "select") {
    return <select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Chọn một giá trị</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  }
  if (field.type === "textarea" || field.type === "multi-line" || field.type === "repeatable") {
    return <textarea value={value} rows={field.type === "textarea" ? 4 : 3} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} />;
  }
  return <input type={field.type === "date" ? "date" : "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} />;
}

export function TemplateFormPanel({
  template,
  schema,
  values,
  sourceText,
  suggestions,
  busy,
  syncMessage,
  onChange,
  onClose,
  onInsertBlank,
  onInsertAndFill,
  onApplyToWord,
  onSourceTextChange,
  onSuggestAi,
  onAcceptAi,
  onReviewAi,
  onAiValueChange,
}: TemplateFormPanelProps): React.ReactElement {
  const preview = buildTemplateFormPreview(template, schema, values);
  const requiresReview = suggestions.some((suggestion) => suggestion.confidence < MIN_TEMPLATE_FORM_AI_CONFIDENCE && suggestion.reviewed !== true);
  return (
    <section className="templateForm card" aria-label={`Form ${schema.label}`}>
      <div className="templateFormHeader">
        <div className="templateFormTitleWrap">
          <div className="formBadge">{preview.issuerLines[1]}</div>
          <div>
            <h3>Điền biểu mẫu: {schema.label}</h3>
            <small>{template.name}{schema.compatibility ? " · Chế độ tương thích" : ""}</small>
          </div>
        </div>
        <button type="button" className="closeBtn" onClick={onClose} disabled={busy} title="Đóng form">✕</button>
      </div>

      {schema.compatibility && (
        <div className="warning">Mẫu chưa có schema chuyên biệt; hỗ trợ các trường cơ bản, hãy kiểm tra lại trên văn bản.</div>
      )}

      <div className="templateFormWorkspace">
      <div className="templateFormFields">
        {schema.fields.map((field) => {
          const value = templateFormInputValue(values[field.tag]);
          return (
            <label key={field.tag} className="templateFormField">
              <span className="fieldLabel">
                {field.label}{field.required ? <span className="reqStar"> *</span> : ""}
              </span>
              {fieldControl(field, value, (input) => onChange(field.tag, templateFormInputToValue(field, input)))}
              {field.helpText && <small className="fieldHelp">{field.helpText}</small>}
            </label>
          );
        })}
      </div>
      <div className="templatePreviewScroller" aria-label="Xem trước trang A4, zoom 75%">
        <div className="templatePreviewZoom">Xem trước A4 · 75%</div>
        <div className="templatePreviewPage">
          <div className="templatePreviewHeader">
            <div className="templatePreviewIssuer"><div>{preview.issuerLines[0]}</div><strong>{preview.issuerLines[1]}</strong><div className="templatePreviewRule" /></div>
            <div className="templatePreviewNational"><strong>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><strong>Độc lập - Tự do - Hạnh phúc</strong><div className="templatePreviewRule" /></div>
          </div>
          <div className="templatePreviewMetadata"><span>{template.symbolHint?.replace("…", "       ") || "Số:       /[KÝ HIỆU]"}<br />{preview.subject}</span><em>{preview.date || "Hà Nội, ngày … tháng … năm …"}</em></div>
          <h3>{template.documentType.toLocaleUpperCase("vi-VN")}</h3>
          {preview.addressee && <p className="templatePreviewAddressee">{preview.addressee}</p>}
          {preview.body && <p className="templatePreviewBody">{preview.body}</p>}
          <div className="templatePreviewFooter"><div><strong>Nơi nhận:</strong><p>{preview.recipients}</p></div><div><strong>{template.organization === "TVCI" ? "GIÁM ĐỐC" : "VIỆN TRƯỞNG"}</strong><p>{templateFormInputValue(values.NGUOI_KY)}</p></div></div>
        </div>
      </div>
      </div>

      <details className="templateFormAi">
        <summary><strong>Trợ lý AI điền thông tin tự động</strong></summary>
        <small className="aiHint">Dán email, công văn đến hoặc ghi chú để AI tự động trích xuất các trường thông tin.</small>
        <textarea
          value={sourceText}
          onChange={(event) => onSourceTextChange(event.target.value)}
          placeholder="Dán nội dung nguồn để AI tự động điền vào các trường trên..."
        />
        <div className="actions">
          <button type="button" onClick={onSuggestAi} disabled={busy || !sourceText.trim()}>AI phân tích &amp; điền</button>
          {suggestions.length > 0 && (
            <button type="button" className="primary" onClick={onAcceptAi} disabled={busy || requiresReview}>
              Chấp nhận đề xuất
            </button>
          )}
        </div>
        {requiresReview && (
          <small className="warning">Có đề xuất độ tin cậy dưới 80%. Vui lòng rà soát giá trị trước khi chấp nhận.</small>
        )}
        {suggestions.length > 0 && (
          <div className="templateFormSuggestions">
            {suggestions.map((suggestion) => (
              <div className="templateFormSuggestion" key={suggestion.tag}>
                <strong>{suggestion.tag}</strong>
                <input
                  value={suggestion.value ?? ""}
                  placeholder="Chưa xác định"
                  onChange={(event) => onAiValueChange(suggestion.tag, event.target.value)}
                />
                <small>
                  Nguồn: {suggestion.source || "Không rõ"} · độ tin cậy {Math.round(suggestion.confidence * 100)}%
                  {suggestion.confidence < MIN_TEMPLATE_FORM_AI_CONFIDENCE ? " · Cần rà soát" : ""}
                </small>
                {suggestion.confidence < MIN_TEMPLATE_FORM_AI_CONFIDENCE && (
                  <button type="button" onClick={() => onReviewAi(suggestion.tag)} disabled={busy}>
                    {suggestion.reviewed ? "Đã rà soát" : "Rà soát"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </details>

      {syncMessage && <div className="sourceNote syncAlert" role="status">{syncMessage}</div>}

      <div className="templateFormActions">
        <button type="button" className="primary full" onClick={onInsertAndFill} disabled={busy}>
          Chèn và điền
        </button>
        <div className="actions subActions">
          <button type="button" onClick={onApplyToWord} disabled={busy} title="Chỉ điền vào tài liệu Word đang mở mà không chèn thêm mẫu">
            Áp dụng vào Word hiện tại
          </button>
          <button type="button" onClick={onInsertBlank} disabled={busy} title="Chèn văn bản mẫu gốc chưa điền">
            Chèn mẫu trống
          </button>
        </div>
      </div>
    </section>
  );
}

