import {
  Table,
  TableRow,
  TableCell,
  Paragraph,
  BorderStyle,
  WidthType,
  AlignmentType,
  VerticalAlign,
} from 'docx';
import type { JSONContent } from './types';
import { ADMIN_TABLE_DXA, A4_PAGE_GEOMETRY } from './styles';

// ==========================================
// Border Presets
// ==========================================

export const BORDERLESS_TABLE_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

export const BORDERLESS_CELL_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

export const DEFAULT_CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

// ==========================================
// Column Width Calculation
// ==========================================

/**
 * Resolves exact DXA widths for columns in a table node.
 * - Header table: [4210, 5145] twips
 * - Footer table: [4677, 4678] twips
 * - Content table: proportional or equal division
 */
export function resolveColumnWidths(
  tableNode: JSONContent,
  totalWidthDxa: number = A4_PAGE_GEOMETRY.usableWidth
): number[] {
  const tableType = tableNode.attrs?.tableType;
  const columnRatio = tableNode.attrs?.columnRatio;
  const columnRatios = tableNode.attrs?.columnRatios;

  // 1. Header table (Agency 45% + Motto 55% or custom ratio)
  if (
    tableType === 'admin-header' ||
    columnRatio === '40-60' ||
    (Array.isArray(columnRatios) && columnRatios[0] <= 0.48)
  ) {
    if (Array.isArray(columnRatios) && columnRatios.length >= 2) {
      const leftRatio = columnRatios[0];
      const leftWidth = Math.round(totalWidthDxa * leftRatio);
      return [leftWidth, totalWidthDxa - leftWidth];
    }
    return [ADMIN_TABLE_DXA.header.left, ADMIN_TABLE_DXA.header.right]; // [4210, 5145]
  }

  // 2. Footer table (Recipients 50% + Signer 50%)
  if (
    tableType === 'admin-footer' ||
    columnRatio === '50-50' ||
    (Array.isArray(columnRatios) && Math.abs(columnRatios[0] - 0.5) < 0.05)
  ) {
    return [ADMIN_TABLE_DXA.footer.left, ADMIN_TABLE_DXA.footer.right]; // [4677, 4678]
  }

  // 3. Inspect first row for column count and cell colwidth attributes
  const firstRow = tableNode.content?.[0];
  const cells = firstRow?.content || [];
  if (cells.length === 0) return [totalWidthDxa];

  const colCount = cells.length;
  const colWidthsFromCells = cells.map((cell) => cell.attrs?.colwidth?.[0]);
  const hasAllColWidths = colWidthsFromCells.every((w) => typeof w === 'number' && w > 0);

  if (hasAllColWidths) {
    const rawTotal = colWidthsFromCells.reduce((sum, w) => sum + (w as number), 0);
    if (rawTotal > 0) {
      let accumulated = 0;
      return colWidthsFromCells.map((w, index) => {
        if (index === colCount - 1) {
          return Math.max(100, totalWidthDxa - accumulated);
        }
        const calculated = Math.round(((w as number) / rawTotal) * totalWidthDxa);
        accumulated += calculated;
        return calculated;
      });
    }
  }

  // Fallback: divide width equally among columns
  const baseWidth = Math.floor(totalWidthDxa / colCount);
  const widths: number[] = [];
  let allocated = 0;
  for (let i = 0; i < colCount; i++) {
    if (i === colCount - 1) {
      widths.push(totalWidthDxa - allocated);
    } else {
      widths.push(baseWidth);
      allocated += baseWidth;
    }
  }
  return widths;
}

// ==========================================
// Table Serializer
// ==========================================

export type NodeToParagraphsFn = (child: JSONContent, cellWidthDxa: number) => Paragraph[];

/**
 * Serializes a Tiptap table AST node into a docx.Table instance.
 */
export function serializeTable(
  node: JSONContent,
  serializeNodeToParagraphs: NodeToParagraphsFn,
  totalWidthDxa: number = A4_PAGE_GEOMETRY.usableWidth
): Table {
  const tableType = node.attrs?.tableType || 'content';
  const isBorderless =
    node.attrs?.isBorderless === true ||
    node.attrs?.borderless === true ||
    tableType === 'admin-header' ||
    tableType === 'admin-footer';

  const colWidths = resolveColumnWidths(node, totalWidthDxa);
  const rowsContent = node.content || [];

  const docxRows: TableRow[] = [];

  for (const rowNode of rowsContent) {
    if (rowNode.type !== 'tableRow') continue;

    const cellNodes = rowNode.content || [];
    const docxCells: TableCell[] = [];

    cellNodes.forEach((cellNode, cellIndex) => {
      if (cellNode.type !== 'tableCell' && cellNode.type !== 'tableHeader') return;

      const cellWidth = colWidths[cellIndex] ?? colWidths[colWidths.length - 1] ?? 4677;

      // Serialize cell inner content
      // ponytail: 1-level table flattening. Upgrade when nested content tables are required.
      const cellParagraphs: Paragraph[] = [];
      const innerContent = cellNode.content || [];

      for (const innerNode of innerContent) {
        const paragraphs = serializeNodeToParagraphs(innerNode, cellWidth);
        cellParagraphs.push(...paragraphs);
      }

      // OpenXML requirement: TableCell MUST contain at least one Paragraph
      if (cellParagraphs.length === 0) {
        cellParagraphs.push(new Paragraph({}));
      }

      // Cell vertical alignment
      let vAlign: (typeof VerticalAlign)[keyof typeof VerticalAlign] = VerticalAlign.TOP;
      if (cellNode.attrs?.verticalAlign === 'center' || cellNode.attrs?.vAlign === 'center') {
        vAlign = VerticalAlign.CENTER;
      } else if (cellNode.attrs?.verticalAlign === 'bottom' || cellNode.attrs?.vAlign === 'bottom') {
        vAlign = VerticalAlign.BOTTOM;
      }

      const cell = new TableCell({
        width: {
          size: cellWidth,
          type: WidthType.DXA,
        },
        verticalAlign: vAlign,
        borders: isBorderless ? BORDERLESS_CELL_BORDERS : DEFAULT_CELL_BORDERS,
        margins: {
          top: 60, // 3pt padding
          bottom: 60,
          left: 100, // 5pt padding
          right: 100,
        },
        children: cellParagraphs,
      });

      docxCells.push(cell);
    });

    // Ensure row has at least one cell
    if (docxCells.length === 0) {
      docxCells.push(
        new TableCell({
          width: { size: totalWidthDxa, type: WidthType.DXA },
          borders: isBorderless ? BORDERLESS_CELL_BORDERS : DEFAULT_CELL_BORDERS,
          children: [new Paragraph({})],
        })
      );
    }

    docxRows.push(
      new TableRow({
        children: docxCells,
      })
    );
  }

  // Fallback if table had no rows
  if (docxRows.length === 0) {
    docxRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: totalWidthDxa, type: WidthType.DXA },
            borders: isBorderless ? BORDERLESS_CELL_BORDERS : DEFAULT_CELL_BORDERS,
            children: [new Paragraph({})],
          }),
        ],
      })
    );
  }

  return new Table({
    width: {
      size: totalWidthDxa,
      type: WidthType.DXA,
    },
    columnWidths: colWidths,
    alignment: AlignmentType.CENTER,
    borders: isBorderless ? BORDERLESS_TABLE_BORDERS : undefined,
    rows: docxRows,
  });
}
