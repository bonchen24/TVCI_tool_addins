import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getOutlinePreset,
  buildTableOoxml,
  buildListItems,
  buildRecipientsOoxml,
  normalizeListLevel,
  getPageNumberPreset,
  buildPageNumberOoxml,
  buildHeaderFooterOoxml,
} from '../src/drafting/presets.ts';

test('IEMM outline presets follow supplied Viện hierarchy typography', () => {
  const chapter = getOutlinePreset('IEMM', 'CHAPTER');
  const article = getOutlinePreset('IEMM', 'ARTICLE');
  const point = getOutlinePreset('IEMM', 'POINT');

  assert.equal(chapter.label, 'Chương I');
  assert.equal(chapter.fontSize, 13);
  assert.equal(chapter.bold, true);
  assert.equal(chapter.alignment, 'Centered');
  assert.equal(article.fontSize, 13);
  assert.equal(article.bold, true);
  assert.equal(point.label, 'a) ');
  assert.equal(point.bold, false);
});

test('table builder applies profile body font and bold centered header row', () => {
  const ooxml = buildTableOoxml('IEMM', 3, 4, true);
  assert.match(ooxml, /Times New Roman/);
  assert.match(ooxml, /w:sz w:val="26"/); // 13 pt
  assert.match(ooxml, /w:tblBorders/);
  assert.match(ooxml, /w:b\/>/);
  assert.match(ooxml, /w:jc w:val="center"/);
});

test('native Word list input is sanitized and nested levels are bounded', () => {
  assert.deepEqual(buildListItems(['  Mục A  ', '', 'Mục B']), ['Mục A', 'Mục B']);
  assert.equal(normalizeListLevel(-1), 0);
  assert.equal(normalizeListLevel(3.8), 3);
  assert.equal(normalizeListLevel(99), 8);
});

test('Word drafting applies native list formatting instead of text markers', () => {
  const source = fs.readFileSync('src/word/drafting.service.ts', 'utf8');
  assert.match(source, /listFormat\.applyBulletDefault/);
  assert.match(source, /listFormat\.applyNumberDefault/);
  assert.match(source, /listFormat\.listLevelNumber/);
  assert.doesNotMatch(source, /buildListText\(kind, items\)\.join/);
});

