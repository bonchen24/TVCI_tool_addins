# Milestone 3 Review Report: Administrative Format Engine

**Milestone**: Milestone 3 (`administrative-format-engine`)  
**Reviewer**: M3 Reviewer 1 (`m3_reviewer_1`)  
**Parent Conversation ID**: `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Date**: 2026-09-29  
**Verdict**: **APPROVE**  

---

## 1. Observation

1. **Pure TypeScript Architecture (`web_app/src/rules/`)**:
   - Inspected all 17 files in `web_app/src/rules/`:
     - `models.ts`: Defines `ParagraphRules`, `PageRules`, `MeasurementRule`, `DocumentRuleSet`, `PageSetupSnapshot`, `ParagraphSnapshot`, `ValidationIssue`, `FormattingPatch`, `RuleCategory`, `RuleEvaluationStatus`, `RuleEvaluationResult`, `DocumentEvaluationSummary`. Backward compatibility aliases (`fontSizePt`, `spaceBeforePt`, `spaceAfterPt`, `context`, `index`) are fully supported.
     - `profiles.ts`: 4 profiles (`NĐ30_TVCI`, `TKV`, `IEMM`, `DANG_05_HD_VPTW_2026`). Alias normalization in `getRuleProfile()` normalizes ASCII (`ND30_TVCI`, `TKV`, `IEMM`), UTF-8 (`NĐ30_TVCI`, `DANG_05_HD_VPTW_2026`), and UI display names (`NĐ 30/2020 TVCI`, `Tập đoàn TKV`, `Viện IEMM`, `Văn bản Đảng`, `tvci-default`, `STRICT`, `ENTERPRISE`), with fallback to `NĐ30_TVCI`. `resolveRuleProfileForOrganization()` maps `DANG`, `TKV`, `IEMM`, `TVCI`.
     - `component-rules.ts`: NĐ 30, IEMM, and Party typography rules (`ADMIN_RULES`, `IEMM_RULES`, `PARTY_RULES`), plus `resolveAddresseeAlignment()` and `getRecipientsItemRule()`.
     - `component-classifier.ts`: Vietnamese regex classifier for 12 administrative components (`NATIONAL_EMBLEM`, `MOTTO`, `PARTY_TITLE`, `AGENCY_NAME`, `NUMBER_SYMBOL`, `PLACE_DATE`, `DOCUMENT_TYPE`, `ABSTRACT`, `LEGAL_BASIS`, `ADDRESSEE`, `RECIPIENTS`, `SIGNER_ROLE`).
     - `component-validator.ts`: Paragraph component validator with dual `fontSize`/`fontSizePt` and range tolerance checks.
     - `page-validator.ts`: Page setup validator with tolerance (`0.5mm`) and margin aliases (`topMm`/`topMarginMm`, etc.).
     - `addressee-validator.ts`: "Kính gửi" block validator (Party vs Administrative punctuation).
     - `recipients-validator.ts`: "Nơi nhận" block validator (archive format, item bullets).
     - `legal-basis-validator.ts`: "Căn cứ" block validator (semicolon and terminal period/comma).
     - `auto-detect.service.ts`: Document context, organization, and profile auto-detection with Vietnamese diacritic removal (`removeTones`).
     - `horizontal-rules.ts`: Horizontal divider line ratio validation (1/3 - 1/2 line width).
     - `validator.ts`: Paragraph rules validator across 9 typography attributes.
     - `tvci-default.ts`: Default TVCI body typography rule set.
     - `document-evaluator.ts`: 27 rules evaluated across 7 categories (`page`, `header`, `symbol_date`, `title`, `recipients`, `body`, `signer`). Supports dual call signatures: `evaluateDocumentRules(snapshots, profileId?)` and `evaluateDocumentRules(input: DocumentEvaluationInput)`.
     - `auto-fixer.ts`: One-click safe auto-fixer (`issueToPatch`, `resolveIssueNodeIndex`, `groupFixableIssues`, `applyFormattingPatch`, `applySingleFix`, `applySafeFixes`). Operates as a single atomic ProseMirror transaction (`editor.state.tr`) supporting attributes and text marks (`bold`, `italic`, `underline`).
     - `fixer.ts`: Barrel export.
     - `index.ts`: Barrel re-export of format engine public API.
   - Performed static search for Office.js imports:
     - `grep -rn "Office" web_app/src/rules/`: Only 1 match in `horizontal-rules.ts:62` which is an XML namespace string inside an OOXML template (`xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"`). Zero code imports.
     - `grep -rn "Word\." web_app/src/rules/`: 0 matches.
     - Zero `@types/office-js` imports across all 17 files.

