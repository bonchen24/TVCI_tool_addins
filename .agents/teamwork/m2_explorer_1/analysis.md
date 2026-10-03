# Technical Analysis: High-Fidelity DOCX Importer Engine (`web_app/src/docx/importer.ts`)

**Author**: M2 Explorer 1  
**Milestone**: M2 (`docx-interop-engine`)  
**Target Module**: `web_app/src/docx/importer.ts`, `web_app/src/docx/types.ts`  
**Date**: 2026-09-29  

---

## 1. Executive Summary & Architecture Overview

The TVCI Web Application requires a dual-tier DOCX import pipeline capable of ingesting Microsoft Word `.docx` documents and transforming them into Tiptap ProseMirror AST (`JSONContent`) while strictly preserving Vietnamese administrative format semantics conforming to **Nghị định 30/2020/NĐ-CP**.

### The Two-Tier Processing Model:
1. **Tier 1 (Primary - High Fidelity OpenXML Parser)**:
   - Unpacks `.docx` zip package using `jszip`.
   - Reads `word/document.xml`, `word/styles.xml`, and optionally `word/numbering.xml`.
   - Parses OpenXML elements (`w:p`, `w:r`, `w:t`, `w:pPr`, `w:rPr`, `w:tbl`, `w:tr`, `w:tc`, `w:drawing`, `w:sdt`).
   - Converts exact OpenXML measurement units (twips, half-points, 240-scale line height) to Tiptap administrative attributes (pt, mm, line spacing multiple).
   - Detects special administrative structures:
     - 2-Column Header Table (`admin-header`, ratio ~40%/60%, borderless).
     - 2-Column Footer Table (`admin-footer`, ratio ~50%/50%, borderless).
     - Horizontal decorative rules (`AdminRule` for Agency, Motto, Abstract).
2. **Tier 2 (Secondary - Mammoth Fallback)**:
   - Activated automatically if XML is corrupted, missing required OpenXML parts, or encounters fatal parsing exceptions.
   - Uses `mammoth.convertToHtml()` with custom style mapping.
   - Converts sanitized HTML to standard Tiptap AST and injects baseline NĐ 30 attributes (Times New Roman, 13pt, 1.2 line spacing, 2pt paragraph spacing, 10mm first-line indent).

```
                      ┌────────────────────────────────────────┐
                      │ Input: ArrayBuffer | Uint8Array (.docx)│
                      └──────────────────┬─────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
                 [Try Primary Tier]             [Catch Failure Tier]
              JSZip OpenXML Extraction           Mammoth Fallback
             - word/document.xml                 - convertToHtml()
             - word/styles.xml                   - HTML DOM Parser
             - word/numbering.xml                - Inject NĐ 30 defaults
                         │                               │
                         ▼                               ▼
             OpenXML DOM Tree Traversal          HTML to Tiptap AST
             - Unit Conversion (twips, sz)       - Normalize nodes
             - Table Classification              - Structure tables
             - AdminRule extraction                      │
                         │                               │
                         └───────────────┬───────────────┘
                                         ▼
                       ┌───────────────────────────────────┐
                       │ Output: Tiptap JSONContent (doc)  │
                       └───────────────────────────────────┘
```

---

## 2. OpenXML Package Decomposition & Environment Portability

### 2.1 JSZip Package Unpacking
A `.docx` file is a ZIP archive adhering to the Open Packaging Conventions (OPC / ECMA-376). The core files required for high-fidelity text and table extraction are:

| File Path in ZIP | Criticality | Purpose |
|------------------|-------------|---------|
| `word/document.xml` | **Mandatory** | Main document body (`w:document/w:body`), containing all paragraphs, runs, tables, and drawing shapes. |
| `word/styles.xml` | **Recommended** | Document default styles (`w:docDefaults`), `Normal` paragraph style, heading styles (`Heading 1`-`4`). Used for attribute inheritance when inline attributes are omitted. |
| `word/numbering.xml` | **Optional** | List definitions mapping `w:numPr/w:numId` to abstract numbering formats (bullets, decimals, roman numerals). |
| `word/_rels/document.xml.rels` | **Optional** | Target URLs for hyperlinks (`w:hyperlink/@r:id`) and image parts. |

### 2.2 Browser vs Node Environment Compatibility
- **Binary Input**:
  - `JSZip.loadAsync(input)` natively accepts `ArrayBuffer`, `Uint8Array`, and Node.js `Buffer`.
  - Normalization logic:
    ```typescript
    function normalizeInput(input: ArrayBuffer | Uint8Array): ArrayBuffer {
      if (input instanceof ArrayBuffer) return input;
      if (ArrayBuffer.isView(input)) {
        return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
      }
      throw new TypeError('Invalid input type: expected ArrayBuffer or Uint8Array');
    }
    ```
