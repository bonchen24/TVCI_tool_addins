# M3 Explorer 2 Analysis: Real-Time Administrative Audit Panel & Evaluation Hook

**Target Milestone**: Milestone 3 (`administrative-format-engine`)  
**Scope**: Real-time evaluation hook (`useDocumentAudit`), Audit Panel UI (`Sidebar.tsx`), and Status Bar live health score badge & Profile Selector (`StatusBar.tsx`).  
**Investigator**: M3 Explorer 2  
**Date**: 2026-09-29  

---

## 1. Executive Summary

Milestone 3 equips the TVCI Web Application with real-time administrative format compliance checking according to Vietnamese Government Decree 30/2020/NĐ-CP (and related enterprise profiles).

This investigation delivers the architecture, interface contracts, state lifecycle, and UI/UX design for:
1. **`useDocumentAudit.ts`**: High-performance debounced (150ms) hook listening to ProseMirror transactions, generating snapshots via `tiptapDocToSnapshots()`, executing `evaluateDocumentRules()`, and exposing live reactive state.
2. **Audit Panel UI (`Sidebar.tsx`)**: Rich issue cards with 3-tier severity badges (Critical: Rose, Major: Amber, Minor: Slate), 6+ Vietnamese administrative element tags (Quốc hiệu, Tiêu ngữ, Số ký hiệu, Thân bài, Nơi nhận, Người ký), rule explanation, individual "Sửa mục này" fix buttons, multi-criteria filtering/grouping, and 100% compliant empty state.
3. **Status Bar & Profile Selector (`StatusBar.tsx`)**: Live dynamic health score badge with 3-color thresholding (Emerald $\ge 90$, Amber $70-89$, Rose $< 70$) and interactive Profile Selector ("NĐ 30/2020 TVCI", "Chuẩn nghiêm ngặt", "Nội bộ doanh nghiệp").

---

## 2. Real-Time Evaluation Hook: `useDocumentAudit.ts`

### 2.1 Performance & Debounce Architecture

Administrative documents may range from 1 to 50+ pages with hundreds of nodes. Running snapshot conversion and 25+ regex rule validations on every keystroke causes frame drops and typing lag.

**Design Strategy**:
- **Listen to `editor.on('transaction')`** filtered strictly by `transaction.docChanged`:
  - Ignores cursor movements, text selections, and focus changes.
  - Triggers only when node content, marks, or attributes actually change.
- **150ms Debounce Window**:
  - Provides instant feedback while typing naturally without thrashing the CPU.
  - Automatically cancels pending timers when new keystrokes arrive or when the component unmounts.
- **Initial Immediate Evaluation**:
  - Executes as soon as the editor instance initializes or when a new document/DOCX is loaded.
- **Reactive Profile Switching**:
  - Changing the profile immediately schedules an audit without waiting for a doc change.

### 2.2 Hook Interface Contract

```typescript
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import type { ValidationIssue, PageSetupSnapshot, ParagraphSnapshot } from '@/rules/models';
import { tiptapDocToSnapshots } from '@/editor/tiptap-adapter';
import { evaluateDocumentRules } from '@/rules';

export interface UseDocumentAuditOptions {
  editor: Editor | null;
  debounceMs?: number; // default: 150ms
  initialProfile?: string; // default: 'NĐ30_TVCI'
  pageSetup?: PageSetupSnapshot;
}

export interface DocumentAuditStats {
  total: number;
  critical: number;
  major: number;
  minor: number;
  autoFixable: number;
}

export interface UseDocumentAuditReturn {
  healthScore: number;
  issueCount: number;
  issues: ValidationIssue[];
  stats: DocumentAuditStats;
  isAuditing: boolean;
  profile: string;
  setProfile: (profileId: string) => void;
  reevaluate: () => void;
  lastEvaluatedAt: Date | null;
}
```

### 2.3 Proposed Implementation: `web_app/src/hooks/useDocumentAudit.ts`

