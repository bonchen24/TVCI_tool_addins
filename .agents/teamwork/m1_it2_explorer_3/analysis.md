# Remediation Analysis: `EditorToolbar.tsx` and `extensions.ts`

**Author**: M1 Iteration 2 Explorer 3  
**Milestone**: Milestone 1 (`core-platform-editor`)  
**Workspace**: `e:\CODING\TVCI_word_addins\web_app`  
**Date**: 2026-09-29T10:12:00+07:00  

---

## 1. Executive Summary

Milestone 1 audit and challenger reviews (`m1_challenger_2`, `m1_reviewer_1`) revealed three concrete defects in editor components:
1. **NĐ 30 Preset Incompleteness** (`EditorToolbar.tsx:272-279`): Clicking "Chuẩn Thân bài NĐ30" on heading nodes fails to convert them to paragraphs, and existing marks (`bold`, `italic`, `underline`, `strike`) are preserved.
2. **`setFontSize` Node Scope** (`extensions.ts:190-195`): Toolbar font size changes only target `paragraph` nodes, ignoring `heading` nodes.
3. **Table Attribute Divergence** (`extensions.ts:286-298`): Production extensions define `isBorderless` and `columnRatio`, whereas downstream fixtures and test harnesses expect `borderless` and `columnRatios`.

This document specifies the exact, line-by-line remediation for both files with zero regression risk.

---

## 2. Remediation Item 1: `EditorToolbar.tsx` Preset Command Chain

### 2.1 Problem Diagnosis
- **Target File**: `web_app/src/components/editor/EditorToolbar.tsx`
- **Location**: Lines 272-279
- **Current Code**:
  ```tsx
  onClick={() => {
    editor
      .chain()
      .focus()
      .setTextAlign('justify')
      .resetToAdministrativeStandard()
      .run();
  }}
  ```
- **Flaws**:
  1. `resetToAdministrativeStandard()` executes `commands.updateAttributes('paragraph', ...)`. When the active selection is a `heading` (`<h1>`..`<h4>`), `updateAttributes('paragraph')` does not match and fails silently. The node remains a Heading.
  2. NĐ 30 Section 2.1 prescribes administrative body text in upright font, normal weight, without underline or strikethrough. The current chain does not clear active marks, leaving bold, italic, underline, or strike intact on copied or previously formatted text.

### 2.2 Proposed Replacement
- **Chained Sequence**:
  `.setParagraph().unsetBold().unsetItalic().unsetUnderline().unsetStrike()` before `resetToAdministrativeStandard()`
- **Replacement Code**:
  ```tsx
  onClick={() => {
    editor
      .chain()
      .focus()
      .setParagraph()
      .unsetBold()
      .unsetItalic()
      .unsetUnderline()
      .unsetStrike()
      .setTextAlign('justify')
      .resetToAdministrativeStandard()
      .run();
  }}
  ```

### 2.3 Rationale & Behavior Trace
1. `.setParagraph()` converts heading or list items into standard paragraph blocks.
2. `.unsetBold().unsetItalic().unsetUnderline().unsetStrike()` strips all formatting marks from the selected range.
3. `.setTextAlign('justify')` sets two-sided justification as required by NĐ 30.
4. `.resetToAdministrativeStandard()` resets paragraph node attributes:
   - `fontFamily`: `'Times New Roman'`
   - `fontSize`: `13`
   - `lineSpacing`: `1.2`
   - `spaceBefore`: `2`
   - `spaceAfter`: `2`
   - `firstLineIndentMm`: `10`
5. All operations execute in a single atomic ProseMirror transaction via `.run()`.

---

## 3. Remediation Item 2: `extensions.ts` - `setFontSize` Multi-Node Support

### 3.1 Problem Diagnosis
- **Target File**: `web_app/src/editor/extensions.ts`
- **Location**: Lines 190-195
- **Current Code**:
  ```ts
  setFontSize:
    (sizePt) =>
    ({ commands }) => {
      return commands.updateAttributes('paragraph', { fontSize: sizePt });
    },
  ```
- **Flaw**: Changing font size while cursor is inside a heading (`AdministrativeHeading`) does not update the heading because the command only targets `'paragraph'`.

### 3.2 Proposed Replacement
- **Command Implementation**:
  ```ts
  setFontSize:
    (sizePt) =>
    ({ commands }) => {
      const updatedParagraph = commands.updateAttributes('paragraph', { fontSize: sizePt });
      const updatedHeading = commands.updateAttributes('heading', { fontSize: sizePt });
      return updatedParagraph || updatedHeading;
    },
  ```
- **Command Interface Update** (`web_app/src/editor/extensions.ts:28-42`):
  Ensure `setFontSize` is registered in `Commands<ReturnType>` so it can be called on both node types without TypeScript error.

### 3.3 Rationale & Behavior Trace
1. Pre-evaluates both `commands.updateAttributes('paragraph', ...)` and `commands.updateAttributes('heading', ...)`. Avoiding short-circuit evaluation guarantees that if a multi-block selection spans both a paragraph and a heading, both nodes receive the new font size attribute.
2. Returns `true` if at least one node type was updated, or `false` if selection does not contain editable paragraph/heading nodes.
3. `AdministrativeHeading` already defines `fontSize` attribute (`lines 212-221`) and serializes `font-size: ${node.attrs.fontSize || 14}pt` (`line 256`), so updating the attribute immediately updates canvas rendering.

