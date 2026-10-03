# DOCX Exporter Architecture & High-Fidelity Design

**Milestone**: M2 (`docx-interop-engine`)  
**Component**: DOCX Exporter (`web_app/src/docx/exporter.ts`, `table-serializer.ts`, `styles.ts`, `types.ts`)  
**Target Standard**: Nghị định 30/2020/NĐ-CP & TVCI Administrative Document Formats  
**Library**: `docx` npm library (v8.5.0)

---

## 1. Executive Summary & Architecture

The DOCX Exporter transforms Tiptap ProseMirror document JSON (`JSONContent`) into standard ECMA-376 OpenXML (`.docx`) binary files. The output files open 100% cleanly in Microsoft Word without repair prompts or XML schema warnings.

### Module Decomposition

```
web_app/src/docx/
├── types.ts             # Shared interfaces (DocxExportOptions, Unit converters, AST shapes)
├── styles.ts            # Default OpenXML styles, typography defaults (Times New Roman), units
├── table-serializer.ts  # AdministrativeTable mapping, column ratio computation, borderless styling
├── exporter.ts          # Core AST walker, Paragraph/Run serialization, isomorphic Packer entry point
└── importer.ts          # (Handled by Explorer 1)
```

```
                        ┌──────────────────────────────┐
                        │   Tiptap JSON (doc node)     │
                        └──────────────┬───────────────┘
                                       │
                         exportDocx(doc, options)
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     Paragraph / Heading / Rule                      Table (admin-header,
     serializeParagraph / serializeHeading           admin-footer, content)
                │                                             │
                │                                    table-serializer.ts
                │                                   (columnWidths, borderless)
                ▼                                             ▼
      docx.Paragraph / docx.TextRun                       docx.Table
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       ▼
                             docx.Document
                     (A4 Portrait, NĐ 30 Margins,
                      Times New Roman Default Styles)
                                       │
                       Packer.toBlob / Packer.toBuffer
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
        Browser Client                               Server / Node
       downloadDocx(blob)                        Buffer / API Route
```

---

## 2. OpenXML Dimensions, Margins & Units (NĐ 30/2020/NĐ-CP)

### 2.1 Standard Measurement Unit Conversion Rules
Word OpenXML operates on **twips** (twentieths of an imperial point) and **half-points**:
- $1\text{ in} = 72\text{ pt} = 25.4\text{ mm} = 1440\text{ twips (dxa)}$
- $1\text{ mm} = \frac{1440}{25.4}\text{ twips} \approx 56.6929\text{ twips}$
- $1\text{ pt} = 20\text{ twips (dxa)}$
- Font sizes in OpenXML (`w:sz`): specified in **half-points** ($1\text{ pt} = 2\text{ half-points}$)
- Line spacing in OpenXML (`w:spacing w:line`): 240 units = 1.0 single line ($1.2\text{ multiple} = 1.2 \times 240 = 288$)

```ts
export const mmToTwip = (mm: number): number => Math.round((mm * 1440) / 25.4);
export const ptToTwip = (pt: number): number => Math.round(pt * 20);
export const ptToHalfPoints = (pt: number): number => Math.round(pt * 2);
export const spacingMultipleToTwip = (multiple: number): number => Math.round(multiple * 240);
```

### 2.2 A4 Page Geometry & Margins

| Dimension | Real Dimension | Twips (dxa) | Formula |
|---|---|---|---|
| Page Width | 210 mm | 11906 | `Math.round(210 * 1440 / 25.4)` |
| Page Height | 297 mm | 16838 | `Math.round(297 * 1440 / 25.4)` |
| Top Margin | 20 mm | 1134 | `Math.round(20 * 1440 / 25.4)` |
| Bottom Margin | 20 mm | 1134 | `Math.round(20 * 1440 / 25.4)` |
| Left Margin | 30 mm | 1701 | `Math.round(30 * 1440 / 25.4)` |
| Right Margin | 15 mm | 850 | `Math.round(15 * 1440 / 25.4)` |
| **Usable Body Width** | **165 mm** | **9355** | `11906 - 1701 - 850` |

### 2.3 Document Section Construction in `docx`

