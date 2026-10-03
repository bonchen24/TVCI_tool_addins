# Root Cause Analysis & Remediation Specification: DOCX Fallback Error Handling

**Author**: M2 Iteration 2 Explorer 1  
**Target Milestone**: M2 (`docx-interop-engine`)  
**Target Components**:
- `web_app/src/docx/importer.ts`
- `web_app/src/docx/types.ts`
- `web_app/tests/unit/docx-import.test.ts`

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 Root Cause
In `web_app/src/docx/importer.ts`, `importDocx` orchestrates a 2-tier import pipeline:
1. Primary tier: `parseDocxWithOpenXml(arrayBuffer, options)`
2. Secondary fallback tier: `parseDocxWithMammoth(arrayBuffer, options)`

Lines 833-845:
```typescript
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
```

And in `parseDocxWithMammoth` (lines 622-641):
```typescript
export async function parseDocxWithMammoth(
  arrayBuffer: ArrayBuffer,
  _options: DocxImportOptions = {}
): Promise<JSONContent> {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [ ... ],
      ignoreEmptyParagraphs: false,
    }
  );
  ...
```

### 1.2 Failure Mechanisms
1. **No try/catch in `parseDocxWithMammoth`**: `mammoth.convertToHtml` is called asynchronously without error handling. When passed an invalid buffer (0 bytes, non-zip binary, truncated archive, or zip without `word/document.xml`), Mammoth rejects with an error (e.g., `Error: Can't find end of central directory : is this a zipfile?` or `Error: Could not find main document part`).
2. **No outer try/catch in `importDocx`**: The fallback invocation `return await parseDocxWithMammoth(arrayBuffer, options);` is located outside any `try...catch` block. The rejection escapes to the caller.
3. **No zero-length guard**: Passing `new ArrayBuffer(0)` or `new Uint8Array(0)` causes both JSZip and Mammoth to process empty byte streams instead of short-circuiting to a clean default AST document.
4. **Duplicate fallback document structures**: Lines 645-661 and lines 806-815 define inline paragraph AST structures with inconsistent attributes. No reusable, exported `createDefaultDocument()` function exists.

---

## 2. Remediation Design

### 2.1 Reusable `createDefaultDocument()` Helper
Define an exported `createDefaultDocument(options?: { withAdministrativeLayout?: boolean })` helper in `importer.ts` (and exported from `@/docx`):
- Defaults to a clean single-paragraph document AST with standard Nghị định 30 administrative attributes: Times New Roman, 13pt, 1.2 line spacing, justify alignment, 10mm first-line indent, and 2pt before/after spacing.
- If `withAdministrativeLayout: true`, provides a standard 2-column header table (Agency + Motto) and empty body paragraph.

### 2.2 Defensive `parseDocxWithMammoth`
- Early return: if `!arrayBuffer || arrayBuffer.byteLength === 0`, immediately return `createDefaultDocument()`.
- Wrap `mammoth.convertToHtml` in `try...catch`. On rejection, return `createDefaultDocument()`.
- Wrap DOM parsing and traversal in `try...catch`. On error or empty content, return `createDefaultDocument()`.

### 2.3 Bulletproof `importDocx`
- Wrap entire function in `try...catch`.
- Short-circuit on `arrayBuffer.byteLength === 0`.
- If OpenXML fails, invoke `parseDocxWithMammoth`.
- If any unexpected error or exception occurs, catch it and return `createDefaultDocument()`.
- Guarantee: `importDocx` will **NEVER** throw an unhandled rejection under any input condition.

---

## 3. Exact Remediation Code Specifications

### 3.1 Changes in `web_app/src/docx/types.ts`
Add optional parameter `fallbackToAdministrativeLayout` to `DocxImportOptions`:

```typescript
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
```

### 3.2 Changes in `web_app/src/docx/importer.ts`

#### A. Add `createDefaultDocument` Definition (before `parseDocxWithMammoth`):
```typescript
/**
 * Create a default fallback document AST with standard ND 30 administrative styling.
 * Guaranteed to return a valid Tiptap JSONContent structure that never crashes the editor canvas.
 */
export function createDefaultDocument(options: { withAdministrativeLayout?: boolean } = {}): JSONContent {
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
```

