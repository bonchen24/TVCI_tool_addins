import { mergeAttributes, Node } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import { UndoRedo } from '@tiptap/extensions';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Paragraph } from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { VietnameseSpellcheck, type VietnameseSpellcheckOptions } from './spellcheck-extension';

export interface AdministrativeParagraphAttributes {
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  spaceBefore: number;
  spaceAfter: number;
  firstLineIndentMm: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    administrativeParagraph: {
      setParagraphFormatting: (attributes: Partial<AdministrativeParagraphAttributes>) => ReturnType;
      resetToAdministrativeStandard: () => ReturnType;
      setLineSpacing: (spacing: number) => ReturnType;
      setParagraphSpacing: (beforePt: number, afterPt: number) => ReturnType;
      setFirstLineIndent: (indentMm: number) => ReturnType;
      setFontSize: (sizePt: number) => ReturnType;
    };
    adminRule: {
      setAdminRule: (attrs: { kind: AdminRuleKind; widthPercent?: number }) => ReturnType;
    };
  }
}

export const AdministrativeParagraph = Paragraph.extend({
  name: 'paragraph',

  addAttributes() {
    return {
      ...this.parent?.(),
      fontFamily: {
        default: 'Times New Roman',
        parseHTML: (element) => {
          const font = element.style.fontFamily;
          if (!font) return 'Times New Roman';
          return font.replace(/['"]/g, '').split(',')[0].trim();
        },
        renderHTML: (attributes) => ({
          'data-font-family': attributes.fontFamily || 'Times New Roman',
        }),
      },
      fontSize: {
        default: 13,
        parseHTML: (element) => {
          const match = element.style.fontSize?.match(/^([\d.]+)pt$/);
          if (match) return parseFloat(match[1]);
          const pxMatch = element.style.fontSize?.match(/^([\d.]+)px$/);
          if (pxMatch) return Math.round((parseFloat(pxMatch[1]) * 72) / 96);
          return 13;
        },
        renderHTML: (attributes) => ({
          'data-font-size': attributes.fontSize || 13,
        }),
      },
      lineSpacing: {
        default: 1.2,
        parseHTML: (element) => {
          const lh = element.style.lineHeight;
          if (!lh || lh === 'normal') return 1.2;
          return parseFloat(lh) || 1.2;
        },
        renderHTML: (attributes) => ({
          'data-line-spacing': attributes.lineSpacing || 1.2,
        }),
      },
      spaceBefore: {
        default: 2,
        parseHTML: (element) => {
          const match = element.style.marginTop?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 2;
        },
        renderHTML: (attributes) => ({
          'data-space-before': attributes.spaceBefore ?? 2,
        }),
      },
      spaceAfter: {
        default: 2,
        parseHTML: (element) => {
          const match = element.style.marginBottom?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 2;
        },
        renderHTML: (attributes) => ({
          'data-space-after': attributes.spaceAfter ?? 2,
        }),
      },
      firstLineIndentMm: {
        default: 10,
        parseHTML: (element) => {
          const match = element.style.textIndent?.match(/^([\d.]+)mm$/);
          if (match) return parseFloat(match[1]);
          const cmMatch = element.style.textIndent?.match(/^([\d.]+)cm$/);
          if (cmMatch) return parseFloat(cmMatch[1]) * 10;
          return 10;
        },
        renderHTML: (attributes) => ({
          'data-indent-mm': attributes.firstLineIndentMm ?? 10,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const fontFamily = HTMLAttributes['data-font-family'] || 'Times New Roman';
    const fontSize = HTMLAttributes['data-font-size'] || 13;
    const lineSpacing = HTMLAttributes['data-line-spacing'] || 1.2;
    const spaceBefore = HTMLAttributes['data-space-before'] ?? 2;
    const spaceAfter = HTMLAttributes['data-space-after'] ?? 2;
    const indent = HTMLAttributes['data-indent-mm'];

    const styles: string[] = [
      `font-family: "${fontFamily}", Times, serif`,
      `font-size: ${fontSize}pt`,
      `line-height: ${lineSpacing}`,
      `margin-top: ${spaceBefore}pt`,
      `margin-bottom: ${spaceAfter}pt`,
    ];

    if (indent !== undefined && indent !== null && Number(indent) > 0) {
      styles.push(`text-indent: ${indent}mm`);
    } else {
      styles.push('text-indent: 0mm');
    }

    if (HTMLAttributes.style) {
      styles.push(HTMLAttributes.style);
    }

    const cleanAttributes = { ...HTMLAttributes };
    delete cleanAttributes.style;
    return ['p', mergeAttributes(this.options.HTMLAttributes, cleanAttributes, { style: styles.join('; ') }), 0];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setParagraphFormatting:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', attrs);
        },

      resetToAdministrativeStandard:
        () =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', {
            fontFamily: 'Times New Roman',
            fontSize: 13,
            lineSpacing: 1.2,
            spaceBefore: 2,
            spaceAfter: 2,
            firstLineIndentMm: 10,
          });
        },

      setLineSpacing:
        (spacing) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { lineSpacing: spacing });
        },

      setParagraphSpacing:
        (beforePt, afterPt) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { spaceBefore: beforePt, spaceAfter: afterPt });
        },

      setFirstLineIndent:
        (indentMm) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { firstLineIndentMm: indentMm });
        },

      setFontSize:
        (sizePt) =>
        ({ commands }) => {
          const updatedParagraph = commands.updateAttributes('paragraph', { fontSize: sizePt });
          const updatedHeading = commands.updateAttributes('heading', { fontSize: sizePt });
          return updatedParagraph || updatedHeading;
        },
    };
  },
});