```ts
import { Document, PageOrientation } from 'docx';

export function createDocxDocument(children: (Paragraph | Table)[], options?: DocxExportOptions): Document {
  const topMargin = options?.pageSetup?.margins?.topMm ? mmToTwip(options.pageSetup.margins.topMm) : 1134;
  const bottomMargin = options?.pageSetup?.margins?.bottomMm ? mmToTwip(options.pageSetup.margins.bottomMm) : 1134;
  const leftMargin = options?.pageSetup?.margins?.leftMm ? mmToTwip(options.pageSetup.margins.leftMm) : 1701;
  const rightMargin = options?.pageSetup?.margins?.rightMm ? mmToTwip(options.pageSetup.margins.rightMm) : 850;

  return new Document({
    creator: options?.creator || 'TVCI Document System',
    title: options?.title || 'Văn bản hành chính',
    description: options?.description || 'Hệ thống chuẩn hóa thể thức văn bản TVCI',
    styles: getDocumentStyles(options),
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
              width: 11906,
              height: 16838,
            },
            margin: {
              top: topMargin,
              bottom: bottomMargin,
              left: leftMargin,
              right: rightMargin,
            },
          },
        },
        children: children.length > 0 ? children : [new Paragraph({})],
      },
    ],
  });
}
```

---

## 3. Paragraph & Run Mapping

### 3.1 Mapping Rules

| Attribute | Tiptap JSON Source | Docx Target Property | Value Mapping |
|---|---|---|---|
| **Font Family** | `node.attrs.fontFamily` or `fontName` | `TextRun.font` / Document Styles | Default: `'Times New Roman'` |
| **Font Size** | `node.attrs.fontSize` | `TextRun.size` | `ptToHalfPoints(fontSize)` (e.g. 13pt -> 26) |
| **Bold** | `mark.type === 'bold'` or `attrs.bold` | `TextRun.bold` | `boolean` |
| **Italic** | `mark.type === 'italic'` or `attrs.italic`| `TextRun.italics` | `boolean` (Note: plural `italics`) |
| **Underline** | `mark.type === 'underline'` | `TextRun.underline` | `{ type: UnderlineType.SINGLE }` |
| **Strike** | `mark.type === 'strike'` | `TextRun.strike` | `boolean` |
| **Alignment** | `attrs.textAlign` or `attrs.align` | `Paragraph.alignment` | `'center'` -> `AlignmentType.CENTER`<br>`'right'` -> `AlignmentType.RIGHT`<br>`'left'` -> `AlignmentType.LEFT`<br>`'justify'` -> `AlignmentType.JUSTIFIED` |
| **Line Spacing** | `attrs.lineSpacing` | `Paragraph.spacing.line` | `Math.round(lineSpacing * 240)`<br>`lineRule: LineRuleType.MULTIPLE` |
| **Space Before** | `attrs.spaceBefore` | `Paragraph.spacing.before` | `ptToTwip(spaceBefore)` (e.g. 2pt -> 40) |
| **Space After** | `attrs.spaceAfter` | `Paragraph.spacing.after` | `ptToTwip(spaceAfter)` (e.g. 2pt -> 40) |
| **First Line Indent** | `attrs.firstLineIndentMm` | `Paragraph.indent.firstLine`| `mmToTwip(firstLineIndentMm)` (e.g. 10mm -> 567) |

### 3.2 Administrative Rule (`adminRule`) Mapping
In Vietnamese administrative documents, horizontal rules are placed beneath:
1. Issuing Agency Name (`AGENCY`): ~33% - 50% length of agency text (e.g. 40%).
2. National Motto (`MOTTO`): full length under "Độc lập - Tự do - Hạnh phúc" (~95%).
3. Document Title / Abstract (`ABSTRACT`): ~33% - 50% length of title text (~40%).

In OpenXML, we serialize `adminRule` as a centered `docx.Paragraph` containing a bottom border clipped with left and right margins, or a 1-row, 1-cell borderless table with a bottom border on that cell. The paragraph border approach produces standard, clean OpenXML:
```ts
export function serializeAdminRule(node: JSONContent, parentWidthDxa = 4200): Paragraph {
  const percent = node.attrs?.widthPercent ?? (node.attrs?.kind === 'MOTTO' ? 95 : 40);
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
      lineRule: LineRuleType.MULTIPLE,
    },
    children: [new TextRun({ text: '' })],
  });
}
```

---

## 4. Table Serialization Engine (`table-serializer.ts`)