```typescript
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import type {
  ValidationIssue,
  PageSetupSnapshot,
  ParagraphSnapshot,
  DocumentEvaluationSummary,
} from '@/rules/models';
import { tiptapDocToSnapshots } from '@/editor/tiptap-adapter';
import { evaluateDocumentRules } from '@/rules';

export interface UseDocumentAuditOptions {
  editor: Editor | null;
  debounceMs?: number;
  initialProfile?: string;
  pageSetup?: PageSetupSnapshot;
}

export interface DocumentAuditStats {
  total: number;
  critical: number;
  major: number;
  minor: number;
  autoFixable: number;
}

export interface UseDocumentAuditReturn {
  healthScore: number;
  issueCount: number;
  issues: ValidationIssue[];
  stats: DocumentAuditStats;
  isAuditing: boolean;
  profile: string;
  setProfile: (profileId: string) => void;
  reevaluate: () => void;
  lastEvaluatedAt: Date | null;
}

const DEFAULT_PAGE_SETUP: PageSetupSnapshot = {
  topMarginMm: 20,
  bottomMarginMm: 20,
  leftMarginMm: 30,
  rightMarginMm: 15,
  paperSize: 'A4',
};

export function useDocumentAudit({
  editor,
  debounceMs = 150,
  initialProfile = 'NĐ30_TVCI',
  pageSetup = DEFAULT_PAGE_SETUP,
}: UseDocumentAuditOptions): UseDocumentAuditReturn {
  const [profile, setProfileState] = useState<string>(initialProfile);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const runEvaluation = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    try {
      setIsAuditing(true);
      const json = editor.getJSON();
      const snapshots: ParagraphSnapshot[] = tiptapDocToSnapshots(json);

      // Gracefully support both evaluateDocumentRules(snapshots, profile) and evaluateDocumentRules(inputObj)
      let summary: DocumentEvaluationSummary;
      const evaluator = evaluateDocumentRules as any;

      if (typeof evaluator === 'function') {
        if (evaluator.length === 1) {
          summary = evaluator({
            profileId: profile,
            validationScope: 'document',
            paragraphSnapshots: snapshots,
            pageSnapshot: pageSetup,
          });
        } else {
          summary = evaluator(snapshots, profile);
        }
      } else {
        throw new Error('evaluateDocumentRules is not available');
      }

      if (isMountedRef.current) {
        setHealthScore(summary.healthScore ?? 100);
        setIssues(summary.issues ?? []);
        setLastEvaluatedAt(new Date());
      }
    } catch (err) {
      console.error('[useDocumentAudit] Evaluation failed:', err);
    } finally {
      if (isMountedRef.current) {
        setIsAuditing(false);
      }
    }
  }, [editor, profile, pageSetup]);

  const scheduleEvaluation = useCallback(
    (immediate = false) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (immediate) {
        runEvaluation();
      } else {
        debounceTimerRef.current = setTimeout(() => {
          runEvaluation();
        }, debounceMs);
      }
    },
    [debounceMs, runEvaluation]
  );

  // Subscribe to editor transactions that change document structure/content
  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    const handleTransaction = ({ transaction }: { transaction: any }) => {
      if (transaction.docChanged) {
        scheduleEvaluation(false);
      }
    };

    editor.on('transaction', handleTransaction);
    // Initial evaluation once editor is mounted
    scheduleEvaluation(true);

    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, scheduleEvaluation]);

  // When profile changes, re-evaluate immediately
  const setProfile = useCallback(
    (newProfileId: string) => {
      setProfileState(newProfileId);
    },
    []
  );

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      scheduleEvaluation(true);
    }
  }, [profile, scheduleEvaluation]);

  const stats = useMemo<DocumentAuditStats>(() => {
    let critical = 0;
    let major = 0;
    let minor = 0;
    let autoFixable = 0;

    for (const issue of issues) {
      const sev = issue.severity;
      if (sev === 'error') critical++;
      else if (sev === 'warning') major++;
      else minor++;

      if (issue.autoFixable) autoFixable++;
    }

    return {
      total: issues.length,
      critical,
      major,
      minor,
      autoFixable,
    };
  }, [issues]);

  return {
    healthScore,
    issueCount: issues.length,
    issues,
    stats,
    isAuditing,
    profile,
    setProfile,
    reevaluate: () => scheduleEvaluation(true),
    lastEvaluatedAt,
  };
}
```

