# TVCI Web Application — Test Infrastructure Specification (TEST_INFRA.md)

## 1. Test Philosophy

The TVCI Web Application Test Track follows an **opaque-box, requirement-driven, contract-based verification model** directly derived from `ORIGINAL_REQUEST.md` (Requirements R1–R5) and the 24-feature architecture defined in `PROJECT.md`.

### Core Principles
1. **Opaque-Box Verification**: Tests validate system behavior through external contracts, AST snapshots, OpenXML binary structures, validation results, and UI interaction states without coupling to internal private methods.
2. **Authoritative Specification Source**: All expected formatting values, typographic rules, and structural schemas derive from:
   - **Nghị định 30/2020/NĐ-CP** (Standard Vietnamese Administrative Documents).
   - **Hướng dẫn 05-HD/VPTW 2026** (Party Document Profile).
   - **TVCI & IEMM & TKV Technical Standards** (`templates/` and `src/rules/`).
3. **Progressive Testability & Isolation**: Every test case is hermetic and self-contained, setting up its own state and fixtures, with zero inter-test execution order dependence.
4. **Adversarial & Boundary Rigor**: Tests verify resilience against malformed OpenXML, Unicode diacritic collisions, oversized payloads, missing metadata, and extreme typography parameters.

---

## 2. Feature Inventory Coverage Mapping

