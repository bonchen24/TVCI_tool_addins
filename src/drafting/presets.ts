import type { RuleProfileId } from '../rules/profiles';
import type { SupportedAlignment } from '../rules/models';

export type OutlineKind = 'PART' | 'CHAPTER' | 'SECTION' | 'SUBSECTION' | 'ARTICLE' | 'CLAUSE' | 'POINT' | 'SUBPOINT';
export type ListKind = 'BULLET' | 'NUMBERED';
export type PageNumberPosition = 'header-center' | 'footer-right' | 'footer-center';

export interface OutlinePreset {
  kind: OutlineKind;
  label: string;
  fontName: string;
  fontSize: number;
  bold: boolean;
  uppercase: boolean;
  alignment: SupportedAlignment;
  separateTitle?: boolean;
  titleUppercase?: boolean;
  titlePlaceholder?: string;
  firstLineIndentMm?: number;
}

export interface PageNumberPreset {
  enabled: boolean;
  position: PageNumberPosition;
  hideFirstPage: boolean;
  fontSize: number;
}

export interface AppendixPreset {
  title: string;
  fontName: string;
  fontSize: number;
  bold: boolean;
}

const IEMM_OUTLINE: Record<OutlineKind, OutlinePreset> = {
  PART: { kind: 'PART', label: 'Phần I', fontName: 'Times New Roman', fontSize: 13, bold: true, uppercase: false, alignment: 'Centered', separateTitle: true, titleUppercase: true, titlePlaceholder: 'TÊN PHẦN' },
  CHAPTER: { kind: 'CHAPTER', label: 'Chương I', fontName: 'Times New Roman', fontSize: 13, bold: true, uppercase: false, alignment: 'Centered', separateTitle: true, titleUppercase: true, titlePlaceholder: 'TÊN CHƯƠNG' },
  SECTION: { kind: 'SECTION', label: 'Mục 1', fontName: 'Times New Roman', fontSize: 13, bold: true, uppercase: false, alignment: 'Centered', separateTitle: true, titleUppercase: true, titlePlaceholder: 'TÊN MỤC' },
  SUBSECTION: { kind: 'SUBSECTION', label: 'Tiểu mục 1', fontName: 'Times New Roman', fontSize: 13, bold: true, uppercase: false, alignment: 'Centered', separateTitle: true, titleUppercase: true, titlePlaceholder: 'TÊN TIỂU MỤC' },
  ARTICLE: { kind: 'ARTICLE', label: 'Điều 1. ', fontName: 'Times New Roman', fontSize: 13, bold: true, uppercase: false, alignment: 'Left', firstLineIndentMm: 10 },
  CLAUSE: { kind: 'CLAUSE', label: '1. ', fontName: 'Times New Roman', fontSize: 13, bold: false, uppercase: false, alignment: 'Left' },
  POINT: { kind: 'POINT', label: 'a) ', fontName: 'Times New Roman', fontSize: 13, bold: false, uppercase: false, alignment: 'Left' },
  SUBPOINT: { kind: 'SUBPOINT', label: '- ', fontName: 'Times New Roman', fontSize: 13, bold: false, uppercase: false, alignment: 'Left' },
};

function genericSize(profileId: RuleProfileId): number {
  return 13;
}

export function getOutlinePreset(profileId: RuleProfileId, kind: OutlineKind): OutlinePreset {
  if (profileId === 'IEMM' || profileId === 'DANG_05_HD_VPTW_2026') return IEMM_OUTLINE[kind];
  const base = IEMM_OUTLINE[kind];
  return { ...base, fontSize: genericSize(profileId) };
}

export function calculateOutlineParagraphs(preset: OutlinePreset): string[] {
  if (!preset.separateTitle) return [preset.label];
  return [preset.label, preset.titleUppercase ? (preset.titlePlaceholder ?? '').toLocaleUpperCase('vi-VN') : (preset.titlePlaceholder ?? '')];
}

export interface RecipientPreset {
  id: string;
  label: string;
  value: string;
}

export const RECIPIENT_PRESETS: RecipientPreset[] = [
  { id: 'above', label: 'Như trên', value: 'Như trên' },
  { id: 'director', label: 'Viện trưởng', value: 'Viện trưởng Viện Cơ khí Năng lượng và Mỏ - VINACOMIN' },
  { id: 'units', label: 'Các phòng, ban, đơn vị thuộc Viện', value: 'Các phòng, ban và đơn vị thuộc Viện' },
  { id: 'party-committee', label: 'Đảng ủy Viện', value: 'Đảng ủy Viện' },
  { id: 'tvci', label: 'Trung tâm Thử nghiệm - Kiểm định Công nghiệp', value: 'Trung tâm Thử nghiệm - Kiểm định Công nghiệp' },
  { id: 'archive', label: 'Lưu văn thư', value: 'Lưu: VT, Văn phòng.' },
];

