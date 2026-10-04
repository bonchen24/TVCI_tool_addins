# Generated Canonical Template System — Design

## Goal

Build real, usable DOCX templates from versioned formatting rules and document-type schemas. A generated DOCX is a canonical system artifact when its source rules, generator, file hash, structural checks, semantic checks, and visual checks are recorded and pass. An external canonical DOCX remains an optional future input, not a prerequisite.

## Architecture decision

Use one versioned JSON specification as the only layout source, a deterministic Python generator (`python-docx` plus controlled OpenXML), and a read-only QA toolchain. The generator is the only writer of `canonical_templates/generated/`; after canonical QA, exact-byte runtime copies are placed at catalog paths under `templates/`. Existing repair/normalization scripts remain forbidden from the canonical tree and are not part of generation.

The alternatives were (1) keep external DOCX as the sole canonical authority (rejected because no source DOCX set exists), (2) put layout values separately in each generator/script (rejected because drift becomes likely), and (3) use one versioned rule spec and deterministic generator (chosen because one rule change can be reviewed, re-generated, and fingerprinted consistently).

## Pipeline

```text
Normative/reference sources
        ↓ encoded once
templates/specs/administrative-templates.v1.json
        ↓ scripts/generate-canonical-templates.py
canonical_templates/generated/*.docx + provenance.json
        ↓ structural + semantic + render QA
templates/<existing catalog paths>/*.docx (byte-identical runtime copies)
        ↓ hashes and evidence
Office catalog + web catalog + docs/template-audit.md
```

The JSON spec carries `ruleSpecVersion`, common page and typography tokens, organization header tokens, per-type block schemas, normative source labels and Drive IDs, unresolved source notes, runtime destinations, and per-template semantic requirements. `generatorVersion` is recorded in the output manifest. SHA-256 is calculated from the normalized DOCX bytes. DOCX ZIP members are sorted and receive fixed timestamps/permissions so a same-version regeneration produces the same hash.

## Encoded base rules

The common administrative profile is A4 portrait, margins top 20 mm / bottom 20 mm / left 30 mm / right 15 mm, Times New Roman, Unicode, black, body 13 pt, justified, 1.2 line spacing, first-line indent 10 mm, and 2 pt before/after. Those fixed values fall within Nghị định 30/2020/NĐ-CP Appendix I ranges supplied for the project. The exact values live only in JSON.

The same token set defines the non-overflowing two-column header, organization and issuing-agency capitalization/weight, national heading and motto, motto and agency rules, number and symbol, italic place/date, document title/summary, recipients, signer, copy certification, page field, and paragraph spacing. Header columns are proportioned within usable page width and wrap naturally; the generator does not force body text widths or signature heights. Page number uses a Word PAGE field, centered at the top in 13 pt, with a distinct first-page header that omits the number.

## Organizations and sources

IEMM uses the catalog's legal-name string `Viện Cơ khí Năng lượng và Mỏ - Vinacomin`; the exact superior-agency header string is not established from the available repository materials and remains a named source note. TVCI uses catalog names and the current catalog rule that its Công văn uses `/VCNM-TTTN` and is issued under the Institute's form; any conflicting legacy sample layout is not authoritative. TKV organization strings are copied only where an existing catalog or rule source provides them; no replacement legal name is invented.

Normative/source metadata in the spec includes:

- Nghị định 30/2020/NĐ-CP, Appendix I, as common baseline.
- IEMM QĐ 731-2023, Appendix VII; Appendix IV; main record-retention/correspondence regulation; the Institute's specific administrative-document rules and type-by-type guidance. The supplied Drive regulation file ID is `1QixLiN0n_2coMWTakVKF2VjDA1hK5Xok`; existing audit metadata retains IDs for individual appendix/reference files where provided.
- TKV QĐ 1456/QĐ-TKV (2026) and appendices 1–4, with Drive parent/file ID `1mD8LuhIR3r6_mVGgUWxu2ujCAqAsgcMH`; Circular/guidance 586/2021 and historical 2018 sample are lower-priority references only where not superseded. The supplied IDs are recorded as source metadata; Drive is never a runtime dependency.
- Leave request is explicitly `internally-defined`, not a form required by statute.

Where the referenced internal document bytes or a detail are not available, the spec retains source metadata and a specific TODO, uses NĐ30-compatible layout, and does not claim that the unavailable detail was observed. These limitations are visible in `docs/template-audit.md`.

## Document schemas

Each requested type is a separate generated file with its own block sequence and labels: the 17 catalogued IEMM types, three additional web-catalogued IEMM types (work program, introduction letter, commitment), a TKV decision from the existing web catalog, and two TVCI types. A letter has no document-type title and has a `V/v` subject; decisions include `QUYẾT ĐỊNH:` and Articles 1–3; proposals include `Kính gửi`; copy forms include a copy certification area; report and plan do not share one file. TVCI Công văn and Thông báo have distinct files and type schemas. Samples stay quarantined.

All dynamic text is represented by visible brace placeholders or structured repeat rows, including `{SO_VAN_BAN}`, `{KY_HIEU}`, `{DIA_DANH}`, `{NGAY_THANG}`, `{TRICH_YEU}`, `{NOI_DUNG}`, `{CHUC_VU_NGUOI_KY}`, `{HO_TEN_NGUOI_KY}`, and `{NOI_NHAN}`. They remain in-line and do not create fixed-height boxes. Canonical masters contain no content controls; the runtime copy is byte-identical. Content controls may be introduced later only as a documented `content-controls-only` derived runtime transformation.

## Provenance and status

`TemplateVerification` supports `generated-canonical` as well as future external canonical evidence. Generated evidence records rule-spec version, generator version/hash, normative and reference sources, canonical path/hash, QA report/hash, runtime path/hash, and comparison (`byte-exact` or `content-controls-only`). `verified` requires source-rule mapping, all listed static/layout tests, per-type semantic checks, deterministic regeneration, runtime parity, and passing render/geometry QA. Missing source detail is reported as a limitation and must not be described as source-verified. External-original absence is informational, not a failure. Generic samples remain quarantined.

## QA and migration

Structural QA opens each ZIP/OpenXML package and checks page size/margins/fonts, header cell geometry and borders, required text/style/alignment, page-number field and first-page suppression, recipient/signature/copy blocks, placeholder run behavior, and content-control uniqueness. Semantic QA asserts required and forbidden blocks per type. Determinism regenerates into a temporary directory twice and compares SHA-256. Runtime parity compares full DOCX bytes. Visual QA renders every DOCX where supported and at minimum the representative IEMM and TVCI set required by the request; PDF page geometry and rendered images are checked for clipping/overlap, header balance, recipient/signature collisions, and correct page numbering. Existing app tests, typecheck, web-app tests, production build, manifest validation, and `git diff --check` complete migration verification.

Legacy runtime DOCX files may be read only for existing display/entity strings and fields. They are never generator inputs or canonical masters. Once generated artifacts pass QA, the generator copies each one to the existing runtime path and catalogs receive their hashes/evidence. Report/quarantine counts distinguish generated canonical status from `external-original absent`.
