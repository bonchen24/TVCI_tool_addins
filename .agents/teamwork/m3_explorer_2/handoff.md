# M3 Explorer 2 Handoff Report: Administrative Audit Panel & Evaluation Hook

**Target Milestone**: Milestone 3 (`administrative-format-engine`)  
**Scope**: Real-time evaluation hook (`useDocumentAudit`), Audit Panel UI (`Sidebar.tsx`), and Status Bar live health score badge & Profile Selector (`StatusBar.tsx`).  
**Investigator**: M3 Explorer 2  
**Date**: 2026-09-29  

---

## 1. Observation

1. **Existing UI Layout**:
   - `web_app/src/components/layout/Sidebar.tsx` (lines 105-157) currently renders a hardcoded mock issue in the audit panel:
     - Hardcoded text: `"Tiêu ngữ hiện tại là 14pt, quy định Nghị định 30 yêu cầu 13pt đứng đậm."`
     - Props currently accepted: `{ isOpen, activeTab, onTabChange, onClose, issueCount, healthScore, onApplySafeFix }`.
     - Lacks `issues: ValidationIssue[]`, individual `onFixIssue`, filtering/grouping by severity or component.
   - `web_app/src/components/layout/StatusBar.tsx` (lines 18-40) currently renders a static green health badge:
     - Static class: `text-emerald-600 font-medium`.
     - Static text: `Điểm chuẩn: {healthScore}%` and `Tiêu chuẩn: {profileName}`.
     - Lacks dynamic color thresholding (Emerald $\ge 90$, Amber $70-89$, Rose $< 70$) and interactive profile switching.
   - `web_app/app/page.tsx` (lines 19-20, 160-170) has placeholder state:
     - `const [healthScore, setHealthScore] = useState(100);`
     - `const [issueCount, setIssueCount] = useState(0);`
     - `onApplySafeFix` logs to console.
2. **Editor & Snapshot Adapter**:
   - `web_app/src/editor/tiptap-adapter.ts` (lines 6-72) exports `tiptapDocToSnapshots(doc: JSONContent): ParagraphSnapshot[]`.
   - Each snapshot assigns `id: "node-${index++}"`, capturing text, font, size, marks (bold, italic, underline), alignment, spacing, and context.
   - `applyPatchToEditorNode(editor, nodeIndex, patch)` in `tiptap-adapter.ts` (lines 74-143) performs atomic ProseMirror transaction updates on a target node index.
3. **Format Engine Models & Evaluation Contract**:
   - `web_app/src/rules/models.ts` and `src/rules/models.ts` define `ValidationIssue`, `ParagraphSnapshot`, `PageSetupSnapshot`, and `DocumentEvaluationSummary`.
   - `e2e-tests/tier1-feature/f11_audit_health_score.test.ts` (lines 9-98) tests `healthScore = (passed / applicable) * 100`, severities (`pass`, `warning`, `error`), and grouping across 7 categories.
   - `web_app/tests/unit/components.test.tsx` (lines 74-76, 95-96) asserts exact text matches:
     - `screen.getByText('Điểm chuẩn thể thức')`
     - `screen.getByText('95%')`
     - `screen.getByText('Danh sách phát hiện (2)')`
     - `screen.getByText('NĐ 30/2020 TVCI')`
     - `screen.getByText('Điểm chuẩn: 100%')`

---

## 2. Logic Chain

1. **Step 1: Debounced Real-Time Hook Architecture (`useDocumentAudit.ts`)**:
   - Document typing triggers dozens of editor transactions per minute. Evaluating 25+ rules synchronously on every keystroke causes perceptible input latency.
   - Therefore, listening to `editor.on('transaction')` with a condition `transaction.docChanged` combined with a `150ms` debouncing timer ensures the audit only runs when document content/structure stabilizes.
   - The hook calls `editor.getJSON()`, converts to snapshots via `tiptapDocToSnapshots()`, passes snapshots to `evaluateDocumentRules()`, and updates reactive state (`healthScore`, `issues`, `issueCount`, `stats`, `isAuditing`, `profile`).
   - Changing `profile` triggers an immediate re-evaluation, providing instantaneous feedback.
