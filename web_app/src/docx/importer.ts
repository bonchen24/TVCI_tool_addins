import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { JSONContent, DocxImportOptions, AdminRuleKind, DefaultDocumentOptions } from './types';
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE_PT,
  DEFAULT_LINE_SPACING,
  DEFAULT_SPACE_BEFORE_PT,
  DEFAULT_SPACE_AFTER_PT,
  DEFAULT_FIRST_LINE_INDENT_MM,
} from './styles';

// ==========================================
// 1. Input Normalization & XML Parsing
// ==========================================

export function normalizeBuffer(input: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) {
    const copy = new Uint8Array(input.byteLength);
    copy.set(new Uint8Array(input.buffer as ArrayBuffer, input.byteOffset, input.byteLength));
    return copy.buffer as ArrayBuffer;
  }
  throw new TypeError('Invalid input type: expected ArrayBuffer or Uint8Array');
}

export function parseXmlDocument(xmlString: string): Document {
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is not available in current environment');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML Parser Error: ${parserError.textContent}`);
  }
  return doc;
}

// ==========================================
// 2. OpenXML Attribute Extraction Helpers
// ==========================================

function getAttribute(el: Element, name: string): string | null {
  return el.getAttribute(`w:${name}`) ?? el.getAttribute(name);
}

function findChild(parent: Element, localName: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.localName === localName) return child;
  }
  return null;
}

function findChildren(parent: Element, localName: string): Element[] {
  const result: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.localName === localName) {
      result.push(child);
    }
  }
  return result;
}

function isToggleActive(el: Element | null): boolean {
  if (!el) return false;
  const val = getAttribute(el, 'val');
  return val === null || val === '1' || val === 'true';
}

// ==========================================
// 3. OpenXML Run Parser
// ==========================================

interface ParsedRunResult {
  nodes: JSONContent[];
  hasDrawingLine: boolean;
  ruleKind?: AdminRuleKind;
  runFontSizePt?: number;
  runFontFamily?: string;
}

function hasLineInElement(el: Element): boolean {
  if (el.localName === 'line' || el.localName === 'prstGeom') {
    const prst = getAttribute(el, 'prst');
    if (!prst || prst === 'line') return true;
  }
  for (let i = 0; i < el.children.length; i++) {
    if (hasLineInElement(el.children[i])) return true;
  }
  return false;
}

