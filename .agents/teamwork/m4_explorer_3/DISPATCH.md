## 2026-09-29T05:39:08Z
You are M4 Explorer 3 for Milestone 4: `template-library-fill` of the TVCI Web Application project.
Your working directory is: e:\CODING\TVCI_word_addins\.agents\teamwork\m4_explorer_3\
Your parent conversation ID: c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0

CRITICAL EXECUTION RULE:
DO NOT USE `run_command`. `run_command` hangs waiting for interactive user terminal permissions. You MUST perform all investigation exclusively using file inspection tools (`view_file`, `grep_search`, `list_dir`, `find_by_name`).

MANDATORY FIRST STEP:
Read the user's original request verbatim at:
e:\CODING\TVCI_word_addins\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
e:\CODING\TVCI_word_addins\PROJECT.md
Inspect existing editor components in:
- `web_app/src/components/layout/Sidebar.tsx`
- `web_app/src/editor/`
- `web_app/e2e-tests/suites/tier1-features.js` (features f13, f14, f15, f16)

OBJECTIVE:
Investigate and design Template Engine, Sidebar UI, and Unit Test Suites:
1. Template Engine (`web_app/src/templates/engine.ts`):
   - 2-tier template injection:
     - Tier 1: Full Document Insertion / Replace: Generates full Tiptap document JSON containing:
       - 2-column header table (Left: Agency & Parent; Right: Quốc hiệu & Tiêu ngữ).
       - Document symbol & place/date table or paragraphs.
       - Title / Type (e.g. `QUYẾT ĐỊNH`) and Abstract.
       - Body sections / Articles / Clauses formatted with administrative font & margins.
       - 2-column footer table (Left: Nơi nhận; Right: Chức vụ & Người ký).
     - Tier 2: Dynamic Field Fill: Takes user form values and updates matching nodes in the active editor without destroying body modifications.
   - Fallback and graceful error handling.
2. Sidebar Template Tab UI in `web_app/src/components/layout/Sidebar.tsx`:
   - When `activeTab === 'templates'`:
     - Category filter / search input.
     - Template card selection list.
     - Dynamic form fields rendered according to selected template's schema.
     - Administrative date picker/inputs.
     - "Áp dụng biểu mẫu" primary action button with loading / feedback states.
3. Unit Test Suites design:
   - `web_app/tests/unit/template-catalog.test.ts`: test 22 templates catalog, categories, search, required fields.
   - `web_app/tests/unit/form-schema.test.ts`: test 8 schemas, field types, date formatter (NĐ 30 day/month rules), validation errors.
   - `web_app/tests/unit/template-engine.test.ts`: test full document generation, field injection, placeholder replacement, Tiptap JSON validity.
   - `web_app/tests/unit/template-ui.test.tsx`: test Sidebar template tab, category filter, dynamic form input change, insert callback.
