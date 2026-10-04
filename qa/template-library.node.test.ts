import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVietnamese, searchTemplates, selectSelectableTemplatesById, type TemplateRecord } from "../src/templates/library.ts";

const records: TemplateRecord[] = [
  {
    id: "tvci-pcn-qd-001",
    name: "Quyết định chứng nhận sản phẩm",
    organization: "TVCI",
    department: "PCN",
    documentType: "Quyết định",
    keywords: ["GCN", "chứng nhận", "sản phẩm"],
    source: { kind: "bundled", path: "/templates/sample-template.docx" },
    version: "2.0",
    status: "active",
  },
  {
    id: "iemm-cv-001",
    name: "Công văn đề nghị bổ sung hồ sơ",
    organization: "IEMM",
    department: "Văn phòng",
    documentType: "Công văn",
    keywords: ["bổ sung hồ sơ", "công văn"],
    source: { kind: "bundled", path: "/templates/sample-template.docx" },
    version: "1.0",
    status: "active",
  },
  {
    id: "tkv-bb-001",
    name: "Biên bản kiểm tra",
    organization: "TKV",
    department: "Kỹ thuật",
    documentType: "Biên bản",
    keywords: ["kiểm tra"],
    source: { kind: "bundled", path: "/templates/sample-template.docx" },
    version: "1.0",
    status: "active",
  },
];

const selectableRecords: TemplateRecord[] = records.map((record) => {
  const hash = "a".repeat(64);
  return {
    ...record,
    verification: {
      status: "verified",
      reason: "Test-only complete provenance fixture.",
      canonicalSource: {
        kind: "official-canonical-docx",
        name: "Test canonical DOCX",
        path: `/canonical_templates/tests/${record.id}.docx`,
        sha256: hash,
      },
      runtime: {
        path: record.source.path,
        sha256: hash,
        derivedFromCanonicalSha256: hash,
        comparison: "byte-exact",
      },
    },
  };
});

test("normalizes Vietnamese diacritics including đ", () => {
  assert.equal(normalizeVietnamese("Quyết định ĐIỀU CHỈNH"), "quyet dinh dieu chinh");
});

test("search finds Vietnamese template using no-diacritic query", () => {
  const result = searchTemplates(selectableRecords, { organization: "TVCI", query: "quyet dinh chung nhan" });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "tvci-pcn-qd-001");
});

test("search uses keywords and organization tab", () => {
  const result = searchTemplates(selectableRecords, { organization: "TVCI", query: "gcn" });
  assert.deepEqual(result.map((item) => item.id), ["tvci-pcn-qd-001"]);
  assert.equal(searchTemplates(selectableRecords, { organization: "IEMM", query: "gcn" }).length, 0);
});

test("search tolerates a small typo", () => {
  const result = searchTemplates(selectableRecords, { organization: "TVCI", query: "quyet dinh chung nhn" });
  assert.equal(result[0]?.id, "tvci-pcn-qd-001");
});

test("filters by department and document type", () => {
  const result = searchTemplates(selectableRecords, { organization: "IEMM", department: "Văn phòng", documentType: "Công văn", query: "" });
  assert.deepEqual(result.map((item) => item.id), ["iemm-cv-001"]);
});

test("favorite and recent IDs resolve only to selectable records", () => {
  const result = selectSelectableTemplatesById([...records, selectableRecords[0]], [records[1].id, selectableRecords[0].id]);
  assert.deepEqual(result.map((item) => item.id), [selectableRecords[0].id]);
});

test("normal search hides bundled records without verified provenance", () => {
  assert.deepEqual(searchTemplates(records, {}), []);
});