function parseRun(runEl: Element, defaultFont: string, defaultSize: number): ParsedRunResult {
  const rPr = findChild(runEl, 'rPr');

  // Text formatting
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;
  let fontFamily = defaultFont;
  let fontSizePt = defaultSize;
  let explicitFontSize: number | undefined;
  let explicitFontFamily: string | undefined;

  if (rPr) {
    const bEl = findChild(rPr, 'b');
    if (isToggleActive(bEl)) isBold = true;

    const iEl = findChild(rPr, 'i');
    if (isToggleActive(iEl)) isItalic = true;

    const uEl = findChild(rPr, 'u');
    if (uEl) {
      const uVal = getAttribute(uEl, 'val');
      if (uVal !== 'none') isUnderline = true;
    }

    const strikeEl = findChild(rPr, 'strike');
    if (isToggleActive(strikeEl)) isStrike = true;

    // Font size in half-points (w:sz)
    const szEl = findChild(rPr, 'sz') || findChild(rPr, 'szCs');
    if (szEl) {
      const szVal = getAttribute(szEl, 'val');
      if (szVal) {
        const parsedHalfPoints = parseInt(szVal, 10);
        if (!isNaN(parsedHalfPoints) && parsedHalfPoints > 0) {
          fontSizePt = Math.round((parsedHalfPoints / 2) * 10) / 10;
          explicitFontSize = fontSizePt;
        }
      }
    }

    // Font Family (w:rFonts)
    const rFontsEl = findChild(rPr, 'rFonts');
    if (rFontsEl) {
      const ascii = getAttribute(rFontsEl, 'ascii') || getAttribute(rFontsEl, 'hAnsi') || getAttribute(rFontsEl, 'cs');
      if (ascii) {
        fontFamily = ascii.replace(/['"]/g, '').trim();
        explicitFontFamily = fontFamily;
      }
    }
  }

  // Check for Drawing Line inside Run
  // ponytail: Only administrative line rules extracted from DrawingML. Upgrade when arbitrary vector shapes needed.
  const drawingEl = findChild(runEl, 'drawing') || findChild(runEl, 'pict');
  let hasDrawingLine = false;
  let ruleKind: AdminRuleKind | undefined;

  if (drawingEl) {
    if (hasLineInElement(drawingEl)) {
      hasDrawingLine = true;
    }
  }

  const nodes: JSONContent[] = [];

  // Marks array for text node
  const marks: Array<{ type: string }> = [];
  if (isBold) marks.push({ type: 'bold' });
  if (isItalic) marks.push({ type: 'italic' });
  if (isUnderline) marks.push({ type: 'underline' });
  if (isStrike) marks.push({ type: 'strike' });

  for (let i = 0; i < runEl.children.length; i++) {
    const child = runEl.children[i];
    if (child.localName === 't') {
      const text = child.textContent || '';
      if (text) {
        // Check if text is a mock line divider e.g. "----------" or "_________"
        if (/^[-—_]{3,}$/.test(text.trim())) {
          hasDrawingLine = true;
        } else {
          nodes.push({
            type: 'text',
            text,
            marks: marks.length > 0 ? marks : undefined,
          });
        }
      }
    } else if (child.localName === 'br') {
      nodes.push({ type: 'hardBreak' });
    } else if (child.localName === 'tab' || child.localName === 'ptab') {
      nodes.push({
        type: 'text',
        text: '\t',
        marks: marks.length > 0 ? marks : undefined,
      });
    }
  }

  return {
    nodes,
    hasDrawingLine,
    ruleKind,
    runFontSizePt: explicitFontSize,
    runFontFamily: explicitFontFamily,
  };
}

// ==========================================
// 4. OpenXML Paragraph Parser
// ==========================================

function parseParagraph(
  pEl: Element,
  context: { isInsideCell?: boolean; cellPosition?: 'left' | 'right' | 'body'; ruleKind?: AdminRuleKind } = {}
): JSONContent[] {
  const pPr = findChild(pEl, 'pPr');

  let alignment: 'left' | 'center' | 'right' | 'justify' =
    context.isInsideCell ? 'left' : 'justify';
  let lineSpacing = context.isInsideCell ? 1.0 : DEFAULT_LINE_SPACING;
  let spaceBefore = context.isInsideCell ? 0 : DEFAULT_SPACE_BEFORE_PT;
  let spaceAfter = context.isInsideCell ? 2 : DEFAULT_SPACE_AFTER_PT;
  let firstLineIndentMm = 0;
  let hangingIndentMm: number | undefined;
  let fontFamily = DEFAULT_FONT_FAMILY;
  let fontSizePt = DEFAULT_FONT_SIZE_PT;
  let hasExplicitPPrSize = false;
  let hasExplicitPPrFont = false;
  let headingLevel: number | null = null;

  if (pPr) {
    // Style (Heading check)
    const pStyle = findChild(pPr, 'pStyle');
    if (pStyle) {
      const styleVal = getAttribute(pStyle, 'val') || '';
      const headingMatch = styleVal.match(/Heading\s*(\d)/i) || styleVal.match(/heading(\d)/i);
      if (headingMatch) {
        headingLevel = Math.min(6, Math.max(1, parseInt(headingMatch[1], 10)));
      } else if (styleVal.toLowerCase() === 'title') {
        headingLevel = 1;
      }
    }

    // Alignment (w:jc)
    const jc = findChild(pPr, 'jc');
    if (jc) {
      const jcVal = getAttribute(jc, 'val');
      if (jcVal === 'center') alignment = 'center';
      else if (jcVal === 'right') alignment = 'right';
      else if (jcVal === 'both' || jcVal === 'distribute') alignment = 'justify';
      else if (jcVal === 'left') alignment = 'left';
    }

    // Spacing (w:spacing)
    const spacing = findChild(pPr, 'spacing');
    if (spacing) {
      const lineVal = getAttribute(spacing, 'line');
      const lineRule = getAttribute(spacing, 'lineRule');
      if (lineVal) {
        const parsedLine = parseInt(lineVal, 10);
        if (!isNaN(parsedLine) && parsedLine > 0) {
          if (!lineRule || lineRule === 'auto') {
            lineSpacing = Number((parsedLine / 240).toFixed(2));
          } else {
            lineSpacing = Number((parsedLine / 240).toFixed(2));
          }
        }
      }

      const beforeVal = getAttribute(spacing, 'before');
      if (beforeVal) {
        const parsedBefore = parseInt(beforeVal, 10);
        if (!isNaN(parsedBefore)) {
          spaceBefore = Number((parsedBefore / 20).toFixed(1));
        }
      }

      const afterVal = getAttribute(spacing, 'after');
      if (afterVal) {
        const parsedAfter = parseInt(afterVal, 10);
        if (!isNaN(parsedAfter)) {
          spaceAfter = Number((parsedAfter / 20).toFixed(1));
        }
      }
    }

    // Indent (w:ind)
    const ind = findChild(pPr, 'ind');
    if (ind) {
      const hangingVal = getAttribute(ind, 'hanging');
      const firstLineVal = getAttribute(ind, 'firstLine');

      if (hangingVal) {
        const parsedHanging = parseInt(hangingVal, 10);
        if (!isNaN(parsedHanging)) {
          hangingIndentMm = Number(((parsedHanging * 127) / 7200).toFixed(1));
          firstLineIndentMm = -hangingIndentMm;
        }
      } else if (firstLineVal) {
        const parsedFirstLine = parseInt(firstLineVal, 10);
        if (!isNaN(parsedFirstLine)) {
          firstLineIndentMm = Number(((parsedFirstLine * 127) / 7200).toFixed(1));
        }
      }
    }

    // Paragraph-level run font/size inheritance
    const rPr = findChild(pPr, 'rPr');
    if (rPr) {
      const szEl = findChild(rPr, 'sz') || findChild(rPr, 'szCs');
      if (szEl) {
        const szVal = getAttribute(szEl, 'val');
        if (szVal) {
          const parsed = parseInt(szVal, 10);
          if (!isNaN(parsed) && parsed > 0) {
            fontSizePt = parsed / 2;
            hasExplicitPPrSize = true;
          }
        }
      }
      const rFonts = findChild(rPr, 'rFonts');
      if (rFonts) {
        const ascii = getAttribute(rFonts, 'ascii');
        if (ascii) {
          fontFamily = ascii;
          hasExplicitPPrFont = true;
        }
      }
    }
  }

  // Children: runs, drawings, SDT
  const childNodes: JSONContent[] = [];
  let containsRule = false;
  let detectedRuleKind: AdminRuleKind =
    context.ruleKind || (context.cellPosition === 'right' ? 'MOTTO' : 'AGENCY');

  for (let i = 0; i < pEl.children.length; i++) {
    const child = pEl.children[i];
    if (child.localName === 'r') {
      const { nodes, hasDrawingLine, ruleKind, runFontSizePt, runFontFamily } = parseRun(child, fontFamily, fontSizePt);
      childNodes.push(...nodes);
      if (hasDrawingLine) {
        containsRule = true;
        if (ruleKind) detectedRuleKind = ruleKind;
      }
      if (!hasExplicitPPrSize && runFontSizePt !== undefined) {
        fontSizePt = runFontSizePt;
        hasExplicitPPrSize = true;
      }
      if (!hasExplicitPPrFont && runFontFamily !== undefined) {
        fontFamily = runFontFamily;
        hasExplicitPPrFont = true;
      }
    } else if (child.localName === 'sdt') {
      // Structured Document Tag - check if it's an admin rule
      const sdtPr = findChild(child, 'sdtPr');
      const tag = sdtPr ? findChild(sdtPr, 'tag') : null;
      const tagVal = tag ? getAttribute(tag, 'val') : '';

      if (tagVal?.includes('HRULE') || tagVal?.includes('MOTTO') || tagVal?.includes('AGENCY')) {
        containsRule = true;
        if (tagVal.includes('MOTTO')) detectedRuleKind = 'MOTTO';
        else if (tagVal.includes('AGENCY')) detectedRuleKind = 'AGENCY';
        else if (tagVal.includes('ABSTRACT')) detectedRuleKind = 'ABSTRACT';
      }

      // Parse inner content of SDT
      const sdtContent = findChild(child, 'sdtContent');
      if (sdtContent) {
        for (let j = 0; j < sdtContent.children.length; j++) {
          const sdtChild = sdtContent.children[j];
          if (sdtChild.localName === 'p') {
            const innerP = parseParagraph(sdtChild, context);
            return innerP; // Return inner SDT paragraph
          } else if (sdtChild.localName === 'r') {
            const { nodes, hasDrawingLine } = parseRun(sdtChild, fontFamily, fontSizePt);
            childNodes.push(...nodes);
            if (hasDrawingLine) containsRule = true;
          }
        }
      }
    }
  }

  // Check if paragraph is purely an AdminRule
  const fullText = childNodes.map((c) => c.text || '').join('').trim();
  if (containsRule && fullText.length === 0) {
    const widthPercent = detectedRuleKind === 'MOTTO' ? 95 : 40;
    return [{ type: 'adminRule', attrs: { kind: detectedRuleKind, widthPercent } }];
  }

  const results: JSONContent[] = [];

  // If text exists, emit paragraph or heading
  if (childNodes.length > 0 || !containsRule) {
    if (headingLevel != null) {
      results.push({
        type: 'heading',
        attrs: {
          level: headingLevel,
          textAlign: alignment,
        },
        content: childNodes.length > 0 ? childNodes : undefined,
      });
    } else {
      results.push({
        type: 'paragraph',
        attrs: {
          fontFamily,
          fontSize: fontSizePt,
          lineSpacing,
          spaceBefore,
          spaceAfter,
          firstLineIndentMm,
          ...(hangingIndentMm !== undefined ? { hangingIndentMm } : {}),
          textAlign: alignment,
          align: alignment,
        },
        content: childNodes.length > 0 ? childNodes : undefined,
      });
    }
  }

  // If text also had an embedded rule, emit rule after the paragraph
  if (containsRule && fullText.length > 0) {
    const widthPercent = detectedRuleKind === 'MOTTO' ? 95 : 40;
    results.push({
      type: 'adminRule',
      attrs: { kind: detectedRuleKind, widthPercent },
    });
  }

  return results;
}

// ==========================================
// 5. OpenXML Table Parser & Classifier
// ==========================================

function isTableBorderless(tblPr: Element | null): boolean {
  if (!tblPr) return false;
  const tblBorders = findChild(tblPr, 'tblBorders');
  if (!tblBorders) return false;

  const borders = Array.from(tblBorders.children);
  if (borders.length === 0) return true;

  return borders.every((border) => {
    const val = getAttribute(border, 'val');
    const sz = getAttribute(border, 'sz');
    return val === 'none' || val === 'nil' || sz === '0';
  });
}

function hasExplicitVisibleBorders(
  tblPr: Element | null,
  firstRowEl?: Element | null
): boolean {
  if (tblPr) {
    const tblBorders = findChild(tblPr, 'tblBorders');
    if (tblBorders) {
      const borderNames = ['top', 'bottom', 'left', 'right', 'insideH', 'insideV'];
      for (let i = 0; i < tblBorders.children.length; i++) {
        const border = tblBorders.children[i];
        if (borderNames.includes(border.localName)) {
          const val = getAttribute(border, 'val');
          const sz = getAttribute(border, 'sz');
          if (val && val !== 'none' && val !== 'nil' && sz !== '0') {
            return true;
          }
        }
      }
    }
  }

  // Also check first cell tcBorders if present
  if (firstRowEl) {
    const firstCell = findChild(firstRowEl, 'tc');
    if (firstCell) {
      const tcPr = findChild(firstCell, 'tcPr');
      const tcBorders = tcPr ? findChild(tcPr, 'tcBorders') : null;
      if (tcBorders) {
        const borderNames = ['top', 'bottom', 'left', 'right'];
        for (let i = 0; i < tcBorders.children.length; i++) {
          const border = tcBorders.children[i];
          if (borderNames.includes(border.localName)) {
            const val = getAttribute(border, 'val');
            const sz = getAttribute(border, 'sz');
            if (val && val !== 'none' && val !== 'nil' && sz !== '0') {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

function parseTable(tblEl: Element): JSONContent {
  const tblPr = findChild(tblEl, 'tblPr');

  const rowEls = findChildren(tblEl, 'tr');
  const isBorderless = isTableBorderless(tblPr);
  const hasVisibleBorders = hasExplicitVisibleBorders(tblPr, rowEls[0]);

  // Extract cell texts to classify administrative tables
  let isHeader = false;
  let isFooter = false;

  if (!hasVisibleBorders && rowEls.length > 0) {
    const firstRowCells = findChildren(rowEls[0], 'tc');
    if (firstRowCells.length === 2) {
      const leftText = (firstRowCells[0].textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const rightText = (firstRowCells[1].textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();

      // Strictly require National Motto keywords
      const hasHeaderRight =
        (rightText.includes('độc lập') && rightText.includes('hạnh phúc')) ||
        rightText.includes('cộng hòa xã hội chủ nghĩa');

      if (hasHeaderRight) {
        isHeader = true;
      }

      // Strictly require 'nơi nhận' on left AND administrative title keyword on right
      const hasFooterLeft = leftText.includes('nơi nhận');

      const hasFooterRight =
        rightText.includes('giám đốc') ||
        rightText.includes('tổng giám đốc') ||
        rightText.includes('thủ trưởng') ||
        rightText.includes('chủ tịch') ||
        rightText.includes('viện trưởng') ||
        rightText.includes('bộ trưởng') ||
        rightText.includes('thứ trưởng') ||
        rightText.includes('hiệu trưởng') ||
        rightText.includes('cục trưởng') ||
        rightText.includes('vụ trưởng') ||
        rightText.includes('trưởng ban') ||
        rightText.includes('trưởng phòng') ||
        rightText.includes('kt.') ||
        rightText.includes('tm.') ||
        rightText.includes('tl.') ||
        rightText.includes('tuq.');

      if (!isHeader && hasFooterLeft && hasFooterRight) {
        isFooter = true;
      }
    }
  }

  let tableType: 'admin-header' | 'admin-footer' | 'content' = 'content';
  let columnRatio: '40-60' | '50-50' | 'custom' = 'custom';

  if (isHeader) {
    tableType = 'admin-header';
    columnRatio = '40-60';
  } else if (isFooter) {
    tableType = 'admin-footer';
    columnRatio = '50-50';
  }

  // Parse rows and cells
  const rowsContent: JSONContent[] = [];

  rowEls.forEach((rowEl) => {
    const tcEls = findChildren(rowEl, 'tc');
    const cellsContent: JSONContent[] = [];

    tcEls.forEach((tcEl, colIndex) => {
      const tcPr = findChild(tcEl, 'tcPr');
      const tcW = tcPr ? findChild(tcPr, 'tcW') : null;
      const widthVal = tcW ? parseInt(getAttribute(tcW, 'w') || '0', 10) : 0;

      const cellPosition: 'left' | 'right' | 'body' =
        colIndex === 0 ? 'left' : 'right';

      const cellBlocks: JSONContent[] = [];

      for (let i = 0; i < tcEl.children.length; i++) {
        const child = tcEl.children[i];
        if (child.localName === 'p') {
          const parsed = parseParagraph(child, {
            isInsideCell: true,
            cellPosition,
          });
          cellBlocks.push(...parsed);
        } else if (child.localName === 'sdt') {
          const sdtContent = findChild(child, 'sdtContent');
          if (sdtContent) {
            for (let j = 0; j < sdtContent.children.length; j++) {
              const sdtChild = sdtContent.children[j];
              if (sdtChild.localName === 'p') {
                const parsed = parseParagraph(sdtChild, {
                  isInsideCell: true,
                  cellPosition,
                });
                cellBlocks.push(...parsed);
              }
            }
          }
        }
      }

      // Guarantee every cell has at least one paragraph
      if (cellBlocks.length === 0) {
        cellBlocks.push({
          type: 'paragraph',
          attrs: { textAlign: 'left', align: 'left' },
        });
      }

      cellsContent.push({
        type: 'tableCell',
        attrs: {
          colspan: 1,
          rowspan: 1,
          colwidth: widthVal > 0 ? [Math.round((widthVal / 9355) * 624)] : undefined,
        },
        content: cellBlocks,
      });
    });

    if (cellsContent.length > 0) {
      rowsContent.push({
        type: 'tableRow',
        content: cellsContent,
      });
    }
  });

  const effectiveBorderless = hasVisibleBorders
    ? false
    : (isBorderless || isHeader || isFooter);

  return {
    type: 'table',
    attrs: {
      tableType,
      isBorderless: effectiveBorderless,
      borderless: effectiveBorderless,
      columnRatio,
      columnRatios: isHeader ? [0.45, 0.55] : isFooter ? [0.5, 0.5] : null,
    },
    content: rowsContent,
  };
}

// ==========================================
// 6. Primary Tier: OpenXML DOM Parser
// ==========================================

export async function parseDocxWithOpenXml(
  arrayBuffer: ArrayBuffer,
  _options: DocxImportOptions = {}
): Promise<JSONContent> {
  void _options;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXmlFile = zip.file('word/document.xml');

  if (!documentXmlFile) {
    throw new Error('Archive is missing word/document.xml');
  }

  const xmlText = await documentXmlFile.async('string');
  const xmlDoc = parseXmlDocument(xmlText);

  const bodyEl = xmlDoc.querySelector('body') || xmlDoc.getElementsByTagName('w:body')[0];
  if (!bodyEl) {
    throw new Error('word/document.xml does not contain a body element');
  }

  const content: JSONContent[] = [];

  for (let i = 0; i < bodyEl.children.length; i++) {
    const el = bodyEl.children[i];
    if (el.localName === 'p') {
      const pNodes = parseParagraph(el, { cellPosition: 'body' });
      content.push(...pNodes);
    } else if (el.localName === 'tbl') {
      const tblNode = parseTable(el);
      content.push(tblNode);
    } else if (el.localName === 'sdt') {
      const sdtPr = findChild(el, 'sdtPr');
      const tag = sdtPr ? findChild(sdtPr, 'tag') : null;
      const tagVal = tag ? getAttribute(tag, 'val') : '';
      let sdtRuleKind: AdminRuleKind | undefined;
      if (tagVal?.includes('MOTTO')) sdtRuleKind = 'MOTTO';
      else if (tagVal?.includes('AGENCY')) sdtRuleKind = 'AGENCY';
      else if (tagVal?.includes('ABSTRACT')) sdtRuleKind = 'ABSTRACT';

      const sdtContent = findChild(el, 'sdtContent');
      if (sdtContent) {
        for (let j = 0; j < sdtContent.children.length; j++) {
          const sdtChild = sdtContent.children[j];
          if (sdtChild.localName === 'p') {
            content.push(...parseParagraph(sdtChild, { cellPosition: 'body', ruleKind: sdtRuleKind }));
          } else if (sdtChild.localName === 'tbl') {
            content.push(parseTable(sdtChild));
          }
        }
      }
    }
  }

  if (content.length === 0) {
    throw new Error('OpenXML parsing yielded zero content blocks');
  }

  return {
    type: 'doc',
    content,
  };
}

/**
 * Create a default fallback document AST with standard ND 30 administrative styling.
 * Guaranteed to return a valid Tiptap JSONContent structure that never crashes the editor canvas.
 */
export function createDefaultDocument(options: DefaultDocumentOptions = {}): JSONContent {
  if (options.withAdministrativeLayout) {
    return {
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: {
            tableType: 'admin-header',
            isBorderless: true,
            columnRatio: '40-60',
          },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, cellType: 'header-left' },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'center',
                        fontFamily: DEFAULT_FONT_FAMILY,
                        fontSize: 12,
                        lineSpacing: 1.15,
                        spaceBefore: 0,
                        spaceAfter: 0,
                      },
                      content: [{ type: 'text', text: 'TÊN CƠ QUAN, TỔ CHỨC' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, cellType: 'header-right' },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'center',
                        fontFamily: DEFAULT_FONT_FAMILY,
                        fontSize: 12,
                        lineSpacing: 1.15,
                        spaceBefore: 0,
                        spaceAfter: 0,
                      },
                      content: [
                        {
                          type: 'text',
                          marks: [{ type: 'bold' }],
                          text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                        },
                      ],
                    },
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'center',
                        fontFamily: DEFAULT_FONT_FAMILY,
                        fontSize: 13,
                        lineSpacing: 1.15,
                        spaceBefore: 2,
                        spaceAfter: 0,
                      },
                      content: [
                        {
                          type: 'text',
                          marks: [{ type: 'bold' }],
                          text: 'Độc lập - Tự do - Hạnh phúc',
                        },
                      ],
                    },
                    {
                      type: 'adminRule',
                      attrs: { kind: 'MOTTO', widthPercent: 95 },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: {
            fontFamily: DEFAULT_FONT_FAMILY,
            fontSize: DEFAULT_FONT_SIZE_PT,
            lineSpacing: DEFAULT_LINE_SPACING,
            spaceBefore: DEFAULT_SPACE_BEFORE_PT,
            spaceAfter: DEFAULT_SPACE_AFTER_PT,
            firstLineIndentMm: DEFAULT_FIRST_LINE_INDENT_MM,
            textAlign: 'justify',
          },
        },
      ],
    };
  }

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: {
          fontFamily: DEFAULT_FONT_FAMILY,
          fontSize: DEFAULT_FONT_SIZE_PT,
          lineSpacing: DEFAULT_LINE_SPACING,
          spaceBefore: DEFAULT_SPACE_BEFORE_PT,
          spaceAfter: DEFAULT_SPACE_AFTER_PT,
          firstLineIndentMm: DEFAULT_FIRST_LINE_INDENT_MM,
          textAlign: 'justify',
        },
      },
    ],
  };
}

// ==========================================
// 7. Secondary Tier: Mammoth Fallback
// ==========================================

export async function parseDocxWithMammoth(
  arrayBuffer: ArrayBuffer,
  options: DocxImportOptions = {}
): Promise<JSONContent> {
  const fallbackDoc = () =>
    createDefaultDocument({ withAdministrativeLayout: options.fallbackToAdministrativeLayout });

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return fallbackDoc();
  }

  let html = '';
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1:fresh",
          'b => strong',
          'i => em',
          'u => u',
          'strike => s',
        ],
        ignoreEmptyParagraphs: false,
      }
    );
    html = result?.value || '';
  } catch {
    return fallbackDoc();
  }

  if (!html.trim()) {
    return fallbackDoc();
  }

  try {
    // Parse HTML into DOM
    if (typeof DOMParser === 'undefined') {
      throw new Error('DOMParser is not available in current environment');
    }
    const domDoc = new DOMParser().parseFromString(html, 'text/html');

    const content: JSONContent[] = [];

    function parseHtmlChildren(parent: Node): JSONContent[] {
      const runs: JSONContent[] = [];

      parent.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          // Text node
          const text = child.textContent || '';
          if (text) {
            runs.push({ type: 'text', text });
          }
        } else if (child.nodeType === 1) {
          const el = child as HTMLElement;
          const tag = el.tagName.toLowerCase();

          if (tag === 'br') {
            runs.push({ type: 'hardBreak' });
          } else if (tag === 'strong' || tag === 'b') {
            const inner = parseHtmlChildren(el);
            inner.forEach((node) => {
              if (node.type === 'text') {
                node.marks = [...(node.marks || []), { type: 'bold' }];
              }
            });
            runs.push(...inner);
          } else if (tag === 'em' || tag === 'i') {
            const inner = parseHtmlChildren(el);
            inner.forEach((node) => {
              if (node.type === 'text') {
                node.marks = [...(node.marks || []), { type: 'italic' }];
              }
            });
            runs.push(...inner);
          } else if (tag === 'u') {
            const inner = parseHtmlChildren(el);
            inner.forEach((node) => {
              if (node.type === 'text') {
                node.marks = [...(node.marks || []), { type: 'underline' }];
              }
            });
            runs.push(...inner);
          } else if (tag === 's' || tag === 'strike') {
            const inner = parseHtmlChildren(el);
            inner.forEach((node) => {
              if (node.type === 'text') {
                node.marks = [...(node.marks || []), { type: 'strike' }];
              }
            });
            runs.push(...inner);
          } else {
            runs.push(...parseHtmlChildren(el));
          }
        }
      });

      return runs;
    }

    const bodyChildren = Array.from(domDoc.body ? domDoc.body.children : domDoc.children);

    for (const el of bodyChildren) {
      if (!el || el.nodeType !== 1) continue;
      const tag = el.tagName.toLowerCase();

      if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag[1], 10);
        content.push({
          type: 'heading',
          attrs: { level, textAlign: 'center' },
          content: parseHtmlChildren(el),
        });
      } else if (tag === 'p') {
        const runs = parseHtmlChildren(el);
        content.push({
          type: 'paragraph',
          attrs: {
            fontFamily: options.defaultFontFamily || DEFAULT_FONT_FAMILY,
            fontSize: options.defaultFontSize || DEFAULT_FONT_SIZE_PT,
            lineSpacing: options.defaultLineSpacing || DEFAULT_LINE_SPACING,
            spaceBefore: DEFAULT_SPACE_BEFORE_PT,
            spaceAfter: DEFAULT_SPACE_AFTER_PT,
            firstLineIndentMm: DEFAULT_FIRST_LINE_INDENT_MM,
            textAlign: 'justify',
            align: 'justify',
          },
          content: runs.length > 0 ? runs : undefined,
        });
      } else if (tag === 'table') {
        const rows = Array.from(el.querySelectorAll('tr'));
        const tableRows: JSONContent[] = [];

        rows.forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('td, th'));
          const tableCells: JSONContent[] = [];

          cells.forEach((td) => {
            const isTh = td.tagName.toLowerCase() === 'th';
            const cellRuns = parseHtmlChildren(td);
            tableCells.push({
              type: isTh ? 'tableHeader' : 'tableCell',
              attrs: {
                colspan: parseInt(td.getAttribute('colspan') || '1', 10),
                rowspan: parseInt(td.getAttribute('rowspan') || '1', 10),
                colwidth: null,
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    fontFamily: options.defaultFontFamily || DEFAULT_FONT_FAMILY,
                    fontSize: options.defaultFontSize || DEFAULT_FONT_SIZE_PT,
                    lineSpacing: 1.15,
                    textAlign: 'left',
                    align: 'left',
                  },
                  content: cellRuns.length > 0 ? cellRuns : undefined,
                },
              ],
            });
          });

          if (tableCells.length > 0) {
            tableRows.push({
              type: 'tableRow',
              content: tableCells,
            });
          }
        });

        if (tableRows.length > 0) {
          content.push({
            type: 'table',
            attrs: {
              tableType: 'content',
              isBorderless: false,
              columnRatio: 'custom',
            },
            content: tableRows,
          });
        }
      }
    }

    return {
      type: 'doc',
      content: content.length > 0 ? content : fallbackDoc().content,
    };
  } catch {
    return fallbackDoc();
  }
}

// ==========================================
// 8. Public High-Fidelity Import API
// ==========================================

/**
 * Import a DOCX binary (ArrayBuffer or Uint8Array) into Tiptap JSONContent.
 * Uses primary OpenXML parser with automatic Mammoth fallback.
 * Guaranteed to never throw unhandled rejections on corrupted, truncated, or zero-byte input.
 */
export async function importDocx(
  input: ArrayBuffer | Uint8Array,
  options: DocxImportOptions = {}
): Promise<JSONContent> {
  try {
    const arrayBuffer = normalizeBuffer(input);

    if (arrayBuffer.byteLength === 0) {
      return createDefaultDocument({ withAdministrativeLayout: options.fallbackToAdministrativeLayout });
    }

    if (!options.forceFallback) {
      try {
        const doc = await parseDocxWithOpenXml(arrayBuffer, options);
        if (doc && Array.isArray(doc.content) && doc.content.length > 0) {
          return doc;
        }
      } catch {
        // Primary OpenXML parsing failed, fallback gracefully to Mammoth
      }
    }

    return await parseDocxWithMammoth(arrayBuffer, options);
  } catch {
    return createDefaultDocument({ withAdministrativeLayout: options.fallbackToAdministrativeLayout });
  }
}
