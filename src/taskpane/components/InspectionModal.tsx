import React, { useState } from "react";
import type { ValidationIssue, DocumentEvaluationSummary } from "../../rules/models";

export interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheck: () => Promise<void>;
  summary: DocumentEvaluationSummary | null;
  issues: ValidationIssue[];
  onLocateIssue: (issue: ValidationIssue) => void;
  onFixIssue: (issue: ValidationIssue) => void;
  onFixAllSafe: () => void;
  on1ClickStandardize?: () => void;
  onRollback?: () => void;
  busy: boolean;
}

type FilterStatus = "all" | "fail" | "missing";

export function InspectionModal({
  isOpen,
  onClose,
  onCheck,
  summary,
  issues,
  onLocateIssue,
  onFixIssue,
  onFixAllSafe,
  on1ClickStandardize,
  onRollback,
  busy,
}: InspectionModalProps): React.ReactElement | null {
  const [filter, setFilter] = useState<FilterStatus>("all");

  const isDialog = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dialog") === "1";

  if (!isOpen) return null;

  const isBlank = summary?.isBlankDocument === true;
  const safeIssuesCount = issues.filter((i) => i.autoFixable).length;

  const failCount = summary?.failedRules ?? 0;
  const missingCount = summary?.missingRules ?? 0;
  const passCount = summary?.passedRules ?? 0;
  const totalCount = summary?.applicableRules ?? 0;

  const filteredResults = (summary?.results || []).filter((r) => {
    if (filter === "fail") return r.status === "FAIL";
    if (filter === "missing") return r.status === "MISSING";
    return true;
  });

  const modalContent = (
    <div
      className={`inspectionModalDialog ${isDialog ? "dialogRootWindow" : "modalDialog"}`}
      style={isDialog ? { width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" } : { maxWidth: 680, width: "95%", height: "80vh", display: "flex", flexDirection: "column" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="modalHeader" style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f3f67" }}>KIỂM TRA THỂ THỨC VĂN BẢN</div>
          <div style={{ fontSize: 10.5, color: "#64748b" }}>
            Đánh giá quy cách thể thức theo Nghị định 30/2020/NĐ-CP
          </div>
        </div>
        <button type="button" className="modalCloseBtn" onClick={onClose} title="Đóng">
          ✕
        </button>
      </div>

      {/* Body: Clean Checklist */}
      <div className="modalBody" style={{ flex: 1, overflowY: "auto", padding: "12px 16px", background: "#ffffff" }}>
        {isBlank ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#b45309", background: "#fffbeb", borderRadius: 6, border: "1px solid #fde68a" }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Tài liệu chưa có nội dung</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Hãy tạo văn bản hoặc chọn mẫu trên Ribbon trước khi kiểm tra.</div>
          </div>
        ) : summary ? (
          <>
            {/* Top Stats Summary + Filter Chips */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#0d4f8b" }}>{passCount} / {totalCount}</span>
                  <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>đạt</span>
                </div>
                {failCount > 0 && (
                  <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 12 }}>
                    {failCount} lỗi cần sửa
                  </div>
                )}
                {missingCount > 0 && (
                  <div style={{ color: "#d97706", fontWeight: 600, fontSize: 12 }}>
                    {missingCount} thiếu
                  </div>
                )}
              </div>

              {/* Filter Chips */}
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className={`btn ${filter === "all" ? "btn-primary" : "btn-outline"}`}
                  style={{ height: 26, fontSize: 11, padding: "0 10px" }}
                  onClick={() => setFilter("all")}
                >
                  Tất cả ({summary.results.length})
                </button>
                <button
                  type="button"
                  className={`btn ${filter === "fail" ? "btn-primary" : "btn-outline"}`}
                  style={{ height: 26, fontSize: 11, padding: "0 10px" }}
                  onClick={() => setFilter("fail")}
                >
                  Cần sửa ({failCount})
                </button>
                <button
                  type="button"
                  className={`btn ${filter === "missing" ? "btn-primary" : "btn-outline"}`}
                  style={{ height: 26, fontSize: 11, padding: "0 10px" }}
                  onClick={() => setFilter("missing")}
                >
                  Thiếu ({missingCount})
                </button>
              </div>
            </div>

            {/* Checklist items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredResults.map((r) => {
                const issue = issues.find((i) => i.ruleId === r.ruleId);
                const isPass = r.status === "PASS";
                const isFail = r.status === "FAIL";
                const isMissing = r.status === "MISSING";

                return (
                  <div
                    key={r.ruleId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: isFail ? "#fca5a5" : isMissing ? "#fde68a" : "#e2e8f0",
                      background: isFail ? "#fff5f5" : isMissing ? "#fffbeb" : "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isPass ? "#16a34a" : isFail ? "#dc2626" : "#d97706" }}>
                        {isPass ? "✓" : isFail ? "✕" : "!"}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 11.5, color: "#1e293b" }}>{r.title}</div>
                        {r.message && !isPass && (
                          <div style={{ fontSize: 10.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline Actions */}
                    {isFail && issue && (
                      <div style={{ display: "flex", gap: 4, marginLeft: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ height: 24, fontSize: 10.5, padding: "0 8px" }}
                          onClick={() => onLocateIssue(issue)}
                        >
                          Đi tới
                        </button>
                        {issue.autoFixable && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ height: 24, fontSize: 10.5, padding: "0 8px", background: "#0d4f8b" }}
                            onClick={() => onFixIssue(issue)}
                          >
                            Sửa
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
            Đang tải kết quả rà soát thể thức...
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ height: 32, fontSize: 11.5, padding: "0 14px" }}
          onClick={() => void onCheck()}
          disabled={busy}
        >
          {busy ? "Đang quét..." : "🔄 Quét lại"}
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          {on1ClickStandardize && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ height: 32, fontSize: 11.5, padding: "0 12px" }}
              onClick={on1ClickStandardize}
              disabled={busy}
            >
              Chuẩn hóa
            </button>
          )}
          {onRollback && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ height: 32, fontSize: 11.5, padding: "0 12px" }}
              onClick={onRollback}
              disabled={busy}
            >
              Hoàn tác
            </button>
          )}
          {safeIssuesCount > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: 32, fontSize: 11.5, padding: "0 16px", background: "#0d4f8b" }}
              onClick={onFixAllSafe}
              disabled={busy}
            >
              ⚡ Sửa tất cả {safeIssuesCount} lỗi an toàn
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline"
            style={{ height: 32, fontSize: 11.5, padding: "0 14px" }}
            onClick={onClose}
          >
            Đóng
          </button>
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