export const AdministrativeHeading = Heading.extend({
  name: 'heading',

  addAttributes() {
    return {
      ...this.parent?.(),
      fontFamily: {
        default: 'Times New Roman',
        parseHTML: (element) => element.style.fontFamily || 'Times New Roman',
        renderHTML: (attributes) => ({
          'data-font-family': attributes.fontFamily || 'Times New Roman',
        }),
      },
      fontSize: {
        default: 14,
        parseHTML: (element) => {
          const match = element.style.fontSize?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 14;
        },
        renderHTML: (attributes) => ({
          'data-font-size': attributes.fontSize || 14,
        }),
      },
      lineSpacing: {
        default: 1.2,
        parseHTML: (element) => parseFloat(element.style.lineHeight) || 1.2,
        renderHTML: (attributes) => ({
          'data-line-spacing': attributes.lineSpacing || 1.2,
        }),
      },
      spaceBefore: {
        default: 6,
        parseHTML: (element) => {
          const match = element.style.marginTop?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 6;
        },
        renderHTML: (attributes) => ({
          'data-space-before': attributes.spaceBefore ?? 6,
        }),
      },
      spaceAfter: {
        default: 6,
        parseHTML: (element) => {
          const match = element.style.marginBottom?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 6;
        },
        renderHTML: (attributes) => ({
          'data-space-after': attributes.spaceAfter ?? 6,
        }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level || 1;
    const styles: string[] = [
      `font-family: "${node.attrs.fontFamily || 'Times New Roman'}", Times, serif`,
      `font-size: ${node.attrs.fontSize || 14}pt`,
      `line-height: ${node.attrs.lineSpacing || 1.2}`,
      `margin-top: ${node.attrs.spaceBefore ?? 6}pt`,
      `margin-bottom: ${node.attrs.spaceAfter ?? 6}pt`,
    ];
    if (HTMLAttributes.style) {
      styles.push(HTMLAttributes.style);
    }

    const rest = { ...HTMLAttributes };
    delete rest.style;
    return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, rest, { style: styles.join('; ') }), 0];
  },
});

export type AdministrativeTableType = 'admin-header' | 'admin-footer' | 'content';
export type AdministrativeColumnRatio = '40-60' | '50-50' | 'custom';

export interface AdministrativeTableAttributes {
  tableType: AdministrativeTableType;
  isBorderless: boolean;
  borderless: boolean;
  columnRatio: AdministrativeColumnRatio;
  columnRatios: [number, number] | number[] | null;
}

export const AdministrativeTable = Table.extend({
  name: 'table',

  addAttributes() {
    return {
      ...this.parent?.(),
      tableType: {
        default: 'content',
        parseHTML: (element) => (element.getAttribute('data-table-type') as AdministrativeTableType) || 'content',
        renderHTML: (attributes) => ({
          'data-table-type': attributes.tableType,
        }),
      },
      isBorderless: {
        default: false,
        parseHTML: (element) => {
          const val = element.getAttribute('data-borderless') ?? element.getAttribute('borderless');
          if (val !== null) return val === 'true';
          return element.classList.contains('borderless-table');
        },
        renderHTML: (attributes) => ({
          'data-borderless': attributes.isBorderless || attributes.borderless ? 'true' : 'false',
        }),
      },
      borderless: {
        default: false,
        parseHTML: (element) => {
          const val = element.getAttribute('borderless') ?? element.getAttribute('data-borderless');
          if (val !== null) return val === 'true';
          return element.classList.contains('borderless-table');
        },
        renderHTML: (attributes) => {
          const borderless = attributes.borderless ?? attributes.isBorderless;
          return borderless ? { borderless: 'true' } : {};
        },
      },
      columnRatio: {
        default: 'custom',
        parseHTML: (element) => {
          const ratio = element.getAttribute('data-column-ratio') || element.getAttribute('column-ratio');
          if (ratio) return ratio as AdministrativeColumnRatio;
          if (element.classList.contains('admin-header-table')) return '40-60';
          if (element.classList.contains('admin-footer-table')) return '50-50';
          const ratios = element.getAttribute('data-column-ratios') || element.getAttribute('column-ratios');
          if (ratios) {
            if (ratios.includes('0.45') || ratios.includes('0.4') || ratios.includes('40')) return '40-60';
            if (ratios.includes('0.5') || ratios.includes('50')) return '50-50';
          }
          return 'custom';
        },
        renderHTML: (attributes) => {
          const ratio = attributes.columnRatio !== 'custom' && attributes.columnRatio
            ? attributes.columnRatio
            : (Array.isArray(attributes.columnRatios)
                ? (attributes.columnRatios[0] <= 0.48 ? '40-60' : '50-50')
                : 'custom');
          return {
            'data-column-ratio': ratio,
          };
        },
      },
      columnRatios: {
        default: null,
        parseHTML: (element) => {
          const ratiosAttr = element.getAttribute('data-column-ratios') || element.getAttribute('column-ratios');
          if (ratiosAttr) {
            try {
              const parsed = JSON.parse(ratiosAttr);
              if (Array.isArray(parsed)) return parsed;
            } catch {
              const parts = ratiosAttr.split(',').map((p) => parseFloat(p.trim()));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
            }
          }
          const ratio = element.getAttribute('data-column-ratio') || element.getAttribute('column-ratio');
          if (ratio === '40-60' || element.classList.contains('admin-header-table')) return [0.45, 0.55];
          if (ratio === '50-50' || element.classList.contains('admin-footer-table')) return [0.5, 0.5];
          return null;
        },
        renderHTML: (attributes) => {
          const ratios = attributes.columnRatios || (
            attributes.columnRatio === '40-60'
              ? [0.45, 0.55]
              : attributes.columnRatio === '50-50'
              ? [0.5, 0.5]
              : null
          );
          if (!ratios) return {};
          return {
            'data-column-ratios': Array.isArray(ratios) ? ratios.join(',') : String(ratios),
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const tableType = node.attrs.tableType as AdministrativeTableType;
    const isBorderless = Boolean(node.attrs.isBorderless || node.attrs.borderless);
    const ratioStr = node.attrs.columnRatio as AdministrativeColumnRatio | undefined;
    const ratiosArr = node.attrs.columnRatios as number[] | null | undefined;
    const isHeaderRatio = ratioStr === '40-60' || (Array.isArray(ratiosArr) && ratiosArr[0] <= 0.48);
    const isFooterRatio = ratioStr === '50-50' || (Array.isArray(ratiosArr) && Math.abs(ratiosArr[0] - 0.5) < 0.05);

    const classNames = [
      'tiptap-table',
      (tableType === 'admin-header' || isHeaderRatio) && 'admin-header-table',
      (tableType === 'admin-footer' || isFooterRatio) && 'admin-footer-table',
      isBorderless && 'borderless-table',
    ]
      .filter(Boolean)
      .join(' ');

    return [
      'table',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: classNames,
      }),
      ['tbody', 0],
    ];
  },
});

export const AdministrativeTableCell = TableCell.extend({
  name: 'tableCell',

  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute('data-colwidth');
          return colwidth ? colwidth.split(',').map((v) => parseInt(v, 10)) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth) return {};
          return {
            'data-colwidth': attributes.colwidth.join(','),
            style: `width: ${attributes.colwidth[0]}px`,
          };
        },
      },
      verticalAlign: {
        default: 'top',
        parseHTML: (element) => element.style.verticalAlign || 'top',
        renderHTML: (attributes) => ({
          style: `vertical-align: ${attributes.verticalAlign || 'top'}`,
        }),
      },
      cellType: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-cell-type') || 'default',
        renderHTML: (attributes) => ({
          'data-cell-type': attributes.cellType,
        }),
      },
    };
  },
});

