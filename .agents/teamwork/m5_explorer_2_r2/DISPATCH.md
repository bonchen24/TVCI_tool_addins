# Task Dispatch: M5 Explorer 2 (AI Subsystems: Drafting, Proofreading, Template Fill)

## Identity
- Role: Explorer
- Working directory: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_2_r2\
- Report file: e:\CODING\TVCI_word_addins\.agents\teamwork\m5_explorer_2_r2\handoff.md

## Context & Objectives
You are investigating Milestone 5 AI Subsystems for the TVCI Web Application:
1. Contextual Drafting Subsystem (`web_app/src/ai/drafting.ts`):
   - Generates administrative document sections (Mở đầu, Căn cứ pháp lý, Nội dung chính, Điều khoản thi hành) according to standard Vietnamese administrative structures (Nghị định 30/2020/NĐ-CP).
2. 5-Category Proofreading Subsystem (`web_app/src/ai/proofreading.ts`):
   - Analyzes document text and provides structured suggestions across 5 categories: Chính tả (Spelling), Ngữ pháp (Grammar), Viết hoa hành chính (Capitalization per NĐ 30), Dấu câu (Punctuation), and Văn phong hành chính (Administrative tone/style).
   - Returns structured issues with original text snippet, suggested fix, explanation, and severity.
3. AI Template Fill Assistant (`web_app/src/ai/template-fill.ts`):
   - Given user free-form notes / context, intelligently extracts and maps values to template form schema fields (compatible with M4 `web_app/src/templates/form-schema.ts`).

## Files to Read & Investigate
1. `e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY)
2. `e:\CODING\TVCI_word_addins\PROJECT.md`
3. `e:\CODING\TVCI_word_addins\web_app\src\templates\` (form schemas and template catalog from M4)
4. Existing AI source in `e:\CODING\TVCI_word_addins\web_app\src\ai\`

## Output Requirements
Write `analysis.md` and `handoff.md` in your working directory containing:
1. Analysis of inputs, outputs, and algorithms for all 3 AI subsystems.
2. Integration strategy with M4 template catalog & form schemas.
3. Specific prompt templates and structured JSON response schemas for Drafting, Proofreading, and Template Fill.
4. Unit testing plan with mocked LLM responses for each subsystem.