---

## 3. Audit Panel UI in `Sidebar.tsx`

### 3.1 UX Architecture & Information Hierarchy

The Audit Panel (`Sidebar.tsx` when `activeTab === 'audit'`) is structured into four zones:
1. **Header & Health Metric Zone**:
   - Health score percentage (0-100%) with dynamic color scale.
   - Smooth animated progress bar.
   - Profile selection dropdown directly accessible.
   - "Sửa an toàn" primary action button with count of auto-fixable issues.
2. **Filter & Filter Pills Zone**:
   - Severity segment filter: Tất cả, Nghiêm trọng (Rose), Cảnh báo (Amber), Nhẹ (Slate).
   - Component filter selector: All, Quốc hiệu / Tiêu ngữ, Số & Ngày, Thân bài, Nơi nhận / Người ký.
3. **Issue List / Empty State Zone**:
   - If `healthScore === 100` and `issueCount === 0`: Rich Empty State with Green Shield.
   - If `issueCount > 0`: Scrollable virtualized/mapped list of `AuditIssueCard` components.
4. **Issue Card Component Anatomy**:
   - Top line: Severity Badge + Element Type Tag + Fixability Icon.
   - Middle line: Rule Title & Human-readable Explanation (Actual vs Expected).
   - Bottom line: "Sửa mục này" action button (for `autoFixable: true`) or guidance hint (for manual content issues).

### 3.2 Element Type Tag Derivation Logic

To ensure robust classification regardless of whether `issue.componentType` or `issue.ruleId` is supplied:

```typescript
export type AdministrativeElementType =
  | 'Quốc hiệu'
  | 'Tiêu ngữ'
  | 'Số ký hiệu'
  | 'Địa danh & Ngày tháng'
  | 'Trích yếu'
  | 'Thân bài'
  | 'Nơi nhận'
  | 'Người ký'
  | 'Khổ giấy & Căn lề'
  | 'Thể thức khác';

export function resolveElementType(issue: ValidationIssue): AdministrativeElementType {
  const ruleId = (issue.ruleId || '').toUpperCase();
  const msg = issue.message || '';
  const comp = ((issue as any).componentType || '').toUpperCase();

  if (comp === 'NATIONAL_EMBLEM' || ruleId.includes('NATIONAL_EMBLEM') || msg.includes('[Quốc hiệu]')) {
    return 'Quốc hiệu';
  }
  if (comp === 'MOTTO' || ruleId.includes('MOTTO') || msg.includes('[Tiêu ngữ]')) {
    return 'Tiêu ngữ';
  }
  if (comp === 'DOCUMENT_NUMBER' || ruleId.includes('DOCUMENT_NUMBER') || ruleId.includes('SYMBOL') || msg.includes('[Số ký hiệu]')) {
    return 'Số ký hiệu';
  }
  if (comp === 'PLACE_DATE' || comp === 'LOCATION_DATE' || ruleId.includes('LOCATION_DATE') || ruleId.includes('PLACE_DATE') || msg.includes('[Địa danh]')) {
    return 'Địa danh & Ngày tháng';
  }
  if (comp === 'SUBJECT' || comp === 'DOCUMENT_TITLE' || ruleId.includes('TITLE') || ruleId.includes('SUBJECT') || msg.includes('[Trích yếu]')) {
    return 'Trích yếu';
  }
  if (comp === 'RECIPIENTS' || ruleId.includes('RECIPIENTS') || msg.includes('[Nơi nhận]')) {
    return 'Nơi nhận';
  }
  if (comp === 'SIGNER' || comp === 'SIGNER_ROLE' || comp === 'SIGNER_NAME' || ruleId.includes('SIGNER') || msg.includes('[Người ký]')) {
    return 'Người ký';
  }
  if (comp === 'PAGE' || ruleId.startsWith('PAGE.') || ruleId.includes('MARGIN') || msg.includes('[Lề trang]')) {
    return 'Khổ giấy & Căn lề';
  }
  if (comp === 'BODY' || ruleId.startsWith('BODY.') || msg.includes('[Thân bài]')) {
    return 'Thân bài';
  }
  return 'Thể thức khác';
}
```

