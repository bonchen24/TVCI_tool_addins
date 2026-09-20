import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

const repoRoot = process.cwd();

const IEMM_SOURCE_TEMPLATES = [
  ["iemm-qd-001", "Quyết định cá biệt của Viện", "/templates/iemm/01-quyet-dinh-ca-biet.docx"],
  ["iemm-qd-ban-hanh-001", "Quyết định ban hành hoặc phê duyệt văn bản của Viện", "/templates/iemm/02-quyet-dinh-ban-hanh-van-ban.docx"],
  ["iemm-quy-che-001", "Quy chế, quy định của Viện", "/templates/iemm/03-quy-che-quy-dinh.docx"],
  ["iemm-van-ban-kem-quyet-dinh-001", "Văn bản ban hành kèm theo quyết định của Viện", "/templates/iemm/04-van-ban-ban-hanh-kem-theo-quyet-dinh.docx"],
  ["iemm-cv-001", "Công văn hành chính của Viện", "/templates/iemm/05-cong-van-hanh-chinh.docx"],
  ["iemm-tb-001", "Thông báo nội bộ của Viện", "/templates/iemm/06-thong-bao-noi-bo-vien.docx"],
  ["iemm-tt-001", "Tờ trình của Viện gửi cấp trên", "/templates/iemm/07-to-trinh-cua-vien.docx"],
  ["iemm-to-trinh-noi-bo-001", "Tờ trình của đơn vị gửi Viện", "/templates/iemm/08-to-trinh-cua-don-vi-gui-vien.docx"],
  ["iemm-bb-001", "Biên bản của Viện", "/templates/iemm/09-bien-ban.docx"],
  ["iemm-van-ban-co-ten-loai-001", "Văn bản hành chính chung của Viện", "/templates/iemm/10-van-ban-chung.docx"],
  ["iemm-ban-sao-001", "Bản sao văn bản của Viện", "/templates/iemm/11-ban-sao-van-ban.docx"],
  ["iemm-thu-moi-001", "Thư mời họp của Viện", "/templates/iemm/12-thu-moi-hop.docx"],
  ["iemm-thu-hoan-hop-001", "Thư báo hoãn họp của Viện", "/templates/iemm/13-thu-bao-hoan-hop.docx"],
  ["iemm-cong-van-dinh-chinh-001", "Công văn đính chính văn bản của Viện", "/templates/iemm/14-cong-van-dinh-chinh.docx"],
] as const;

function bundledTemplate(id: string) {
  const record = TEMPLATE_CATALOG.find((item) => item.id === id);
  assert.ok(record, `Missing template ${id}`);
  assert.equal(record.source.kind, "bundled");
  const absolutePath = path.join(repoRoot, record.source.path.replace(/^\//, ""));
  assert.equal(fs.existsSync(absolutePath), true, `${absolutePath} should exist`);
  return record;
}

test("catalog contains bundled templates derived from attached Viện sources", () => {
  const iemmCongVan = bundledTemplate("iemm-cv-001");
  const iemmNghiPhep = bundledTemplate("iemm-nghi-phep-001");
  const tvciCongVan = bundledTemplate("tvci-cv-001");

  assert.ok(iemmCongVan.referenceSources?.includes("4. Mau Chi tiet van ban cua Vien (PLVII) Quy che van thu Vien.doc"));
  assert.ok(iemmNghiPhep.referenceSources?.includes("Mau don xin nghi- Ky HD.doc"));
  assert.ok(tvciCongVan.referenceSources?.includes("1. Quy che Chinh ve Cong tac van thu cua Vien.doc"));
});

test("catalog offers starter templates for IEMM, TVCI and Văn bản Đảng", () => {
  const organizations = new Set(TEMPLATE_CATALOG.map((item) => item.organization));
  assert.deepEqual([...organizations].sort(), ["DANG", "IEMM", "TVCI"]);
});

test("IEMM catalog includes the complete source-backed administrative template set", () => {
  for (const [id, name, sourcePath] of IEMM_SOURCE_TEMPLATES) {
    const record = bundledTemplate(id);
    assert.equal(record.organization, "IEMM");
    assert.equal(record.name, name);
    assert.equal(record.source.path, sourcePath);
    assert.ok(record.referenceSources?.some((source) => /Phụ lục VII|Mẫu văn bản hành chính/i.test(source)));
  }
});

test("source-backed IEMM DOCX template payloads are present and non-empty", () => {
  for (const [, , sourcePath] of IEMM_SOURCE_TEMPLATES) {
    const absolutePath = path.join(repoRoot, sourcePath.replace(/^\//, ""));
    const payload = fs.readFileSync(absolutePath);
    assert.equal(payload.subarray(0, 4).toString("latin1"), "PK\u0003\u0004");
    assert.ok(payload.length > 10_000, `${sourcePath} should contain a complete DOCX package`);
  }
});

test("source-backed IEMM DOCX templates use IEMM footer branding", () => {
  for (const [, , sourcePath] of IEMM_SOURCE_TEMPLATES) {
    const absolutePath = path.join(repoRoot, sourcePath.replace(/^\//, ""));
    const zip = new AdmZip(absolutePath);
    const footerXml = zip.getEntries()
      .filter((entry: { entryName: string }) => /^word\/footer\d+\.xml$/.test(entry.entryName))
      .map((entry: { getData: () => Buffer }) => entry.getData().toString("utf8"))
      .join("\n");
    assert.match(footerXml, /Viện Cơ khí Năng lượng và Mỏ/);
  }
});
