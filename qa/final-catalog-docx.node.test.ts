import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";
const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

const paths = [...new Map(TEMPLATE_CATALOG.filter((item) => item.source.kind === "bundled").map((item) => [item.source.path, item.organization])).entries()];
for (const [source, organization] of paths) {
  test(`FINAL DOCX ${source}`, () => {
    const zip = new AdmZip(path.resolve(source.slice(1)));
    const xml = zip.getEntry("word/document.xml")?.getData().toString("utf8") ?? "";
    const texts = [...xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(" ");
    assert.doesNotMatch(texts, /\b(?:IEMM|TVCI)\b/, source);
    assert.match(xml, /<w:pgSz\b[^>]*w:w="11906"[^>]*w:h="16838"/, source);
    for (const margin of ["top=\"1134\"", "bottom=\"1134\"", "left=\"1701\"", "right=\"850\""]) assert.match(xml.match(/<w:pgMar\b[^>]*>/)?.[0] ?? "", new RegExp(`w:${margin}`), source);
    if (organization === "IEMM") {
      assert.match(texts, /TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM/);
      assert.match(texts, /VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN/);
    }
    if (organization === "TVCI") {
      assert.match(texts, /VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN/);
      assert.match(texts, /TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP/);
    }
    if (organization !== "DANG") {
      assert.match(xml, /<v:line\b[^>]*z-index:1[^>]*strokeweight="0.5pt"/, `${source} needs a front-of-text line shape`);
      assert.doesNotMatch(xml, /<w:pBdr\b/, `${source} has a paragraph border`);
    }
    assert.doesNotMatch(texts, /\(Ký và ghi rõ họ tên\)/);
  });
}