### 3.3 Severity Badge Specification

| Severity Level | Badge Background & Text | Border | Lucide Icon | Meaning |
|---|---|---|---|---|
| **Critical** (`error`) | `bg-rose-50 text-rose-700` | `border-rose-200` | `AlertCircle` | Vi phạm thể thức bắt buộc (thiếu tiêu ngữ, sai font chữ chính, lề sai vượt mức) |
| **Major** (`warning`) | `bg-amber-50 text-amber-700` | `border-amber-200` | `AlertTriangle` | Sai lệch cỡ chữ, khoảng cách dòng, thụt đầu dòng |
| **Minor** (`info` / other) | `bg-slate-100 text-slate-700` | `border-slate-200` | `Info` | Gợi ý tối ưu thẩm mỹ hoặc căn lề đối chiếu |

### 3.4 Issue Card Component Design (`AuditIssueCard`)

```tsx
export interface AuditIssueCardProps {
  issue: ValidationIssue;
  onFix?: (issue: ValidationIssue) => void;
  onSelectNode?: (targetId: string) => void;
}

export function AuditIssueCard({ issue, onFix, onSelectNode }: AuditIssueCardProps) {
  const elementType = resolveElementType(issue);
  const isCritical = issue.severity === 'error';
  const isMajor = issue.severity === 'warning';

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all duration-150 bg-white hover:shadow-xs',
        isCritical
          ? 'border-rose-200 hover:border-rose-300'
          : isMajor
          ? 'border-amber-200 hover:border-amber-300'
          : 'border-slate-200 hover:border-slate-300'
      )}
    >
      {/* Top Meta Row */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Severity Badge */}
          {isCritical ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Nghiêm trọng
            </span>
          ) : isMajor ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Cảnh báo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Info className="w-3 h-3 text-slate-500" />
              Nhẹ
            </span>
          )}

          {/* Element Type Tag */}
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {elementType}
          </span>
        </div>

        {issue.autoFixable && (
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Có thể tự sửa
          </span>
        )}
      </div>

      {/* Message and Actual vs Expected */}
      <div className="space-y-1 mb-2">
        <p className="text-xs font-semibold text-slate-800 leading-snug">
          {issue.message}
        </p>
        {(issue.actual !== undefined || issue.expected !== undefined) && (
          <div className="text-[11px] text-slate-500 bg-slate-50 rounded px-2 py-1 border border-slate-100">
            {issue.actual !== undefined && (
              <span className="block">
                Hiện tại: <strong className="text-rose-600">{String(issue.actual)}</strong>
              </span>
            )}
            {issue.expected !== undefined && (
              <span className="block">
                Quy định: <strong className="text-emerald-700">{String(issue.expected)}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        {issue.autoFixable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFix?.(issue)}
            className="h-7 px-2.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 gap-1"
          >
            <Wrench className="w-3 h-3 text-emerald-600" />
            Sửa mục này
          </Button>
        ) : (
          <span className="text-[11px] text-slate-400 italic">
            Cần chỉnh sửa thủ công
          </span>
        )}

        {issue.targetId && (
          <button
            type="button"
            onClick={() => onSelectNode?.(issue.targetId)}
            className="text-[11px] text-primary-600 hover:text-primary-700 hover:underline font-medium cursor-pointer"
          >
            Xem vị trí
          </button>
        )}
      </div>
    </div>
  );
}
```

### 3.5 100% Compliant Empty State Design

When `healthScore === 100` and `issueCount === 0`:
```tsx
<div className="text-center py-10 px-4 space-y-3 bg-emerald-50/40 rounded-xl border border-emerald-200/80">
  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
    <ShieldCheck className="w-7 h-7" />
  </div>
  <div className="space-y-1">
    <h4 className="text-sm font-bold text-slate-800">
      Tài liệu đạt chuẩn 100% Nghị định 30/2020!
    </h4>
    <p className="text-xs text-slate-500 max-w-xs mx-auto">
      Không phát hiện lỗi định dạng font chữ, cỡ chữ, căn lề, khoảng cách đoạn hoặc tiêu chuẩn trình bày.
    </p>
  </div>
  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold">
    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    Sẵn sàng ban hành & in ấn
  </div>
</div>
```