- **XML DOM Parsing**:
  - **Browser Environment**: Standard `DOMParser` is globally available on `window.DOMParser`.
  - **Node.js / Vitest Environment**: Vitest runs with `environment: 'jsdom'` (configured in `web_app/vitest.config.ts`), so `globalThis.DOMParser` is pre-populated.
  - **Next.js SSR / Server Action**: When running in Node without jsdom in `globalThis`, we dynamically import `jsdom` or use a lightweight DOM wrapper:
    ```typescript
    export function parseXml(xmlString: string): Document {
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
          throw new Error(`XML parsing error: ${parseError.textContent}`);
        }
        return doc;
      }
      // Node fallback via jsdom
      const { JSDOM } = require('jsdom');
      return new JSDOM(xmlString, { contentType: 'application/xml' }).window.document;
    }
    ```
- **Namespace Resiliency**:
  OpenXML tags standardly use the `w:` prefix (e.g. `w:p`, `w:r`, `w:t`). However, some generators emit default namespaces or aliases (`w14:`, `w15:`). To guarantee 100% parsing resilience:
  - Match nodes via `node.localName` (e.g., `node.localName === 'p'`).
  - Read attributes via `node.getAttribute('w:val') || node.getAttribute('val')`.

---

## 3. Attribute Extraction & Mathematical Conversions for NĐ 30

The Vietnamese Administrative standard (Nghị định 30/2020/NĐ-CP) defines strict rules for typography, page margins, line spacing, paragraph spacing, and indentations. Below is the exact OpenXML mapping and unit conversion matrix.

### 3.1 Unit Conversion Formulas

| Property | OpenXML XML Path | OpenXML Unit | Tiptap Target Property | Conversion Formula |
|---|---|---|---|---|
| **Font Size** | `w:rPr/w:sz/@w:val` | Half-points (1/2 pt) | `fontSize` (number in pt) | `pt = Math.round((parseInt(val, 10) / 2) * 10) / 10` |
| **Font Family** | `w:rPr/w:rFonts/@w:ascii` | Font name string | `fontFamily` (string) | `ascii \|\| hAnsi \|\| cs \|\| 'Times New Roman'` |
| **Line Spacing (Auto)** | `w:pPr/w:spacing/@w:line` (`w:lineRule="auto"` or omitted) | 240ths of a line | `lineSpacing` (multiplier) | `mult = Math.round((parseInt(val, 10) / 240) * 100) / 100` |
| **Line Spacing (Exact)** | `w:pPr/w:spacing/@w:line` (`w:lineRule="exact"`) | Twips (1/20 pt) | `lineSpacing` (multiplier) | `mult = Math.round(((parseInt(val, 10) / 20) / fontSize) * 100) / 100` |
| **Space Before** | `w:pPr/w:spacing/@w:before` | Twips (1/20 pt) | `spaceBefore` (number in pt) | `pt = Math.round((parseInt(val, 10) / 20) * 10) / 10` |
| **Space After** | `w:pPr/w:spacing/@w:after` | Twips (1/20 pt) | `spaceAfter` (number in pt) | `pt = Math.round((parseInt(val, 10) / 20) * 10) / 10` |
| **First Line Indent** | `w:pPr/w:ind/@w:firstLine` | Twips (1/20 pt) | `firstLineIndentMm` (mm) | `mm = Math.round(((parseInt(val, 10) * 127) / 7200) * 10) / 10` |
| **Hanging Indent** | `w:pPr/w:ind/@w:hanging` | Twips (1/20 pt) | `firstLineIndentMm` (mm) | `0` (or negative representation) |
| **Column Width** | `w:tblGrid/w:gridCol/@w:w` or `w:tcPr/w:tcW/@w:w` | Twips (1/20 pt) | `colwidth` (px array) | `px = Math.round((twips / totalTableTwips) * 624)` |

### 3.2 Detailed Property Extraction

#### 1. Font Family (`w:rFonts`)
- OpenXML attributes: `w:ascii`, `w:hAnsi`, `w:cs`, `w:eastAsia`.
- Priority order: `w:ascii` -> `w:hAnsi` -> `w:cs` -> inherited style -> `'Times New Roman'`.
- Normalization: Remove enclosing single/double quotes, normalize aliases (`TimesNewRomanPSMT` -> `Times New Roman`).

