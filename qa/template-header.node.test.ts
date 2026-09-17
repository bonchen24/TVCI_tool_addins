import { TEMPLATE_CATALOG } from "../src/templates/catalog.ts";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

const templateRoot = path.resolve("templates");

function listDocxFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listDocxFiles(entryPath);
    return entry.name.endsWith(".docx") ? [entryPath] : [];
  });
}

const civilTemplatePaths = [...new Set(TEMPLATE_CATALOG
  .filter((item) => item.organization === "IEMM" || item.organization === "TVCI")
  .filter((item) => item.source.kind === "bundled")
  .map((item) => path.resolve(item.source.path.slice(1))))].sort();

function firstDocumentTableXml(filePath: string): string {
  const zip = new AdmZip(filePath);
  const documentXml = zip.getEntry("word/document.xml")?.getData().toString("utf8") ?? "";
  const tableXml = documentXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/)?.[0];
  assert.ok(tableXml, `${filePath} must expose a first-page header table`);
  return tableXml;
}

function documentParagraphTexts(filePath: string): string[] {
  const zip = new AdmZip(filePath);
  const documentXml = zip.getEntry("word/document.xml")?.getData().toString("utf8") ?? "";
  return [...documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((paragraphMatch) =>
    [...paragraphMatch[0].matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((textMatch) => textMatch[1])
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  );
}

function documentParagraphXmls(filePath: string): string[] {
  const zip = new AdmZip(filePath);
  const documentXml = zip.getEntry("word/document.xml")?.getData().toString("utf8") ?? "";
  return [...documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => match[0]);
}

function documentTableXmls(filePath: string): string[] {
  const zip = new AdmZip(filePath);
  const documentXml = zip.getEntry("word/document.xml")?.getData().toString("utf8") ?? "";
  return [...documentXml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)].map((match) => match[0]);
}

function tableCellXmls(tableXml: string): string[] {
  return [...tableXml.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((match) => match[0]);
}

function cellParagraphTexts(cellXml: string): string[] {
  return [...cellXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((paragraphMatch) =>
    [...paragraphMatch[0].matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((textMatch) => textMatch[1])
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  );
}

test("all non-Party bundled templates use the IEMM administrative header identity", () => {
  assert.equal(civilTemplatePaths.length, 30);

  for (const filePath of civilTemplatePaths) {
    const headerXml = firstDocumentTableXml(filePath);
    for (const expectedText of [
      "TẬP ĐOÀN CÔNG NGHIỆP",
      "THAN - KHOÁNG SẢN VIỆT NAM",
      "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ",
      "VINACOMIN",
      "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập - Tự do - Hạnh phúc",
    ]) {
      assert.match(headerXml, new RegExp(expectedText), path.relative(process.cwd(), filePath));
    }
    assert.match(headerXml, /<w:tblGrid>/);
    assert.match(headerXml, /<w:tc[\s\S]*?<w:tc[\s\S]*?<\/w:tr>/);
  }
});

test("national header keeps the prominent first line and a centered motto rule", () => {
  for (const filePath of civilTemplatePaths) {
    const headerXml = firstDocumentTableXml(filePath);
    const headerCells = tableCellXmls(headerXml);
    assert.ok(headerCells.length >= 2, `${filePath} must expose the two header columns`);
    const rightCell = headerCells[1];
    const paragraphs = cellParagraphTexts(rightCell).filter((text) => text.trim());

    assert.equal(paragraphs[0], "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", filePath);
    assert.equal(paragraphs[1], "Độc lập - Tự do - Hạnh phúc", filePath);
    for (const expectedText of ["CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", "Độc lập - Tự do - Hạnh phúc"]) {
      const paragraph = rightCell.match(
        new RegExp(`<w:p\\b[\\s\\S]*?<w:t[^>]*>${expectedText}[\\s\\S]*?<\\/w:p>`),
      )?.[0] ?? "";
      assert.match(paragraph, /<w:jc\s+w:val="center"\s*\/>/, `${filePath} must center ${expectedText}`);
      assert.match(paragraph, /<w:sz\s+w:val="26"\s*\/>/, `${filePath} must use 13pt for ${expectedText}`);
      assert.match(paragraph, /<w:b\s*\/>/, `${filePath} must bold ${expectedText}`);
    }
    assert.match(rightCell, /TVCI_HRULE:NATIONAL_MOTTO/);
    assert.match(rightCell, /<[^>]*:docPr[^>]*name="National motto rule"/);
    assert.match(rightCell, /<wp:anchor[^>]*behindDoc="0"/);
    assert.match(rightCell, /<wp:extent[^>]*cx="2000250"[^>]*cy="6350"/);
    assert.match(
      rightCell,
      /Độc lập - Tự do - Hạnh phúc[\s\S]*?TVCI_HRULE:NATIONAL_MOTTO[\s\S]*?Hà Nội|Độc lập - Tự do - Hạnh phúc[\s\S]*?TVCI_HRULE:NATIONAL_MOTTO/,
      `${path.relative(process.cwd(), filePath)} must place the motto rule below the motto`,
    );
  }
});

test("sender header block uses single line spacing", () => {
  for (const filePath of civilTemplatePaths) {
    const leftCell = tableCellXmls(firstDocumentTableXml(filePath))[0] ?? "";
    const paragraphs = [...leftCell.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => match[0]);

    for (const paragraph of paragraphs) {
      const text = [...paragraph.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((match) => match[1])
        .join("")
        .trim();
      if (!text) continue;
      assert.match(paragraph, /<w:spacing\b[^>]*w:line="240"/, `${path.basename(filePath)}: ${text}`);
      assert.match(paragraph, /<w:spacing\b[^>]*w:lineRule="auto"/, `${path.basename(filePath)}: ${text}`);
    }
  }
});

test("archive line in the recipient block uses single line spacing", () => {
  let archiveCount = 0;

  for (const filePath of civilTemplatePaths) {
    for (const paragraph of documentParagraphXmls(filePath)) {
      const text = [...paragraph.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((match) => match[1])
        .join("")
        .trim();
      if (!/^Lưu\s*:/i.test(text)) continue;

      archiveCount += 1;
      assert.match(paragraph, /<w:spacing\b[^>]*w:line="240"/, `${path.basename(filePath)}: ${text}`);
      assert.match(paragraph, /<w:spacing\b[^>]*w:lineRule="auto"/, `${path.basename(filePath)}: ${text}`);
    }
  }

  assert.ok(archiveCount >= 10);
});

test("IEMM header rules use a thin line weight", () => {
  for (const filePath of civilTemplatePaths) {
    const headerXml = firstDocumentTableXml(filePath);
    const ruleExtents = [...headerXml.matchAll(/<[^>]*:extent\b[^>]*\bcy="([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(
      ruleExtents,
      ["9000", "6350"],
      `${path.relative(process.cwd(), filePath)} should keep the left-column rule and the motto rule`,
    );
  }
});

test("document-number placeholders reserve handwriting space and use a leading slash", () => {
  let numberPlaceholderCount = 0;
  for (const filePath of civilTemplatePaths) {
    for (const paragraphText of documentParagraphTexts(filePath).filter((text) => text.startsWith("Số:"))) {
      numberPlaceholderCount += 1;
      assert.match(paragraphText, /^Số: {5,}\/\S+/, path.relative(process.cwd(), filePath));
      assert.doesNotMatch(paragraphText, /…/, path.relative(process.cwd(), filePath));
    }
  }
  assert.ok(numberPlaceholderCount >= 10);
});

test("header number and V/v share the centered agency column", () => {
  let numberCount = 0;
  const vvFiles: string[] = [];

  for (const filePath of civilTemplatePaths) {
    const tableXml = documentTableXmls(filePath).find((candidate) => candidate.includes("Số:"));
    if (!tableXml) continue;
    const numberTable = tableXml;
    const numberCell = tableCellXmls(numberTable).find((cellXml) => cellXml.includes("Số:"));
    assert.ok(numberCell, `${filePath} must place Số in a table cell`);

    const numberParagraph = numberCell.match(/<w:p\b[\s\S]*?<w:t[^>]*>Số:/)?.[0];
    assert.ok(numberParagraph, `${filePath} must expose the Số paragraph`);
    assert.match(numberParagraph, /<w:jc\s+w:val="center"\s*\/>/, path.relative(process.cwd(), filePath));
    numberCount += 1;

    const paragraphs = cellParagraphTexts(numberCell);
    const numberIndex = paragraphs.findIndex((text) => text.startsWith("Số:"));
    const documentParagraphs = documentParagraphTexts(filePath);
    if (documentParagraphs.some((text) => text.startsWith("V/v"))) {
      vvFiles.push(path.basename(filePath));
      assert.equal(paragraphs[numberIndex + 1]?.startsWith("V/v"), true, `${filePath} must put V/v below Số`);
      assert.match(
        numberCell.match(/<w:p\b[\s\S]*?<w:t[^>]*>V\/v[\s\S]*?<\/w:p>/)?.[0] ?? "",
        /<w:jc\s+w:val="center"\s*\/>/,
        `${filePath} V/v must be centered with Số`,
      );
    }
  }

  assert.ok(numberCount >= 10);
  assert.deepEqual(vvFiles, [
    "iemm-cong-van-template.docx",
    "iemm-thu-moi-template.docx",
    "05-cong-van-hanh-chinh.docx",
    "06-thong-bao-noi-bo-vien.docx",
    "14-cong-van-dinh-chinh.docx",
    "tvci-cong-van-template.docx",
  ]);
});

test("header date area has no underscore rule above the date", () => {
  for (const filePath of civilTemplatePaths) {
    const firstTable = firstDocumentTableXml(filePath);
    const headerCells = tableCellXmls(firstTable);
    if (headerCells.length < 2) continue;
    const rightCell = headerCells[1];
    assert.doesNotMatch(
      rightCell,
      /Header rule|<[^>]*:extent\b[^>]*\bcy="9000"|<w:t[^>]*>_{5,}<\/w:t>/,
      `${path.relative(process.cwd(), filePath)} must not draw a rule above the date`,
    );
  }
});

test("IEMM notice templates use the requested VCKM-TB symbol format", () => {
  for (const filePath of civilTemplatePaths.filter((filePath) =>
    [
      "06-thong-bao-noi-bo-vien.docx",
      "iemm-thong-bao-template.docx",
      "tvci-thong-bao-template.docx",
    ].includes(path.basename(filePath)),
  )) {
    const numberText = documentParagraphTexts(filePath).find((text) => text.startsWith("Số:"));
    assert.equal(numberText, "Số:       /VCKM-TB", path.relative(process.cwd(), filePath));
  }
});

test("template addressee layout keeps one recipient inline and aligns multiple recipients", () => {
  const inlineExpectations = new Map([
    ["iemm-thong-bao-template.docx", "Kính gửi: Các đơn vị trong Viện"],
    ["iemm-thu-moi-template.docx", "Kính gửi: ………………………………………………………………………"],
    ["iemm-to-trinh-noi-bo-template.docx", "Kính gửi: Viện trưởng Viện Cơ khí Năng lượng và Mỏ - VINACOMIN"],
    ["iemm-to-trinh-template.docx", "Kính gửi: ………………………………………………………………………"],
    ["tvci-thong-bao-template.docx", "Kính gửi: Các đơn vị/cá nhân có liên quan"],
  ]);
  for (const [fileName, expected] of inlineExpectations) {
    const filePath = path.join(templateRoot, fileName);
    const actual = documentParagraphTexts(filePath).find((text) => text.startsWith("Kính gửi:"));
    assert.equal(actual, expected, fileName);
  }

  const multiplePath = path.join(templateRoot, "iemm-don-xin-nghi-phep-template.docx");
  const multipleParagraphs = documentParagraphTexts(multiplePath);
  const multipleIndex = multipleParagraphs.findIndex((text) => text.startsWith("Kính gửi:"));
  assert.equal(multipleParagraphs[multipleIndex], "Kính gửi:");
  assert.deepEqual(multipleParagraphs.slice(multipleIndex + 1, multipleIndex + 3), [
    "- Viện trưởng Viện Cơ khí Năng lượng và Mỏ - VINACOMIN;",
    "- Trưởng phòng Tổ chức - Hành chính.",
  ]);

  for (const fileName of ["iemm-cong-van-template.docx", "tvci-cong-van-template.docx"]) {
    const paragraphs = documentParagraphTexts(path.join(templateRoot, fileName));
    const index = paragraphs.findIndex((text) => text.startsWith("Kính gửi:"));
    assert.equal(paragraphs[index], "Kính gửi:", fileName);
    assert.match(paragraphs[index + 1] ?? "", /^-\s+/);
    assert.match(paragraphs[index + 2] ?? "", /^-\s+/);
  }
});

test("Party starter template keeps its separate document identity", () => {
  const partyXml = new AdmZip(path.join(templateRoot, "dang-sample.docx"))
    .getEntry("word/document.xml")
    ?.getData()
    .toString("utf8");
  assert.ok(partyXml);
  assert.match(partyXml, /VĂN BẢN ĐẢNG MẪU/);
  assert.doesNotMatch(partyXml, /VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ/);
});