2. **Evaluation and Aggregation Mechanics**:
   - In `web_app/src/rules/document-evaluator.ts`:
     - Lines 57-75: Blank document detection (`paragraphSnapshots.every(p => !p.text || p.text.trim().length === 0)`), returning `isBlankDocument: true`, `totalRules: 0`, `applicableRules: 0`, `healthScore: 0`.
     - Lines 96-125: Multiline block index expansion (`SIGNER_ROLE` up to 5 paragraphs, `RECIPIENTS` up to 10 paragraphs until `Lưu:`, `LEGAL_BASIS` up to 15 paragraphs) prevents component lines from being evaluated as body paragraphs.
     - Lines 1041-1050: Rule aggregation formula:
       ```ts
       const totalRules = results.length;
       const passedRules = results.filter((r) => r.status === 'PASS').length;
       const failedRules = results.filter((r) => r.status === 'FAIL').length;
       const missingRules = results.filter((r) => r.status === 'MISSING').length;
       const notApplicableRules = results.filter((r) => r.status === 'NOT_APPLICABLE').length;
       const applicableRules = totalRules - notApplicableRules;
       const healthScore = applicableRules > 0 ? Math.round((passedRules / applicableRules) * 100) : 0;
       ```
     - Validated mathematically: `applicableRules === passedRules + failedRules + missingRules`. Health score reflects exact percentage compliance.

3. **Unit Test Coverage & Integrity Audit**:
   - `web_app/tests/unit/format-engine.test.ts` (8 tests):
     - Blank document handling.
     - National Emblem validation (compliant vs 4+ errors).
     - Motto validation (compliant vs non-bold).
     - Agency Name validation.
     - Place & Date validation (compliant vs left-aligned non-italic).
     - Document Type & Abstract validation.
     - Body paragraph formatting validation (`healthScore >= 90%`).
     - Page setup boundary validation with tolerance (valid within tolerance vs 6 errors for invalid dimensions).
   - `web_app/tests/unit/multi-profile.test.ts` (5 tests):
     - Profile registry checks all 4 profiles.
     - Alias resolution across ASCII, UTF-8, and UI strings.
     - Organization resolution (`TVCI`, `TKV`, `IEMM`, `DANG`).
     - Component rule overrides (Party vs NĐ30 addressee alignment and IEMM font size).
     - Dynamic switching between NĐ30 and Party profile (party doc under NĐ30 has MISSING emblem, NOT_APPLICABLE party title; under Party profile emblem is NOT_APPLICABLE, party title is PASS, `healthScore >= 90%`).
   - `web_app/tests/unit/auto-fixer.test.ts` (5 tests):
     - `issueToPatch` for font, alignment, indent.
     - `groupFixableIssues` aggregates multiple issues for single node index.
     - `applySafeFixes` brings unstandardized document to 0 failed rules and 100% health score.
     - `applySingleFix` isolates target node without affecting adjacent nodes.
   - `web_app/tests/unit/audit-panel.test.tsx` (4 tests):
     - Renders health score, severity badges, and component tags.
     - "Sửa an toàn" click trigger.
     - "Sửa mục này" individual fix click trigger.
     - 100% compliance Green Shield empty state.
   - Integrity check: Zero hardcoded mock returns in rules, zero dummy or facade implementations, zero test shortcuts.

4. **Integration with Editor & UI**:
   - `web_app/src/hooks/useDocumentAudit.ts`: 150ms debounced reactive audit hook listening to editor transactions (`transaction.docChanged`).
   - `web_app/src/components/layout/StatusBar.tsx`: 3-tier health score badge (Emerald $\ge 90\%$, Amber $70-89\%$, Rose $< 70\%$) and interactive profile selector.
   - `web_app/src/components/layout/Sidebar.tsx`: Real-time audit tab with severity badges, component badges, and auto-fix buttons.
   - `web_app/app/page.tsx`: Full wiring of hook, fix callbacks, and state updates.