export function getAppendixPreset(profileId: RuleProfileId): AppendixPreset {
  return { title: 'PHỤ LỤC', fontName: 'Times New Roman', fontSize: genericSize(profileId), bold: true };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function halfPoints(points: number): number { return Math.round(points * 2); }

function runProperties(fontSize: number, bold = false, italic = false): string {
  return `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${halfPoints(fontSize)}"/>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}</w:rPr>`;
}

function paragraphProperties(
  alignment: 'left' | 'center' | 'right' = 'left',
  before = 0,
  after = 120,
  line = 360,
  lineRule: 'auto' | 'atLeast' | 'exact' = 'atLeast',
): string {
  return `<w:pPr><w:jc w:val="${alignment}"/><w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="${lineRule}"/></w:pPr>`;
}

function bodyParagraphProperties(alignment: 'left' | 'center' | 'right' = 'left'): string {
  return paragraphProperties(alignment, 40, 40, 288, 'auto');
}

export function buildTableOoxml(profileId: RuleProfileId, rows: number, columns: number, headerRow: boolean): string {
  const safeRows = Math.max(1, Math.min(50, Math.floor(rows)));
  const safeCols = Math.max(1, Math.min(20, Math.floor(columns)));
  const size = genericSize(profileId);
  const border = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders>';
  const tableRows = Array.from({ length: safeRows }, (_, r) => {
    const cells = Array.from({ length: safeCols }, (_, c) => {
      const isHeader = headerRow && r === 0;
      const text = isHeader ? `Tiêu đề ${c + 1}` : `Nội dung ${r}${c + 1}`;
      return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p>${bodyParagraphProperties(isHeader ? 'center' : 'left')}${`<w:r>${runProperties(size, isHeader)}<w:t>${escapeXml(text)}</w:t></w:r>`}</w:p></w:tc>`;
    }).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');
  return `<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:tblPr><w:tblW w:w="0" w:type="auto"/>${border}</w:tblPr>${tableRows}</w:tbl>`;
}

export function buildAppendixTableValues(rows: number, columns: number, headerRow: boolean): string[][] {
  const safeRows = Math.max(1, Math.min(50, Math.floor(rows)));
  const safeColumns = Math.max(1, Math.min(20, Math.floor(columns)));
  return Array.from({ length: safeRows }, (_, row) => Array.from({ length: safeColumns }, (_, column) => {
    if (headerRow && row === 0) return column === 0 ? 'STT' : `Tiêu đề ${column + 1}`;
    return column === 0 ? String(headerRow ? row : row + 1) : '';
  }));
}

export function buildListItems(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean).slice(0, 20);
}

export function normalizeListLevel(level: number): number {
  return Math.max(0, Math.min(8, Math.floor(level)));
}

const PAGE_NUMBER_PRESETS: Record<RuleProfileId, PageNumberPreset> = {
  NĐ30_TVCI: { enabled: true, position: 'header-center', hideFirstPage: true, fontSize: 13 },
  TKV: { enabled: true, position: 'footer-right', hideFirstPage: true, fontSize: 13 },
  IEMM: { enabled: true, position: 'footer-right', hideFirstPage: true, fontSize: 13 },
  DANG_05_HD_VPTW_2026: { enabled: true, position: 'footer-center', hideFirstPage: true, fontSize: 13 },
};

export function getPageNumberPreset(profileId: RuleProfileId): PageNumberPreset {
  return { ...PAGE_NUMBER_PRESETS[profileId] };
}

function alignmentForPageNumber(position: PageNumberPosition): 'center' | 'right' {
  return position === 'footer-right' ? 'right' : 'center';
}

export function buildPageNumberOoxml(position: PageNumberPosition, fontSize: number): string {
  const alignment = alignmentForPageNumber(position);
  return `<w:sdt xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:sdtPr><w:tag w:val="TVCI_PAGE_NUMBER"/></w:sdtPr><w:sdtContent><w:p><w:pPr><w:jc w:val="${alignment}"/></w:pPr><w:r>${runProperties(fontSize)}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${runProperties(fontSize)}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r>${runProperties(fontSize)}<w:fldChar w:fldCharType="end"/></w:r></w:p></w:sdtContent></w:sdt>`;
}

export function buildHeaderFooterOoxml(text: string, alignment: 'left' | 'center' | 'right', fontSize: number): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return `<w:sdt xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:sdtPr><w:tag w:val="TVCI_MANAGED_HEADER_FOOTER"/></w:sdtPr><w:sdtContent><w:p><w:pPr><w:jc w:val="${alignment}"/></w:pPr><w:r>${runProperties(fontSize)}<w:t>${escapeXml(trimmed)}</w:t></w:r></w:p></w:sdtContent></w:sdt>`;
}

function recipientsParagraph(text: string, fontSize: number, bold: boolean, italic: boolean, alignment: 'left' | 'center'): string {
  return `<w:p>${paragraphProperties(alignment)}<w:r>${runProperties(fontSize, bold, italic)}<w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function buildRecipientsOoxml(profileId: RuleProfileId, recipients: string[]): string {
  void profileId;
  const cleaned = recipients.map((item) => item.trim()).filter(Boolean).slice(0, 20);
  const archive = cleaned.find((item) => /^Lưu\s*:/i.test(item));
  const items = cleaned.filter((item) => !/^Lưu\s*:/i.test(item)).map((item) => {
    const value = item.replace(/^[-•]\s*/, '').replace(/[;,.]+\s*$/, '').trim();
    return recipientsParagraph(`- ${value};`, 11, false, false, 'left');
  });
  const finalArchive = archive
    ? `Lưu: ${archive.replace(/^Lưu\s*:/i, '').replace(/,\s*\d+\s*bản/gi, '').replace(/[;,.]+\s*$/, '').trim() || 'VT, Văn phòng'}.`
    : 'Lưu: VT, Văn phòng.';
  const label = recipientsParagraph('Nơi nhận:', 12, true, true, 'left');
  items.push(recipientsParagraph(finalArchive, 11, false, false, 'left'));
  return `<w:sdt xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:sdtPr><w:tag w:val="TVCI_RECIPIENTS"/></w:sdtPr><w:sdtContent>${label}${items}</w:sdtContent></w:sdt>`;
}

