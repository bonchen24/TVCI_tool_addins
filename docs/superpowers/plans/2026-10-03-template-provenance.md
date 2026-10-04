# Generated Canonical Templates Implementation Plan

> **For agentic workers:** execute inline in this session with `superpowers:executing-plans`; use each task as a test and review checkpoint. Do not commit.

**Goal:** Generate 23 real IEMM/TKV/TVCI DOCX templates from one versioned rules specification, then verify their structure, semantics, deterministic bytes, runtime parity, and visual rendering before marking catalog entries verified.

**Architecture:** A versioned JSON file is the sole layout source. One Python generator creates deterministic canonical DOCX files and provenance; structural/semantic QA and a renderer gate determine whether canonical files can be copied byte-for-byte to existing runtime catalog paths. Catalogs and audit docs consume hashes and QA results, not Google Drive at runtime.

**Tech Stack:** Python 3.11, `python-docx` 1.2.0, Python `unittest`, OpenXML ZIP/XML inspection, existing Jest/Vitest application tests, LibreOffice or available DOCX renderer.

**Spec:** `docs/superpowers/specs/2026-10-03-template-provenance-design.md`

## Global Constraints

- `templates/specs/administrative-templates.v1.json` is the only source of layout/type rules.
- `scripts/generate-canonical-templates.py` is the only writer of `canonical_templates/generated/`.
- Canonical templates are never runtime assets; only byte-identical or explicitly content-control-derived copies may enter runtime paths.
- No old runtime DOCX is a generator input; only entity strings/field labels may be cross-checked against catalog metadata.
- No rule detail is invented when evidence is absent; record a source-specific note and use the NĐ30 baseline structure.
- Samples remain quarantined. The leave form is labeled `internally-defined`.
- Do not commit.

---

### Task 1: Replace the fail-closed contract with generated-canonical provenance

**Files:**
- Modify: `src/templates/provenance.ts`
- Modify: `src/templates/catalog.ts`
- Modify: `web_app/src/templates/types.ts`
- Modify: `web_app/src/templates/catalog.ts`
- Test: `tests/templates/generated-canonical-provenance.test.ts`
- Test: `web_app/tests/unit/template-provenance-guard.test.ts`

**Interfaces:**
- `TemplateVerification` gains a canonical-source variant `kind: "generated-canonical"` with `ruleSpecVersion`, `generatorVersion`, `generatorSha256`, `normativeSources`, `referenceSources`, `structuralQa`, `visualQa`, canonical SHA, runtime SHA, and comparison mode.
- `isOfficialTemplateVerified` accepts generated evidence only when both QA states pass and SHA-256 values/runtime comparison are present.

- [ ] Write failing tests: a generated canonical fixture with both QA gates and matching runtime hash is selectable; missing visual QA, stale hash, or non-byte-exact runtime is rejected; samples stay quarantined.
- [ ] Run `npm test -- tests/templates/generated-canonical-provenance.test.ts` and `npm --prefix web_app test -- --run tests/unit/template-provenance-guard.test.ts`; confirm failures are caused by missing generated evidence handling.
- [ ] Add the generated source type and minimal verifier checks; keep the external-canonical source kind supported.
- [ ] Rerun both focused suites and confirm pass.

### Task 2: Encode all common, organization, and type rules in one spec

**Files:**
- Create: `templates/specs/administrative-templates.v1.json`
- Create: `requirements-template-generator.txt`
- Test: `tests/templates/test_canonical_template_spec.py`

**Interfaces:**
- Spec top-level fields: `ruleSpecVersion`, `sources`, `commonStyle`, `organizations`, `documentTypes`, and `templates`.
- Each template row contains stable catalog ID, output filename, organization ID, type key, exact runtime path, required labels, forbidden labels, block schema, references, and source notes.

- [x] Write failing `unittest` checks for fixed A4/margins/font tokens, source IDs, distinct report/plan/general files, 20 IEMM types across both catalogs, the TKV decision, both TVCI types, and the `internally-defined` leave form.
- [x] Run `python -m unittest discover -s tests/templates -p "test_canonical_template_spec.py" -v`; confirm missing-spec failures.
- [x] Add the common style matrix and organization/type schemas. Use catalog legal-name strings exactly and record unresolved authority/header source notes.
- [ ] Pin `python-docx==1.2.0` in `requirements-template-generator.txt` and rerun the spec tests.

### Task 3: Implement the deterministic canonical generator

**Files:**
- Create: `scripts/generate-canonical-templates.py`
- Modify: `package.json`
- Test: `tests/templates/test_canonical_docx_generator.py`

**Interfaces:**
- `build_document(spec, template) -> Document` creates one DOCX from spec tokens.
- CLI `generate` writes only `canonical_templates/generated/*.docx` and `provenance.json`.
- CLI `sync-runtime` refuses to copy unless the manifest records passing structural, semantic, deterministic, and visual gates; then copies canonical bytes to spec-declared runtime paths.
- ZIP normalization sorts member names and fixes timestamps, flags, and permissions.

- [ ] Write failing tests for deterministic ZIP hashes, 23 unique outputs, expected template-specific labels, no generator output under `templates/`, and canonical-only writer ownership.
- [ ] Run `python -m unittest discover -s tests/templates -p "test_canonical_docx_generator.py" -v`; confirm expected missing-module failures.
- [ ] Implement the header grid, document-body blocks, recipient/signature tables, copy certification, page field with first-page suppression, visible placeholders, fixed core properties, ZIP normalization, and source/version/hash manifest.
- [ ] Run the generator tests twice and compare generated hashes; confirm expected hashes remain stable.

