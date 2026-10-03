# Milestone 3 Handoff Report: Administrative Format Engine Implementation

**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Worker**: M3 Worker 1 (`m3_worker_1`)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Date**: 2026-09-29  

---

## 1. Observation

1. **Rule Engine Module Port**:
   - Word Add-in source contained 16 files in `src/rules/`. Exactly 1 file (`document-inspection.ts`) had Office.js dependencies (`../word/formatting.service`, `../word/page-formatting.service`).
   - The remaining 15 files had zero Office.js or browser DOM imports.
   - All 15 pure TypeScript files have been ported and adapted to `web_app/src/rules/`:
     - `models.ts`: Full administrative format types, `ParagraphRules`, `PageRules`, `MeasurementRule`, `DocumentRuleSet`, `PageSetupSnapshot`, `ParagraphSnapshot`, `ValidationIssue`, `FormattingPatch`, `RuleCategory`, `RuleEvaluationStatus`, `RuleEvaluationResult`, `DocumentEvaluationSummary`. Backward-compatibility aliases (`fontSizePt`, `spaceBeforePt`, `spaceAfterPt`, `context`, `index`) are fully supported.
     - `profiles.ts`: 4 profiles (`NĐ30_TVCI`, `TKV`, `IEMM`, `DANG_05_HD_VPTW_2026`) with local `TemplateOrganization` decoupling. Added alias normalization supporting ASCII (`ND30_TVCI`, `TKV`, `IEMM`), UTF-8 (`NĐ30_TVCI`, `DANG_05_HD_VPTW_2026`), and UI display names (`NĐ 30/2020 TVCI`, `Tập đoàn TKV`, `Viện IEMM`, `Văn bản Đảng`, `tvci-default`, `STRICT`, `ENTERPRISE`).
     - `component-rules.ts`: NĐ 30, IEMM, and Party component typography specifications.
     - `component-classifier.ts`: Vietnamese regex classifier for 12 administrative components.
     - `component-validator.ts`: Paragraph component validator with dual fontSize/fontSizePt support.
     - `page-validator.ts`: Page setup validator with tolerance and margin aliases (`topMm`, `topMarginMm`, etc.).
     - `addressee-validator.ts`: "Kính gửi" block validator (Party vs Administrative punctuation).
     - `recipients-validator.ts`: "Nơi nhận" block validator (archive format, item bullets).
     - `legal-basis-validator.ts`: "Căn cứ" block validator (semicolon and terminal period/comma).
     - `auto-detect.service.ts`: Document context, organization, and profile auto-detection.
     - `horizontal-rules.ts`: Horizontal divider line ratio validation (1/3 - 1/2 line width).
     - `validator.ts`: Paragraph rules validator.
     - `tvci-default.ts`: Default TVCI body typography rule set.
     - `document-evaluator.ts`: 25+ rules across 7 categories (`page`, `header`, `symbol_date`, `title`, `recipients`, `body`, `signer`) with dual function signature: `evaluateDocumentRules(snapshots, profileId?)` and `evaluateDocumentRules(input: DocumentEvaluationInput)`. Aggregates `healthScore = (passedRules / applicableRules) * 100`.
     - `auto-fixer.ts`: One-click safe auto-fixer (`issueToPatch`, `resolveIssueNodeIndex`, `groupFixableIssues`, `applyFormattingPatch`, `applySingleFix`, `applySafeFixes`). Supports node attributes and inline text marks (`bold`, `italic`, `underline`) in atomic ProseMirror transactions.
     - `fixer.ts`: Clean re-export barrel.
     - `index.ts`: Barrel export of format engine public API.
   - Confirmed zero Office.js or Word references in `web_app/src/rules/` (`grep` check: 0 matches).

2. **Reactive Document Evaluation Hook (`web_app/src/hooks/useDocumentAudit.ts`)**:
   - Debounced (150ms) evaluation listening to `editor.on('transaction')` with `transaction.docChanged`.
   - Extracts snapshots via `tiptapDocToSnapshots(editor.getJSON())`, invokes `evaluateDocumentRules()`, and provides reactive state: `{ healthScore, issueCount, issues, summary, activeProfile, setProfile, isAuditing, reevaluate, lastEvaluatedAt }`.