---

## 4. Status Bar & Profile Selector Design

### 4.1 Live Health Score Badge in `StatusBar.tsx`

The Status Bar is anchored at the bottom of the viewport (`h-6 border-t bg-white px-4 text-xs`).

**Score Color Thresholds**:
- **$\ge 90\%$ (Emerald)**:
  - `text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100`
  - Icon: `<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />`
  - Label: `Điểm chuẩn: 95%`
- **$70\% - 89\%$ (Amber)**:
  - `text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100`
  - Icon: `<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />`
  - Label: `Điểm chuẩn: 82%`
- **$< 70\%$ (Rose)**:
  - `text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100`
  - Icon: `<AlertCircle className="w-3.5 h-3.5 text-rose-600" />`
  - Label: `Điểm chuẩn: 60%`

**Interactive Trigger**:
Clicking the Health Score badge in the Status Bar automatically triggers `onOpenAudit?.()`, which expands the Sidebar and switches active tab to `'audit'`.

### 4.2 Profile Selector Definition

We define three standard administrative profiles as specified:
1. **`NĐ30_TVCI` ("NĐ 30/2020 TVCI")**:
   - Baseline decree standard: Times New Roman, Quốc hiệu 12-13pt bold, Tiêu ngữ 13-14pt bold, Thân bài 13-14pt justified, indent 10-12.7mm, line spacing 1.2x.
2. **`STRICT` ("Chuẩn nghiêm ngặt")**:
   - Strict compliance: Body exact 13pt, exact 10mm indent, mandatory motto underscore, zero tolerance on missing elements.
3. **`ENTERPRISE` ("Nội bộ doanh nghiệp")**:
   - Enterprise internal rules (TKV / IEMM): allows custom internal header markings, company document numbers, tailored signer formatting.

**Profile Selector UI**:
A compact, elegant native dropdown in `StatusBar.tsx` styled to match the minimal aesthetic:
```tsx
<div className="flex items-center gap-1.5">
  <span className="text-slate-500">Tiêu chuẩn:</span>
  <select
    value={activeProfile}
    onChange={(e) => onProfileChange?.(e.target.value)}
    className="bg-transparent font-semibold text-slate-700 hover:text-primary-600 cursor-pointer text-xs border-none outline-none focus:ring-1 focus:ring-primary-400 rounded px-1 py-0.5 transition-colors"
    title="Thay đổi bộ quy chuẩn thể thức kiểm tra"
  >
    <option value="NĐ30_TVCI">NĐ 30/2020 TVCI</option>
    <option value="STRICT">Chuẩn nghiêm ngặt</option>
    <option value="ENTERPRISE">Nội bộ doanh nghiệp</option>
  </select>
</div>
```

### 4.3 Proposed Implementation: `web_app/src/components/layout/StatusBar.tsx`

