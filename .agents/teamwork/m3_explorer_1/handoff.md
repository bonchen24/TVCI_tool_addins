# Handoff Report: Milestone 3 Administrative Format Rule Engine Port

## 1. Observation
- `src/rules/` directory contains 16 files:
  - 15 files have zero Office.js, Word, or browser DOM imports:
    `models.ts`, `profiles.ts`, `component-rules.ts`, `component-classifier.ts`, `document-evaluator.ts`, `fixer.ts`, `horizontal-rules.ts`, `validator.ts`, `addressee-validator.ts`, `auto-detect.service.ts`, `component-validator.ts`, `legal-basis-validator.ts`, `page-validator.ts`, `recipients-validator.ts`, `tvci-default.ts`.
  - Exactly 1 file has Office.js dependencies:
    `src/rules/document-inspection.ts:6-7`:
    ```typescript
    import { inspectDocumentParagraphs } from "../word/formatting.service";
    import { inspectPageSetup } from "../word/page-formatting.service";
    ```
- In `web_app/src/rules/models.ts`, only a partial model exists (`ParagraphSnapshot`, `PageSetupSnapshot`, `FormattingPatch`, `ValidationIssue`), missing `ParagraphRules`, `MeasurementRule`, `PageRules`, `DocumentRuleSet`, `RuleCategory`, `RuleEvaluationStatus`, `RuleEvaluationResult`, and `DocumentEvaluationSummary`.
- In `web_app/src/editor/tiptap-adapter.ts:6-72`, `tiptapDocToSnapshots(doc: JSONContent): ParagraphSnapshot[]` is already implemented and passes unit tests in `web_app/tests/unit/tiptap-adapter.test.ts`. It maps paragraph and tableCell nodes into `ParagraphSnapshot` with `alignment`, `fontName`, `fontSize`, `bold`, `italic`, `underline`, and `context`.
- In `web_app/src/editor/tiptap-adapter.ts:74-143`, `applyPatchToEditorNode(editor, nodeIndex, patch)` is implemented and tested to mutate single ProseMirror nodes without cascading side effects.
- In `web_app/e2e-tests/tier1-feature/f08_rule_engine.test.ts`, `f09_multi_profile.test.ts`, `f10_ast_adapter.test.ts`, `f11_audit_health_score.test.ts`, and `f12_autofix_engine.test.ts`:
  - `f09_multi_profile.test.ts` references profile ID `"ND30_TVCI"` (ASCII) alongside `"TKV"`, `"IEMM"`, and `"DANG_05_HD_VPTW_2026"`.
  - `f11_audit_health_score.test.ts` verifies `healthScore = (passed / applicable) * 100`, excluding `NOT_APPLICABLE` and `MISSING`.
  - `f12_autofix_engine.test.ts` verifies `issueToPatch()` transformations and safe auto-fix filtering.

## 2. Logic Chain
1. *Office.js Isolation*: Because only `document-inspection.ts` interacts with Word Office.js runtime, porting all other 15 modules to `web_app/src/rules/` ensures 100% pure TypeScript execution in Node.js, Vitest, and the Next.js runtime.
2. *Document Source Decoupling*: Because the web editor uses Tiptap (ProseMirror), `document-inspection.ts` is not needed. `tiptapDocToSnapshots(editor.getJSON())` generates `ParagraphSnapshot[]` directly from the ProseMirror AST.
3. *Multi-Profile Compatibility*: `src/rules/profiles.ts` uses Vietnamese diacritics (`'NĐ30_TVCI'`) while test fixtures use ASCII (`'ND30_TVCI'`) and user request specifies `'tvci-default'`. Aliasing all three to the standard NĐ 30 profile resolves discrepancies without breaking existing callers.
4. *Dual Signature Design*: Existing code in `src/rules/document-evaluator.ts` expects an input object `DocumentEvaluationInput`. Supporting a function overload `evaluateDocumentRules(snapshots: ParagraphSnapshot[], profileId?: string)` fulfills the user prompt's signature requirement while maintaining full backwards compatibility with `DocumentEvaluationInput`.
5. *Auto-Fix Pipeline*: `fixer.ts` converts `ValidationIssue` to `FormattingPatch`. Combining `issueToPatch()` with `applyPatchToEditorNode()` enables atomic, safe fixes directly on the Tiptap editor canvas.

## 3. Caveats
- Horizontal rule evaluation: `horizontal-rules.ts` contains `buildHorizontalRuleOoxml()` for Word OpenXML output. In the web app, visual dividers in Tiptap are rendered as horizontal rule nodes; rule validation (`calculateHorizontalRuleWidth`, ratio checks) is pure math and applies directly.
- Page setup in Web App: Unless document page setup margins are explicitly tracked in editor state, page rules are evaluated as `NOT_APPLICABLE` or use default A4 margins (20-20-30-15mm).
- `TemplateOrganization` type: Currently imported from `../templates/library` in `profiles.ts`. In `web_app`, define this union (`'TVCI' | 'IEMM' | 'TKV' | 'DANG'`) locally in `profiles.ts` or `models.ts` to keep the rules module completely decoupled from templates.

## 4. Conclusion
The format rule engine port to `web_app/src/rules/` is straightforward and high-confidence:
- 15 pure TypeScript files to port from `src/rules/`.
- 1 file (`document-inspection.ts`) to omit.
- 1 barrel (`index.ts`) to create.
- Enhance `models.ts` with complete summary and result types.
- Add dual function signature to `document-evaluator.ts` to support `evaluateDocumentRules(snapshots, profileId?)`.
- Connect `tiptapDocToSnapshots()` -> `evaluateDocumentRules()` -> `issueToPatch()` -> `applyPatchToEditorNode()`.

## 5. Verification Method
1. Inspect files in `web_app/src/rules/` to ensure zero `@types/office-js` or Word runtime imports:
   ```bash
   grep -rn "Office" web_app/src/rules/
   grep -rn "Word\." web_app/src/rules/
   ```
2. Run TypeScript compilation check:
   ```bash
   cd web_app && pnpm tsc --noEmit
   ```
3. Run unit tests for adapter and rules:
   ```bash
   cd web_app && pnpm vitest run tests/unit/tiptap-adapter.test.ts
   ```
4. Verify E2E feature tests for rule engine (F08 - F12):
   ```bash
   cd web_app && pnpm vitest run e2e-tests/tier1-feature/f08_rule_engine.test.ts e2e-tests/tier1-feature/f09_multi_profile.test.ts e2e-tests/tier1-feature/f10_ast_adapter.test.ts e2e-tests/tier1-feature/f11_audit_health_score.test.ts e2e-tests/tier1-feature/f12_autofix_engine.test.ts
   ```
