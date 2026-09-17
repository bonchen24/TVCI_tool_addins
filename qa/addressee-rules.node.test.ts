import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyDocumentComponents } from "../src/rules/component-classifier.ts";
import { getComponentRule, getRecipientsItemRule, resolveAddresseeAlignment } from "../src/rules/component-rules.ts";
import { validateComponentParagraph } from "../src/rules/component-validator.ts";
import { validateAddresseeBlock } from "../src/rules/addressee-validator.ts";
import { validateRecipientsBlock } from "../src/rules/recipients-validator.ts";
import { buildAddresseeText } from "../src/word/addressee-format.ts";
import type { ParagraphSnapshot } from "../src/rules/models.ts";

function p(id: number, text: string, alignment: ParagraphSnapshot["alignment"] = "Left", size = 14): ParagraphSnapshot {
  return {
    id: `doc:p:${id}`,
    text,
    fontName: "Times New Roman",
    fontSize: size,
    bold: false,
    italic: false,
    underline: false,
    alignment,
    spaceBefore: 0,
    spaceAfter: 0,
  };
}

test("classifier recognizes Kính gửi separately from Nơi nhận", () => {
  const found = classifyDocumentComponents([
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    "Độc lập - Tự do - Hạnh phúc",
    "CÔNG VĂN",
    "Kính gửi: Bộ Công Thương",
    "Nội dung...",
    "Nơi nhận:",
  ], "ADMINISTRATIVE");
  const byType = new Map(found.map((item) => [item.type, item.paragraphIndex]));
  assert.equal(byType.get("ADDRESSEE"), 3);
  assert.equal(byType.get("RECIPIENTS"), 5);
});

test("classifier recognizes Nơi nhận when the first recipient is on the same line", () => {
  const found = classifyDocumentComponents(["Nơi nhận: Bộ Công Thương"], "ADMINISTRATIVE");
  assert.equal(found[0]?.type, "RECIPIENTS");
});

test("NĐ30 Kính gửi one recipient stays on same line and uses 13-14 upright", () => {
  const rule = getComponentRule("NĐ30_TVCI", "ADDRESSEE");
  assert.deepEqual(rule.fontSize, { min: 13, max: 14, target: 14 });
  assert.equal(rule.italic, false);
  assert.equal(rule.alignment, "Left");

  const snapshots = [p(0, "Kính gửi: Bộ Công Thương")];
  assert.deepEqual(validateAddresseeBlock(snapshots, 0, "NĐ30_TVCI"), []);
});

test("NĐ30 Kính gửi without a colon gets a safe punctuation fix", () => {
  const issues = validateAddresseeBlock([p(0, "Kính gửi Công ty ABC")], 0, "NĐ30_TVCI");

  assert.deepEqual(issues.map((x) => x.ruleId), ["text.addressee.colon"]);
  assert.equal(issues[0].fixValue, "Kính gửi: Công ty ABC");
});

test("NĐ30 Kính gửi multiple recipients requires hyphen lines, semicolons, final period", () => {
  const snapshots = [
    p(0, "Kính gửi:"),
    p(1, "- Bộ Công Thương,"),
    p(2, "- Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam;"),
    p(3, "- Viện Cơ khí Năng lượng và Mỏ - VINACOMIN;"),
  ];
  const issues = validateAddresseeBlock(
    snapshots,
    0,
    "NĐ30_TVCI",
    (snapshot) => validateComponentParagraph(snapshot, "ADDRESSEE", getComponentRule("NĐ30_TVCI", "ADDRESSEE")),
  );
  assert.deepEqual(issues.map((x) => x.ruleId), [
    "text.addressee.punctuation",
    "text.addressee.finalPunctuation",
  ]);
  assert.equal(issues[0].fixValue, "- Bộ Công Thương;");
  assert.equal(issues[1].fixValue, "- Viện Cơ khí Năng lượng và Mỏ - VINACOMIN.");
});

test("IEMM Kính gửi follows the compact 13pt baseline", () => {
  const rule = getComponentRule("IEMM", "ADDRESSEE");
  assert.equal(rule.fontSize, 13);
  assert.equal(rule.alignment, "Left");
});

test("Kính gửi in Công văn is centered while Tờ trình and Báo cáo stay left", () => {
  assert.equal(resolveAddresseeAlignment("IEMM", "CÔNG VĂN"), "Centered");
  assert.equal(resolveAddresseeAlignment("IEMM", "TỜ TRÌNH"), "Left");
  assert.equal(resolveAddresseeAlignment("IEMM", "BÁO CÁO"), "Left");
});

