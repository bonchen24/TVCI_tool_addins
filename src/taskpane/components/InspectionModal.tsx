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
  on1ClickStandardize: () => void;
  onRollback: () => void;
  busy: boolean;
}

type FilterStatus = "all" | "fail" | "missing" | "pass" | "na";

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

  if (!isOpen) return null;

  const isBlank = summary?.isBlankDocument === true;
  const safeIssuesCount = issues.filter((i) => i.autoFixable).length;

  const filteredRules = summary?.results.filter((r) => {
    if (filter === "all") return true;
    if (filter === "fail") return r.status === "FAIL";
    if (filter === "missing") return r.status === "MISSING";
    if (filter === "pass") return r.status === "PASS";
    if (filter === "na") return r.status === "NOT_APPLICABLE";
    return true;
  }) || [];

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog inspectionModalDialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modalHeader">
          <div className="modalTitle">
            <span>🛡️</span> Kiểm tra Thể thức Văn bản
          </div>
          <button type="button" className="modalCloseBtn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modalBody" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {/* Status Summary Banner */}
          {isBlank ? (
            <div className="inspectionBlankBanner">
              <div style={{ fontSize: 24, marginBottom: 4 }}>⚠️</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e" }}>
                Tài liệu chưa có nội dung để kiểm tra
              </div>
              <div style={{ fontSize: 11.5, color: "#78350f", marginTop: 2 }}>
                Hãy nhập văn bản hoặc chọn biểu mẫu từ Kho biểu mẫu để bắt đầu.
              </div>
            </div>
          ) : summary ? (
            <div className="inspectionScoreCard">
              <div className="inspectionScoreHeader">
                <div className="inspectionScoreNumber">
                  {summary.passedRules} / {summary.applicableRules}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Tiêu chuẩn thể thức đã đạt</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    Điểm tuân thủ: {summary.healthScore}% · Nghị định 30/2020/NĐ-CP
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="inspectionProgressBarTrack">
                <div
                  className="inspectionProgressBarFill"
                  style={{
                    width: `${summary.healthScore}%`,
                    background:
                      summary.healthScore >= 90
                        ? "#16a34a"
                        : summary.healthScore >= 60
                        ? "#ca8a04"
                        : "#dc2626",
                  }}
                />
              </div>

              {/* Stats badges */}
              <div className="inspectionStatsRow">
                <span className="statBadge pass">✓ {summary.passedRules} Đạt</span>
                <span className="statBadge fail">✗ {summary.failedRules} Vi phạm</span>
                <span className="statBadge missing">! {summary.missingRules} Còn thiếu</span>
                <span className="statBadge na">- {summary.notApplicableRules} N/A</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b" }}>
              Đang tải kết quả kiểm tra...
            </div>
          )}

          {/* Filter tabs */}
          {summary && !isBlank && (
            <div className="inspectionFilterBar">
              <button
                type="button"
                className={`inspectionFilterBtn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                Tất cả ({summary.results.length})
              </button>
              <button
                type="button"
                className={`inspectionFilterBtn ${filter === "fail" ? "active" : ""}`}
                onClick={() => setFilter("fail")}
              >
                Lỗi vi phạm ({summary.failedRules})
              </button>
              <button
                type="button"
                className={`inspectionFilterBtn ${filter === "missing" ? "active" : ""}`}
                onClick={() => setFilter("missing")}
              >
                Còn thiếu ({summary.missingRules})
              </button>
              <button
                type="button"
                className={`inspectionFilterBtn ${filter === "pass" ? "active" : ""}`}
                onClick={() => setFilter("pass")}
              >
                Đã đạt ({summary.passedRules})
              </button>
            </div>
          )}

          {/* Rules & Issues List */}
          <div className="inspectionRulesList">
            {filteredRules.map((rule) => {
              const ruleIssue = issues.find((i) => i.ruleId === rule.ruleId);
              return (
                <div key={rule.ruleId} className={`inspectionRuleItem ${rule.status.toLowerCase()}`}>
                  <div className="inspectionRuleHeader">
                    <span className={`inspectionRuleStatusTag ${rule.status.toLowerCase()}`}>
                      {rule.status === "PASS" && "✓ ĐẠT"}
                      {rule.status === "FAIL" && "✗ VI PHẠM"}
                      {rule.status === "MISSING" && "! THIẾU"}
                      {rule.status === "NOT_APPLICABLE" && "N/A"}
                    </span>
                    <span className="inspectionRuleTitle">{rule.title}</span>
                  </div>

                  <div className="inspectionRuleMsg">{rule.message}</div>

                  {/* Actions for FAIL or MISSING */}
                  {rule.status === "FAIL" && ruleIssue && (
                    <div className="inspectionRuleActions">
                      <button
                        type="button"
                        className="ruleActionBtn secondary"
                        onClick={() => onLocateIssue(ruleIssue)}
                      >
                        🎯 Đi tới lỗi
                      </button>
                      {ruleIssue.autoFixable && (
                        <button
                          type="button"
                          className="ruleActionBtn primary"
                          onClick={() => onFixIssue(ruleIssue)}
                          disabled={busy}
                        >
                          ⚡ Sửa lỗi này
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="modalFooter" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void onCheck()}
              disabled={busy}
            >
              🔄 Quét lại
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onRollback}
              disabled={busy}
            >
              ↩️ Hoàn tác
            </button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {safeIssuesCount > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onFixAllSafe}
                disabled={busy}
              >
                ⚡ Sửa {safeIssuesCount} lỗi an toàn
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={on1ClickStandardize}
              disabled={busy}
            >
              ✨ Chuẩn hóa 1-click
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