| # | Feature | Milestone | Scope / Contract | Target Test File | Tier 1 Cases | Key Verification Criteria |
|---|---------|-----------|------------------|------------------|--------------|---------------------------|
| 1 | Web App Scaffold & Design System | M1 | Next.js App Router, Tailwind layout, Indigo `#6366F1` & Emerald `#10B981` palette, collapsible panels | `f01_scaffold_design.test.ts` | 5 | Brand theme tokens, responsive panels, navigation state, sidebar tabs |
| 2 | A4 Document Canvas & Toolbar | M1 | A4 aspect ratio (210x297mm), page margins, typography controls, line spacing | `f02_canvas_toolbar.test.ts` | 5 | Margin controls, font size mutations, line spacing presets (1.0-1.5), text alignment |
| 3 | 2-Column Administrative Table Nodes | M1 | Header table (Agency + Motto) & Footer table (Recipients + Signer) with invisible borders | `f03_two_column_tables.test.ts` | 5 | Table node creation, cell ratio splits, borderless attributes, cell alignment |
| 4 | Base Build & Testing Infra | M1 | Next.js build config, test harness execution, environment isolation | `f04_build_test_infra.test.ts` | 5 | Config validation, env variables, test harness reporter, runner exit codes |
| 5 | High-Fidelity DOCX Import Engine | M2 | OpenXML parser (`jszip`) + fallback extractor, paragraph & style extraction | `f05_docx_import.test.ts` | 5 | Paragraph extraction, run bold/italic, table preservation, heading styles |
| 6 | High-Fidelity DOCX Export Engine | M2 | OpenXML generator (`docx`), NĐ30 page margins, Times New Roman, valid docx zip | `f06_docx_export.test.ts` | 5 | Zip integrity, `word/document.xml` generation, page setup XML, font declarations |
| 7 | Roundtrip File Interop & Verification | M2 | Import existing sample DOCX -> editor model -> export DOCX without corruption | `f07_roundtrip_interop.test.ts` | 5 | Structural roundtrip fidelity, text preservation, table structure, XML compliance |
| 8 | Pure TypeScript Rule Engine Port | M3 | 25+ administrative rules across 7 categories (`page`, `header`, `symbol_date`, etc.) | `f08_rule_engine.test.ts` | 5 | Rule registry, font size evaluation, alignment check, margin rule evaluation |
| 9 | Multi-Profile Configuration | M3 | NĐ30_TVCI, TKV, IEMM, DANG_05_HD_VPTW_2026 profiles | `f09_multi_profile.test.ts` | 5 | Profile switching, profile-specific motto/emblem rules, legal basis punctuation |
| 10 | Editor AST Snapshot Adapter | M3 | Editor AST -> `ParagraphSnapshot[]` & `PageSetupSnapshot` | `f10_ast_adapter.test.ts` | 5 | Node attribute extraction, paragraph classification, table cell flattening, metrics |
| 11 | Real-time Audit & Health Score | M3 | `evaluateDocumentRules`, `ValidationIssue[]`, `healthScore = (passed/applicable)*100` | `f11_audit_health_score.test.ts` | 5 | Issue detection, severity assignment, health score math, category breakdown |
| 12 | One-Click Safe Auto-Fix Engine | M3 | Transform issues to `FormattingPatch` & apply atomic fixes | `f12_autofix_engine.test.ts` | 5 | Patch generation, safe fix filtering, font/size fix, line spacing & margin fix |
| 13 | Template Catalog (22 templates) | M4 | 22-template registry across TVCI, IEMM, TKV, DANG | `f13_template_catalog.test.ts` | 5 | Catalog listing, category filtering, search query matching, template metadata |
| 14 | 8 Canonical Form Schemas | M4 | Schemas for Công văn, Quyết định, Thông báo, Tờ trình, Báo cáo, Biên bản, Thư mời, Đơn nghỉ phép | `f14_form_schemas.test.ts` | 5 | Schema registry, field type validation, required fields, default values |
| 15 | Dynamic Form Fill UI & Date Formatter | M4 | Field input model, `formatAdministrativeDate` padding rules | `f15_form_fill_date.test.ts` | 5 | Date formatting (day/month padding), field binding, validation errors |
| 16 | 2-Tier Template Insertion Engine | M4 | Direct AST generation + regex fallback tag replacement | `f16_template_insertion.test.ts` | 5 | Structured AST insertion, regex placeholder replacement, missing tag tolerance |
| 17 | Multi-Provider AI Client | M5 | OpenAI `gpt-4o-mini` & Google Gemini `gemini-2.0-flash` client contract | `f17_ai_client.test.ts` | 5 | Provider abstraction, timeout handling, retry logic, error status normalization |
| 18 | Strict Administrative AI Prompts | M5 | `ADMINISTRATIVE_AI_RULES` (no hallucinations, no markdown, no emoji, concise) | `f18_ai_prompts.test.ts` | 5 | Anti-hallucination prompt guard, output sanitization, markdown stripping |
| 19 | Contextual Drafting Subsystem | M5 | Section generation based on prompt, doc type, and context | `f19_ai_drafting.test.ts` | 5 | Drafting prompt construction, administrative tone enforcement, context injection |
| 20 | 5-Category Proofreading Subsystem | M5 | Spelling, grammar, capitalization, punctuation, administrative style | `f20_ai_proofreading.test.ts` | 5 | 5-category taxonomy, suggestion payload parsing, issue location indexing |
| 21 | AI Template Fill Assistant | M5 | Field value extraction from rough user notes into template schema | `f21_ai_template_fill.test.ts` | 5 | Extraction mapping, schema alignment, partial data handling, confidence output |
| 22 | Visual Diff Preview Workflow | M5 | Word-level diff (`diffWordsWithSpace`) with Accept/Reject controls | `f22_diff_preview.test.ts` | 5 | Word diff calculation, addition/deletion spans, partial accept, full reject |
| 23 | E2E Opaque-Box Test Suite (Tiers 1-4) | M6 | Test runner execution, tier partitioning, reporting | `f23_e2e_suite_meta.test.ts` | 5 | Runner execution, tier selection, report format, failure isolation |
| 24 | Adversarial Coverage Hardening (Tier 5) | M6 | Boundary stress, malformed input recovery, fuzzing contracts | `f24_adversarial_hardening.test.ts` | 5 | Fuzz payload tolerance, boundary values, memory limits, recovery paths |

---

## 3. 4-Tier Test Architecture

