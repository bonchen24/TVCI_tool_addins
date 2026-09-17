import test from "node:test";
import assert from "node:assert/strict";
import { makeUserTemplateRecord } from "../src/templates/user-template.ts";

test("creates normalized user template metadata with searchable keywords", () => {
  const record = makeUserTemplateRecord({
    name: "Quyết định chứng nhận",
    organization: "TVCI",
    department: "PCN",
    documentType: "Quyết định",
    keywords: "GCN, san pham, chung nhan",
  }, "fixed-id", "2026-09-15T00:00:00.000Z");
  assert.equal(record.id, "fixed-id");
  assert.deepEqual(record.keywords, ["GCN", "san pham", "chung nhan"]);
  assert.deepEqual(record.source, { kind: "user", storageId: "fixed-id" });
  assert.equal(record.status, "active");
});

test("rejects a user template without a name", () => {
  assert.throws(() => makeUserTemplateRecord({
    name: " ", organization: "IEMM", department: "", documentType: "Biểu mẫu", keywords: ""
  }), /Tên biểu mẫu/);
});

import { updateUserTemplateRecord } from "../src/templates/user-template.ts";

test("updates user template metadata while preserving id source and updatedAt", () => {
  const original = makeUserTemplateRecord({
    name: "Mẫu cũ", organization: "TVCI", department: "Văn bản chung", documentType: "Công văn", keywords: "cu"
  }, "fixed-id", "2026-09-15T00:00:00.000Z");
  const updated = updateUserTemplateRecord(original, {
    name: "Mẫu mới",
    department: "PTN Vật liệu",
    documentType: "Biên bản",
    version: "2.1",
    keywords: "vat lieu, bien ban",
    description: "Mô tả mới",
  }, "2026-09-16T00:00:00.000Z");
  assert.equal(updated.id, "fixed-id");
  assert.deepEqual(updated.source, { kind: "user", storageId: "fixed-id" });
  assert.equal(updated.name, "Mẫu mới");
  assert.equal(updated.department, "PTN Vật liệu");
  assert.equal(updated.documentType, "Biên bản");
  assert.equal(updated.version, "2.1");
  assert.deepEqual(updated.keywords, ["vat lieu", "bien ban"]);
  assert.equal(updated.description, "Mô tả mới");
  assert.equal(updated.updatedAt, "2026-09-16T00:00:00.000Z");
});