#### 2. Font Size (`w:sz` and `w:szCs`)
- OpenXML standard specifies font size in half-points.
- Example:
  - `<w:sz w:val="26"/>` -> 26 / 2 = **13 pt** (Standard body text / motto).
  - `<w:sz w:val="28"/>` -> 28 / 2 = **14 pt** (Document title / heading).
  - `<w:sz w:val="24"/>` -> 24 / 2 = **12 pt** (Agency name / recipients title).
  - `<w:sz w:val="22"/>` -> 22 / 2 = **11 pt** (Recipients items / footnotes).
- Boundary Clamping: Clamp extracted font size to `[6, 72]` pt.

#### 3. Formatting Marks (`w:b`, `w:i`, `w:u`, `w:strike`)
- **Tri-State Boolean Handling**:
  In OpenXML, an element `<w:b/>` without `w:val` signifies `true`. However, `<w:b w:val="0"/>` or `<w:b w:val="false"/>` signifies `false` (explicitly unsetting an inherited bold style).
  ```typescript
  function isToggleElementActive(element: Element | null): boolean {
    if (!element) return false;
    const val = element.getAttribute('w:val');
    return val === null || val === '1' || val === 'true';
  }
  ```
- **Underline (`w:u`)**:
  Active if element exists and `w:val !== 'none'`.

#### 4. Paragraph Alignment (`w:jc`)
- OpenXML values:
  - `both` or `distribute` -> `'justify'` (NĐ 30 body text default).
  - `center` -> `'center'` (Title, motto, signer role, table header).
  - `right` -> `'right'` (Place & date).
  - `left` -> `'left'` (Addressee, recipients items).
- Default if omitted: Inherited from style or default to `'justify'` for body paragraphs; `'left'` for table cells.

#### 5. Line Spacing (`w:spacing w:line` and `w:lineRule`)
- Standard NĐ 30 line spacing is 1.15x to 1.5x (default 1.2x).
- When `w:lineRule` is omitted or `'auto'`:
  - Value is 240-based: `spacing = parseInt(val, 10) / 240`.
  - Common values:
    - `240` -> `1.0`
    - `276` -> `1.15`
    - `288` -> `1.2` (Default TVCI)
    - `300` -> `1.25`
    - `312` -> `1.3`
    - `360` -> `1.5`
- Clamping: Clamp to `[1.0, 2.0]`.

#### 6. Paragraph Spacing Before / After (`w:spacing w:before`, `w:after`)
- Values are in twips (1 pt = 20 twips).
- Examples:
  - `w:before="0"` -> `0 pt`
  - `w:before="40"` -> `2 pt` (NĐ 30 default paragraph spacing)
  - `w:before="120"` -> `6 pt` (NĐ 30 heading spacing)
  - `w:before="240"` -> `12 pt` (Section spacing)
- Formula: `pt = Math.round((parseInt(val, 10) / 20) * 10) / 10`.

#### 7. First Line Indentation (`w:ind w:firstLine`)
- Value in twips: `1 inch = 1440 twips = 25.4 mm`.
- Ratio: `1 mm = 1440 / 25.4 = 56.6929 twips`.
- Examples:
  - `w:firstLine="567"` -> 567 / 56.6929 = `10.0 mm` (Standard NĐ 30 paragraph indent).
  - `w:firstLine="720"` -> 720 / 56.6929 = `12.7 mm` (0.5 inch indent, common in Vinacomin/TKV documents).
- In centered or right-aligned paragraphs, first-line indent must be forced to `0`.

---

## 4. Administrative Table & Rule Recognition Architecture

Vietnamese administrative documents standardly utilize two borderless 2-column tables to arrange header and footer blocks. Accurately classifying these tables is crucial for roundtrip fidelity.

### 4.1 Header Table (`admin-header`)
- **Structure**:
  - Typically 1 row (or 2 rows), 2 columns.
  - Left column: Parent agency, Issuing agency, Agency horizontal rule (`AdminRule: AGENCY`), Document symbol (`Số: ...`), Subject/Abstract.
  - Right column: National Motto (`CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM`), Sub-motto (`Độc lập - Tự do - Hạnh phúc`), Motto horizontal rule (`AdminRule: MOTTO`), Place & Date (`Hà Nội, ngày ...`).
- **Geometric Signature**:
  - Column ratio: Left column ~40%-46%, Right column ~54%-60% (`columnRatio = '40-60'`).
  - Total width: Typically 9000 twips (4200 / 4800 or 4000 / 5000).
