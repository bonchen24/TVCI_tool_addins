/**
 * Central index exporting all E2E test suites and framework components
 */

export * from "./framework/types";
export * from "./framework/assertions";
export * from "./framework/testHarness";
export * from "./fixtures/documentFixtures";
export * from "./fixtures/ruleSnapshots";
export * from "./fixtures/templateFixtures";

// Import all Tier 1 suites
import "./tier1-feature/f01_scaffold_design.test";
import "./tier1-feature/f02_canvas_toolbar.test";
import "./tier1-feature/f03_two_column_tables.test";
import "./tier1-feature/f04_build_test_infra.test";
import "./tier1-feature/f05_docx_import.test";
import "./tier1-feature/f06_docx_export.test";
import "./tier1-feature/f07_roundtrip_interop.test";
import "./tier1-feature/f08_rule_engine.test";
import "./tier1-feature/f09_multi_profile.test";
import "./tier1-feature/f10_ast_adapter.test";
import "./tier1-feature/f11_audit_health_score.test";
import "./tier1-feature/f12_autofix_engine.test";
import "./tier1-feature/f13_template_catalog.test";
import "./tier1-feature/f14_form_schemas.test";
import "./tier1-feature/f15_form_fill_date.test";
import "./tier1-feature/f16_template_insertion.test";
import "./tier1-feature/f17_ai_client.test";
import "./tier1-feature/f18_ai_prompts.test";
import "./tier1-feature/f19_ai_drafting.test";
import "./tier1-feature/f20_ai_proofreading.test";
import "./tier1-feature/f21_ai_template_fill.test";
import "./tier1-feature/f22_diff_preview.test";
import "./tier1-feature/f23_e2e_suite_meta.test";
import "./tier1-feature/f24_adversarial_hardening.test";

// Import all Tier 2 suites
import "./tier2-boundary/boundary_inputs.test";
import "./tier2-boundary/extreme_margins_spacing.test";
import "./tier2-boundary/corrupted_docx_recovery.test";
import "./tier2-boundary/unicode_vietnamese_stress.test";
import "./tier2-boundary/missing_metadata_schema.test";

// Import all Tier 3 suites
import "./tier3-pairwise/journey_import_audit_fix_export.test";
import "./tier3-pairwise/journey_template_ai_diff_export.test";
import "./tier3-pairwise/journey_profile_switch_reaudit.test";
import "./tier3-pairwise/journey_draft_proofread_structure.test";

// Import all Tier 4 suites
import "./tier4-workloads/workload_cong_van_tvci.test";
import "./tier4-workloads/workload_quyet_dinh.test";
import "./tier4-workloads/workload_to_trinh.test";
import "./tier4-workloads/workload_thong_bao.test";
import "./tier4-workloads/workload_bao_cao.test";
