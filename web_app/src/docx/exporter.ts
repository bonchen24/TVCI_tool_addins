import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  AlignmentType,
  HeadingLevel,
  LineRuleType,
  BorderStyle,
  UnderlineType,
  PageOrientation,
} from 'docx';
import type { JSONContent, DocxExportOptions } from './types';
import {
  A4_PAGE_GEOMETRY,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE_PT,
  DEFAULT_LINE_SPACING,
  DEFAULT_SPACE_BEFORE_PT,
  DEFAULT_SPACE_AFTER_PT,
  mmToTwip,
  ptToTwip,
  ptToHalfPoints,
  spacingMultipleToTwip,
  getDocumentStyles,
} from './styles';
import { serializeTable } from './table-serializer';

// ==========================================
// 1. Text & Run Serialization
// ==========================================

export function serializeRuns(
  childNode: JSONContent,
  parentAttrs: Record<string, unknown> = {}
): (TextRun | Paragraph)[] {
  if (childNode.type === 'hardBreak') {
    return [new TextRun({ text: '', break: 1 })];
  }

  if (childNode.type !== 'text') {
    return [];
  }

  const text = childNode.text || '';
  const marks = childNode.marks || [];

  const hasMark = (markType: string): boolean =>
    marks.some((m) => m.type === markType) ||
    childNode.attrs?.[markType] === true ||
    childNode[markType] === true;

  const isBold = hasMark('bold');
  const isItalic = hasMark('italic');
  const isUnderline = hasMark('underline');
  const isStrike = hasMark('strike');

  const fontFamilyValue =
    childNode.attrs?.fontFamily ||
    parentAttrs.fontFamily ||
    parentAttrs.fontName ||
    DEFAULT_FONT_FAMILY;
  const fontFamily = typeof fontFamilyValue === 'string' ? fontFamilyValue : DEFAULT_FONT_FAMILY;

  const fontSizeValue =
    childNode.attrs?.fontSize ||
    parentAttrs.fontSize ||
    DEFAULT_FONT_SIZE_PT;
  const fontSizePt = typeof fontSizeValue === 'number' ? fontSizeValue : DEFAULT_FONT_SIZE_PT;

  const textRun = new TextRun({
    text,
    font: fontFamily,
    size: ptToHalfPoints(fontSizePt),
    bold: isBold,
    italics: isItalic,
    strike: isStrike,
    underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
  });

  return [textRun];
}

// ==========================================
// 2. Alignment Mapping
// ==========================================

export function resolveAlignment(
  alignStr?: string,
  defaultAlign: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  if (!alignStr) return defaultAlign;
  switch (alignStr.toLowerCase()) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'left':
      return AlignmentType.LEFT;
    case 'justify':
    case 'both':
    case 'distribute':
      return AlignmentType.JUSTIFIED;
    default:
      return defaultAlign;
  }
}

// ==========================================
// 3. Paragraph Serialization
// ==========================================

export function serializeParagraph(
  node: JSONContent,
  isInsideTable = false
): Paragraph {
  const attrs = node.attrs || {};
  const childrenNodes = node.content || [];

  // Runs
  const runs: TextRun[] = [];
  for (const child of childrenNodes) {
    const serialized = serializeRuns(child, attrs);
    for (const item of serialized) {
      if (item instanceof TextRun) {
        runs.push(item);
      }
    }
  }

  // Fallback empty run to preserve empty paragraph
  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text: '',
        font: attrs.fontFamily || attrs.fontName || DEFAULT_FONT_FAMILY,
        size: ptToHalfPoints(attrs.fontSize || DEFAULT_FONT_SIZE_PT),
      })
    );
  }

  // Alignment
  const defaultAlign = isInsideTable ? AlignmentType.LEFT : AlignmentType.JUSTIFIED;
  const alignment = resolveAlignment(attrs.textAlign || attrs.align, defaultAlign);

  // Spacing
  const lineSpacing = attrs.lineSpacing ?? (isInsideTable ? 1.0 : DEFAULT_LINE_SPACING);
  const spaceBefore = attrs.spaceBefore ?? (isInsideTable ? 0 : DEFAULT_SPACE_BEFORE_PT);
  const spaceAfter = attrs.spaceAfter ?? (isInsideTable ? 2 : DEFAULT_SPACE_AFTER_PT);

  // First Line Indent (only for left/justified text outside tables, or explicitly requested)
  let firstLineIndentDxa = 0;
  if (attrs.firstLineIndentMm && alignment !== AlignmentType.CENTER && alignment !== AlignmentType.RIGHT) {
    firstLineIndentDxa = mmToTwip(attrs.firstLineIndentMm);
  } else if (!isInsideTable && alignment === AlignmentType.JUSTIFIED && attrs.firstLineIndentMm !== 0) {
    firstLineIndentDxa = mmToTwip(attrs.firstLineIndentMm ?? 10);
  }

  return new Paragraph({
    alignment,
    spacing: {
      line: spacingMultipleToTwip(lineSpacing),
      lineRule: LineRuleType.AUTO,
      before: ptToTwip(spaceBefore),
      after: ptToTwip(spaceAfter),
    },
    indent: firstLineIndentDxa > 0 ? { firstLine: firstLineIndentDxa } : undefined,
    children: runs,
  });
}

// ==========================================
// 4. Heading Serialization
// ==========================================

