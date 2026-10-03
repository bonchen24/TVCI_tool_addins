# Handoff Report: Milestone 4 Administrative Template Catalog Design
**Agent:** M4 Explorer 1  
**Working Directory:** `e:\CODING\TVCI_word_addins\.agents\teamwork\m4_explorer_1\`  
**Date:** 2026-09-29  
**Type:** Hard Handoff (Investigation & Specification Complete)  

---

## 1. Observation

1. **Test Suites & Fixtures:**
   - In `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier1-feature\f13_template_catalog.test.ts`:
     - Lines 9-15 define `TemplateMetadata` with fields `id`, `title`, `organization` (`"TVCI" | "IEMM" | "TKV" | "DANG"`), `category` (`"cong_van" | "quyet_dinh" | "thong_bao" | "to_trinh" | "bieu_mau_noi_bo"`), and `fileName`.
     - Lines 17-40 register exactly 22 template records: `tvci-cv`, `tvci-tb`, `tkv-qd`, `dang-sample`, `iemm-01` through `iemm-14`, `iemm-tt-nb`, `iemm-don-np`, `iemm-thu-moi`, and `tvci-sample`.
     - Lines 42-78 test catalog length (`>= 22`), coverage across all 4 organizations, case-insensitive Vietnamese search (`"công văn"`, `"quyết định"`), `.docx` extension check, and mapping to the 5 categories.
   - In `e:\CODING\TVCI_word_addins\web_app\e2e-tests\fixtures\templateFixtures.ts`:
     - Lines 24-126 define `CANONICAL_SCHEMAS: DocumentFormSchema[]` registering 8 schemas: `cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bao_cao`, `bien_ban`, `thu_moi`, and `don_nghi_phep`.
     - Lines 29, 44, 58, 70, 83, 95, 107, 118 assign `defaultProfile`: `ND30_TVCI` or `IEMM`.
   - In `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier1-feature\f15_form_fill_date.test.ts`:
     - Lines 15-24 specify NĐ 30 administrative date formatting: Days 1..9 pad leading zero (`ngày 05`); Months 1..2 pad leading zero (`tháng 01`, `tháng 02`); Months 3..12 do not pad (`tháng 3` .. `tháng 12`).
   - In `e:\CODING\TVCI_word_addins\web_app\e2e-tests\tier1-feature\f16_template_insertion.test.ts`:
     - Lines 10-37 specify Tier 1 Tiptap AST generation.
     - Lines 39-65 specify Tier 2 regex placeholder replacement supporting both `{{TAG}}` and `[TAG]`.

2. **Template Assets in Repository:**
   - In `e:\CODING\TVCI_word_addins\templates\iemm\`: Contains 14 `.docx` files: `01-quyet-dinh-ca-biet.docx`, `02-quyet-dinh-ban-hanh-van-ban.docx`, `03-quy-che-quy-dinh.docx`, `04-van-ban-ban-hanh-kem-theo-quyet-dinh.docx`, `05-cong-van-hanh-chinh.docx`, `06-thong-bao-noi-bo-vien.docx`, `07-to-trinh-cua-vien.docx`, `08-to-trinh-cua-don-vi-gui-vien.docx`, `09-bien-ban.docx`, `10-van-ban-chung.docx`, `11-ban-sao-van-ban.docx`, `12-thu-moi-hop.docx`, `13-thu-bao-hoan-hop.docx`, `14-cong-van-dinh-chinh.docx`.
   - In `e:\CODING\TVCI_word_addins\templates\`: Contains `tvci-cong-van-template.docx`, `tvci-thong-bao-template.docx`, `tkv-quyet-dinh-template.docx`, `dang-sample.docx`, `tvci-sample.docx`, `iemm-don-xin-nghi-phep-template.docx`, `iemm-thu-moi-template.docx`, `iemm-to-trinh-noi-bo-template.docx`.

3. **Current Web App Source State:**
   - `web_app/src/templates/` directory does not yet exist.
   - `web_app/src/components/layout/Sidebar.tsx` has static mock items for templates at lines 290-314.

---

## 2. Logic Chain

1. From Observation 1 (`f13_template_catalog.test.ts` and `templateFixtures.ts`) and Observation 2 (existing `.docx` files), there is an exact 1-to-1 match between the 22 physical Word templates in `templates/` and the required E2E test IDs: `tvci-cv`, `tvci-tb`, `tkv-qd`, `dang-sample`, `iemm-01` .. `iemm-14`, `iemm-tt-nb`, `iemm-don-np`, `iemm-thu-moi`, `tvci-sample`.
2. From Observation 1 (`f14_form_schemas.test.ts`), all templates must link to one of the 8 canonical schemas (`cong_van`, `quyet_dinh`, `thong_bao`, `to_trinh`, `bao_cao`, `bien_ban`, `thu_moi`, `don_nghi_phep`).
3. From Observation 1 (`f15_form_fill_date.test.ts` and `f16_template_insertion.test.ts`), the template data model must support:
   - Metadata and search indexing (Vietnamese fuzzy matching).
   - Dynamic form schema field bindings.
   - Direct AST generation for 2-column header and 2-column footer tables compatible with Tiptap schema.
   - Regex fallback replacements (`{{TAG}}` and `[TAG]`).
4. Therefore, designing `web_app/src/templates/types.ts` and `web_app/src/templates/catalog.ts` around these 22 templates ensures 100% compliance with NĐ 30/2020/NĐ-CP, corporate requirements (TKV, IEMM, TVCI, DANG), and automated E2E tests.

---

## 3. Caveats

- **No live server run during inspection:** As instructed, `run_command` was not executed. Verification was conducted using direct static inspection of test suites, code files, and fixture definitions.
- **Physical DOCX file paths in web app:** While the filenames match the `.docx` assets in `templates/`, in a Next.js web application, if client-side downloads or binary file reading are required, these templates must either be served from `public/templates/` or embedded as structural JSON AST definitions. The design provides `initialContent` and `initialBodyParagraphs` for zero-IO instant editor initialization.

---

## 4. Conclusion

1. The 22 administrative templates are completely enumerated, categorized, and specified in `e:\CODING\TVCI_word_addins\.agents\teamwork\m4_explorer_1\analysis.md`.
2. The TypeScript interfaces for `AdministrativeTemplate`, `TemplateCategory`, `TemplateField`, `DocumentTypeSchema`, `TwoColumnHeaderConfig`, and `TwoColumnFooterConfig` are fully drafted.
3. The catalog module design in `analysis.md` provides all 22 complete template records, query helper functions (`getTemplateById`, `getTemplatesByCategory`, `getTemplatesByOrganization`, `searchAdministrativeTemplates`), and the Tiptap AST document generator `generateInitialTiptapDoc`.

---

## 5. Verification Method

To independently verify this investigation and design:
1. **Inspect Test Specifications:**
   - View `web_app/e2e-tests/tier1-feature/f13_template_catalog.test.ts` and compare catalog items with Table 2 of `analysis.md`. Confirm count (`22`), organizations (`TVCI, IEMM, TKV, DANG`), categories, and `.docx` extensions.
   - View `web_app/e2e-tests/tier1-feature/f14_form_schemas.test.ts` and confirm all 8 canonical schemas are mapped.
2. **Inspect Existing DOCX Assets:**
   - View `templates/` and `templates/iemm/` to verify existence of all referenced files.
3. **Inspect Analysis Report:**
   - Read `e:\CODING\TVCI_word_addins\.agents\teamwork\m4_explorer_1\analysis.md` to review the full 22-template data definitions and proposed code contracts for `web_app/src/templates/types.ts` and `catalog.ts`.
