import React from "react";
import type { TemplateRecord } from "../../templates/library";
import type { TemplateFormDraft } from "../../templates/form-drafts";
import type { AutoDetectResult } from "../../rules/auto-detect.service";

export interface SmartStartScreenProps {
  hasDocumentContent: boolean;
  docStats: { paragraphs: number; words: number; snippet: string };
  autoDetectResult?: AutoDetectResult | null;
  pendingDraft: TemplateFormDraft | null;
  pendingDraftTemplateName?: string;
  recentTemplates: TemplateRecord[];
  favoriteTemplates: TemplateRecord[];
  onInspectDocument: () => void;
  onNewDocument: () => void;
  onChangeRuleProfile?: () => void;
  onResumeDraft: (draft: TemplateFormDraft) => void;
  onDiscardDraft: (draft: TemplateFormDraft) => void;
  onSelectTemplate: (template: TemplateRecord) => void;
  onToggleFavorite: (templateId: string) => void;
  onOpenLibrary: () => void;
}

export function SmartStartScreen({
  hasDocumentContent,
  docStats,
  autoDetectResult,
  pendingDraft,
  pendingDraftTemplateName,
  recentTemplates,
  favoriteTemplates,
  onInspectDocument,
  onNewDocument,
  onChangeRuleProfile,
  onResumeDraft,
  onDiscardDraft,
  onSelectTemplate,
  onToggleFavorite,
  onOpenLibrary,
}: SmartStartScreenProps): React.ReactElement {
  return (
    <div className="smartStartScreen" aria-label="Trang bắt đầu thông minh">
      {/* 1. Tài liệu hiện tại / Primary Call-to-Action */}
      <section className="smartDocStatusCard card">
        <div className="smartDocStatusHeader">
          <span className="smartDocStatusIcon">{hasDocumentContent ? "📄" : "📝"}</span>
          <div>
            <h4>{hasDocumentContent ? "Tài liệu Word hiện tại" : "Tài liệu trống"}</h4>
            <p className="smartDocStatusMeta">
              {hasDocumentContent
                ? `Đã nhận diện ~${docStats.paragraphs} đoạn (${docStats.words} từ)`
                : "Chưa có nội dung. Hãy bắt đầu bằng cách chọn một biểu mẫu chuẩn."}
            </p>
          </div>
        </div>

        {hasDocumentContent && autoDetectResult && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
              padding: "8px 10px",
              margin: "8px 0",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534" }}>
                ✓ Đã tự động nhận diện ({Math.round(autoDetectResult.confidence * 100)}%)
              </span>
              {onChangeRuleProfile && (
                <button
                  type="button"
                  onClick={onChangeRuleProfile}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0f3f67",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Đổi quy cách
                </button>
              )}
            </div>
            <div style={{ fontSize: "11.5px", color: "#1e293b", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
              <div><span style={{ color: "#64748b" }}>Đơn vị:</span> <strong>{autoDetectResult.orgLabel}</strong></div>
              <div><span style={{ color: "#64748b" }}>Loại:</span> <strong>{autoDetectResult.documentType}</strong></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "#64748b" }}>Quy cách:</span> <span>{autoDetectResult.ruleProfileName}</span>
              </div>
            </div>
          </div>
        )}

        {hasDocumentContent && docStats.snippet && (
          <div className="smartDocSnippet" title={docStats.snippet}>
            &ldquo;{docStats.snippet}&rdquo;
          </div>
        )}

        <div className="smartDocActions">
          {hasDocumentContent ? (
            <>
              <button
                type="button"
                className="btnPrimary mainCtaBtn"
                onClick={onInspectDocument}
                title="Quét toàn bộ văn bản và đối chiếu với thể thức quy định"
              >
                🔍 Kiểm tra thể thức văn bản này
              </button>
              <button type="button" className="btnSecondary" onClick={onOpenLibrary}>
                ➕ Soạn văn bản mới từ biểu mẫu
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btnPrimary mainCtaBtn"
                onClick={onOpenLibrary}
                title="Mở kho biểu mẫu để bắt đầu tạo tài liệu chuẩn"
              >
                ➕ Tạo văn bản mới từ biểu mẫu
              </button>
              <button type="button" className="btnSecondary" onClick={onInspectDocument}>
                🔍 Kiểm tra định dạng hiện tại
              </button>
            </>
          )}
        </div>
      </section>

      {/* 2. Tiếp tục biểu mẫu đang làm (Draft Resumption Card) */}
      {pendingDraft && (
        <section className="smartDraftResumeCard card" aria-label="Biểu mẫu chưa hoàn thành">
          <div className="smartDraftResumeHeader">
            <span className="smartDraftIcon">⏳</span>
            <div>
              <strong>Tiếp tục biểu mẫu đang làm</strong>
              <div className="smartDraftName">
                {pendingDraftTemplateName || pendingDraft.templateId} ({pendingDraft.documentType})
              </div>
              <small className="smartDraftTime">
                Cập nhật lúc: {new Date(pendingDraft.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </small>
            </div>
          </div>
          <div className="smartDraftActions">
            <button
              type="button"
              className="btnPrimary btnSmall"
              onClick={() => onResumeDraft(pendingDraft)}
            >
              Tiếp tục điền
            </button>
            <button
              type="button"
              className="btnSecondary btnSmall"
              onClick={() => onDiscardDraft(pendingDraft)}
            >
              Bỏ qua
            </button>
          </div>
        </section>
      )}

      {/* 3. Mẫu yêu thích (Favorite Templates) */}
      {favoriteTemplates.length > 0 && (
        <section className="smartSection" aria-label="Mẫu yêu thích">
          <div className="smartSectionTitle">
            <span>⭐ Biểu mẫu yêu thích ({favoriteTemplates.length})</span>
          </div>
          <div className="smartTemplateGrid">
            {favoriteTemplates.map((template) => (
              <div key={template.id} className="smartTemplateCard">
                <div className="smartTemplateInfo" onClick={() => onSelectTemplate(template)}>
                  <span className="smartTemplateOrgBadge">{template.organization}</span>
                  <strong>{template.name}</strong>
                  <small>{template.documentType}</small>
                </div>
                <button
                  type="button"
                  className="smartFavBtn active"
                  title="Bỏ đánh dấu yêu thích"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(template.id);
                  }}
                >
                  ★
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Mẫu vừa dùng (Recent Templates) */}
      {recentTemplates.length > 0 && (
        <section className="smartSection" aria-label="Mẫu vừa dùng">
          <div className="smartSectionTitle">
            <span>🕒 Biểu mẫu vừa dùng gần đây</span>
          </div>
          <div className="smartRecentList">
            {recentTemplates.slice(0, 5).map((template) => (
              <div
                key={template.id}
                className="smartRecentItem"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="smartRecentText">
                  <span className="smartTemplateOrgBadge small">{template.organization}</span>
                  <span className="smartRecentName">{template.name}</span>
                </div>
                <button
                  type="button"
                  className="smartRecentActionBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(template);
                  }}
                >
                  Điền form →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Nút mở kho biểu mẫu đầy đủ */}
      <div className="smartOpenLibraryWrap">
        <button type="button" className="btnSecondary fullWidthBtn" onClick={onOpenLibrary}>
          📁 Xem toàn bộ Kho biểu mẫu ({recentTemplates.length > 0 ? "31+ mẫu" : "Kho mẫu TVCI/IEMM/Đảng"})
        </button>
      </div>
    </div>
  );
}