- **Classification Rule**:
  ```typescript
  function isHeaderTable(rowElements: Element[], colRatios: number[] | null): boolean {
    if (rowElements.length === 0) return false;
    const firstRowCells = Array.from(rowElements[0].children).filter((c) => c.localName === 'tc');
    if (firstRowCells.length !== 2) return false;

    const cell0Text = firstRowCells[0].textContent?.toLowerCase() || '';
    const cell1Text = firstRowCells[1].textContent?.toLowerCase() || '';

    const hasHeaderKeywords =
      (cell0Text.includes('số:') || cell0Text.includes('viện') || cell0Text.includes('bộ') || cell0Text.includes('tập đoàn') || cell0Text.includes('công ty')) &&
      (cell1Text.includes('cộng hòa') || cell1Text.includes('độc lập') || cell1Text.includes('ngày'));

    const ratioMatch = colRatios ? colRatios[0] <= 0.48 : true;
    return hasHeaderKeywords || (ratioMatch && cell1Text.includes('độc lập'));
  }
  ```

### 4.2 Footer Table (`admin-footer`)
- **Structure**:
  - 1 row, 2 columns.
  - Left column: `Nơi nhận:` (bold italic), followed by list of recipients (`- Như trên;`, `- Lưu: VT...`).
  - Right column: Signer role (`GIÁM ĐỐC`, `KT. VIỆN TRƯỞNG`), blank signature space, Signer full name (`TS. Nguyễn Văn A`).
- **Geometric Signature**:
  - Column ratio: 50% / 50% (`columnRatio = '50-50'`).
  - Width: 4500 / 4500 twips.
- **Classification Rule**:
  ```typescript
  function isFooterTable(rowElements: Element[], colRatios: number[] | null): boolean {
    if (rowElements.length === 0) return false;
    const firstRowCells = Array.from(rowElements[0].children).filter((c) => c.localName === 'tc');
    if (firstRowCells.length !== 2) return false;

    const cell0Text = firstRowCells[0].textContent?.toLowerCase() || '';
    const cell1Text = firstRowCells[1].textContent?.toLowerCase() || '';

    const hasFooterKeywords =
      (cell0Text.includes('nơi nhận') || cell0Text.includes('kính gửi') || cell0Text.includes('như trên')) &&
      (cell1Text.includes('trưởng') || cell1Text.includes('giám đốc') || cell1Text.includes('chủ tịch') || cell1Text.includes('kt.') || cell1Text.includes('tm.'));

    return hasFooterKeywords;
  }
  ```

### 4.3 Borderless Table Detection
In OpenXML, table borders are specified in `w:tblPr/w:tblBorders`.
- If `w:tblBorders` has `<w:top w:val="none"/>`, `<w:left w:val="none"/>`, `<w:bottom w:val="none"/>`, `<w:right w:val="none"/>`, `<w:insideH w:val="none"/>`, `<w:insideV w:val="none"/>` (or `w:val="nil"`), the table is borderless.
- If `w:tblBorders` is completely missing, Word treats it as default bordered unless a borderless table style is applied.
- Extraction logic:
  ```typescript
  function isTableBorderless(tblPr: Element | null): boolean {
    if (!tblPr) return false;
    const tblBorders = Array.from(tblPr.children).find((c) => c.localName === 'tblBorders');
    if (!tblBorders) return false;

    const borders = Array.from(tblBorders.children);
    if (borders.length === 0) return true;

    return borders.every((border) => {
      const val = border.getAttribute('w:val') || border.getAttribute('val');
      const sz = border.getAttribute('w:sz') || border.getAttribute('sz');
      return val === 'none' || val === 'nil' || sz === '0';
    });
  }
  ```

### 4.4 Horizontal Rule (`AdminRule`) Extraction
In DOCX files, horizontal rules (the lines under Agency, Motto, or Abstract) are represented in one of 4 ways:
1. **DrawingML Line Shape**: `<w:drawing>...<a:prstGeom prst="line"/>...</w:drawing>` inside a paragraph.
2. **SDT Tag**: `<w:sdt><w:sdtPr><w:tag w:val="TVCI_HRULE:AGENCY"/></w:sdtPr>...`
3. **Paragraph Bottom Border**: `<w:pBdr><w:bottom w:val="single" w:sz="6".../></w:pBdr>`
4. **Text Run of Hyphens/Underscores**: `<w:t>-----------------</w:t>` or `<w:t>_______</w:t>`

When the importer encounters any of these inside an administrative context:
- Inside Left Header Cell: maps to `{ type: 'adminRule', attrs: { kind: 'AGENCY', widthPercent: 40 } }`.
- Inside Right Header Cell: maps to `{ type: 'adminRule', attrs: { kind: 'MOTTO', widthPercent: 95 } }`.
- Inside Main Body (after document type/abstract): maps to `{ type: 'adminRule', attrs: { kind: 'ABSTRACT', widthPercent: 40 } }`.

---