export type AdminRuleKind = 'AGENCY' | 'MOTTO' | 'ABSTRACT';

export const AdminRule = Node.create({
  name: 'adminRule',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      kind: {
        default: 'AGENCY' as AdminRuleKind,
        parseHTML: (element) => (element.getAttribute('data-rule-kind') as AdminRuleKind) || 'AGENCY',
        renderHTML: (attributes) => ({
          'data-rule-kind': attributes.kind,
        }),
      },
      widthPercent: {
        default: 40,
        parseHTML: (element) => {
          const val = element.getAttribute('data-width-percent');
          return val ? parseFloat(val) : 40;
        },
        renderHTML: (attributes) => ({
          'data-width-percent': attributes.widthPercent,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.admin-horizontal-rule',
      },
      {
        tag: 'hr.admin-rule',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes['data-rule-kind'] || 'AGENCY';
    const percent = HTMLAttributes['data-width-percent'] || (kind === 'MOTTO' ? 95 : 40);

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `admin-horizontal-rule admin-rule-${kind.toLowerCase()}`,
        style: `width: ${percent}%; margin: 3px auto 5px; height: 1px; background-color: #000000; border: none;`,
      }),
    ];
  },

  addCommands() {
    return {
      setAdminRule:
        (attrs) =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs }).run();
        },
    };
  },
});

const baseEditorExtensions = [
  Document,
  AdministrativeParagraph,
  AdministrativeHeading.configure({ levels: [1, 2, 3, 4] }),
  Text,
  TextStyle,
  FontFamily.configure({ types: ['textStyle'] }),
  Bold,
  Italic,
  Underline,
  Strike,
  TextAlign.configure({
    types: ['paragraph', 'heading'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'justify',
  }),
  UndoRedo.configure({
    depth: 100,
    newGroupDelay: 500,
  }),
  AdministrativeTable.configure({ resizable: false }),
  TableRow,
  AdministrativeTableCell,
  TableHeader,
  AdminRule,
];

export function createCoreEditorExtensions(spellcheckOptions: Partial<VietnameseSpellcheckOptions> = {}) {
  return [
    ...baseEditorExtensions,
    VietnameseSpellcheck.configure(spellcheckOptions),
  ];
}

export const coreEditorExtensions = createCoreEditorExtensions();
