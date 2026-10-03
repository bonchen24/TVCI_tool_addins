import type { IStylesOptions } from 'docx';
import type { DocxExportOptions } from './types';

// ==========================================
// 1. Exact Unit Conversion Functions
// ==========================================

/**
 * Convert millimeters to OpenXML twips (dxa)
 * 1 inch = 72 pt = 25.4 mm = 1440 twips
 */
export const mmToTwip = (mm: number): number => Math.round((mm * 1440) / 25.4);

/**
 * Convert typographic points (pt) to twips (dxa)
 * 1 pt = 20 twips
 */
export const ptToTwip = (pt: number): number => Math.round(pt * 20);

/**
 * Convert OpenXML twips (dxa) to millimeters
 * (twip * 127) / 7200
 */
export const twipToMm = (twip: number): number => Number(((twip * 127) / 7200).toFixed(2));

/**
 * Convert OpenXML twips (dxa) to typographic points (pt)
 * 1 pt = 20 twips
 */
export const twipToPt = (twip: number): number => Number((twip / 20).toFixed(1));

/**
 * Convert typographic points (pt) to OpenXML half-points
 * 1 pt = 2 half-points
 */
export const ptToHalfPoints = (pt: number): number => Math.round(pt * 2);

/**
 * Convert OpenXML half-points to typographic points (pt)
 * 1 half-point = 0.5 pt
 */
export const halfPointsToPt = (hp: number): number => hp / 2;

/**
 * Convert line spacing multiplier to OpenXML spacing twips
 * 1.0 single spacing = 240 twips
 */
export const spacingMultipleToTwip = (mult: number): number => Math.round(mult * 240);

/**
 * Convert OpenXML spacing twips to line spacing multiplier
 */
export const twipToSpacingMultiple = (twip: number): number => Number((twip / 240).toFixed(2));

// ==========================================
// 2. Default A4 Page Geometry (Nghị định 30/2020/NĐ-CP)
// ==========================================

export const A4_PAGE_GEOMETRY = {
  width: 11906, // 210 mm
  height: 16838, // 297 mm
  margins: {
    top: 1134, // 20 mm
    bottom: 1134, // 20 mm
    left: 1701, // 30 mm
    right: 850, // 15 mm
  },
  usableWidth: 9355, // 11906 - 1701 - 850 = 9355 twips (~165 mm)
} as const;

export const DEFAULT_PAGE_SETUP = {
  width: 11906,
  height: 16838,
  topMargin: 1134,
  bottomMargin: 1134,
  leftMargin: 1701,
  rightMargin: 850,
  usableWidth: 9355,
} as const;

// Column width defaults for administrative tables
export const ADMIN_TABLE_DXA = {
  header: {
    left: 4210, // ~45%
    right: 5145, // ~55%
    total: 9355,
  },
  footer: {
    left: 4677, // 50%
    right: 4678, // 50%
    total: 9355,
  },
} as const;

// ==========================================
// 3. Document Default Styles
// ==========================================

export const DEFAULT_FONT_FAMILY = 'Times New Roman';
export const DEFAULT_FONT_SIZE_PT = 13;
export const DEFAULT_LINE_SPACING = 1.2;
export const DEFAULT_SPACE_BEFORE_PT = 2;
export const DEFAULT_SPACE_AFTER_PT = 2;
export const DEFAULT_FIRST_LINE_INDENT_MM = 10;

/**
 * Returns document default style definitions for docx.Document
 */
export function getDocumentStyles(_options?: DocxExportOptions): IStylesOptions {
  void _options;
  return {
    default: {
      document: {
        run: {
          font: DEFAULT_FONT_FAMILY,
          size: ptToHalfPoints(DEFAULT_FONT_SIZE_PT), // 26 half-points = 13 pt
          color: '000000',
        },
        paragraph: {
          spacing: {
            line: spacingMultipleToTwip(DEFAULT_LINE_SPACING), // 288
            before: ptToTwip(DEFAULT_SPACE_BEFORE_PT), // 40
            after: ptToTwip(DEFAULT_SPACE_AFTER_PT), // 40
          },
        },
      },
    },
  };
}
