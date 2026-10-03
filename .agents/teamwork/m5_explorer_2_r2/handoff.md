# Handoff Report: M5 Explorer 2 (AI Subsystems: Drafting, Proofreading, Template Fill)

## 1. Observation
1. **Source Code Status**:
   - `web_app/src/ai/`: Currently does not exist.
   - `web_app/src/templates/form-schema.ts`: Lines 95–769 define 8 canonical schemas (`cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bao_cao`, `bien_ban`, `ke_hoach`, `hop_dong`), lines 772–853 define 2 internal schemas (`thu_moi`, `don_nghi_phep`), and lines 862–881 export `getFormSchema` and `getTemplateFormSchemaByDocumentType`.
   - `web_app/src/templates/form-validation.ts`: Lines 20–78 and line 105 export `formatAdministrativeDate` conforming strictly to NĐ 30/2020/NĐ-CP (leading zero on day < 10, leading zero on month 1 and 2).
   - `web_app/src/templates/engine.ts`: Lines 61–95 define `makeParagraph` producing Tiptap AST nodes with Times New Roman, fontSize 13, lineSpacing 1.2, firstLineIndentMm 10.
   - `src/ai/proofreading.ts`: Lines 1–15 in the Word Add-in reference implementation define `ProofreadingCategory` ("spelling" | "grammar" | "capitalization" | "punctuation" | "administrative_style") and `extractJson`.
   - `src/ai/template-fill.ts`: Lines 9–15 and 61–72 in the Word Add-in define `TemplateFillField`, `MIN_AUTO_FILL_CONFIDENCE = 0.8`, and tag sanitization.
2. **E2E Test Specifications**:
   - `web_app/e2e-tests/tier1-feature/f19_ai_drafting.test.ts` lines 10–25: Tests `DraftingRequest` with `docType`, `section`, `userPrompt`, `context`, formal phrasing validation, paragraph splitting, token metadata tracking, and empty prompt error.
   - `web_app/e2e-tests/tier1-feature/f20_ai_proofreading.test.ts` lines 10–25: Tests 5 categories: `spelling`, `grammar`, `capitalization`, `punctuation`, `administrative_style`. Expects detection of diacritic typo `kiễm tra` -> `kiểm tra`, style replacement for `chúng tôi`, position index calculation, and clean text returning `issues: []`.
   - `web_app/e2e-tests/tier1-feature/f21_ai_template_fill.test.ts` lines 10–85: Tests recipient extraction (`KINH_GUI`), subject summary with prefix (`TRICH_YEU` -> `V/v ...`), signer name (`NGUOI_KY`), validation against canonical schema fields discarding unknown tags (`UNKNOWN_EXTRA_TAG`), and confidence scoring (`> 0.9`).
   - `web_app/e2e-tests/fixtures/templateFixtures.ts` lines 129–150: Exports `MOCK_AI_RESPONSES` providing deterministic fixtures for drafting and proofreading.
   - `web_app/e2e-tests/tier3-pairwise/journey_draft_proofread_structure.test.ts` lines 9–35: Tests end-to-end pipeline: AI Draft -> Sanitization -> Proofreading -> Layout structuring.

## 2. Logic Chain
1. Based on Observation 1 and 2 (`f19_ai_drafting.test.ts`), `drafting.ts` must validate that `userPrompt` is non-empty, reject prompt injection, construct structured prompts combining `ADMINISTRATIVE_AI_RULES` with section-specific guidance (`mo_dau`, `can_cu`, `noi_dung`, `dieu_khoan`, `ket_luan`), sanitize output against markdown/emojis, split output into clean paragraphs, and report token consumption.
2. Based on Observation 1 and 2 (`f20_ai_proofreading.test.ts`), `proofreading.ts` must classify issues into exactly the 5 defined categories: `spelling`, `grammar`, `capitalization` (NĐ 30 Phụ lục II), `punctuation`, and `administrative_style`. It must calculate character positions (`position`, `endIndex`) within the source text, support clean text without error, extract JSON safely across markdown code fences (` ```json `), and normalize severity.
3. Based on Observation 1 and 2 (`f21_ai_template_fill.test.ts` and `form-schema.ts`), `template-fill.ts` must extract dynamic values from free-form user notes, map them to canonical form schema fields (`FORM_SCHEMAS`, `INTERNAL_SCHEMAS`), enforce `TRICH_YEU` prefixing with `V/v `, validate against the target schema and strictly discard any hallucinated tags, normalize dates using `formatAdministrativeDate`, parse repeatable fields into arrays, populate dual keys (`values[id]`, `values[tag]`, `values[alias]`), and compute confidence scores with a `0.8` review threshold.
4. To ensure 100% hermetic testing without live API keys or network latency, all 3 modules must integrate with `mock-provider.ts` and deterministic regex fallbacks, matching the fixtures in `templateFixtures.ts`.

## 3. Caveats
- Subsystem implementations rely on `web_app/src/ai/direct-client.ts`, `administrative-rules.ts`, and `sanitizer.ts` being provided by Explorer 1's architecture.
- Downstream visual diff display and Tiptap editor insertion are within the domain of Explorer 3 (`diff.ts`, `AiWorkspacePanel.tsx`).
- Live LLM responses may vary slightly in token count and phrasing, so all automated unit and integration tests must run against mocked deterministic handlers.

## 4. Conclusion
1. Implement the 3 AI subsystems under `web_app/src/ai/`:
   - `web_app/src/ai/drafting.ts`: Contextual drafting engine supporting 10 document types, 5 administrative sections, paragraph parsing, and token tracking.
   - `web_app/src/ai/proofreading.ts`: 5-category proofreader returning `{ revisedText, issues: [{ category, original, replacement, explanation, severity, position, endIndex }] }`.
   - `web_app/src/ai/template-fill.ts`: Intelligent field extractor mapping user notes into M4 `TemplateFormValues` with tag validation, confidence scoring, and administrative date formatting.
2. Add three corresponding unit test suites under `web_app/tests/unit/`:
   - `web_app/tests/unit/ai-drafting.test.ts`
   - `web_app/tests/unit/ai-proofreading.test.ts`
   - `web_app/tests/unit/ai-template-fill.test.ts`
3. Export all types and functions from `web_app/src/ai/index.ts`.

## 5. Verification Method
1. **Type Checking**:
   ```bash
   npm run typecheck
   ```
   (Must pass with 0 errors).
2. **Unit Test Execution**:
   ```bash
   npx vitest run tests/unit/ai-drafting.test.ts tests/unit/ai-proofreading.test.ts tests/unit/ai-template-fill.test.ts
   ```
3. **E2E Feature Test Verification**:
   ```bash
   node web_app/e2e-tests/runner.js --tier=1 --filter=ai
   ```
   Verifies that F19 (`f19_ai_drafting.test.ts`), F20 (`f20_ai_proofreading.test.ts`), and F21 (`f21_ai_template_fill.test.ts`) pass 100%.
4. **Pairwise Journey Test Verification**:
   ```bash
   node web_app/e2e-tests/runner.js --tier=3 --filter=draft
   ```
   Verifies `journey_draft_proofread_structure.test.ts`.
5. **Invalidation Conditions**:
   - Proofreading categories count is not exactly 5, or invalid category names are introduced.
   - Template fill keeps hallucinated tags not in canonical schema.
   - Legal bases or decision clauses violate NĐ 30 syntax (missing semicolons, incorrect headers).
   - Test suites make live network calls instead of using hermetic mocks.
