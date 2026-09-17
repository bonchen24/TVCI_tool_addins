# Chuẩn hóa IEMM, Đảng và TVCI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa trang, nội dung, căn cứ, đề mục, Nơi nhận và đường kẻ tiêu đề cho IEMM, Đảng/Đảng ủy Viện và TVCI, đồng thời loại TKV/NĐ30 độc lập khỏi luồng sử dụng.

**Architecture:** Mở rộng mô hình rule để biểu diễn thụt dòng, giãn dòng và dấu câu; dùng Word API để kiểm tra/sửa paragraph và page setup; dùng preset OOXML có kiểm soát cho outline, căn cứ và Nơi nhận. Catalog/UI chỉ expose các tổ chức trong phạm vi, còn script XML cập nhật các DOCX bundled.

**Tech Stack:** TypeScript, Office.js Word API, OOXML, React task pane, Node test runner, Python zip/XML patching, LibreOffice render QA.

**Spec:** `docs/superpowers/specs/2026-09-16-iemm-party-tvci-formatting-design.md`

## Global Constraints

- Khổ A4, dọc; lề trên 20mm, dưới 20mm, trái 30mm, phải 15mm là mặc định.
- Cỡ chữ mặc định của nội dung là 13pt Times New Roman.
- IEMM/TVCI dùng tên đơn vị đầy đủ trong văn bản; chỉ giữ viết tắt bắt buộc trong symbol hoặc VT.
- Không tạo đường kẻ ở khu vực ngày tháng/header; chỉ tạo đường kẻ dưới Tên loại/Trích yếu.
- Mọi sửa DOCX phải được render và kiểm tra PNG sau cùng.

### Task 1: Lock the requested behavior with tests

**Files:**
- Modify: `qa/rule-profiles.node.test.ts`
- Modify: `qa/document-components.node.test.ts`
- Modify: `qa/drafting-tools.node.test.ts`
- Modify: `qa/addressee-rules.node.test.ts`
- Modify: `qa/template-header.node.test.ts`
- Create: `qa/content-formatting.node.test.ts`

- [ ] Add red tests for page defaults, body font/indent/spacing, Party exact 18pt, final punctuation, legal-basis punctuation, outline shape, recipient presets, V/v copy and active organizations.
- [ ] Run targeted tests and confirm they fail against the current implementation.

### Task 2: Extend rules and Word formatter

**Files:**
- Modify: `src/rules/models.ts`
- Modify: `src/rules/profiles.ts`
- Modify: `src/rules/validator.ts`
- Modify: `src/rules/fixer.ts`
- Modify: `src/word/formatting.service.ts`
- Modify: `src/word/page-formatting.service.ts`

- [ ] Add first-line indent and line-spacing measurements to paragraph rules/snapshots/patches.
- [ ] Set active profiles to 13pt, 10mm first-line indent, 6pt after, 18pt line spacing, and page margins 20/20/30/15.
- [ ] Load and auto-fix the added fields through the existing issue pipeline.
- [ ] Ensure page rules are applied before template/drafting insertion paths.

### Task 3: Implement legal basis, outline and content insertion behavior

**Files:**
- Modify: `src/rules/component-classifier.ts`
- Modify: `src/rules/component-rules.ts`
- Modify: `src/rules/component-validator.ts`
- Modify: `src/rules/recipients-validator.ts`
- Modify: `src/drafting/presets.ts`
- Modify: `src/word/drafting.service.ts`
- Modify: `src/word/selection.service.ts`

- [ ] Add legal-basis classification and profile-specific punctuation checks.
- [ ] Make outline insertion use two paragraphs for Part/Chapter/Section/Subsection and the requested indent/typography for Article/Clause/Point.
- [ ] Apply body formatting to newly inserted AI/content paragraphs.
- [ ] Normalize `V/v` without colon and with lower-case trích yếu.
- [ ] Implement recipient formatting and preset normalization, including `Như trên;` and final `Lưu: ... .`.

### Task 4: Reduce catalog scope and improve Nơi nhận controls

**Files:**
- Modify: `src/templates/library.ts`
- Modify: `src/templates/catalog.ts`
- Modify: `src/templates/tvci-tabs.ts`
- Modify: `src/rules/profiles.ts`
- Modify: `src/taskpane/App.tsx`
- Modify: `src/reference/quick-guidance.ts`
- Modify: `qa/party-templates.node.test.ts`
- Modify: `qa/template-ui.node.test.ts`

- [ ] Remove TKV from active organization tabs/catalog and stop exposing standalone NĐ30 profile as a user-facing option.
- [ ] Keep TVCI mapped to IEMM administrative rules and label Party flow as including Đảng ủy Viện.
- [ ] Add preset selection controls and a full-name unit warning to the Nơi nhận group.
- [ ] Update copy, placeholders and guidance to avoid non-required unit abbreviations.

### Task 5: Patch bundled DOCX templates

**Files:**
- Create: `scripts/normalize-active-template-format.py`
- Modify: active DOCX files under `templates/iemm`, root IEMM/TVCI templates and `templates/dang-sample.docx`
- Modify: `qa/template-header.node.test.ts`

- [ ] Normalize section page XML to A4 and 20/20/30/15mm.
- [ ] Normalize body paragraphs to 13pt, justified, 10mm first-line indent, 6pt after and appropriate line spacing.
- [ ] Normalize legal basis and Nơi nhận blocks, V/v copy and full unit names without touching mandatory symbols.
- [ ] Preserve the single left-column header rule and title/abstract rule only.
- [ ] Add idempotent `--check` validation for active templates.

### Task 6: Render and verify

**Files:**
- No source changes expected.
- Outputs: `temp-format-audit/iemm-party-tvci-final/`

- [ ] Run all QA tests, typecheck and production build.
- [ ] Render representative IEMM, TVCI and Party documents with the canonical DOCX renderer and inspect every page.
- [ ] Run template check on source and `dist/templates`.
- [ ] Record any non-blocking webpack size warning separately from correctness results.
