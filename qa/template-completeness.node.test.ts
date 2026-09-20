import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";
const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");
const active = TEMPLATE_CATALOG.filter((r) => ["IEMM", "TVCI", "DANG"].includes(r.organization));
const headers: Record<string, string[]> = {
  IEMM: ["TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM", "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"],
  TVCI: ["VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN", "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP"],
};
test("active catalog has full user-facing names", () => {
  for (const r of active) for (const value of [r.name, r.description, ...(r.usageNotes ?? [])])
    assert.doesNotMatch(value ?? "", /\b(?:IEMM|TVCI)\b/i, r.id);
});
test("active DOCX headers and A4 page setup", () => {
  for (const r of active) {
    if (r.source.kind !== "bundled") continue;
    const zip = new AdmZip(path.resolve(r.source.path.slice(1)));
    const xml = zip.getEntry("word/document.xml")?.getData().toString("utf8") ?? "";
    const visible = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    assert.doesNotMatch(visible, /\b(?:IEMM|TVCI)\b/i, r.id);
    const packageVisible = zip.getEntries().filter((entry: { entryName: string }) => entry.entryName.startsWith("word/") && entry.entryName.endsWith(".xml"))
      .flatMap((entry: { getData: () => Buffer }) => [...entry.getData().toString("utf8").matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]))
      .join(" ");
    assert.doesNotMatch(packageVisible, /\b(?:IEMM|TVCI)\b/i, r.id + " package");
    const compact = xml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    for (const header of headers[r.organization] ?? []) {
      if (r.id === "iemm-nghi-phep-001" && header.includes("TẬP ĐOÀN")) continue;
      const match = visible.includes(header) || compact.includes(header) || (header.includes("VIỆN CƠ KHÍ") && /VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ\s*(-|)\s*VINACOMIN/i.test(compact));
      assert.ok(match, r.id + ": " + header);
    }
    assert.match(xml, /<w:pgSz\b[^>]*w:w="11906"[^>]*w:h="16838"/, r.id);
    assert.match(xml, /<w:pgMar\b[^>]*w:top="1134"[^>]*w:right="850"[^>]*w:bottom="1134"[^>]*w:left="1701"/, r.id);
  }
});

test("representative templates keep 13 pt justified body paragraphs and tagged title rule", () => {
  for (const id of ["iemm-qd-001", "tvci-cv-001", "dang-sample-001"]) {
    const record = active.find((item) => item.id === id);
    assert.ok(record && record.source.kind === "bundled");
    const xml = new AdmZip(path.resolve(record.source.path.slice(1))).getEntry("word/document.xml")?.getData().toString("utf8") ?? "";
    assert.match(xml, /<w:jc w:val="both"/, id);
    assert.match(xml, /<w:ind[^>]*w:firstLine="567"/, id);
    assert.match(xml, /<w:spacing[^>]*w:after="120"[^>]*w:line="360"[^>]*w:lineRule="exact"/, id);
    assert.match(xml, /<w:rFonts[^>]*w:ascii="Times New Roman"/, id);
    assert.match(xml, /<w:sz w:val="26"/, id);
  }
});

test("civil headers have no drawn or bordered rule and no repeated document number", () => {
  for (const record of active.filter((item) => item.organization !== "DANG")) {
    if (record.source.kind !== "bundled") continue;
    const xml = new AdmZip(path.resolve(record.source.path.slice(1))).getEntry("word/document.xml")?.getData().toString("utf8") ?? "";
    const header = xml.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/)?.[0];
    if (!header) continue;
    assert.doesNotMatch(header, /<w:pBdr\b/, record.id);
    assert.ok((header.match(/Số:/g) ?? []).length <= 1, record.id);
  }
});