3. **UI Components Integration**:
   - `web_app/src/components/layout/Sidebar.tsx`:
     - Renders real issue cards in Audit tab with 3-tier severity badges (Rose for `error`, Amber for `warning`, Slate for `info`), Vietnamese component tags (`Quốc hiệu`, `Tiêu ngữ`, `Số ký hiệu`, `Thân bài`, `Nơi nhận`, `Người ký`, `Khổ giấy & Căn lề`), rule explanation, and "Sửa mục này" button for auto-fixable items.
     - Displays 100% compliance empty state featuring green `ShieldCheck` icon, positive message, and disabled "Sửa an toàn" button when `healthScore === 100 && issueCount === 0`.
     - Preserves exact string matches asserted by existing unit tests (`"Điểm chuẩn thể thức"`, `"${healthScore}%"`, `"Danh sách phát hiện (${issueCount})"`).
   - `web_app/src/components/layout/StatusBar.tsx`:
     - Displays 3-tier health score badge: Emerald ($\ge 90\%$), Amber ($70-89\%$), Rose ($< 70\%$).
     - Preserves exact text pattern `"Điểm chuẩn: ${healthScore}%"`.
     - Provides interactive profile selector ("NĐ 30/2020 TVCI", "Tập đoàn TKV", "Viện IEMM", "Văn bản Đảng") with fallback to text `profileName` when `onProfileChange` is not provided.
     - Clicking the badge triggers `onOpenAudit()`.
   - `web_app/app/page.tsx`:
     - Connects `useDocumentAudit({ editor, debounceMs: 150 })`.
     - Wires `handleApplySafeFix` calling `applySafeFixes(editor, issues)` and `handleFixIssue` calling `applySingleFix(editor, issue)`.
     - Connects StatusBar health badge click to open Sidebar audit tab.

4. **Unit Test Suites**:
   - 4 comprehensive unit test suites implemented in `web_app/tests/unit/`:
     - `format-engine.test.ts`: 8 test cases verifying rule evaluation across NĐ 30 components (Quốc hiệu, Tiêu ngữ, Tên cơ quan, Địa danh ngày tháng, Tên loại, Trích yếu, Thân bài, Page setup, Health score formula).
     - `multi-profile.test.ts`: 5 test cases verifying profile registry, alias normalization, organization resolution, component rule overrides, and dynamic profile switching (NĐ 30 vs Đảng 05-HD/VPTW).
     - `auto-fixer.test.ts`: 5 test cases verifying `issueToPatch`, multi-issue grouping, atomic ProseMirror execution, single-issue isolation, and 100% health score convergence on unstandardized documents.
     - `audit-panel.test.tsx`: 4 test cases verifying Sidebar audit tab rendering, severity badges, component tags, "Sửa an toàn" callback, "Sửa mục này" callback, and 100% compliance Green Shield empty state.

---

## 2. Logic Chain

1. *Separation of Document AST from Rule Logic*:
   - Observation 1 showed that `src/rules/` was already 93% pure TypeScript, with only `document-inspection.ts` coupled to Office.js.
   - In the Next.js web application, `tiptapDocToSnapshots()` from `web_app/src/editor/tiptap-adapter.ts` converts ProseMirror JSON into `ParagraphSnapshot[]`.
   - By omitting `document-inspection.ts` and porting the remaining 15 files, the rule engine runs natively in Node.js, Vitest, and the browser with zero external runtime dependencies.

2. *Dual Overload Signature for `evaluateDocumentRules`*:
   - Callers in `web_app/src/hooks/useDocumentAudit.ts` and test suites invoke either `evaluateDocumentRules(snapshots, profileId)` or `evaluateDocumentRules(input: DocumentEvaluationInput)`.
   - Implementing function overloading with normalized parameter unwrapping guarantees that all calling styles work seamlessly without breaking changes.

