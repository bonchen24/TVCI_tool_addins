import test from "node:test";
import assert from "node:assert/strict";
import { classifyDocumentComponents } from "../src/rules/component-classifier.ts";
import { getComponentRule } from "../src/rules/component-rules.ts";
import { validateComponentParagraph } from "../src/rules/component-validator.ts";
import type { ParagraphSnapshot } from "../src/rules/models.ts";

test("recognizes major NĐ30 administrative document components", () => {
  const lines = [
    "TRUNG TÂM TVCI",
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    "Độc lập - Tự do - Hạnh phúc",
    "Số: 12/QĐ-TVCI",
    "Hà Nội, ngày 15 tháng 9 năm 2026",
    "QUYẾT ĐỊNH",
    "Về việc ban hành quy trình nội bộ",
    "Điều 1. Ban hành kèm theo Quyết định này...",
    "Nơi nhận:",
    "GIÁM ĐỐC",
  ];
  const found = classifyDocumentComponents(lines, "ADMINISTRATIVE");
  const byType = new Map(found.map((item) => [item.type, item.paragraphIndex]));
  assert.equal(byType.get("NATIONAL_EMBLEM"), 1);
  assert.equal(byType.get("MOTTO"), 2);
  assert.equal(byType.get("NUMBER_SYMBOL"), 3);
  assert.equal(byType.get("PLACE_DATE"), 4);
  assert.equal(byType.get("DOCUMENT_TYPE"), 5);
  assert.equal(byType.get("ABSTRACT"), 6);
  assert.equal(byType.get("RECIPIENTS"), 8);
  assert.equal(byType.get("SIGNER_ROLE"), 9);
});

test("recognizes major Party document components", () => {
  const lines = [
    "ĐẢNG BỘ TỈNH HÀ NỘI",
    "ĐẢNG CỘNG SẢN VIỆT NAM",
    "Số 127-QĐ/TW",
    "Hà Nội, ngày 20 tháng 10 năm 2026",
    "BÁO CÁO",
    "kết quả thực hiện nhiệm vụ quý III",
    "Nội dung báo cáo...",
    "Nơi nhận:",
    "T/M BAN THƯỜNG VỤ",
  ];
  const found = classifyDocumentComponents(lines, "PARTY");
  const byType = new Map(found.map((item) => [item.type, item.paragraphIndex]));
  assert.equal(byType.get("PARTY_TITLE"), 1);
  assert.equal(byType.get("AGENCY_NAME"), 0);
  assert.equal(byType.get("NUMBER_SYMBOL"), 2);
  assert.equal(byType.get("PLACE_DATE"), 3);
  assert.equal(byType.get("DOCUMENT_TYPE"), 4);
  assert.equal(byType.get("ABSTRACT"), 5);
  assert.equal(byType.get("RECIPIENTS"), 7);
  assert.equal(byType.get("SIGNER_ROLE"), 8);
});

test("component rules expose exact/range typography instead of one body rule", () => {
  const national = getComponentRule("NĐ30_TVCI", "NATIONAL_EMBLEM");
  assert.deepEqual(national.fontSize, { min: 12, max: 13, target: 12 });
  assert.equal(national.bold, true);
  assert.equal(national.alignment, "Centered");

  const partyTitle = getComponentRule("DANG_05_HD_VPTW_2026", "PARTY_TITLE");
  assert.equal(partyTitle.fontSize, 13);
  assert.equal(partyTitle.bold, true);
});

test("validates component-specific bold italic size and alignment", () => {
  const snapshot: ParagraphSnapshot = {
    id: "doc:p:4",
    text: "Hà Nội, ngày 15 tháng 9 năm 2026",
    fontName: "Arial",
    fontSize: 12,
    bold: true,
    italic: false,
    alignment: "Left",
    spaceBefore: 0,
    spaceAfter: 0,
  };
  const rule = getComponentRule("NĐ30_TVCI", "PLACE_DATE");
  const issues = validateComponentParagraph(snapshot, "PLACE_DATE", rule);
  assert.deepEqual(issues.map((issue) => issue.ruleId), [
    "component.PLACE_DATE.fontName",
    "component.PLACE_DATE.fontSize",
    "component.PLACE_DATE.italic",
    "component.PLACE_DATE.alignment",
  ]);
  assert.ok(issues.every((issue) => issue.message.includes("Địa danh và ngày tháng")));
});

import { issueToPatch } from "../src/rules/fixer.ts";

test("component issue fixer uses target value for ranged typography", () => {
  assert.deepEqual(issueToPatch({
    id: "x", ruleId: "component.PLACE_DATE.fontSize", targetId: "doc:p:4",
    message: "x", severity: "error", autoFixable: true,
    actual: 12, expected: "13-14", fixValue: 14,
  }), { fontSize: 14 });
  assert.deepEqual(issueToPatch({
    id: "y", ruleId: "component.DOCUMENT_TYPE.bold", targetId: "doc:p:5",
    message: "y", severity: "error", autoFixable: true,
    actual: false, expected: true, fixValue: true,
  }), { bold: true });
});

import { readFile } from "node:fs/promises";

test("Word integration scans full document and UI exposes recognized components", async () => {
  const formatting = await readFile(new URL("../src/word/formatting.service.ts", import.meta.url), "utf8");
  const inspection = await readFile(new URL("../src/rules/document-inspection.ts", import.meta.url), "utf8");
  assert.match(formatting, /inspectDocumentParagraphs/);
  assert.match(formatting, /document\.body\.paragraphs/);
  assert.match(formatting, /export async function inspectDocumentParagraphs[\s\S]*?tableNestingLevel === 0/);
  assert.match(inspection, /classifyDocumentComponents/);
  assert.match(inspection, /evaluateDocumentRules/);
});

test("standardize UI exposes an active selection/document scope", async () => {
  const app = await readFile(new URL("../src/taskpane/App.tsx", import.meta.url), "utf8");
  assert.match(app, /validationScope/);
  assert.match(app, /inspectCurrentDocument/);
});

test("validation scope applies to component and page checks too", async () => {
  const inspection = await readFile(new URL("../src/rules/document-inspection.ts", import.meta.url), "utf8");
  const evaluator = await readFile(new URL("../src/rules/document-evaluator.ts", import.meta.url), "utf8");
  assert.match(inspection, /inspectCurrentDocument/);
  assert.match(evaluator, /validationScope/);
});

test("text issue fixer supports both document and selection targets", async () => {
  const formatting = await readFile(new URL("../src/word/formatting.service.ts", import.meta.url), "utf8");
  const start = formatting.indexOf("export async function applyTextIssueFix");
  const body = formatting.slice(start);
  assert.ok(body.includes("const selectionMatch = /^p:(\\d+)$/.exec(issue.targetId);"));
  assert.match(body, /const paragraphs = documentMatch \? context\.document\.body\.paragraphs : context\.document\.getSelection\(\)\.paragraphs/);
});