### 4.1 Administrative Table Layout Specifications
Vietnamese administrative documents rely on 2 specific two-column tables with invisible borders:
1. **Header Table (`admin-header`)**:
   - Left cell: Issuing Agency & Reference Number (~40% - 45% width, ~4200 dxa).
   - Right cell: National Motto & Place/Date (~55% - 60% width, ~5155 dxa).
   - Total width: 9355 dxa (matches full body width between 30mm left and 15mm right margins).
2. **Footer Table (`admin-footer`)**:
   - Left cell: Recipients ("Nơi nhận:") (50% width, ~4677 dxa).
   - Right cell: Signer block (Role, space, Full Name) (50% width, ~4678 dxa).
   - Total width: 9355 dxa.
3. **Content Table (`content`)**:
   - Standard data table. If `colwidth` is present on cells, proportional DXA is allocated. Otherwise, width is split evenly.

### 4.2 Complete Border Suppression
To guarantee that administrative tables are completely borderless in all versions of Microsoft Word (Desktop 2013-365, Word Online, Word Mac), borders must be set to `BorderStyle.NONE` at both **table** level (`w:tblBorders`) and **cell** level (`w:tcBorders`):

```ts
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
```

### 4.3 Table Column Calculation Algorithm
```ts
export function resolveColumnWidths(tableNode: JSONContent, totalWidthDxa = 9355): number[] {
  const tableType = tableNode.attrs?.tableType;
  const columnRatio = tableNode.attrs?.columnRatio;
  const columnRatios = tableNode.attrs?.columnRatios;

  // Header table default (45% / 55% or 40% / 60%)
  if (tableType === 'admin-header' || columnRatio === '40-60' || (Array.isArray(columnRatios) && columnRatios[0] <= 0.48)) {
    const leftRatio = Array.isArray(columnRatios) ? columnRatios[0] : 0.45;
    const leftWidth = Math.round(totalWidthDxa * leftRatio);
    return [leftWidth, totalWidthDxa - leftWidth];
  }

  // Footer table default (50% / 50%)
  if (tableType === 'admin-footer' || columnRatio === '50-50' || (Array.isArray(columnRatios) && Math.abs(columnRatios[0] - 0.5) < 0.05)) {
    const halfWidth = Math.floor(totalWidthDxa / 2);
    return [halfWidth, totalWidthDxa - halfWidth];
  }

  // Inspect first row cells for colwidth
  const firstRow = tableNode.content?.[0];
  const cells = firstRow?.content || [];
  if (cells.length === 0) return [totalWidthDxa];

  const colWidthsFromCells = cells.map((cell) => cell.attrs?.colwidth?.[0]);
  const hasAllColWidths = colWidthsFromCells.every((w) => typeof w === 'number' && w > 0);

  if (hasAllColWidths) {
    const sumPixels = colWidthsFromCells.reduce((a, b) => a + b, 0);
    return colWidthsFromCells.map((px) => Math.round((px / sumPixels) * totalWidthDxa));
  }

  // Equal division fallback
  const cellCount = cells.length;
  const baseWidth = Math.floor(totalWidthDxa / cellCount);
  const widths = Array(cellCount).fill(baseWidth);
  widths[widths.length - 1] = totalWidthDxa - baseWidth * (cellCount - 1);
  return widths;
}
```

---

## 5. Export Interface Contract & Download Helper

### 5.1 Public Signature
```ts
export interface DocxExportOptions {
  title?: string;
  creator?: string;
  description?: string;
  outputType?: 'blob' | 'buffer' | 'auto';
  pageSetup?: {
    pageSize?: 'A4';
    orientation?: 'portrait' | 'landscape';
    margins?: {
      topMm?: number;
      bottomMm?: number;
      leftMm?: number;
      rightMm?: number;
    };
  };
  defaultFont?: string;
  defaultFontSize?: number;
}

export async function exportDocx(
  doc: JSONContent,
  options?: DocxExportOptions
): Promise<Blob | Buffer>
```

### 5.2 Browser Download Helper
Zero dependencies, standard DOM API:
```ts
export function downloadDocx(blob: Blob, filename = 'van-ban.docx'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## 6. Concrete Implementation Code

### 6.1 `web_app/src/docx/types.ts`
```ts
import type { JSONContent } from '@tiptap/core';