### Task 4: Add structural and per-type semantic QA

**Files:**
- Create: `scripts/verify-canonical-templates.py`
- Modify: `package.json`
- Test: `tests/templates/test_canonical_template_qa.py`

**Interfaces:**
- `verify_docx(path, template_spec) -> list[Finding]` opens ZIP/OpenXML and checks page/margins/default fonts, 2-column header geometry, text styles, rules, page field/first page, recipients/signature/copy regions, unique controls, and template-specific present/absent labels.
- `write_qa_manifest()` records structural, semantic, deterministic, and runtime-parity results and SHA-256 values; it does not mark visual QA passed.

- [ ] Write failing package tests for all 23 files plus negative fixtures for bad margins, duplicated control tags, a titled Công văn, a Quyết định missing Articles, a Tờ trình missing `Kính gửi`, and a Bản sao missing certification.
- [ ] Run `python -m unittest discover -s tests/templates -p "test_canonical_template_qa.py" -v`; confirm failures before implementation.
- [ ] Implement focused OpenXML checks and type-specific required/forbidden-block assertions.
- [ ] Run the focused QA suite and verify each negative fixture fails for its intended reason and every generated canonical passes.

### Task 5: Render representative DOCX files and gate visual status

**Files:**
- Create: `scripts/render-canonical-templates.py`
- Create: `qa/template-render-baselines/`
- Test: `tests/templates/test_canonical_template_rendering.py`

**Interfaces:**
- CLI `render --representative` renders IEMM decision, letter, proposal, notice, minutes, report, plan, copy, and TVCI letter/notice to PDFs and page images.
- Visual QA records renderer/version, page count, A4 geometry, image paths/hashes, and reviewed overlap/clipping result in the manifest.

- [ ] Write failing tests that visual status cannot pass without renderer identity, rendered PDFs/images, geometry assertions, and a checked representative list.
- [ ] Run the rendering tests and confirm they fail before report implementation.
- [ ] Implement the available renderer adapter (LibreOffice first; Microsoft Word COM if present), PDF page-size validation, PNG output, and a review report. If no renderer exists, visual QA stays `unverified` and no production runtime sync occurs.
- [ ] Render the requested representative set, inspect each page, capture baselines or geometry assertions, and record any remaining source/layout TODOs.

### Task 6: Generate and QA the complete canonical library

**Files:**
- Generate: `canonical_templates/generated/` (23 DOCX files + provenance/QA manifest)
- Test: all `tests/templates/test_canonical_template_*.py`

- [ ] Run `python scripts/generate-canonical-templates.py generate`.
- [ ] Run `python scripts/verify-canonical-templates.py --all`; fix any generated DOCX defect by first adding a failing regression fixture, then correcting the spec/generator.
- [ ] Run `python scripts/generate-canonical-templates.py verify-determinism` twice and confirm all canonical SHA-256 values remain unchanged.
- [ ] Confirm every canonical DOCX reopens with `python-docx` and ZIP/XML parsing; do not manually edit generated files.

### Task 7: Sync runtime bytes and update catalog/audit provenance

**Files:**
- Modify/generate: `templates/iemm/*.docx`
- Modify/generate: `templates/iemm-don-xin-nghi-phep-template.docx`
- Modify/generate: `templates/tvci-cong-van-template.docx`, `templates/tvci-thong-bao-template.docx`
- Modify: `src/templates/provenance.ts`, `src/templates/catalog.ts`
- Modify: `web_app/src/templates/types.ts`, `web_app/src/templates/catalog.ts`, web static-file routing if required
- Modify: `docs/template-audit.md`, `design.md`
- Test: `qa/source-backed-template-rules.node.test.ts`, `qa/template-audit.node.test.ts`, `qa/template-canonical-safety.node.test.ts`, `tests/templates/generated-canonical-provenance.test.ts`, web catalog/provenance tests

- [ ] Add a failing runtime test requiring canonical/runtime byte parity and matching manifest/catalog SHA values for every generated record.
- [ ] Run focused tests to confirm they reject the pre-migration no-canonical state.
- [ ] Run `python scripts/generate-canonical-templates.py sync-runtime`; require all QA gates pass before copying.
- [ ] Update the 17 IEMM catalog destinations to their individual output files, including separate report and plan paths; retain existing 2 TVCI catalog paths; leave sample assets quarantined.
- [ ] Align only web catalog records whose type/schema matches a generated file; direct their fetch paths to actual runtime copies without promoting unrelated/sample rows.
- [ ] Generate the audit matrix with rule-spec/generator versions, Drive IDs/source labels, canonical/runtime hashes, comparison mode, structural/semantic/render status, external-original absent note, and unresolved source notes.
- [ ] Rerun Office and web provenance/selectability/apply tests.

### Task 8: Run full migration verification and review worktree

**Files:**
- Read: all changed project files and generated manifest
- Verify: generator, QA/render, app/build/audit commands below

- [ ] Run `python -m unittest discover -s tests/templates -p "test_canonical_template_*.py" -v`.
- [ ] Run targeted QA: `npm run test:qa`.
- [ ] Run root and web app test suites: `npm test`, `npm --prefix web_app test -- --run`.
- [ ] Run `npm run typecheck`, `npm --prefix web_app run typecheck`, `npm run build`, and `npm run validate-manifest`.
- [ ] Run `git diff --check`; inspect the exact changed paths, generated/runtime hashes, status counts, representative render outputs, and ensure no commit was created.