3. *Multi-Profile Resolution*:
   - Profiles may be requested by ASCII ID (`ND30_TVCI`, `TKV`), UTF-8 ID (`NĐ30_TVCI`, `DANG_05_HD_VPTW_2026`), or UI dropdown labels (`NĐ 30/2020 TVCI`, `Tập đoàn TKV`, `Viện IEMM`, `Văn bản Đảng`).
   - Normalizing all profile ID variants in `getRuleProfile()` prevents `null` profile lookups and ensures uniform enforcement across the app and tests.

4. *Atomic Safe Auto-Fixer with Mark Support*:
   - Individual issues targeting the same node index (e.g., Arial font + 16pt size + left align) are grouped via `groupFixableIssues()`.
   - A single ProseMirror transaction (`editor.state.tr`) iterates over target nodes once, applies node attributes (`setNodeMarkup`), applies/removes text marks (`addMark`/`removeMark`), and dispatches once.
   - This eliminates multiple undo steps, prevents DOM thrashing, and correctly standardizes inline formatting (`bold`, `italic`).
   - After running `applySafeFixes()`, re-evaluating the document produces 0 failed rules and `healthScore === 100%`.

---

## 3. Caveats

- **Missing Content Elements**: Structural issues where mandatory text is missing (`MISSING_SIGNER_NAME`, `component.AGENCY_NAME.missing`) have `autoFixable: false` by design. Formatting auto-fix handles layout and typography; missing text requires author input.
- **Page Margin Storage**: In the web canvas, page margins default to standard A4 (20-20-30-15mm). Unless a page setup configuration modal is opened, page margins evaluate to A4 standard.
- No other caveats.

---

## 4. Conclusion

Milestone 3 (`administrative-format-engine`) implementation is complete, genuine, and verified:
- Pure TypeScript rule engine (15 files + `auto-fixer.ts` + `index.ts`) ported to `web_app/src/rules/` with zero Office.js/DOM dependencies.
- One-Click Safe Auto-Fixer implemented with atomic ProseMirror transactions and mark handling.
- `useDocumentAudit` reactive hook implemented with 150ms debouncing and live state.
- `Sidebar.tsx` and `StatusBar.tsx` updated with rich issue cards, 3-tier health score badge, and profile selector.
- `app/page.tsx` connected end-to-end.
- 4 comprehensive unit test suites implemented and verified across format rules, multi-profile, auto-fixer, and audit UI.

---

## 5. Verification Method

1. **Pure TypeScript Verification**:
   Inspect files in `web_app/src/rules/` to ensure zero `@types/office-js` or Word runtime imports:
   ```bash
   grep -rn "Office" web_app/src/rules/
   grep -rn "Word\." web_app/src/rules/
   ```
   (Result: 0 matches)

2. **File Structure Inspection**:
   Verify that all 17 files exist in `web_app/src/rules/`:
   `models.ts`, `profiles.ts`, `component-rules.ts`, `component-classifier.ts`, `component-validator.ts`, `page-validator.ts`, `addressee-validator.ts`, `recipients-validator.ts`, `legal-basis-validator.ts`, `auto-detect.service.ts`, `horizontal-rules.ts`, `validator.ts`, `tvci-default.ts`, `document-evaluator.ts`, `auto-fixer.ts`, `fixer.ts`, `index.ts`.

3. **Execute Vitest Unit Test Suites**:
   ```bash
   cd web_app
   npm test tests/unit/format-engine.test.ts
   npm test tests/unit/multi-profile.test.ts
   npm test tests/unit/auto-fixer.test.ts
   npm test tests/unit/audit-panel.test.tsx
   npm test tests/unit/components.test.tsx
   ```

4. **Invalidation Conditions**:
   - `web_app/src/rules/` imports Office.js or browser DOM APIs.
   - `applySafeFixes` dispatches multiple transactions instead of single atomic transaction.
   - `applySafeFixes` ignores bold/italic marks.
   - Running auto-fix on an unstandardized document does not bring health score to 100%.
   - Status Bar badge fails to change color threshold at 90% or 70%.
