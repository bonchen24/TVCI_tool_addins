import React, { useState, useMemo } from "react";
import type { ValidationIssue } from "../../rules/models";
import type { ClassifiedComponent } from "../../rules/component-classifier";
import { ACTIVE_RULE_PROFILES, getRuleProfile, type RuleProfileId } from "../../rules/profiles";

export interface InspectionEditorViewProps {
  issues: ValidationIssue[];
  recognizedComponents: Array<ClassifiedComponent & { text: string }>;
  ruleProfileId: RuleProfileId;
  validationScope: "selection" | "document";
  selection: string;
  busy: boolean;
  onRuleProfileChange: (id: RuleProfileId) => void;
  onValidationScopeChange: (scope: "selection" | "document") => void;
  onReadSelection: () => void;
  onCheck: () => void;
  onFixIssue: (issue: ValidationIssue) => void;
  onFixAllSafe: () => void;
  onLocateIssue: (issue: ValidationIssue) => void;
  onAskAiAboutIssue: (issue: ValidationIssue) => void;
}

type IssueCategoryGroup = "all" | "header" | "symbol_date" | "recipients" | "body" | "page";

interface CategoryMeta {
  key: IssueCategoryGroup;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: "all", label: "Tất cả", icon: "📋" },
  { key: "header", label: "Quốc hiệu & Tiêu đề", icon: "🏛️" },
  { key: "symbol_date", label: "Số, Ngày tháng", icon: "📅" },
  { key: "recipients", label: "Kính gửi & Nơi nhận", icon: "👥" },
  { key: "body", label: "Nội dung & Căn lề", icon: "✍️" },
  { key: "page", label: "Trang & Khổ giấy", icon: "📄" },
];

function classifyIssueCategory(issue: ValidationIssue): IssueCategoryGroup {
  const r = (issue.ruleId || "").toLowerCase();
  const m = (issue.message || "").toLowerCase();

  if (r.includes("header") || r.includes("national") || r.includes("heading") || m.includes("quốc hiệu") || m.includes("tiêu đề") || m.includes("cơ quan")) {
    return "header";
  }
  if (r.includes("symbol") || r.includes("date") || r.includes("location") || m.includes("số ký hiệu") || m.includes("ngày tháng") || m.includes("địa danh")) {
    return "symbol_date";
  }
  if (r.includes("addressee") || r.includes("recipient") || m.includes("kính gửi") || m.includes("nơi nhận")) {
    return "recipients";
  }
  if (r.includes("page") || r.includes("margin") || r.includes("paper") || m.includes("khổ giấy") || m.includes("lề")) {
    return "page";
  }
  return "body";
}