export interface DocxPageMargins {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

export interface DocxPageSetup {
  pageSize: 'A4';
  orientation: 'portrait' | 'landscape';
  margins: DocxPageMargins;
}

export interface DocxExportOptions {
  title?: string;
  creator?: string;
  description?: string;
  outputType?: 'blob' | 'buffer' | 'auto';
  pageSetup?: {
    pageSize?: 'A4';
    orientation?: 'portrait' | 'landscape';
    margins?: {
      topMm?: number;
      bottomMm?: number;
      leftMm?: number;
      rightMm?: number;
    };
  };
  defaultFont?: string;
  defaultFontSize?: number;
}
```

### 6.2 `web_app/src/docx/styles.ts`
```ts
import {
  HeadingLevel,
  type IStylesOptions,
  LineRuleType,
} from 'docx';
import type { DocxExportOptions } from './types';

export const mmToTwip = (mm: number): number => Math.round((mm * 1440) / 25.4);
export const ptToTwip = (pt: number): number => Math.round(pt * 20);
export const ptToHalfPoints = (pt: number): number => Math.round(pt * 2);
export const spacingMultipleToTwip = (multiple: number): number => Math.round(multiple * 240);

export function getDocumentStyles(options?: DocxExportOptions): IStylesOptions {
  const defaultFont = options?.defaultFont || 'Times New Roman';
  const defaultSizePt = options?.defaultFontSize || 13;

  return {
    default: {
      document: {
        run: {
          font: defaultFont,
          size: ptToHalfPoints(defaultSizePt),
        },
        paragraph: {
          spacing: {
            line: spacingMultipleToTwip(1.2),
            lineRule: LineRuleType.MULTIPLE,
            before: ptToTwip(2),
            after: ptToTwip(2),
          },
        },
      },
    },
    paragraphStyles: [
      {
        id: 'Normal',
        name: 'Normal',
        quickFormat: true,
        run: {
          font: defaultFont,
          size: ptToHalfPoints(defaultSizePt),
        },
      },
      {
        id: HeadingLevel.HEADING_1,
        name: 'Heading 1',
        quickFormat: true,
        run: {
          font: defaultFont,
          size: ptToHalfPoints(14),
          bold: true,
        },
        paragraph: {
          spacing: {
            before: ptToTwip(6),
            after: ptToTwip(6),
            line: spacingMultipleToTwip(1.2),
            lineRule: LineRuleType.MULTIPLE,
          },
        },
      },
      {
        id: HeadingLevel.HEADING_2,
        name: 'Heading 2',
        quickFormat: true,
        run: {
          font: defaultFont,
          size: ptToHalfPoints(13),
          bold: true,
        },
        paragraph: {
          spacing: {
            before: ptToTwip(4),
            after: ptToTwip(4),
            line: spacingMultipleToTwip(1.2),
            lineRule: LineRuleType.MULTIPLE,
          },
        },
      },
    ],
  };
}
```

### 6.3 `web_app/src/docx/table-serializer.ts`
```ts
import type { JSONContent } from '@tiptap/core';
import {
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalAlign,
  Paragraph,
} from 'docx';
import type { DocxExportOptions } from './types';
import { ptToTwip } from './styles';

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

export const STANDARD_TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

export function resolveColumnWidths(tableNode: JSONContent, totalWidthDxa = 9355): number[] {
  const tableType = tableNode.attrs?.tableType;
  const columnRatio = tableNode.attrs?.columnRatio;
  const columnRatios = tableNode.attrs?.columnRatios;

  if (tableType === 'admin-header' || columnRatio === '40-60' || (Array.isArray(columnRatios) && columnRatios[0] <= 0.48)) {
    const leftRatio = Array.isArray(columnRatios) ? columnRatios[0] : 0.45;
    const leftWidth = Math.round(totalWidthDxa * leftRatio);
    return [leftWidth, totalWidthDxa - leftWidth];
  }

  if (tableType === 'admin-footer' || columnRatio === '50-50' || (Array.isArray(columnRatios) && Math.abs(columnRatios[0] - 0.5) < 0.05)) {
    const halfWidth = Math.floor(totalWidthDxa / 2);
    return [halfWidth, totalWidthDxa - halfWidth];
  }

  const firstRow = tableNode.content?.[0];
  const cells = firstRow?.content || [];
  if (cells.length === 0) return [totalWidthDxa];

  const colWidthsFromCells = cells.map((cell) => cell.attrs?.colwidth?.[0]);
  const hasAllColWidths = colWidthsFromCells.every((w) => typeof w === 'number' && w > 0);

  if (hasAllColWidths) {
    const sumPixels = colWidthsFromCells.reduce((a, b) => a + b, 0);
    return colWidthsFromCells.map((px) => Math.round((px / sumPixels) * totalWidthDxa));
  }

  const cellCount = cells.length;
  const baseWidth = Math.floor(totalWidthDxa / cellCount);
  const widths = Array(cellCount).fill(baseWidth);
  widths[widths.length - 1] = totalWidthDxa - baseWidth * (cellCount - 1);
  return widths;
}

export function serializeTable(
  node: JSONContent,
  serializeBlock: (childNode: JSONContent, parentWidthDxa?: number) => Paragraph | Table,
  options?: DocxExportOptions
): Table {
  const isBorderless = Boolean(node.attrs?.isBorderless || node.attrs?.borderless);
  const totalWidthDxa = 9355;
  const colWidths = resolveColumnWidths(node, totalWidthDxa);

  const rowNodes = (node.content || []).filter(
    (n) => n.type === 'tableRow' || n.type === 'row'
  );

  const rows = rowNodes.map((rowNode) => {
    const cellNodes = (rowNode.content || []).filter(
      (n) => n.type === 'tableCell' || n.type === 'tableHeader' || n.type === 'cell'
    );

    const cells = cellNodes.map((cellNode, colIdx) => {
      const cellWidthDxa = colWidths[colIdx] || Math.floor(totalWidthDxa / cellNodes.length);

      const cellChildren: (Paragraph | Table)[] = [];
      const childrenJson = cellNode.content || [];

      for (const childJson of childrenJson) {
        cellChildren.push(serializeBlock(childJson, cellWidthDxa));
      }

      // OpenXML requirement: Cell must contain at least one paragraph
      if (cellChildren.length === 0) {
        cellChildren.push(new Paragraph({}));
      }

      return new TableCell({
        width: {
          size: cellWidthDxa,
          type: WidthType.DXA,
        },
        borders: isBorderless ? BORDERLESS_CELL_BORDERS : undefined,
        verticalAlign: VerticalAlign.TOP,
        margins: {
          top: ptToTwip(1),
          bottom: ptToTwip(1),
          left: ptToTwip(2),
          right: ptToTwip(2),
        },
        children: cellChildren,
      });
    });

    return new TableRow({
      children: cells,
    });
  });

  return new Table({
    width: {
      size: totalWidthDxa,
      type: WidthType.DXA,
    },
    columnWidths: colWidths,
    borders: isBorderless ? BORDERLESS_TABLE_BORDERS : STANDARD_TABLE_BORDERS,
    rows: rows.length > 0 ? rows : [new TableRow({ children: [new TableCell({ children: [new Paragraph({})] })] })],
  });
}
```

### 6.4 `web_app/src/docx/exporter.ts`
```ts
import type { JSONContent } from '@tiptap/core';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  AlignmentType,
  LineRuleType,
  UnderlineType,
  HeadingLevel,
  BorderStyle,
  PageOrientation,
} from 'docx';
import type { DocxExportOptions } from './types';
import {
  getDocumentStyles,
  mmToTwip,
  ptToTwip,
  ptToHalfPoints,
  spacingMultipleToTwip,
} from './styles';
import { serializeTable } from './table-serializer';