## 5. Robust Fallback Architecture: Mammoth Integration

### 5.1 Failure Conditions Triggering Fallback
The custom OpenXML parser automatically degrades to Mammoth under the following conditions:
1. **Invalid ZIP Structure**: `JSZip.loadAsync()` throws (corrupted zip header, truncated buffer).
2. **Missing Document Part**: `word/document.xml` does not exist in the archive.
3. **Corrupted XML Syntax**: XML parser encounters fatal syntax or encoding errors.
4. **Empty AST Extraction**: OpenXML traversal results in 0 valid block nodes.

### 5.2 Mammoth Transformation Pipeline
1. Ingest input buffer:
   ```typescript
   const result = await mammoth.convertToHtml(
     { arrayBuffer: inputBuffer },
     {
       styleMap: [
         "p[style-name='Heading 1'] => h1:fresh",
         "p[style-name='Heading 2'] => h2:fresh",
         "p[style-name='Heading 3'] => h3:fresh",
         "p[style-name='Title'] => h1:fresh",
         "b => strong",
         "i => em",
         "u => u",
         "strike => s",
       ],
       ignoreEmptyParagraphs: false,
     }
   );
   ```
2. Parse Mammoth HTML string using DOMParser.
3. Transform HTML elements into Tiptap JSONContent:
   - `<h1>`-`<h4>` -> `heading` node with `attrs.level`.
   - `<p>` -> `paragraph` node with default NĐ 30 attributes (Times New Roman, 13pt, 1.2 line spacing, 2pt margins, 10mm indent).
   - `<table>`, `<tr>`, `<td>` -> `table`, `tableRow`, `tableCell` nodes.
   - Text formatting: `strong` -> `bold`, `em` -> `italic`, `u` -> `underline`, `s` -> `strike`.

---

## 6. Concrete TypeScript Blueprint & Interface Contracts

### 6.1 Types Contract (`web_app/src/docx/types.ts`)

```typescript
import type { JSONContent } from '@tiptap/core';

export interface DocxImportOptions {
  /** If true, skips custom OpenXML parser and forces Mammoth fallback */
  forceFallback?: boolean;
  /** Custom fallback font family if omitted in OpenXML (default: 'Times New Roman') */
  defaultFontFamily?: string;
  /** Custom fallback font size in pt if omitted in OpenXML (default: 13) */
  defaultFontSize?: number;
  /** Custom fallback line spacing if omitted in OpenXML (default: 1.2) */
  defaultLineSpacing?: number;
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
```

### 6.2 Importer Blueprint (`web_app/src/docx/importer.ts`)

```typescript
import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { JSONContent } from '@tiptap/core';
import type {
  AdministrativeParagraphAttributes,
  AdministrativeTableType,
  AdministrativeColumnRatio,
} from '@/editor/extensions';
import { defaultDocumentState } from '@/editor/schema';
import type { DocxImportOptions, ParsedOpenXmlStyles, TableGeometry } from './types';

/**
 * High-fidelity DOCX importer transforming OpenXML .docx into Tiptap JSONContent
 */
export async function importDocx(
  input: ArrayBuffer | Uint8Array,
  options: DocxImportOptions = {}
): Promise<JSONContent> {
  const arrayBuffer = normalizeBuffer(input);

  if (!options.forceFallback) {
    try {
      const doc = await parseDocxWithOpenXml(arrayBuffer, options);
      if (doc && Array.isArray(doc.content) && doc.content.length > 0) {
        return doc;
      }
    } catch (err) {
      console.warn('[DOCX Importer] OpenXML parsing failed, invoking Mammoth fallback:', err);
    }
  }

  return parseDocxWithMammoth(arrayBuffer, options);
}
```

---

## 7. Verification Method & Test Strategy

### Independent Verification Commands:
1. **Unit Tests**:
   - `npx vitest run tests/unit/docx-importer.test.ts`
   - Test OpenXML unit converters (twips to pt, twips to mm, sz to pt, line spacing).
   - Test header and footer table detection.
   - Test AdminRule recognition.
   - Test Mammoth fallback trigger on corrupted binary.
2. **Integration Roundtrip Verification**:
   - Import `templates/tvci-cong-van-template.docx`.
   - Verify:
     - Root node is `doc`.
     - First node is `table` with `tableType: 'admin-header'`, `isBorderless: true`.
     - Right cell contains "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" in bold.
     - Right cell contains AdminRule (`MOTTO`).
     - Last node is `table` with `tableType: 'admin-footer'`.
     - Body paragraphs have font `Times New Roman`, size `13`, line spacing `1.2`.
3. **Type Checking**:
   - `npm run typecheck`
