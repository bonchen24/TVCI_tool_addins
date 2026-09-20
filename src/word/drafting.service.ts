import type { RuleProfileId } from '../rules/profiles';
import { getRuleProfile } from '../rules/profiles';
import { getComponentRule, resolveAddresseeAlignment } from '../rules/component-rules';
import { buildHorizontalRuleOoxml, calculateHorizontalRuleWidth, estimateLongestLineWidth, type HorizontalRuleKind } from '../rules/horizontal-rules';
import { buildAddresseeText } from './addressee-format';
import {
  buildHeaderFooterOoxml,
  buildAppendixTableValues,
  buildListItems,
  buildPageNumberOoxml,
  buildRecipientsOoxml,
  buildTableOoxml,
  getAppendixPreset,
  calculateOutlineParagraphs,
  getOutlinePreset,
  getPageNumberPreset,
  normalizeListLevel,
  type ListKind,
  type OutlineKind,
  type PageNumberPosition,
} from '../drafting/presets';

function wordAlignment(value: 'Left' | 'Centered' | 'Right' | 'Justified'): Word.Alignment {
  switch (value) {
    case 'Centered': return Word.Alignment.centered;
    case 'Right': return Word.Alignment.right;
    case 'Justified': return Word.Alignment.justified;
    default: return Word.Alignment.left;
  }
}

function bodyFontSize(profileId: RuleProfileId): number {
  const size = getRuleProfile(profileId).body.fontSize;
  return typeof size === 'number' ? size : 13;
}

const BODY_SPACE_BEFORE_PT = 2;
const BODY_SPACE_AFTER_PT = 2;
const BODY_LINE_SPACING_PT = 15.6;

function applyBodyParagraphSpacing(paragraph: Word.Paragraph): void {
  paragraph.spaceBefore = BODY_SPACE_BEFORE_PT;
  paragraph.spaceAfter = BODY_SPACE_AFTER_PT;
  paragraph.lineSpacing = BODY_LINE_SPACING_PT;
}

export async function insertAppendix(profileId: RuleProfileId, title: string): Promise<void> {
  const preset = getAppendixPreset(profileId);
  const appendixTitle = title.trim() || preset.title;
  await Word.run(async (context) => {
    const body = context.document.body;
    body.insertBreak(Word.BreakType.page, Word.InsertLocation.end);
    const paragraph = body.insertParagraph(appendixTitle, Word.InsertLocation.end);
    paragraph.font.name = preset.fontName;
    paragraph.font.size = preset.fontSize;
    paragraph.font.bold = preset.bold;
    paragraph.font.italic = false;
    paragraph.font.underline = Word.UnderlineType.none;
    paragraph.alignment = Word.Alignment.centered;
    paragraph.spaceBefore = 0;
    paragraph.spaceAfter = 0;
    const control = paragraph.insertContentControl();
    control.tag = 'TVCI_APPENDIX';
    control.title = 'Phụ lục TVCI';
    await context.sync();
  });
}

export async function insertAppendixTable(profileId: RuleProfileId, rows: number, columns: number, headerRow = true): Promise<void> {
  const values = buildAppendixTableValues(rows, columns, headerRow);
  await Word.run(async (context) => {
    const table = context.document.body.insertTable(values.length, values[0].length, Word.InsertLocation.end, values);
    table.headerRowCount = headerRow ? 1 : 0;
    table.styleBuiltIn = 'TableGrid';
    table.font.name = 'Times New Roman';
    table.font.size = bodyFontSize(profileId);
    table.verticalAlignment = Word.VerticalAlignment.center;
    const rowsCollection = table.rows;
    rowsCollection.load('items/cells/items');
    const tableParagraphs = table.getRange().paragraphs;
    tableParagraphs.load('items');
    await context.sync();
    for (const paragraph of tableParagraphs.items) applyBodyParagraphSpacing(paragraph);
    for (const row of rowsCollection.items) {
      const firstCell = row.cells.items[0];
      if (firstCell) firstCell.horizontalAlignment = Word.Alignment.centered;
    }
    await context.sync();
  });
}