function resolveAlignment(alignStr?: string): AlignmentType {
  const norm = (alignStr || '').toLowerCase().trim();
  if (norm === 'center' || norm === 'centered') return AlignmentType.CENTER;
  if (norm === 'right') return AlignmentType.RIGHT;
  if (norm === 'left') return AlignmentType.LEFT;
  return AlignmentType.JUSTIFIED;
}

export function serializeAdminRule(node: JSONContent, parentWidthDxa = 4200): Paragraph {
  const percent = node.attrs?.widthPercent ?? (node.attrs?.kind === 'MOTTO' ? 95 : 40);
  const sideIndentDxa = Math.round(((100 - percent) / 200) * parentWidthDxa);

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
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
      lineRule: LineRuleType.MULTIPLE,
    },
    children: [new TextRun({ text: '' })],
  });
}

export function serializeRuns(
  node: JSONContent,
  inheritedFont = 'Times New Roman',
  inheritedSizePt = 13,
  inheritedAttrs: Record<string, any> = {}
): TextRun[] {
  const runs: TextRun[] = [];

  // Case 1: Node has direct text property (as in test fixtures)
  if (typeof node.text === 'string' && (!node.content || node.content.length === 0)) {
    const isBold = Boolean(inheritedAttrs.bold || node.attrs?.bold);
    const isItalic = Boolean(inheritedAttrs.italic || node.attrs?.italic);
    const isUnderline = Boolean(inheritedAttrs.underline || node.attrs?.underline);
    const isStrike = Boolean(inheritedAttrs.strike || node.attrs?.strike);

    runs.push(
      new TextRun({
        text: node.text,
        font: inheritedFont,
        size: ptToHalfPoints(inheritedSizePt),
        bold: isBold,
        italics: isItalic,
        underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
        strike: isStrike,
      })
    );
    return runs;
  }

  // Case 2: Standard Tiptap content array
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (child.type === 'text' && typeof child.text === 'string') {
        const marks = Array.isArray(child.marks) ? child.marks : [];
        const isBold = marks.some((m) => m.type === 'bold') || Boolean(inheritedAttrs.bold);
        const isItalic = marks.some((m) => m.type === 'italic') || Boolean(inheritedAttrs.italic);
        const isUnderline = marks.some((m) => m.type === 'underline') || Boolean(inheritedAttrs.underline);
        const isStrike = marks.some((m) => m.type === 'strike') || Boolean(inheritedAttrs.strike);

        runs.push(
          new TextRun({
            text: child.text,
            font: inheritedFont,
            size: ptToHalfPoints(inheritedSizePt),
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
            strike: isStrike,
          })
        );
      } else if (child.type === 'hardBreak') {
        runs.push(new TextRun({ text: '', break: 1 }));
      }
    }
  }

  return runs;
}

