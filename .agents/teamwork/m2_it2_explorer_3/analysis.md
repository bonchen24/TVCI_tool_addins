# Analysis: Tab Characters & Indentation Remediation (`web_app/src/docx/importer.ts`)

## 1. Problem Statement & Scope
- Target file: `web_app/src/docx/importer.ts`
- Related types: `web_app/src/docx/types.ts`
- Test target: `web_app/tests/unit/docx-import.test.ts`
- Issues:
  1. `<w:tab/>` elements ignored in `parseRun` (lines 166-185), causing loss of tab stops and text concatenation.
  2. `<w:ind w:hanging="...">` ignored in `parseParagraph` (lines 267-276).
  3. Body paragraphs without explicit `<w:ind>` receive unrequested 10mm indent from `DEFAULT_FIRST_LINE_INDENT_MM` (line 205).
  4. Paragraphs in table cells or headings must never default to 10mm indent.

---

## 2. Root Cause Analysis

### 2.1 Tab Character Dropping in `parseRun`
- **Location**: `web_app/src/docx/importer.ts:166-185`
- **Observed Code**:
  ```typescript
  for (let i = 0; i < runEl.children.length; i++) {
    const child = runEl.children[i];
    if (child.localName === 't') {
      const text = child.textContent || '';
      ...
    } else if (child.localName === 'br') {
      nodes.push({ type: 'hardBreak' });
    }
  }
  ```
- **Mechanism**: Run loop inspects only `child.localName === 't'` and `child.localName === 'br'`. OpenXML `<w:tab/>` (and `<w:ptab/>`) elements have `localName === 'tab'`. They hit neither condition and get dropped silently.
- **Consequence**:
  - Intra-run tab `<w:r><w:t>Kính gửi:</w:t><w:tab/><w:t>- Ban Giám đốc</w:t></w:r>` yields `[{ text: 'Kính gửi:' }, { text: '- Ban Giám đốc' }]`. Words collapse into `"Kính gửi:- Ban Giám đốc"`.
  - Standalone tab run `<w:r><w:tab/></w:r>` produces empty node array `[]`.

### 2.2 Hanging Indents Ignored in `parseParagraph`
- **Location**: `web_app/src/docx/importer.ts:266-276`
- **Observed Code**:
  ```typescript
  const ind = findChild(pPr, 'ind');
  if (ind) {
    const firstLineVal = getAttribute(ind, 'firstLine');
    if (firstLineVal) {
      const parsedFirstLine = parseInt(firstLineVal, 10);
      if (!isNaN(parsedFirstLine)) {
        firstLineIndentMm = Number(((parsedFirstLine * 127) / 7200).toFixed(1));
      }
    }
  }
  ```
- **Mechanism**: Only `w:firstLine` attribute read. In OpenXML ECMA-376 (17.3.1.12), hanging indents specify `w:hanging`. `w:hanging` and `w:firstLine` are mutually exclusive. Paragraph with `<w:ind w:left="720" w:hanging="720"/>` has no `w:firstLine`.
- **Consequence**: `firstLineVal` evaluates to `null`. Hanging indent ignored completely.

### 2.3 False Positive 10mm Default Indent
- **Location**: `web_app/src/docx/importer.ts:205`
- **Observed Code**:
  ```typescript
  let firstLineIndentMm = context.isInsideCell ? 0 : DEFAULT_FIRST_LINE_INDENT_MM;
  ```
- **Mechanism**: `DEFAULT_FIRST_LINE_INDENT_MM` is `10` (from `styles.ts:104`). Body paragraphs without explicit `<w:ind>` inherit `10mm` indent unconditionally.
- **Combined Impact with 2.2**: When a paragraph contains `<w:ind w:hanging="720"/>`, `w:hanging` is ignored AND `firstLineIndentMm` stays `10`. Outdented text turns into indented text (+10mm).

---

## 3. Remediation Design & Code Specifications

### 3.1 `web_app/src/docx/types.ts`
Add optional `hangingIndentMm` to paragraph attributes:
```typescript
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
```

### 3.2 `web_app/src/docx/importer.ts` - Step-by-Step Code Diffs

#### Diff A: Drop unused import `DEFAULT_FIRST_LINE_INDENT_MM`
```typescript
// Location: web_app/src/docx/importer.ts:4-12
<<<<
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE_PT,
  DEFAULT_LINE_SPACING,
  DEFAULT_SPACE_BEFORE_PT,
  DEFAULT_SPACE_AFTER_PT,
  DEFAULT_FIRST_LINE_INDENT_MM,
} from './styles';
====
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE_PT,
  DEFAULT_LINE_SPACING,
  DEFAULT_SPACE_BEFORE_PT,
  DEFAULT_SPACE_AFTER_PT,
} from './styles';
>>>>
```

#### Diff B: Support `<w:tab/>` and `<w:ptab/>` in `parseRun`
```typescript
// Location: web_app/src/docx/importer.ts:182-186
<<<<
    } else if (child.localName === 'br') {
      nodes.push({ type: 'hardBreak' });
    }
  }
====
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
>>>>
```

#### Diff C: Initialize paragraph indent to 0mm (eliminate unrequested 10mm default)
```typescript
// Location: web_app/src/docx/importer.ts:205
<<<<
  let firstLineIndentMm = context.isInsideCell ? 0 : DEFAULT_FIRST_LINE_INDENT_MM;
====
  let firstLineIndentMm = 0;
  let hangingIndentMm: number | undefined;
>>>>
```