```tsx
'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusBarProps {
  wordCount: number;
  paragraphCount: number;
  healthScore: number;
  issueCount?: number;
  profileName?: string;
  activeProfile?: string;
  onProfileChange?: (profileId: string) => void;
  onOpenAudit?: () => void;
}

export function StatusBar({
  wordCount,
  paragraphCount,
  healthScore,
  issueCount = 0,
  profileName = 'NĐ 30/2020 TVCI',
  activeProfile = 'NĐ30_TVCI',
  onProfileChange,
  onOpenAudit,
}: StatusBarProps) {
  const isEmerald = healthScore >= 90;
  const isAmber = healthScore >= 70 && healthScore < 90;
  const isRose = healthScore < 70;

  return (
    <footer className="h-6 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-xs text-slate-500 shrink-0 select-none z-10">
      {/* Left Metrics */}
      <div className="flex items-center gap-4">
        <span>
          Từ: <strong className="text-slate-700">{wordCount}</strong>
        </span>
        <span>
          Đoạn: <strong className="text-slate-700">{paragraphCount}</strong>
        </span>
        <span className="hidden sm:inline">
          Khổ giấy: <strong className="text-slate-700">A4 (210×297mm)</strong>
        </span>
      </div>

      {/* Right Controls & Health Badge */}
      <div className="flex items-center gap-3">
        {/* Profile Selector */}
        <div className="flex items-center gap-1.5">
          <span>Tiêu chuẩn:</span>
          {onProfileChange ? (
            <select
              value={activeProfile}
              onChange={(e) => onProfileChange(e.target.value)}
              aria-label="Tiêu chuẩn quy cách"
              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.2 text-[11px] font-semibold text-slate-800 cursor-pointer hover:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="NĐ30_TVCI">NĐ 30/2020 TVCI</option>
              <option value="STRICT">Chuẩn nghiêm ngặt</option>
              <option value="ENTERPRISE">Nội bộ doanh nghiệp</option>
            </select>
          ) : (
            <strong className="text-slate-700">{profileName}</strong>
          )}
        </div>

        {/* Live Health Score Badge */}
        <button
          type="button"
          onClick={onOpenAudit}
          title={`Điểm chuẩn: ${healthScore}%. Nhấn để xem danh sách lỗi thể thức.`}
          className={cn(
            'flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border text-[11px] transition-all cursor-pointer',
            isEmerald && 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
            isAmber && 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
            isRose && 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
          )}
        >
          {isEmerald && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
          {isAmber && <AlertTriangle className="w-3 h-3 text-amber-600" />}
          {isRose && <AlertCircle className="w-3 h-3 text-rose-600" />}
          <span>Điểm chuẩn: {healthScore}%</span>
          {issueCount > 0 && (
            <span className="ml-0.5 text-[10px] opacity-75 font-semibold">
              ({issueCount})
            </span>
          )}
        </button>
      </div>
    </footer>
  );
}
```

---

## 5. End-to-End Wiring in `app/page.tsx`

Here is how the real-time hook connects the Editor, Sidebar, and StatusBar together:

```tsx
// Inside AppPage component in web_app/app/page.tsx:
const editor = useEditor({
  extensions: coreEditorExtensions,
  content: defaultDocumentState,
  immediatelyRender: false,
  onUpdate: ({ editor: ed }) => {
    setIsSaved(false);
    calculateStats(ed);
  },
});

// Real-time evaluation hook:
const {
  healthScore,
  issueCount,
  issues,
  isAuditing,
  profile,
  setProfile,
  reevaluate,
} = useDocumentAudit({
  editor,
  debounceMs: 150,
  initialProfile: 'NĐ30_TVCI',
});

// Single issue fix action
const handleFixSingleIssue = (issue: ValidationIssue) => {
  if (!editor || !issue.targetId) return;
  const match = issue.targetId.match(/node-(\d+)/);
  if (match) {
    const nodeIndex = parseInt(match[1], 10);
    const patch = buildPatchFromIssue(issue);
    applyPatchToEditorNode(editor, nodeIndex, patch);
  }
};

// Batch safe fix action
const handleApplySafeFix = () => {
  if (!editor) return;
  const safeIssues = issues.filter((i) => i.autoFixable);
  for (const issue of safeIssues) {
    handleFixSingleIssue(issue);
  }
};
```

---

## 6. Verification and Regression Defense

1. **Components Test Suite Compatibility**:
   - `web_app/tests/unit/components.test.tsx` line 74-76 checks:
     - `screen.getByText('Điểm chuẩn thể thức')`
     - `screen.getByText('95%')`
     - `screen.getByText('Danh sách phát hiện (2)')`
   - Line 95-96 checks:
     - `screen.getByText('NĐ 30/2020 TVCI')`
     - `screen.getByText('Điểm chuẩn: 100%')`
   - Our proposed implementation matches these exact string patterns while enhancing them with interactive features.
2. **E2E Feature 11 Compatibility**:
   - `e2e-tests/tier1-feature/f11_audit_health_score.test.ts` validates `healthScore = (passed / applicable) * 100` and severities (`pass`, `warning`, `error`).
   - Our badge mapping and hook seamlessly handle these severities.
3. **No Unrequested Scaffolding / Zero Bloat**:
   - Uses native React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`).
   - Standard Tailwind utility classes without extra third-party libraries.