2. **Step 2: Rich Audit Panel in `Sidebar.tsx`**:
   - The user must clearly see which Vietnamese administrative element is invalid, why it violates Decree 30, and how to fix it.
   - Mapping issues to 3-tier severity badges:
     - `error` / `critical` -> Rose (`bg-rose-100 text-rose-800 border-rose-200`)
     - `warning` / `major` -> Amber (`bg-amber-100 text-amber-800 border-amber-200`)
     - `info` / `minor` -> Slate (`bg-slate-100 text-slate-700 border-slate-200`)
   - Resolving element tags through rule IDs, message prefixes, and component types yields clean Vietnamese labels: `Quốc hiệu`, `Tiêu ngữ`, `Số ký hiệu`, `Địa danh & Ngày tháng`, `Thân bài`, `Nơi nhận`, `Người ký`, `Khổ giấy & Căn lề`.
   - For `issue.autoFixable === true`, rendering a "Sửa mục này" button triggers `onFixIssue(issue)`. For non-autoFixable issues (e.g. missing text content), displaying a subtle guide tag prevents user frustration.
   - Multi-mode filtering (by Severity pills and Component dropdown) lets users triage issues quickly in long documents.
   - An empty state featuring a Green Shield (`ShieldCheck`) and positive text renders when `healthScore === 100 && issueCount === 0`.
3. **Step 3: Status Bar & Profile Selector (`StatusBar.tsx`)**:
   - In accordance with the prompt's 3-color threshold:
     - $\ge 90\%$: Emerald (`text-emerald-700 bg-emerald-50 border-emerald-200`)
     - $70\% - 89\%$: Amber (`text-amber-700 bg-amber-50 border-amber-200`)
     - $< 70\%$: Rose (`text-rose-700 bg-rose-50 border-rose-200`)
   - Clicking the Status Bar health badge dispatches `onOpenAudit()`, automatically expanding the Sidebar and focusing the `'audit'` tab.
   - Profile selector in the Status Bar allows switching between:
     - "NĐ 30/2020 TVCI" (`NĐ30_TVCI`)
     - "Chuẩn nghiêm ngặt" (`STRICT`)
     - "Nội bộ doanh nghiệp" (`ENTERPRISE`)
4. **Step 4: Regression & Test Safety**:
   - Preserves exact strings asserted in `components.test.tsx` (`"Điểm chuẩn thể thức"`, `"Danh sách phát hiện (${issueCount})"`, `"Điểm chuẩn: ${healthScore}%"`, `"NĐ 30/2020 TVCI"`).
   - Guarantees backward compatibility if `issues` prop is not passed (graceful fallback).

---

## 3. Caveats

1. **Page Margins Extraction**:
   - In the web canvas, A4 page margins are visually rendered via CSS (`p-a4-top`, etc.). Unless a dedicated page-setup modal is present, page margins default to standard Decree 30 values (top 20mm, bottom 20mm, left 30mm, right 15mm).
2. **Cooperation with M3 Explorer 1 & 3**:
   - M3 Explorer 1 ports pure TS rules (`src/rules/*` -> `web_app/src/rules/*`).
   - M3 Explorer 3 designs batch auto-fixer (`auto-fixer.ts`).
   - `useDocumentAudit` supports both signatures of `evaluateDocumentRules`: `(snapshots, profile)` and `({ profileId, paragraphSnapshots, ... })`.
3. **No External Heavy Dependencies**:
   - Uses standard React hooks and Lucide React icons already present in the workspace. No extra libraries required.

---

## 4. Conclusion

The real-time audit architecture is fully designed:
- **Hook**: `web_app/src/hooks/useDocumentAudit.ts` with 150ms debouncing on `transaction.docChanged`, snapshot extraction, and reactive summary state.
- **Sidebar Audit Tab**: Interactive issue cards with 3-tier severity badges, element type tags, rule explanations, "Sửa mục này" individual fix buttons, severity/component filtering, and a 100% compliance Green Shield empty state.
- **Status Bar**: Live dynamic health score badge (Emerald $\ge 90$, Amber $70-89$, Rose $< 70$) with click-to-open-sidebar interaction and interactive Profile Selector.

Full code designs and architecture specifications have been written to `web_app/src/hooks/useDocumentAudit.ts`, `web_app/src/components/layout/Sidebar.tsx`, and `web_app/src/components/layout/StatusBar.tsx` specifications in `analysis.md`.

---

## 5. Verification Method

1. **Unit Test Verification**:
   - Run existing unit test suite:
     ```bash
     cd web_app && npm test
     ```
   - Verify `components.test.tsx` passes 100%.
2. **Audit Component Tests**:
   - Check that `Sidebar.tsx` renders issue list when `issues` prop contains items.
   - Check that clicking "Sửa mục này" invokes `onFixIssue(issue)`.
   - Check that `healthScore === 100` and `issueCount === 0` renders Green Shield empty state.
3. **Status Bar Tests**:
   - Check that `healthScore = 95` has emerald badge styling.
   - Check that `healthScore = 75` has amber badge styling.
   - Check that `healthScore = 60` has rose badge styling.
   - Check that changing profile in selector triggers `onProfileChange` with selected profile ID.
4. **Invalidation Conditions**:
   - If `evaluateDocumentRules` does not return `issues` array, hook falls back to empty array.
   - If editor is destroyed or null, hook safely bypasses evaluation without throwing.