export function serializeHeading(node: JSONContent): Paragraph {
  const level = node.attrs?.level || 1;
  const attrs = node.attrs || {};
  const childrenNodes = node.content || [];

  const headingLevelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };

  const runs: TextRun[] = [];
  for (const child of childrenNodes) {
    const text = child.text || '';
    runs.push(
      new TextRun({
        text,
        font: attrs.fontFamily || DEFAULT_FONT_FAMILY,
        size: ptToHalfPoints(level === 1 ? 14 : 13),
        bold: true,
      })
    );
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: '' }));
  }

  return new Paragraph({
    heading: headingLevelMap[level] || HeadingLevel.HEADING_1,
    alignment: resolveAlignment(attrs.textAlign || attrs.align, AlignmentType.CENTER),
    spacing: {
      before: ptToTwip(attrs.spaceBefore ?? 6),
      after: ptToTwip(attrs.spaceAfter ?? 6),
      line: spacingMultipleToTwip(DEFAULT_LINE_SPACING),
      lineRule: LineRuleType.AUTO,
    },
    children: runs,
  });
}

// ==========================================
// 5. AdminRule Serialization
// ==========================================

export function serializeAdminRule(
  node: JSONContent,
  parentWidthDxa: number = 4210
): Paragraph {
  const kind = node.attrs?.kind || 'AGENCY';
  const percent = node.attrs?.widthPercent ?? (kind === 'MOTTO' ? 95 : 40);
  const sideIndentDxa = Math.round(((100 - percent) / 200) * parentWidthDxa);

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6, // 0.75 pt
        color: '000000',
        space: 1,
      },
    },
    indent: {
      left: Math.max(0, sideIndentDxa),
      right: Math.max(0, sideIndentDxa),
    },
    spacing: {
      before: ptToTwip(1),
      after: ptToTwip(4),
      line: 240,
      lineRule: LineRuleType.AUTO,
    },
    children: [new TextRun({ text: '' })],
  });
}

// ==========================================
// 6. AST Node Dispatcher
// ==========================================

export function serializeNodeToBlocks(
  node: JSONContent,
  parentWidthDxa: number = A4_PAGE_GEOMETRY.usableWidth,
  isInsideTable = false
): (Paragraph | Table)[] {
  switch (node.type) {
    case 'paragraph':
      return [serializeParagraph(node, isInsideTable)];

    case 'heading':
      return [serializeHeading(node)];

    case 'adminRule':
      return [serializeAdminRule(node, parentWidthDxa)];

    case 'table':
      return [
        serializeTable(
          node,
          (child, cellWidth) => {
            const result = serializeNodeToBlocks(child, cellWidth, true);
            return result.filter((item): item is Paragraph => item instanceof Paragraph);
          },
          parentWidthDxa
        ),
      ];

    default:
      if (node.text) {
        return [
          new Paragraph({
            children: [new TextRun({ text: node.text, font: DEFAULT_FONT_FAMILY })],
          }),
        ];
      }
      return [];
  }
}

// ==========================================
// 7. Core Export Pipeline
// ==========================================

/**
 * Builds a docx.Document from a Tiptap JSONContent root document
 */
export function buildDocxDocument(
  doc: JSONContent,
  options: DocxExportOptions = {}
): Document {
  const topMargin = options.pageSetup?.margins?.topMm != null
    ? mmToTwip(options.pageSetup.margins.topMm)
    : A4_PAGE_GEOMETRY.margins.top;

  const bottomMargin = options.pageSetup?.margins?.bottomMm != null
    ? mmToTwip(options.pageSetup.margins.bottomMm)
    : A4_PAGE_GEOMETRY.margins.bottom;

  const leftMargin = options.pageSetup?.margins?.leftMm != null
    ? mmToTwip(options.pageSetup.margins.leftMm)
    : A4_PAGE_GEOMETRY.margins.left;

  const rightMargin = options.pageSetup?.margins?.rightMm != null
    ? mmToTwip(options.pageSetup.margins.rightMm)
    : A4_PAGE_GEOMETRY.margins.right;

  const orientation =
    options.pageSetup?.orientation === 'landscape'
      ? PageOrientation.LANDSCAPE
      : PageOrientation.PORTRAIT;

  const usableWidth = A4_PAGE_GEOMETRY.width - leftMargin - rightMargin;

  const contentNodes = doc.content || [];
  const bodyBlocks: (Paragraph | Table)[] = [];

  for (const node of contentNodes) {
    const blocks = serializeNodeToBlocks(node, usableWidth, false);
    bodyBlocks.push(...blocks);
  }

  // Ensure document has at least one paragraph
  if (bodyBlocks.length === 0) {
    bodyBlocks.push(new Paragraph({}));
  }

  return new Document({
    creator: options.creator || 'TVCI Document System',
    title: options.title || 'Văn bản hành chính',
    description: options.description || 'Hệ thống chuẩn hóa thể thức văn bản TVCI',
    styles: getDocumentStyles(options),
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation,
              width: A4_PAGE_GEOMETRY.width,
              height: A4_PAGE_GEOMETRY.height,
            },
            margin: {
              top: topMargin,
              bottom: bottomMargin,
              left: leftMargin,
              right: rightMargin,
            },
          },
        },
        children: bodyBlocks,
      },
    ],
  });
}

/**
 * Export Tiptap JSONContent AST to a DOCX binary Blob or Buffer
 */
export async function exportDocx(
  doc: JSONContent,
  options: DocxExportOptions = {}
): Promise<Blob | Buffer> {
  const docxDoc = buildDocxDocument(doc, options);

  const isBrowser = typeof window !== 'undefined';
  const outputType = options.outputType ?? (isBrowser ? 'blob' : 'buffer');

  if (outputType === 'blob') {
    return await Packer.toBlob(docxDoc);
  }

  return await Packer.toBuffer(docxDoc);
}

/**
 * Browser-only helper to trigger direct file download of a DOCX Blob
 */
export function downloadDocx(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;

  const safeFilename = filename.toLowerCase().endsWith('.docx')
    ? filename
    : `${filename}.docx`;

  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