test("Kính gửi keeps one recipient inline and aligns multiple recipients with hyphens", () => {
  assert.equal(buildAddresseeText("NĐ30_TVCI", ["Bộ Công Thương"]), "Kính gửi: Bộ Công Thương");
  assert.equal(
    buildAddresseeText("NĐ30_TVCI", ["Bộ Công Thương", "Viện Cơ khí Năng lượng và Mỏ - VINACOMIN"]),
    "Kính gửi:\n- Bộ Công Thương;\n- Viện Cơ khí Năng lượng và Mỏ - VINACOMIN.",
  );
});

test("NĐ30 multiline Kính gửi validates recipient line typography", () => {
  const snapshots = [
    p(0, "Kính gửi:"),
    p(1, "- Bộ Công Thương", "Right", 12),
  ];
  const issues = validateAddresseeBlock(
    snapshots,
    0,
    "NĐ30_TVCI",
    (snapshot) => validateComponentParagraph(snapshot, "ADDRESSEE", getComponentRule("NĐ30_TVCI", "ADDRESSEE")),
  );
  assert.deepEqual(issues.map((x) => x.ruleId), [
    "component.ADDRESSEE.fontSize",
    "component.ADDRESSEE.alignment",
    "text.addressee.finalPunctuation",
  ]);
});

test("Party Kính gửi is centered and each recipient entry ends with semicolon", () => {
  const rule = getComponentRule("DANG_05_HD_VPTW_2026", "ADDRESSEE");
  assert.equal(rule.alignment, "Centered");

  const snapshots = [
    p(0, "Kính gửi:", "Centered", 13),
    p(1, "Ban Tổ chức Trung ương;", "Left", 13),
    p(2, "Văn phòng Trung ương Đảng.", "Centered", 13),
  ];
  const issues = validateAddresseeBlock(
    snapshots,
    0,
    "DANG_05_HD_VPTW_2026",
    (snapshot) => validateComponentParagraph(snapshot, "ADDRESSEE", getComponentRule("DANG_05_HD_VPTW_2026", "ADDRESSEE")),
  );
  assert.deepEqual(issues.map((x) => x.ruleId), [
    "component.ADDRESSEE.alignment",
    "text.addressee.partyPunctuation",
  ]);
  assert.equal(issues[1].fixValue, "Văn phòng Trung ương Đảng;");
});

test("Nơi nhận requires a colon and validates multiline recipient typography", () => {
  const issues = validateRecipientsBlock(
    [p(0, "Nơi nhận:"), p(1, "Như trên", "Right", 10), p(2, "GIÁM ĐỐC", "Centered", 14)],
    0,
    (snapshot) => validateComponentParagraph(snapshot, "RECIPIENTS", getRecipientsItemRule("IEMM")),
  );
  assert.deepEqual(issues.map((x) => x.ruleId), [
    "component.RECIPIENTS.fontSize",
    "component.RECIPIENTS.alignment",
    "text.recipients.itemPunctuation",
  ]);

  const validItemIssues = validateRecipientsBlock(
    [p(0, "Nơi nhận:"), p(1, "- Như trên;", "Left", 11), p(2, "- GIÁM ĐỐC;", "Left", 11)],
    0,
    (snapshot) => validateComponentParagraph(snapshot, "RECIPIENTS", getRecipientsItemRule("IEMM")),
  );
  assert.deepEqual(validItemIssues, []);

  const colonIssue = validateRecipientsBlock([p(0, "Nơi nhận")], 0);
  assert.equal(colonIssue[0]?.ruleId, "text.recipients.colon");
  assert.equal(colonIssue[0]?.fixValue, "Nơi nhận:");
});

test("Word insertion resets inherited emphasis for Kính gửi and structured drafting", async () => {
  const source = await readFile(new URL("../src/word/drafting.service.ts", import.meta.url), "utf8");
  const addressee = source.slice(source.indexOf("export async function insertAddressee"), source.indexOf("export async function insertRecipients"));
  const outline = source.slice(source.indexOf("export async function insertOutline"), source.indexOf("export async function insertAddressee"));
  const list = source.slice(source.indexOf("export async function insertStandardList"), source.indexOf("export async function insertOutline"));
  assert.match(addressee, /range\.font\.bold = rule\.bold \?\? false/);
  assert.match(addressee, /range\.font\.italic = rule\.italic \?\? false/);
  assert.match(addressee, /range\.font\.underline = Word\.UnderlineType\.none/);
  assert.match(outline, /range\.font\.italic = false/);
  assert.match(outline, /range\.font\.underline = Word\.UnderlineType\.none/);
  assert.match(list, /range\.font\.italic = false/);
  assert.match(list, /range\.font\.underline = Word\.UnderlineType\.none/);
});