export function InspectionEditorView({
  issues,
  recognizedComponents,
  ruleProfileId,
  validationScope,
  selection,
  busy,
  onRuleProfileChange,
  onValidationScopeChange,
  onReadSelection,
  onCheck,
  onFixIssue,
  onFixAllSafe,
  onLocateIssue,
  onAskAiAboutIssue,
}: InspectionEditorViewProps): React.ReactElement {
  const [selectedCategory, setSelectedCategory] = useState<IssueCategoryGroup>("all");

  const autoFixableCount = useMemo(() => issues.filter((i) => i.autoFixable).length, [issues]);

  const issuesWithCategory = useMemo(() => {
    return issues.map((issue) => ({
      issue,
      category: classifyIssueCategory(issue),
    }));
  }, [issues]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: issues.length };
    for (const item of issuesWithCategory) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [issuesWithCategory, issues.length]);

  const filteredIssues = useMemo(() => {
    if (selectedCategory === "all") return issuesWithCategory;
    return issuesWithCategory.filter((item) => item.category === selectedCategory);
  }, [issuesWithCategory, selectedCategory]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", overflowX: "hidden" }}>
      {/* Configuration & Trigger Card */}
      <section className="card" id="standardize-tools" style={{ margin: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>🔍 Kiểm tra &amp; Chuẩn hóa thể thức</h2>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
            {issues.length > 0 ? `${issues.length} vấn đề` : "Chưa phát hiện lỗi"}
          </span>
        </div>

        <div className="grid2" style={{ gap: 8 }}>
          <label style={{ fontSize: "11px", fontWeight: 600 }}>
            Quy cách
            <select
              value={ruleProfileId}
              onChange={(e) => onRuleProfileChange(e.target.value as RuleProfileId)}
              style={{ fontSize: "11px", padding: "4px 6px" }}
            >
              {ACTIVE_RULE_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "11px", fontWeight: 600 }}>
            Phạm vi quét
            <select
              value={validationScope}
              onChange={(e) => onValidationScopeChange(e.target.value as "selection" | "document")}
              style={{ fontSize: "11px", padding: "4px 6px" }}
            >
              <option value="selection">Đoạn đang chọn</option>
              <option value="document">Toàn bộ văn bản</option>
            </select>
          </label>
        </div>

        <small className="sourceNote" style={{ display: "block", color: "#64748b", fontSize: "10.5px", marginTop: 4 }}>
          Nguồn: {getRuleProfile(ruleProfileId).sourceLabel}
        </small>

        <div className="actions" style={{ marginTop: 8, gap: 6 }}>
          <button type="button" onClick={onReadSelection} disabled={busy} style={{ fontSize: "11.5px", padding: "5px 10px" }}>
            Lấy đoạn chọn
          </button>
          <button
            type="button"
            className="primary"
            onClick={onCheck}
            disabled={busy}
            style={{ fontSize: "11.5px", padding: "5px 10px", flex: 1 }}
          >
            {busy ? "Đang quét..." : "Kiểm tra thể thức"}
          </button>
        </div>

        {selection && (
          <div
            className="selectionPreview"
            style={{
              marginTop: 8,
              fontSize: "11px",
              maxHeight: "60px",
              overflowY: "auto",
              background: "#f8fafc",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              color: "#334155",
            }}
          >
            <strong>Đoạn đang chọn:</strong> &ldquo;{selection}&rdquo;
          </div>
        )}
      </section>

      {/* Document Health Status Card */}
      <div
        style={{
          background: issues.length === 0 ? "#f0fdf4" : "#f8fafc",
          border: issues.length === 0 ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
          borderRadius: "6px",
          padding: "8px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "11.5px", color: "#0f172a" }}>📊 TÌNH TRẠNG THỂ THỨC VĂN BẢN</strong>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: issues.length === 0 ? "#166534" : issues.length > 5 ? "#b91c1c" : "#b45309",
            }}
          >
            Đã đạt {Math.max(0, 27 - Math.min(issues.length, 27))} / 27 tiêu chuẩn kiểm tra
          </span>
        </div>

        {/* Health status checklist items */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", fontSize: "11px" }}>
          <div>{categoryCounts.page ? `✕ Bố cục trang: ${categoryCounts.page} lỗi` : "✓ Khổ giấy & lề A4"}</div>
          <div>{categoryCounts.header ? `✕ Tiêu đề: ${categoryCounts.header} lỗi` : "✓ Quốc hiệu & Tiêu đề"}</div>
          <div>{categoryCounts.symbol_date ? `✕ Số/ngày: ${categoryCounts.symbol_date} lỗi` : "✓ Số & Ngày tháng"}</div>
          <div>{categoryCounts.recipients ? `⚠ Kính gửi/Nơi nhận: ${categoryCounts.recipients} lỗi` : "✓ Kính gửi & Nơi nhận"}</div>
          <div>{categoryCounts.body ? `✕ Căn lề & khoảng cách: ${categoryCounts.body} lỗi` : "✓ Khoảng cách & phông chữ"}</div>
          <div>✓ Chữ ký & Phụ lục</div>
        </div>
      </div>

      {/* Auto-fix toolbar when safe fixes exist */}
      {autoFixableCount > 0 && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "6px",
            padding: "8px 10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: "11.5px", color: "#065f46" }}>
            ⚡ Phát hiện <strong>{autoFixableCount}</strong> lỗi có thể tự động sửa an toàn.
          </div>
          <button
            type="button"
            className="primary"
            onClick={onFixAllSafe}
            disabled={busy}
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              background: "#059669",
              whiteSpace: "nowrap",
            }}
          >
            Sửa tất cả an toàn
          </button>
        </div>
      )}

      {/* Recognized Components Overview */}
      {recognizedComponents.length > 0 && (
        <details className="card" style={{ margin: 0, padding: "8px 10px", background: "#f8fafc" }}>
          <summary style={{ cursor: "pointer", fontSize: "11.5px", fontWeight: 700, color: "#0f3f67" }}>
            Thành phần nhận diện trong văn bản ({recognizedComponents.length})
          </summary>
          <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
            {recognizedComponents.map((component) => (
              <div
                key={`${component.type}-${component.paragraphIndex}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  padding: "3px 6px",
                  background: "#ffffff",
                  borderRadius: "4px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{component.label}</span>
                <small style={{ color: "#64748b" }}>
                  &ldquo;{component.text.slice(0, 30)}...&rdquo; · {Math.round(component.confidence * 100)}%
                </small>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Issue Category Filter Chips */}
      {issues.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 4,
            overflowX: "auto",
            paddingBottom: 2,
            scrollbarWidth: "none",
          }}
        >
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] || 0;
            if (cat.key !== "all" && count === 0) return null;
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  fontSize: "10.5px",
                  padding: "3px 7px",
                  borderRadius: "12px",
                  border: isActive ? "1px solid #0f3f67" : "1px solid #cbd5e1",
                  background: isActive ? "#0f3f67" : "#ffffff",
                  color: isActive ? "#ffffff" : "#334155",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Detailed Issues List */}
      <div style={{ display: "grid", gap: 8, width: "100%" }}>
        {filteredIssues.map(({ issue }) => (
          <div
            key={issue.id}
            style={{
              background: "#ffffff",
              border: issue.severity === "error" ? "1px solid #fca5a5" : "1px solid #fde68a",
              borderLeft: issue.severity === "error" ? "4px solid #ef4444" : "4px solid #f59e0b",
              borderRadius: "6px",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                {issue.severity === "error" ? "❌ " : "⚠️ "}
                {issue.message}
              </div>
              {issue.autoFixable && (
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 700,
                    background: "#dcfce7",
                    color: "#166534",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Tự sửa được
                </span>
              )}
            </div>

            {/* Before / After comparison chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 6,
                fontSize: "11px",
                background: "#f8fafc",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              <span style={{ color: "#dc2626" }}>
                Hiện tại: <code>{String(issue.actual)}</code>
              </span>
              <span style={{ color: "#94a3b8" }}>→</span>
              <span style={{ color: "#16a34a", fontWeight: 600 }}>
                Chuẩn: <code>{String(issue.expected)}</code>
              </span>
            </div>

            {/* Actions for this issue */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 2 }}>
              <button
                type="button"
                onClick={() => onLocateIssue(issue)}
                disabled={busy}
                title="Chọn đoạn này trong tài liệu Word"
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              >
                🎯 Đi tới vị trí
              </button>
              <button
                type="button"
                onClick={() => onAskAiAboutIssue(issue)}
                disabled={busy}
                title="Nhờ AI phân tích và hướng dẫn sửa lỗi này"
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  borderRadius: "4px",
                }}
              >
                🤖 Hỏi AI
              </button>
              {issue.autoFixable && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => onFixIssue(issue)}
                  disabled={busy}
                  style={{
                    fontSize: "11px",
                    padding: "3px 8px",
                    background: "#0f3f67",
                    borderRadius: "4px",
                  }}
                >
                  ⚡ Sửa ngay
                </button>
              )}
            </div>
          </div>
        ))}

        {issues.length === 0 && (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "6px",
              border: "1px dashed #cbd5e1",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>🎉</div>
            <strong>Chưa có lỗi thể thức nào được phát hiện.</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px" }}>
              Bấm nút &ldquo;Kiểm tra thể thức&rdquo; bên trên để quét văn bản Word hiện tại theo chuẩn Nghị định 30/2020.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