export async function numberSelectedTable(): Promise<void> {
  await Word.run(async (context) => {
    const table = context.document.getSelection().parentTableOrNullObject;
    table.load('isNullObject,rowCount,headerRowCount,rows/items/cells/items');
    await context.sync();
    if (table.isNullObject) throw new Error('Hãy đặt con trỏ trong bảng cần đánh số.');
    const headerRows = Math.max(0, Math.min(table.headerRowCount || 0, table.rows.items.length));
    let sequence = 1;
    for (let index = headerRows; index < table.rows.items.length; index += 1) {
      const firstCell = table.rows.items[index].cells.items[0];
      if (!firstCell) continue;
      firstCell.value = String(sequence);
      firstCell.horizontalAlignment = Word.Alignment.centered;
      sequence += 1;
    }
    await context.sync();
  });
}

export async function insertStandardTable(profileId: RuleProfileId, rows: number, columns: number, headerRow = true): Promise<void> {
  const ooxml = buildTableOoxml(profileId, rows, columns, headerRow);
  await Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.insertOoxml(ooxml, Word.InsertLocation.replace);
    await context.sync();
  });
}

function supportsNativeWordLists(): boolean {
  return Boolean(Office.context.requirements?.isSetSupported?.('WordApiDesktop', '1.3'));
}

export async function insertStandardList(profileId: RuleProfileId, kind: ListKind, itemCount = 3, listLevel = 0): Promise<void> {
  if (!supportsNativeWordLists()) throw new Error('Word hiện tại chưa hỗ trợ danh sách chuẩn (cần WordApiDesktop 1.3 trở lên).');
  const count = Math.max(1, Math.min(20, Math.floor(itemCount)));
  const items = Array.from({ length: count }, (_, index) => `Nội dung ${index + 1}`);
  const text = buildListItems(items).join('\n');
  const level = normalizeListLevel(listLevel);
  await Word.run(async (context) => {
    const range = context.document.getSelection().insertText(text, Word.InsertLocation.replace);
    range.font.name = 'Times New Roman';
    range.font.size = bodyFontSize(profileId);
    range.font.bold = false;
    range.font.italic = false;
    range.font.underline = Word.UnderlineType.none;
    const paragraphs = range.paragraphs;
    paragraphs.load('items');
    await context.sync();
    for (const p of paragraphs.items) {
      p.alignment = Word.Alignment.left;
      applyBodyParagraphSpacing(p);
    }
    if (kind === 'BULLET') range.listFormat.applyBulletDefault('Word97');
    else range.listFormat.applyNumberDefault('Word97');
    range.listFormat.listLevelNumber = level;
    await context.sync();
  });
}

export async function insertOutline(profileId: RuleProfileId, kind: OutlineKind): Promise<void> {
  const preset = getOutlinePreset(profileId, kind);
  await Word.run(async (context) => {
    const range = context.document.getSelection().insertText(calculateOutlineParagraphs(preset).join('\n'), Word.InsertLocation.replace);
    range.font.name = preset.fontName;
    range.font.size = preset.fontSize;
    range.font.bold = preset.bold;
    range.font.italic = false;
    range.font.underline = Word.UnderlineType.none;
    const paragraphs = range.paragraphs;
    paragraphs.load('items');
    await context.sync();
    for (const p of paragraphs.items) {
      p.alignment = wordAlignment(preset.alignment);
      applyBodyParagraphSpacing(p);
      if (preset.firstLineIndentMm !== undefined) p.firstLineIndent = preset.firstLineIndentMm * 28.3464567;
    }
    await context.sync();
  });
}

export async function insertAddressee(profileId: RuleProfileId, recipients: string[]): Promise<void> {
  const text = buildAddresseeText(profileId, recipients);
  const party = profileId === 'DANG_05_HD_VPTW_2026';
  const hasMultipleRecipients = recipients.map((item) => item.trim()).filter(Boolean).length > 1;
  const rule = getComponentRule(profileId, 'ADDRESSEE');
  const fontSize = typeof rule.fontSize === 'number' ? rule.fontSize : rule.fontSize?.target ?? bodyFontSize(profileId);
  await Word.run(async (context) => {
    const body = context.document.body;
    body.load('text');
    await context.sync();
    const alignment = wordAlignment(resolveAddresseeAlignment(profileId, body.text));
    const range = context.document.getSelection().insertText(text, Word.InsertLocation.replace);
    range.font.name = rule.fontName ?? 'Times New Roman';
    range.font.size = fontSize;
    range.font.bold = rule.bold ?? false;
    range.font.italic = rule.italic ?? false;
    range.font.underline = Word.UnderlineType.none;
    const paragraphs = range.paragraphs;
    paragraphs.load('items');
    await context.sync();
    for (const p of paragraphs.items) {
      p.alignment = party ? Word.Alignment.centered : alignment;
      p.leftIndent = hasMultipleRecipients && !party && alignment === Word.Alignment.left && p !== paragraphs.items[0] ? 27 : 0;
      p.firstLineIndent = 0;
      p.spaceBefore = 0;
      p.spaceAfter = 0;
    }
    await context.sync();
  });
}

