import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";
import { PARTY_DOCUMENT_TYPES } from "../src/templates/party.ts";
import { searchTemplates, type TemplateRecord } from "../src/templates/library.ts";

test("party document library exposes the agreed default document types", () => {
  assert.deepEqual(PARTY_DOCUMENT_TYPES, [
    "Nghị quyết",
    "Quyết định",
    "Kế hoạch",
    "Báo cáo",
    "Thông báo",
    "Công văn",
    "Tờ trình",
    "Biên bản",
  ]);
});

test("catalog contains a bundled Party document template", () => {
  const item = TEMPLATE_CATALOG.find((record) => record.organization === "DANG");
  assert.ok(item);
  assert.equal(item?.department, "Văn bản Đảng");
});

test("Party templates support Vietnamese no-diacritic search", () => {
  const records: TemplateRecord[] = [{
    id: "dang-nghi-quyet-001",
    name: "Nghị quyết của Chi bộ",
    organization: "DANG",
    department: "Văn bản Đảng",
    documentType: "Nghị quyết",
    keywords: ["chi bộ", "nghị quyết", "đảng"],
    version: "1.0",
    status: "active",
    source: { kind: "bundled", path: "/templates/dang-sample.docx" },
  }];
  const result = searchTemplates(records, { organization: "DANG", query: "nghi quyet chi bo" });
  assert.equal(result[0]?.id, "dang-nghi-quyet-001");
});

test("taskpane shows Văn bản Đảng as a top-level template group", async () => {
  const source = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(source, /Đảng/);
  assert.match(source, /DANG/);
});

test("Party template builder keeps document type extensible beyond defaults", async () => {
  const source = await readFile(new URL("../src/templates/party.ts", import.meta.url), "utf8");
  assert.match(source, /PARTY_DOCUMENT_TYPES/);
});
