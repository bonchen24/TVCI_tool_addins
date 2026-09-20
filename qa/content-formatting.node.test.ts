import test from "node:test";
import assert from "node:assert/strict";
import { classifyDocumentComponents } from "../src/rules/component-classifier.ts";
import { getComponentRule } from "../src/rules/component-rules.ts";
import { getRuleProfile, resolveRuleProfileForOrganization } from "../src/rules/profiles.ts";
import { validateLegalBasisBlock } from "../src/rules/legal-basis-validator.ts";
import {
  RECIPIENT_PRESETS,
  buildRecipientsOoxml,
  buildTableOoxml,
  calculateOutlineParagraphs,
  getOutlinePreset,
} from "../src/drafting/presets.ts";
import { calculateHorizontalRuleWidth, estimateLongestLineWidth } from "../src/rules/horizontal-rules.ts";

test("active IEMM, TVCI and Party profiles use the custom content baseline", () => {
  const iemm = getRuleProfile("IEMM");
  const party = getRuleProfile("DANG_05_HD_VPTW_2026");
  for (const profile of [iemm, party]) {
    assert.equal(profile.body.fontName, "Times New Roman");
    assert.equal(profile.body.fontSize, 13);
    assert.equal(profile.body.alignment, "Justified");
    assert.equal(profile.body.firstLineIndentMm, 10);
    assert.equal(profile.body.spaceBefore, 2);
    assert.equal(profile.body.spaceAfter, 2);
    assert.equal(profile.body.lineSpacingPt, 15.6);
    assert.equal(profile.body.lineSpacingRule, "multiple");
    assert.equal(profile.body.lineSpacingMultiple, 1.2);
  }
  assert.deepEqual(iemm.page, { paperSize: "A4", orientation: "Portrait", topMm: 20, bottomMm: 20, leftMm: 30, rightMm: 15 });
  assert.equal(resolveRuleProfileForOrganization("TVCI").id, "NĐ30_TVCI");
});

test("generated content tables use Before 2pt, After 2pt and Multiple 1.2", () => {
  const ooxml = buildTableOoxml("IEMM", 2, 2, true);
  assert.match(ooxml, /w:before="40" w:after="40" w:line="288" w:lineRule="auto"/);
});

test("classifier and rules expose legal basis formatting", () => {
  const lines = ["QUYẾT ĐỊNH", "Căn cứ Luật Tổ chức Chính phủ;", "Căn cứ Quy chế Văn thư của Viện."];
  const found = classifyDocumentComponents(lines, "ADMINISTRATIVE");
  assert.deepEqual(found.filter((item) => item.type === "LEGAL_BASIS").map((item) => item.paragraphIndex), [1, 2]);
  const rule = getComponentRule("IEMM", "LEGAL_BASIS");
  assert.equal(rule.fontSize, 13);
  assert.equal(rule.italic, true);
  assert.equal(rule.alignment, "Left");
});

test("legal basis punctuation follows the profile", () => {
  const paragraphs = [
    { id: "p0", text: "Căn cứ Luật Tổ chức Chính phủ", fontName: "Times New Roman", fontSize: 13, italic: true, alignment: "Left" as const, spaceBefore: 0, spaceAfter: 6 },
    { id: "p1", text: "Căn cứ Quy chế Văn thư của Viện;", fontName: "Times New Roman", fontSize: 13, italic: true, alignment: "Left" as const, spaceBefore: 0, spaceAfter: 6 },
  ];
  const adminIssues = validateLegalBasisBlock(paragraphs, 0, "IEMM");
  assert.equal(adminIssues[0]?.fixValue, "Căn cứ Luật Tổ chức Chính phủ;");
  const partyIssues = validateLegalBasisBlock(paragraphs, 0, "DANG_05_HD_VPTW_2026");
  assert.equal(partyIssues.at(-1)?.fixValue, "Căn cứ Quy chế Văn thư của Viện,");
});

test("outline presets separate heading titles and use the requested indent", () => {
  const part = getOutlinePreset("IEMM", "PART");
  const chapter = getOutlinePreset("IEMM", "CHAPTER");
  const section = getOutlinePreset("IEMM", "SECTION");
  const subsection = getOutlinePreset("IEMM", "SUBSECTION");
  const article = getOutlinePreset("IEMM", "ARTICLE");
  assert.equal(part.separateTitle, true);
  assert.equal(chapter.titleUppercase, true);
  assert.equal(section.titleUppercase, true);
  assert.equal(subsection.label, "Tiểu mục 1");
  assert.equal(article.firstLineIndentMm, 10);
  assert.equal(part.fontSize, 13);
  assert.deepEqual(calculateOutlineParagraphs(part), ["Phần I", "TÊN PHẦN"]);
});

test("recipient presets and OOXML normalize full names and punctuation", () => {
  assert.ok(RECIPIENT_PRESETS.some((item) => item.id === "party-committee" && item.value === "Đảng ủy Viện"));
  const ooxml = buildRecipientsOoxml("IEMM", ["Như trên", "Trung tâm Thử nghiệm - Kiểm định Công nghiệp"]);
  assert.match(ooxml, /- Như trên;/);
  assert.match(ooxml, /- Trung tâm Thử nghiệm - Kiểm định Công nghiệp;/);
  assert.match(ooxml, /Lưu: VT, Văn phòng\./);
  assert.match(ooxml, /w:sz w:val="24"/);
  assert.match(ooxml, /w:sz w:val="22"/);
});

test("title rule width is based on the longest title line", () => {
  const lineWidth = estimateLongestLineWidth("Tên loại ngắn\nTrích yếu nội dung văn bản dài hơn", 13);
  assert.equal(lineWidth, estimateLongestLineWidth("Trích yếu nội dung văn bản dài hơn", 13));
  assert.equal(calculateHorizontalRuleWidth("TITLE_ABSTRACT", 450, lineWidth), Math.round(lineWidth * 0.4 * 1000) / 1000);
});