---

## 4. Remediation Item 3: `extensions.ts` - `AdministrativeTable` Attribute Aliases

### 4.1 Problem Diagnosis
- **Target File**: `web_app/src/editor/extensions.ts`
- **Location**: Lines 273-324
- **Divergence**:
  - `extensions.ts` and `schema.ts`: `isBorderless: true`, `columnRatio: '40-60' | '50-50' | 'custom'`
  - Fixtures (`documentFixtures.ts:39, 91`) and E2E runner (`runner.js:169, 200, 313`): `borderless: true`, `columnRatios: [0.45, 0.55]` or `[0.5, 0.5]`
- **Flaw**:
  When downstream fixtures, DOCX imports, or test cases construct or query AST nodes with `borderless` or `columnRatios`, `AdministrativeTable.renderHTML` fails to attach `.borderless-table`, `.admin-header-table`, or `.admin-footer-table` classes because it only inspects `node.attrs.isBorderless` and `node.attrs.tableType`.

### 4.2 Proposed Implementation

#### 4.2.1 Type Definitions
```ts
export type AdministrativeTableType = 'admin-header' | 'admin-footer' | 'content';
export type AdministrativeColumnRatio = '40-60' | '50-50' | 'custom';

export interface AdministrativeTableAttributes {
  tableType: AdministrativeTableType;
  isBorderless: boolean;
  borderless: boolean;
  columnRatio: AdministrativeColumnRatio;
  columnRatios: [number, number] | number[] | null;
}
```

#### 4.2.2 `AdministrativeTable.addAttributes()`
```ts
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
```

#### 4.2.3 Compatibility Matrix
| Source | Input Attributes | `node.attrs` Populated | `renderHTML` Classes Applied |
|---|---|---|---|
| `schema.ts` (Default Doc) | `{ isBorderless: true, columnRatio: '40-60' }` | `isBorderless: true`, `columnRatio: '40-60'` | `.tiptap-table.admin-header-table.borderless-table` |
| `documentFixtures.ts` | `{ borderless: true, columnRatios: [0.45, 0.55] }` | `borderless: true`, `columnRatios: [0.45, 0.55]` | `.tiptap-table.admin-header-table.borderless-table` |
| HTML Parse (`data-*`) | `<table data-borderless="true" data-column-ratio="40-60">` | `isBorderless: true`, `borderless: true`, `columnRatio: '40-60'`, `columnRatios: [0.45, 0.55]` | `.tiptap-table.admin-header-table.borderless-table` |
| HTML Parse (`legacy`) | `<table borderless="true" column-ratios="0.5,0.5">` | `isBorderless: true`, `borderless: true`, `columnRatio: '50-50'`, `columnRatios: [0.5, 0.5]` | `.tiptap-table.admin-footer-table.borderless-table` |

---

## 5. Verification Specifications

### 5.1 Unit Test Cases (`web_app/tests/unit/editor-extensions.test.ts`)
Add following test cases to `tests/unit/editor-extensions.test.ts`:

1. **Test `setFontSize` on Heading**:
   ```ts
   it('updates heading font size via setFontSize command', () => {
     const editor = new Editor({
       extensions: [Document, AdministrativeParagraph, AdministrativeHeading, Text],
       content: '<h2>TIÊU ĐỀ MỤC</h2>',
     });

     editor.commands.setFontSize(16);
     expect(editor.getAttributes('heading').fontSize).toBe(16);
     editor.destroy();
   });
   ```

2. **Test `AdministrativeTable` Attribute Aliases**:
   ```ts
   it('supports attribute aliases isBorderless/borderless and columnRatio/columnRatios', () => {
     const editor = new Editor({
       extensions: [
         Document,
         AdministrativeParagraph,
         Text,
         AdministrativeTable,
         TableRow,
         AdministrativeTableCell,
       ],
       content: `
         <table borderless="true" column-ratios="0.45,0.55">
           <tr><td><p>Trái</p></td><td><p>Phải</p></td></tr>
         </table>
       `,
     });

     const attrs = editor.getAttributes('table');
     expect(attrs.borderless).toBe(true);
     expect(attrs.isBorderless).toBe(true);
     expect(attrs.columnRatio).toBe('40-60');
     expect(attrs.columnRatios).toEqual([0.45, 0.55]);
     editor.destroy();
   });
   ```

3. **Test JSON content hydration with `borderless` and `columnRatios`**:
   ```ts
   it('renders borderless and header ratio classes when initialized via fixture AST', () => {
     const editor = new Editor({
       extensions: [Document, AdministrativeParagraph, Text, AdministrativeTable, TableRow, AdministrativeTableCell],
       content: {
         type: 'doc',
         content: [
           {
             type: 'table',
             attrs: { borderless: true, columnRatios: [0.45, 0.55] },
             content: [
               {
                 type: 'tableRow',
                 content: [
                   { type: 'tableCell', content: [{ type: 'paragraph', text: 'A' }] },
                   { type: 'tableCell', content: [{ type: 'paragraph', text: 'B' }] },
                 ],
               },
             ],
           },
         ],
       },
     });

     const html = editor.getHTML();
     expect(html).toContain('borderless-table');
     expect(html).toContain('admin-header-table');
     editor.destroy();
   });
   ```