export function serializeParagraph(node: JSONContent, options?: DocxExportOptions): Paragraph {
  const attrs = node.attrs || {};
  const fontName = attrs.fontFamily || attrs.fontName || options?.defaultFont || 'Times New Roman';
  const fontSizePt = typeof attrs.fontSize === 'number' ? attrs.fontSize : (options?.defaultFontSize || 13);
  const alignStr = attrs.textAlign || attrs.align || 'justify';
  const alignment = resolveAlignment(alignStr);

  const lineSpacing = typeof attrs.lineSpacing === 'number' ? attrs.lineSpacing : 1.2;
  const spaceBefore = typeof attrs.spaceBefore === 'number' ? attrs.spaceBefore : 2;
  const spaceAfter = typeof attrs.spaceAfter === 'number' ? attrs.spaceAfter : 2;
  const indentMm = typeof attrs.firstLineIndentMm === 'number' ? attrs.firstLineIndentMm : 0;

  const runs = serializeRuns(node, fontName, fontSizePt, attrs);

  return new Paragraph({
    alignment,
    spacing: {
      line: spacingMultipleToTwip(lineSpacing),
      lineRule: LineRuleType.MULTIPLE,
      before: ptToTwip(spaceBefore),
      after: ptToTwip(spaceAfter),
    },
    indent: indentMm > 0 ? { firstLine: mmToTwip(indentMm) } : undefined,
    children: runs,
  });
}

export function serializeHeading(node: JSONContent, options?: DocxExportOptions): Paragraph {
  const attrs = node.attrs || {};
  const level = typeof attrs.level === 'number' ? attrs.level : 1;
  const headingLevel =
    level === 1 ? HeadingLevel.HEADING_1 :
    level === 2 ? HeadingLevel.HEADING_2 :
    level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4;

  const fontName = attrs.fontFamily || attrs.fontName || options?.defaultFont || 'Times New Roman';
  const fontSizePt = typeof attrs.fontSize === 'number' ? attrs.fontSize : 14;
  const alignStr = attrs.textAlign || attrs.align || 'left';
  const alignment = resolveAlignment(alignStr);

  const runs = serializeRuns(node, fontName, fontSizePt, { ...attrs, bold: attrs.bold ?? true });

  return new Paragraph({
    heading: headingLevel,
    alignment,
    spacing: {
      line: spacingMultipleToTwip(attrs.lineSpacing ?? 1.2),
      lineRule: LineRuleType.MULTIPLE,
      before: ptToTwip(attrs.spaceBefore ?? 6),
      after: ptToTwip(attrs.spaceAfter ?? 6),
    },
    children: runs,
  });
}

export function serializeBlockNode(node: JSONContent, parentWidthDxa = 9355, options?: DocxExportOptions): Paragraph | Table {
  switch (node.type) {
    case 'paragraph':
      return serializeParagraph(node, options);
    case 'heading':
      return serializeHeading(node, options);
    case 'adminRule':
      return serializeAdminRule(node, parentWidthDxa);
    case 'table':
      return serializeTable(node, (child, w) => serializeBlockNode(child, w, options), options);
    default:
      return serializeParagraph(node, options);
  }
}