test('recipient builder keeps label and recipient typography separate', () => {
  const ooxml = buildRecipientsOoxml('IEMM', ['Phòng Kỹ thuật', 'Lưu: VT']);
  assert.match(ooxml, /TVCI_RECIPIENTS/);
  assert.match(ooxml, /Nơi nhận:/);
  assert.match(ooxml, /w:sz w:val="24"[^>]*\/?>.*w:b\/.*w:i\//s);
  assert.match(ooxml, /w:sz w:val="22"/);
  assert.match(ooxml, /Phòng Kỹ thuật/);
});

test('page number presets distinguish current administrative and Viện legacy placement', () => {
  const nd30 = getPageNumberPreset('NĐ30_TVCI');
  const iemm = getPageNumberPreset('IEMM');
  assert.deepEqual(nd30, { enabled: true, position: 'header-center', hideFirstPage: true, fontSize: 13 });
  assert.deepEqual(iemm, { enabled: true, position: 'footer-right', hideFirstPage: true, fontSize: 13 });
});

test('page-number OOXML contains PAGE field and requested alignment', () => {
  const ooxml = buildPageNumberOoxml('footer-right', 14);
  assert.match(ooxml, /PAGE/);
  assert.match(ooxml, /w:jc w:val="right"/);
  assert.match(ooxml, /w:sz w:val="28"/);
});

test('header/footer text is optional and tagged as add-in managed content', () => {
  assert.equal(buildHeaderFooterOoxml('', 'center', 11), '');
  const ooxml = buildHeaderFooterOoxml('Viện Cơ khí Năng lượng và Mỏ - VINACOMIN', 'center', 11);
  assert.match(ooxml, /TVCI_MANAGED_HEADER_FOOTER/);
  assert.match(ooxml, /Viện Cơ khí Năng lượng và Mỏ - VINACOMIN/);
});

test('drafting service exposes standard drafting operations', () => {
  const draftingService = fs.readFileSync('src/word/drafting.service.ts', 'utf8');
  const commands = fs.readFileSync('src/commands/commands.ts', 'utf8');
  assert.match(draftingService, /export async function insertAddressee/);
  assert.match(draftingService, /export async function insertRecipients/);
  assert.match(draftingService, /export async function insertOutline/);
  assert.match(draftingService, /export async function configurePageNumbers/);
  assert.match(draftingService, /export async function insertStandardTable/);
  assert.match(commands, /insertAddressee/);
  assert.match(commands, /insertRecipients/);
  assert.match(commands, /insertOutline/);
});

test('table builder supports configurable table rows, columns, and header row', () => {
  const draftingService = fs.readFileSync('src/word/drafting.service.ts', 'utf8');
  assert.match(draftingService, /export async function insertStandardTable\(profileId:\s*RuleProfileId,\s*rows:\s*number,\s*columns:\s*number,\s*headerRow\s*=\s*true\)/);
});

test('quick guidance includes source-backed page numbering and hierarchy notes', async () => {
  const { QUICK_GUIDANCE } = await import('../src/reference/quick-guidance.ts');
  const ids = new Set(QUICK_GUIDANCE.map((item) => item.id));
  assert.equal(ids.has('iemm-page-number'), true);
  assert.equal(ids.has('iemm-outline-hierarchy'), true);
  assert.equal(ids.has('header-footer-caution'), true);
});

test('header and footer can be independently enabled or disabled in drafting service', () => {
  const draftingService = fs.readFileSync('src/word/drafting.service.ts', 'utf8');
  assert.match(draftingService, /export async function configureHeaderFooter\(headerText:\s*string,\s*footerText:\s*string\)/);
});

test('page-number support is checked before managed controls are removed', () => {
  const source = fs.readFileSync('src/word/drafting.service.ts', 'utf8');
  const start = source.indexOf('export async function configurePageNumbers');
  const end = source.indexOf('export async function configureHeaderFooter');
  const body = source.slice(start, end);
  const supportCheck = body.indexOf('if (enabled && preset.hideFirstPage');
  const deleteManaged = body.indexOf('await deleteManagedControls(context, "TVCI_PAGE_NUMBER")');
  assert.ok(supportCheck >= 0, 'must guard the enabled path');
  assert.ok(deleteManaged > supportCheck, 'must not delete managed page numbers before the guard');
});

test('appendix preset and table values follow the selected profile', async () => {
  const presets = await import('../src/drafting/presets.ts');
  assert.equal(typeof presets.getAppendixPreset, 'function');
  assert.equal(typeof presets.buildAppendixTableValues, 'function');
  const preset = presets.getAppendixPreset('IEMM');
  assert.equal(preset.title, 'PHỤ LỤC');
  assert.equal(preset.fontName, 'Times New Roman');
  assert.equal(preset.fontSize, 13);
  assert.deepEqual(presets.buildAppendixTableValues(3, 2, true), [
    ['STT', 'Tiêu đề 2'],
    ['1', ''],
    ['2', ''],
  ]);
  assert.deepEqual(presets.buildAppendixTableValues(2, 2, false), [['1', ''], ['2', '']]);
});

test('Word drafting exposes safe appendix and selected-table numbering operations', () => {
  const source = fs.readFileSync('src/word/drafting.service.ts', 'utf8');
  assert.match(source, /export async function insertAppendix\(/);
  assert.match(source, /TVCI_APPENDIX/);
  assert.match(source, /insertBreak\(Word\.BreakType\.page/);
  assert.match(source, /export async function insertAppendixTable\(/);
  assert.match(source, /buildAppendixTableValues/);
  assert.match(source, /export async function numberSelectedTable\(/);
  assert.match(source, /parentTable/);
  assert.match(source, /headerRowCount/);
  assert.match(source, /Hãy đặt con trỏ trong bảng cần đánh số/);
});

test('appendix and selected-table controls are exposed via commands and drafting service', () => {
  const commands = fs.readFileSync('src/commands/commands.ts', 'utf8');
  const draftingService = fs.readFileSync('src/word/drafting.service.ts', 'utf8');
  assert.match(commands, /insertAppendix/);
  assert.match(draftingService, /export async function insertAppendix/);
  assert.match(draftingService, /export async function insertAppendixTable/);
  assert.match(draftingService, /export async function numberSelectedTable/);
});
