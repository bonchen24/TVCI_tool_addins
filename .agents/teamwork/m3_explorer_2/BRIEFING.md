# BRIEFING — 2026-09-29T05:00:00Z

## Mission
Investigate and design real-time Administrative Audit Panel UI, evaluation hook (`useDocumentAudit.ts`), Sidebar issue components, and StatusBar health badge for TVCI Web Application Milestone 3.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m3_explorer_2
- Original parent: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Milestone: administrative-format-engine (Milestone 3)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement production code
- Adhere to Teamwork protocol (BRIEFING, DISPATCH, progress, handoff)
- Terse caveman style in chat/messages, detailed and rigorous in analysis/handoff files

## Current Parent
- Conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0
- Updated: 2026-09-29T05:00:00Z

## Investigation State
- **Explored paths**:
  - `web_app/src/components/layout/Sidebar.tsx`
  - `web_app/src/components/layout/StatusBar.tsx`
  - `web_app/src/components/layout/Header.tsx`
  - `web_app/app/page.tsx`
  - `web_app/src/editor/tiptap-adapter.ts`
  - `web_app/src/rules/models.ts`
  - `src/rules/` (models, profiles, document-evaluator, component-classifier)
  - `web_app/e2e-tests/tier1-feature/f08_rule_engine.test.ts`, `f11_audit_health_score.test.ts`, `f12_autofix_engine.test.ts`
  - `web_app/tests/unit/components.test.tsx`
- **Key findings**:
  - `useDocumentAudit.ts` must listen to `transaction.docChanged` with 150ms debouncing, call `tiptapDocToSnapshots()`, run `evaluateDocumentRules()`, and expose reactive state `{ healthScore, issueCount, issues, stats, isAuditing, profile, setProfile }`.
  - `Sidebar.tsx` audit tab needs `AuditIssueCard` with 3 severity levels (Critical: Rose, Major: Amber, Minor: Slate), element type tag (Quốc hiệu, Tiêu ngữ, Số ký hiệu, Thân bài, Nơi nhận, Người ký), rule explanation, "Sửa mục này" individual fix button, and Green Shield empty state when 100% compliant.
  - `StatusBar.tsx` requires live health score badge (Emerald $\ge 90$, Amber $70-89$, Rose $< 70$) with click-to-open-sidebar interaction and interactive Profile Selector ("NĐ 30/2020 TVCI", "Chuẩn nghiêm ngặt", "Nội bộ doanh nghiệp").
- **Unexplored areas**: None within M3 Explorer 2 scope.

## Key Decisions Made
- Fully designed `useDocumentAudit.ts` hook architecture, `Sidebar.tsx` audit cards/filters/empty-state, and `StatusBar.tsx` live badge & profile selector.
- Preserved 100% backward-compatibility with existing unit tests in `components.test.tsx`.

## Artifact Index
- `DISPATCH.md` — Received dispatch task
- `BRIEFING.md` — Situational awareness
- `progress.md` — Liveness heartbeat
- `analysis.md` — Full investigation and design specification
- `handoff.md` — 5-component handoff report
