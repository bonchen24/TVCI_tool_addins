import type { JSONContent } from '@tiptap/core';

export type { JSONContent };

export interface PageMarginsOptions {
  topMm?: number;
  bottomMm?: number;
  leftMm?: number;
  rightMm?: number;
}

export interface PageSetupOptions {
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'Letter';
  margins?: PageMarginsOptions;
}

export interface DocxExportOptions {
  title?: string;
  creator?: string;
  description?: string;
  pageSetup?: PageSetupOptions;
  outputType?: 'blob' | 'buffer' | 'uint8array';
}

export interface DocxImportOptions {
  /** If true, skips custom OpenXML parser and forces Mammoth fallback */
  forceFallback?: boolean;
  /** Custom fallback font family if omitted in OpenXML (default: 'Times New Roman') */
  defaultFontFamily?: string;
  /** Custom fallback font size in pt if omitted in OpenXML (default: 13) */
  defaultFontSize?: number;
  /** Custom fallback line spacing if omitted in OpenXML (default: 1.2) */
  defaultLineSpacing?: number;
  /** If true, fallback generates an administrative 2-column header layout */
  fallbackToAdministrativeLayout?: boolean;
}

export interface DefaultDocumentOptions {
  withAdministrativeLayout?: boolean;
}

export interface AdministrativeParagraphAttributes {
  fontFamily?: string;
  fontSize?: number;
  lineSpacing?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  firstLineIndentMm?: number;
  hangingIndentMm?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface ParsedOpenXmlStyles {
  defaultFontFamily: string;
  defaultFontSize: number;
  defaultLineSpacing: number;
  paragraphStyles: Map<string, Partial<AdministrativeParagraphAttributes>>;
}

export interface TableGeometry {
  colCount: number;
  colRatios: [number, number] | number[] | null;
  colwidths: number[];
  isBorderless: boolean;
}

export type AdminRuleKind = 'AGENCY' | 'MOTTO' | 'ABSTRACT';

export interface AdminRuleAttributes {
  kind: AdminRuleKind;
  widthPercent?: number;
}