#### B. Replace `parseDocxWithMammoth` Implementation:
```typescript
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
  } catch (_err) {
    return fallbackDoc();
  }

  if (!html.trim()) {
    return fallbackDoc();
  }

  try {
    // Parse HTML into DOM
    let domDoc: Document;
    if (typeof DOMParser !== 'undefined') {
      domDoc = new DOMParser().parseFromString(html, 'text/html');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { JSDOM } = require('jsdom');
      domDoc = new JSDOM(html).window.document;
    }

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

    const bodyNodes = Array.from(domDoc.body ? domDoc.body.childNodes : domDoc.childNodes);

    for (const node of bodyNodes) {
      if (node.nodeType !== 1) continue;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        const level = parseInt(tag.charAt(1), 10);
        const runs = parseHtmlChildren(el);
        content.push({
          type: 'heading',
          attrs: {
            level,
            textAlign: 'center',
          },
          content: runs.length > 0 ? runs : undefined,
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
          },
          content: runs.length > 0 ? runs : undefined,
        });
      } else if (tag === 'table') {
        const rowNodes = el.querySelectorAll('tr');
        const rows: JSONContent[] = [];

        rowNodes.forEach((tr) => {
          const cellNodes = tr.querySelectorAll('td, th');
          const cells: JSONContent[] = [];

          cellNodes.forEach((td) => {
            const isHeader = td.tagName.toLowerCase() === 'th';
            const runs = parseHtmlChildren(td);
            cells.push({
              type: isHeader ? 'tableHeader' : 'tableCell',
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
                  },
                  content: runs.length > 0 ? runs : undefined,
                },
              ],
            });
          });

          if (cells.length > 0) {
            rows.push({
              type: 'tableRow',
              content: cells,
            });
          }
        });

        if (rows.length > 0) {
          content.push({
            type: 'table',
            attrs: {
              tableType: 'content',
              isBorderless: false,
              columnRatio: null,
            },
            content: rows,
          });
        }
      }
    }

    return {
      type: 'doc',
      content: content.length > 0 ? content : fallbackDoc().content,
    };
  } catch (_domErr) {
    return fallbackDoc();
  }
}
```

#### C. Replace `importDocx` Implementation:
```typescript
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
```

---

## 4. Exact Unit Test Specifications (`web_app/tests/unit/docx-import.test.ts`)

Add the following complete test suite to `web_app/tests/unit/docx-import.test.ts`:

```typescript
  describe('DOCX Import Fallback & Error Handling', () => {
    it('handles empty ArrayBuffer (0 bytes) without throwing and returns valid AST', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      const result = await importDocx(emptyBuffer);

      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
      expect(result.content![0].type).toBe('paragraph');
      expect(result.content![0].attrs?.fontFamily).toBe('Times New Roman');
      expect(result.content![0].attrs?.fontSize).toBe(13);
    });

    it('handles empty Uint8Array (0 bytes) without throwing and returns valid AST', async () => {
      const emptyU8 = new Uint8Array(0);
      const result = await importDocx(emptyU8);

      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles truncated zip archive header gracefully', async () => {
      // PK\x03\x04 header with truncated body
      const truncatedBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]).buffer;
      const result = await importDocx(truncatedBuffer);

      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles arbitrary non-zip binary payload gracefully', async () => {
      const nonZipBinary = new Uint8Array([
        0x00, 0xff, 0x42, 0x61, 0x64, 0x46, 0x69, 0x6c, 0x65, 0xde, 0xad, 0xbe, 0xef,
      ]).buffer;

      const result = await importDocx(nonZipBinary);
      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles forceFallback mode with damaged buffer without rejection', async () => {
      const damagedBuffer = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer;
      const result = await importDocx(damagedBuffer, { forceFallback: true });

      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles zip archive missing word/document.xml without rejection', async () => {
      const zip = new JSZip();
      zip.file('unrelated.txt', 'This is not a docx file');
      const nonDocxZipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      const result = await importDocx(nonDocxZipBuffer);
      expect(result.type).toBe('doc');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('handles direct calls to parseDocxWithMammoth with damaged buffers safely', async () => {
      const zeroBuffer = new ArrayBuffer(0);
      const result1 = await parseDocxWithMammoth(zeroBuffer);
      expect(result1.type).toBe('doc');
      expect(result1.content!.length).toBeGreaterThan(0);

      const badBuffer = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
      const result2 = await parseDocxWithMammoth(badBuffer);
      expect(result2.type).toBe('doc');
      expect(result2.content!.length).toBeGreaterThan(0);
    });

    it('creates administrative layout fallback when requested', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      const result = await importDocx(emptyBuffer, { fallbackToAdministrativeLayout: true });

      expect(result.type).toBe('doc');
      expect(result.content!.length).toBeGreaterThanOrEqual(2);
      expect(result.content![0].type).toBe('table');
      expect(result.content![0].attrs?.tableType).toBe('admin-header');
    });

    it('exports createDefaultDocument returning valid ND30 AST', () => {
      const defaultDoc = createDefaultDocument();
      expect(defaultDoc.type).toBe('doc');
      expect(defaultDoc.content).toBeDefined();
      expect(defaultDoc.content![0].type).toBe('paragraph');
      expect(defaultDoc.content![0].attrs?.fontFamily).toBe('Times New Roman');
      expect(defaultDoc.content![0].attrs?.fontSize).toBe(13);
      expect(defaultDoc.content![0].attrs?.lineSpacing).toBe(1.2);
      expect(defaultDoc.content![0].attrs?.textAlign).toBe('justify');
    });
  });
```

---

## 5. Verification Checklist

1. Typecheck: `npm run typecheck` passes with zero diagnostics.
2. Unit tests: `npm test -- tests/unit/docx-import.test.ts` executes all 9 new fallback test cases and existing tests with 100% pass rate.
3. Roundtrip tests: `npm test -- tests/unit/docx-roundtrip.test.ts` continues to pass 100%.
4. No unhandled promise rejection under any malformed buffer condition.