---

## 2. Logic Chain

1. *Pure TypeScript Decoupling*:
   - Word Add-in rules depended on Office.js only in `document-inspection.ts`.
   - By omitting `document-inspection.ts` and porting all 15 pure rule files, `web_app/src/rules/` contains 0 runtime Office.js or browser DOM imports.
   - Verified by regex search over all 17 files in `web_app/src/rules/`.

2. *Profile Normalization*:
   - User or UI may provide profile IDs in ASCII (`ND30_TVCI`), Vietnamese UTF-8 (`NĐ30_TVCI`, `DANG_05_HD_VPTW_2026`), or UI select labels (`NĐ 30/2020 TVCI`, `Tập đoàn TKV`, `Viện IEMM`, `Văn bản Đảng`).
   - `getRuleProfile()` maps all variants and falls back to `NĐ30_TVCI`.
   - Verified by unit tests in `multi-profile.test.ts:21-31`.

3. *Evaluation Accuracy*:
   - Rules return 4-state status (`PASS`, `FAIL`, `MISSING`, `NOT_APPLICABLE`).
   - `applicableRules = totalRules - notApplicableRules`.
   - `healthScore = Math.round((passedRules / applicableRules) * 100)`.
   - Edge cases (blank doc, multi-line blocks) handled correctly without false positives.

4. *Auto-Fixer Atomicity*:
   - `applySafeFixes()` groups issues by node index and dispatches a single ProseMirror transaction (`editor.view.dispatch(tr)`).
   - Text marks (`bold`, `italic`, `underline`) are applied or removed cleanly on text nodes.
   - Re-auditing after fix achieves 100% score convergence.

---

## 3. Caveats

- **Missing Text Elements**: Missing mandatory text elements (e.g. missing signer name or missing legal basis) cannot be auto-fixed (`autoFixable: false`). Only formatting and layout errors are auto-fixed. Author input is required for text generation.
- **Page Margin Web Default**: Web editor canvas uses standard A4 margins (20-20-30-15mm) unless customized via page setup.

---

## 4. Conclusion

Implementation of Milestone 3 (`administrative-format-engine`) in `web_app/src/rules/` meets all architectural, functional, and quality requirements. Code is genuine, pure TypeScript, free from Office.js coupling, and backed by comprehensive unit tests.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify:

1. **Verify Pure TypeScript (No Office.js Imports)**:
   Inspect `web_app/src/rules/`:
   ```bash
   grep -rn "Office" web_app/src/rules/
   grep -rn "Word\." web_app/src/rules/
   ```
   Confirm 0 imports from `@types/office-js` or Word runtime.

2. **Verify 17 Files in `web_app/src/rules/`**:
   Inspect directory `web_app/src/rules/` to ensure all 17 files exist:
   `models.ts`, `profiles.ts`, `component-rules.ts`, `component-classifier.ts`, `component-validator.ts`, `page-validator.ts`, `addressee-validator.ts`, `recipients-validator.ts`, `legal-basis-validator.ts`, `auto-detect.service.ts`, `horizontal-rules.ts`, `validator.ts`, `tvci-default.ts`, `document-evaluator.ts`, `auto-fixer.ts`, `fixer.ts`, `index.ts`.

3. **Verify Test Suites**:
   Inspect `web_app/tests/unit/format-engine.test.ts`, `web_app/tests/unit/multi-profile.test.ts`, `web_app/tests/unit/auto-fixer.test.ts`, `web_app/tests/unit/audit-panel.test.tsx`.

4. **Invalidation Conditions**:
   - `web_app/src/rules/` imports Office.js or browser DOM APIs.
   - Profile alias lookup returns null or wrong profile.
   - Evaluator health score denominator includes `NOT_APPLICABLE` rules.
   - Auto-fixer dispatches multiple transactions instead of single atomic transaction.