#### Diff D: Parse `w:hanging` and `w:firstLine` with ECMA-376 priority
```typescript
// Location: web_app/src/docx/importer.ts:266-277
<<<<
    // Indent (w:ind)
    const ind = findChild(pPr, 'ind');
    if (ind) {
      const firstLineVal = getAttribute(ind, 'firstLine');
      if (firstLineVal) {
        const parsedFirstLine = parseInt(firstLineVal, 10);
        if (!isNaN(parsedFirstLine)) {
          firstLineIndentMm = Number(((parsedFirstLine * 127) / 7200).toFixed(1));
        }
      }
    }
====
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
>>>>
```

#### Diff E: Emit `hangingIndentMm` in paragraph attributes
```typescript
// Location: web_app/src/docx/importer.ts:366-378
<<<<
      results.push({
        type: 'paragraph',
        attrs: {
          fontFamily,
          fontSize: fontSizePt,
          lineSpacing,
          spaceBefore,
          spaceAfter,
          firstLineIndentMm,
          textAlign: alignment,
          align: alignment,
        },
        content: childNodes.length > 0 ? childNodes : undefined,
      });
====
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
>>>>
```

---

## 4. Unit Test Specifications (`web_app/tests/unit/docx-import.test.ts`)

Append following test suite to `web_app/tests/unit/docx-import.test.ts`:

```typescript
  describe('Tab Characters and Indentation Handling', () => {
    it('preserves <w:tab/> elements within runs and across runs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:t>Kính gửi:</w:t>
              <w:tab/>
              <w:t>- Ban Giám đốc Viện</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r><w:t>Hà Nội,</w:t></w:r>
            <w:r><w:tab/></w:r>
            <w:r><w:t>ngày 15 tháng 8 năm 2026</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);

      // Paragraph 1: Intra-run tab
      const p1 = json.content![0];
      expect(p1.content?.length).toBe(3);
      expect(p1.content![0].text).toBe('Kính gửi:');
      expect(p1.content![1].text).toBe('\t');
      expect(p1.content![2].text).toBe('- Ban Giám đốc Viện');

      // Paragraph 2: Standalone tab run
      const p2 = json.content![1];
      expect(p2.content?.length).toBe(3);
      expect(p2.content![0].text).toBe('Hà Nội,');
      expect(p2.content![1].text).toBe('\t');
      expect(p2.content![2].text).toBe('ngày 15 tháng 8 năm 2026');
    });

    it('parses <w:ind w:hanging="..."> as negative firstLineIndentMm and hangingIndentMm', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:ind w:left="720" w:hanging="720"/>
            </w:pPr>
            <w:r><w:t>- Các phòng ban trực thuộc;</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:ind w:hanging="567"/>
            </w:pPr>
            <w:r><w:t>Đoạn văn thụt treo 10mm.</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);

      // Paragraph 1: 720 twips = 12.7mm hanging
      const p1 = json.content![0];
      expect(p1.attrs?.firstLineIndentMm).toBeCloseTo(-12.7, 1);
      expect(p1.attrs?.hangingIndentMm).toBeCloseTo(12.7, 1);

      // Paragraph 2: 567 twips = 10.0mm hanging
      const p2 = json.content![1];
      expect(p2.attrs?.firstLineIndentMm).toBeCloseTo(-10.0, 1);
      expect(p2.attrs?.hangingIndentMm).toBeCloseTo(10.0, 1);
    });

    it('defaults body paragraphs without <w:ind> to 0mm first line indent', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:jc w:val="left"/>
            </w:pPr>
            <w:r><w:t>Đoạn văn căn trái không thụt dòng.</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="both"/>
            </w:pPr>
            <w:r><w:t>Đoạn văn căn đều không thụt dòng.</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);
      expect(json.content![0].attrs?.firstLineIndentMm).toBe(0);
      expect(json.content![1].attrs?.firstLineIndentMm).toBe(0);
    });

    it('ensures table cells and headings never default to 10mm indent', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="Heading1"/>
            </w:pPr>
            <w:r><w:t>Tiêu đề chương 1</w:t></w:r>
          </w:p>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:p>
                  <w:r><w:t>Nội dung ô bảng</w:t></w:r>
                </w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      expect(json.content?.length).toBe(2);

      // Node 0: Heading 1
      const heading = json.content![0];
      expect(heading.type).toBe('heading');
      expect(heading.attrs?.level).toBe(1);
      expect(heading.attrs?.firstLineIndentMm).toBeUndefined();

      // Node 1: Table Cell Paragraph
      const table = json.content![1];
      const cell = table.content![0].content![0];
      const cellParagraph = cell.content![0];
      expect(cellParagraph.type).toBe('paragraph');
      expect(cellParagraph.attrs?.firstLineIndentMm).toBe(0);
    });

    it('preserves text formatting marks on tab characters within formatted runs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:i/>
              </w:rPr>
              <w:t>Mục 1</w:t>
              <w:tab/>
              <w:t>Chi tiết 1</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>`;

      const docxBuffer = await createTestDocxZip(xml);
      const json = await parseDocxWithOpenXml(docxBuffer);

      const p = json.content![0];
      const tabNode = p.content![1];
      expect(tabNode.text).toBe('\t');
      expect(tabNode.marks?.some((m: any) => m.type === 'bold')).toBe(true);
      expect(tabNode.marks?.some((m: any) => m.type === 'italic')).toBe(true);
    });
  });
```

---

## 5. Backward Compatibility & Impact Assessment
- `tests/unit/docx-import.test.ts`: Existing test at line 88 uses `<w:ind w:firstLine="567"/>`. It continues to assert `expect(p2.attrs?.firstLineIndentMm).toBeCloseTo(10.0, 1)`. Unaffected.
- `tests/unit/docx-roundtrip.test.ts`: Export generates `<w:ind w:firstLine="567"/>` when source AST has `firstLineIndentMm: 10`. Import parses it back to `10.0`. Unaffected.
- Zero breaking changes to `exportDocx` or `Tiptap` schemas.