export async function insertRecipients(profileId: RuleProfileId, recipients: string[]): Promise<void> {
  await Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.insertOoxml(buildRecipientsOoxml(profileId, recipients), Word.InsertLocation.replace);
    await context.sync();
  });
}

export async function insertHorizontalRule(kind: HorizontalRuleKind): Promise<void> {
  await Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load('text,font/size');
    await context.sync();
    const available = 450;
    const fontSize = selection.font.size || 13;
    const estimatedTextWidth = estimateLongestLineWidth(selection.text, fontSize);
    const width = calculateHorizontalRuleWidth(kind, available, estimatedTextWidth);
    selection.insertOoxml(buildHorizontalRuleOoxml(kind, width, available), Word.InsertLocation.after);
    await context.sync();
  });
}

function headerFooterType(): Word.HeaderFooterType | "Primary" {
  return (Word as unknown as { HeaderFooterType?: { primary?: Word.HeaderFooterType } }).HeaderFooterType?.primary ?? "Primary";
}

async function deleteManagedControls(context: Word.RequestContext, tag: string): Promise<void> {
  const controls = context.document.contentControls.getByTag(tag);
  controls.load("items");
  await context.sync();
  for (const control of controls.items) control.delete(false);
  await context.sync();
}

export async function configurePageNumbers(profileId: RuleProfileId, enabled: boolean, positionOverride?: PageNumberPosition): Promise<void> {
  const preset = getPageNumberPreset(profileId);
  const position = positionOverride ?? preset.position;
  if (enabled && preset.hideFirstPage && !Office.context.requirements.isSetSupported('WordApiDesktop', '1.3')) {
    throw new Error('Word hiện tại chưa hỗ trợ cấu hình ẩn số trang ở trang đầu (cần WordApiDesktop 1.3). Văn bản chưa bị thay đổi số trang.');
  }
  await Word.run(async (context) => {
    await deleteManagedControls(context, "TVCI_PAGE_NUMBER");
    if (!enabled) return;
    const sections = context.document.sections;
    sections.load("items");
    await context.sync();
    for (const section of sections.items) {
      if (preset.hideFirstPage) section.pageSetup.differentFirstPageHeaderFooter = true;
      const target = position.startsWith("header")
        ? section.getHeader(headerFooterType())
        : section.getFooter(headerFooterType());
      target.insertOoxml(buildPageNumberOoxml(position, preset.fontSize), Word.InsertLocation.end);
    }
    await context.sync();
  });
}

export async function hasConfiguredPageNumbers(): Promise<boolean> {
  return Word.run(async (context) => {
    const controls = context.document.contentControls.getByTag("TVCI_PAGE_NUMBER");
    controls.load("items");
    await context.sync();
    return controls.items.length > 0;
  });
}

export async function configureHeaderFooter(headerText: string, footerText: string): Promise<void> {
  await Word.run(async (context) => {
    await deleteManagedControls(context, "TVCI_MANAGED_HEADER_FOOTER");
    const sections = context.document.sections;
    sections.load("items");
    await context.sync();
    for (const section of sections.items) {
      const header = section.getHeader(headerFooterType());
      const footer = section.getFooter(headerFooterType());
      const headerXml = buildHeaderFooterOoxml(headerText, "center", 11);
      const footerXml = buildHeaderFooterOoxml(footerText, "center", 11);
      if (headerXml) header.insertOoxml(headerXml, Word.InsertLocation.end);
      if (footerXml) footer.insertOoxml(footerXml, Word.InsertLocation.end);
    }
    await context.sync();
  });
}