export async function exportDocx(
  doc: JSONContent,
  options?: DocxExportOptions
): Promise<Blob | Buffer> {
  const childrenJson = Array.isArray(doc.content) ? doc.content : [];
  const docxChildren: (Paragraph | Table)[] = [];

  for (const blockJson of childrenJson) {
    docxChildren.push(serializeBlockNode(blockJson, 9355, options));
  }

  if (docxChildren.length === 0) {
    docxChildren.push(new Paragraph({}));
  }

  const topMargin = options?.pageSetup?.margins?.topMm ? mmToTwip(options.pageSetup.margins.topMm) : 1134;
  const bottomMargin = options?.pageSetup?.margins?.bottomMm ? mmToTwip(options.pageSetup.margins.bottomMm) : 1134;
  const leftMargin = options?.pageSetup?.margins?.leftMm ? mmToTwip(options.pageSetup.margins.leftMm) : 1701;
  const rightMargin = options?.pageSetup?.margins?.rightMm ? mmToTwip(options.pageSetup.margins.rightMm) : 850;

  const docxDoc = new Document({
    creator: options?.creator || 'TVCI Document System',
    title: options?.title || 'Văn bản hành chính',
    description: options?.description || 'Hệ thống chuẩn hóa thể thức văn bản TVCI',
    styles: getDocumentStyles(options),
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
              width: 11906,
              height: 16838,
            },
            margin: {
              top: topMargin,
              bottom: bottomMargin,
              left: leftMargin,
              right: rightMargin,
            },
          },
        },
        children: docxChildren,
      },
    ],
  });

  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  const targetOutput = options?.outputType || (isBrowser ? 'blob' : 'buffer');

  if (targetOutput === 'buffer') {
    return await Packer.toBuffer(docxDoc);
  }
  return await Packer.toBlob(docxDoc);
}

export function downloadDocx(blob: Blob, filename = 'van-ban.docx'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## 7. Verification Strategy & Test Suites

### 7.1 Unit Tests (`web_app/tests/unit/docx-export.test.ts`)
Using Vitest and `jszip`:
1. **Mathematical Constants & Conversions**:
   - `mmToTwip(20) === 1134`
   - `mmToTwip(30) === 1701`
   - `mmToTwip(15) === 850`
   - `ptToTwip(2) === 40`
   - `ptToHalfPoints(13) === 26`
   - `spacingMultipleToTwip(1.2) === 288`
2. **Binary Package Integrity**:
   - `exportDocx(defaultDocumentState, { outputType: 'buffer' })` produces a Buffer.
   - Buffer starts with ZIP magic bytes `[0x50, 0x4B, 0x03, 0x04]`.
   - Size > 4000 bytes.
3. **OpenXML Internal Structure Check**:
   - Load with `JSZip.loadAsync(buffer)`.
   - Verify presence of:
     - `[Content_Types].xml`
     - `_rels/.rels`
     - `word/document.xml`
     - `word/styles.xml`
     - `word/_rels/document.xml.rels`
4. **Document XML Schema Validation**:
   - Inspect `word/document.xml`:
     - Contains `w:rFonts w:ascii="Times New Roman"`
     - Contains UTF-8 Vietnamese strings without mojibake (e.g. `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM`).
     - Contains `<w:tbl>` with borderless properties: `<w:top w:val="none"/>` or `w:tblBorders`.
     - Contains margin twips: `w:top="1134"`, `w:bottom="1134"`, `w:left="1701"`, `w:right="850"`.
5. **Fixtures & Edge Cases**:
   - Export `SAMPLE_CONG_VAN_DOC`.
   - Export empty document `{ type: 'doc', content: [] }`.
   - Export table with empty cells (ensures fallback `<w:p/>` inside `<w:tc>`).
   - Export runs with multiple combinations of bold, italic, underline, strike.

### 7.2 Compatibility with E2E Tier 1 Runner
Verification passes feature `f06` in `web_app/e2e-tests/tier1-feature/f06_docx_export.test.ts`:
- mm to dxa margin calculation.
- Times New Roman font declarations.
- Space before/after dxa computation.
- 2-column header table borderless attribute and alignment.
- Valid OpenXML ZIP package structure.