```
web_app/e2e-tests/
├── runner.ts                     # Standalone CLI Test Runner & Orchestrator
├── framework/                    # Lightweight Zero-Dependency Test Harness
│   ├── testHarness.ts            # describe, it, runAllSuites, timeout handling
│   ├── assertions.ts             # expect(), toEqual(), toMatch(), toBeCloseTo()
│   └── types.ts                  # TestCase, TestSuite, TestResult, Reporter
├── fixtures/                     # Authoritative Test Payloads & Models
│   ├── documentFixtures.ts       # AST document models for standard administrative types
│   ├── ruleSnapshots.ts          # Sample ParagraphSnapshot & PageSetup fixtures
│   └── templateFixtures.ts       # Sample form input data & expected strings
├── tier1-feature/                # Tier 1: 24 Features Coverage (>= 120 test cases)
│   ├── f01_scaffold_design.test.ts
│   ├── f02_canvas_toolbar.test.ts
│   ├── f03_two_column_tables.test.ts
│   ├── f04_build_test_infra.test.ts
│   ├── f05_docx_import.test.ts
│   ├── f06_docx_export.test.ts
│   ├── f07_roundtrip_interop.test.ts
│   ├── f08_rule_engine.test.ts
│   ├── f09_multi_profile.test.ts
│   ├── f10_ast_adapter.test.ts
│   ├── f11_audit_health_score.test.ts
│   ├── f12_autofix_engine.test.ts
│   ├── f13_template_catalog.test.ts
│   ├── f14_form_schemas.test.ts
│   ├── f15_form_fill_date.test.ts
│   ├── f16_template_insertion.test.ts
│   ├── f17_ai_client.test.ts
│   ├── f18_ai_prompts.test.ts
│   ├── f19_ai_drafting.test.ts
│   ├── f20_ai_proofreading.test.ts
│   ├── f21_ai_template_fill.test.ts
│   ├── f22_diff_preview.test.ts
│   ├── f23_e2e_suite_meta.test.ts
│   └── f24_adversarial_hardening.test.ts
├── tier2-boundary/               # Tier 2: Boundary & Corner Cases (>= 25 test cases)
│   ├── boundary_inputs.test.ts
│   ├── extreme_margins_spacing.test.ts
│   ├── corrupted_docx_recovery.test.ts
│   ├── unicode_vietnamese_stress.test.ts
│   └── missing_metadata_schema.test.ts
├── tier3-pairwise/               # Tier 3: Cross-Feature Interactions (>= 20 test cases)
│   ├── journey_import_audit_fix_export.test.ts
│   ├── journey_template_ai_diff_export.test.ts
│   ├── journey_profile_switch_reaudit.test.ts
│   └── journey_draft_proofread_structure.test.ts
└── tier4-workloads/              # Tier 4: Real-World Administrative Documents (>= 20 test cases)
    ├── workload_cong_van_tvci.test.ts
    ├── workload_quyet_dinh.test.ts
    ├── workload_to_trinh.test.ts
    ├── workload_thong_bao.test.ts
    └── workload_bao_cao.test.ts
```

---

## 4. Execution Commands & Pass/Fail Semantics

### Commands
1. **Run All Tiers**:
   ```bash
   node web_app/e2e-tests/runner.ts
   ```
2. **Run Specific Tier**:
   ```bash
   node web_app/e2e-tests/runner.ts --tier=1
   node web_app/e2e-tests/runner.ts --tier=2
   node web_app/e2e-tests/runner.ts --tier=3
   node web_app/e2e-tests/runner.ts --tier=4
   ```
3. **Filter Test Suites**:
   ```bash
   node web_app/e2e-tests/runner.ts --filter=docx
   node web_app/e2e-tests/runner.ts --filter=workload
   ```

### Pass/Fail Semantics
- **Exit Code 0**: 100% of executed test assertions passed. Zero unhandled rejections.
- **Exit Code 1**: One or more assertions failed or unexpected runtime exceptions thrown. Summary prints failing suites, file paths, line numbers, and exact vs actual output diffs.
