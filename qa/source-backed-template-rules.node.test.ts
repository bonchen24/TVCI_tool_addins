import test from "node:test";
import assert from "node:assert/strict";
import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";

function get(id: string) {
  const record = TEMPLATE_CATALOG.find((item) => item.id === id);
  assert.ok(record, `Missing ${id}`);
  return record;
}

test("IEMM catalog covers the main Viện forms listed in Phụ lục VII", () => {
  const types = new Set(TEMPLATE_CATALOG.filter((item) => item.organization === "IEMM").map((item) => item.documentType));
  for (const type of ["Quyết định", "Công văn", "Thông báo", "Tờ trình", "Biên bản", "Thư mời", "Báo cáo", "Kế hoạch", "Văn bản có tên loại"]) {
    assert.equal(types.has(type), true, `Missing IEMM ${type}`);
  }
});

test("source-backed templates expose symbol and usage guidance", () => {
  assert.equal(get("iemm-cv-001").symbolHint, "Số: …/VCNM-[ĐƠN VỊ]");
  assert.equal(get("tvci-cv-001").symbolHint, "Số: …/VCNM-TTTN");
  assert.match(get("iemm-to-trinh-noi-bo-001").usageNotes?.join(" ") ?? "", /không lấy số văn bản/i);
});

test("IEMM typography guidance is attached to source-backed templates", () => {
  assert.match(get("iemm-cv-001").usageNotes?.join(" ") ?? "", /trích yếu.*13/i);
  assert.match(get("iemm-tb-001").usageNotes?.join(" ") ?? "", /trích yếu.*13/i);
});
