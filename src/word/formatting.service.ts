import type { FormattingPatch, ParagraphSnapshot, SupportedAlignment, ValidationIssue } from "../rules/models";
import { issueToPatch } from "../rules/fixer";
import { normalizeWordAlignment } from "./alignment-normalization";

const POINTS_PER_MM = 72 / 25.4;
const pointsToMm = (points: number) => Math.round((points / POINTS_PER_MM) * 10) / 10;

function toWordAlignment(value: SupportedAlignment): Word.Alignment {
  switch (value) {
    case "Centered": return Word.Alignment.centered;
    case "Right": return Word.Alignment.right;
    case "Justified": return Word.Alignment.justified;
    default: return Word.Alignment.left;
  }
}

function snapshotParagraph(p: Word.Paragraph, id: string): ParagraphSnapshot {
  return {
    id,
    text: p.text,
    fontName: p.font.name || "",
    fontSize: p.font.size || 0,
    bold: Boolean(p.font.bold),
    italic: Boolean(p.font.italic),
    underline: p.font.underline !== Word.UnderlineType.none,
    alignment: normalizeWordAlignment(String(p.alignment)),
    spaceBefore: p.spaceBefore || 0,
    spaceAfter: p.spaceAfter || 0,
    firstLineIndentMm: pointsToMm(p.firstLineIndent || 0),
    lineSpacingPt: p.lineSpacing || 0,
    lineSpacingRule: undefined,
    lineSpacingMultiple: undefined,
  };
}

async function loadParagraphFormatting(context: Word.RequestContext, paragraphs: Word.ParagraphCollection): Promise<void> {
  paragraphs.load("items/text,items/alignment,items/spaceBefore,items/spaceAfter,items/firstLineIndent,items/lineSpacing,items/tableNestingLevel");
  await context.sync();
  for (const p of paragraphs.items) p.font.load("name,size,bold,italic,underline");
  await context.sync();
}

export async function inspectSelectionParagraphs(): Promise<ParagraphSnapshot[]> {
  return Word.run(async (context) => {
    const paragraphs = context.document.getSelection().paragraphs;
    await loadParagraphFormatting(context, paragraphs);
    return paragraphs.items
      .map((p, index) => ({ index, p }))
      .filter(({ p }) => p.text.trim().length > 0 && p.tableNestingLevel === 0)
      .map(({ p, index }) => snapshotParagraph(p, `p:${index}`));
  });
}

export async function inspectDocumentParagraphs(): Promise<ParagraphSnapshot[]> {
  return Word.run(async (context) => {
    const paragraphs = context.document.body.paragraphs;
    await loadParagraphFormatting(context, paragraphs);
    return paragraphs.items
      .map((p, index) => ({ index, p }))
      .filter(({ p }) => p.text.trim().length > 0 && p.tableNestingLevel === 0)
      .map(({ p, index }) => snapshotParagraph(p, `doc:p:${index}`));
  });
}

function applyPatch(paragraph: Word.Paragraph, patch: FormattingPatch): void {
  if (patch.fontName !== undefined) paragraph.font.name = patch.fontName;
  if (patch.fontSize !== undefined) paragraph.font.size = patch.fontSize;
  if (patch.bold !== undefined) paragraph.font.bold = patch.bold;
  if (patch.italic !== undefined) paragraph.font.italic = patch.italic;
  if (patch.underline !== undefined) paragraph.font.underline = patch.underline ? Word.UnderlineType.single : Word.UnderlineType.none;
  if (patch.alignment !== undefined) paragraph.alignment = toWordAlignment(patch.alignment);
  if (patch.spaceBefore !== undefined) paragraph.spaceBefore = patch.spaceBefore;
  if (patch.spaceAfter !== undefined) paragraph.spaceAfter = patch.spaceAfter;
  if (patch.firstLineIndentMm !== undefined) paragraph.firstLineIndent = patch.firstLineIndentMm * POINTS_PER_MM;
  if (patch.lineSpacingPt !== undefined) paragraph.lineSpacing = patch.lineSpacingPt;
  else if (patch.lineSpacingMultiple !== undefined) paragraph.lineSpacing = patch.lineSpacingMultiple * 13;
}

export async function applyIssueFix(issue: ValidationIssue): Promise<void> {
  const documentMatch = /^doc:p:(\d+)$/.exec(issue.targetId);
  const selectionMatch = /^p:(\d+)$/.exec(issue.targetId);
  if (!documentMatch && !selectionMatch) throw new Error("Không xác định được đoạn cần sửa.");
  const targetIndex = Number((documentMatch ?? selectionMatch)![1]);
  const patch = issueToPatch(issue);

  await Word.run(async (context) => {
    const paragraphs = documentMatch ? context.document.body.paragraphs : context.document.getSelection().paragraphs;
    paragraphs.load("items");
    await context.sync();
    const paragraph = paragraphs.items[targetIndex];
    if (!paragraph) throw new Error("Đoạn văn đã thay đổi. Hãy kiểm tra lại trước khi sửa.");
    applyPatch(paragraph, patch);
    await context.sync();
  });
}

export async function applyTextIssueFix(issue: ValidationIssue): Promise<void> {
  const documentMatch = /^doc:p:(\d+)$/.exec(issue.targetId);
  const selectionMatch = /^p:(\d+)$/.exec(issue.targetId);
  const fixValue = issue.fixValue;
  if ((!documentMatch && !selectionMatch) || typeof fixValue !== "string") throw new Error("Không xác định được đoạn văn bản cần sửa.");
  const targetIndex = Number((documentMatch ?? selectionMatch)![1]);
  await Word.run(async (context) => {
    const paragraphs = documentMatch ? context.document.body.paragraphs : context.document.getSelection().paragraphs;
    paragraphs.load("items");
    await context.sync();
    const paragraph = paragraphs.items[targetIndex];
    if (!paragraph) throw new Error("Đoạn văn đã thay đổi. Hãy kiểm tra lại trước khi sửa.");
    paragraph.insertText(fixValue, Word.InsertLocation.replace);
    await context.sync();
  });
}

export async function selectParagraphByTargetId(targetId: string): Promise<void> {
  const documentMatch = /^doc:p:(\d+)$/.exec(targetId);
  const selectionMatch = /^p:(\d+)$/.exec(targetId);
  if (!documentMatch && !selectionMatch) return;
  const targetIndex = Number((documentMatch ?? selectionMatch)![1]);
  await Word.run(async (context) => {
    const paragraphs = documentMatch ? context.document.body.paragraphs : context.document.getSelection().paragraphs;
    paragraphs.load("items");
    await context.sync();
    const paragraph = paragraphs.items[targetIndex];
    if (paragraph) {
      paragraph.select();
      await context.sync();
    }
  });
}
