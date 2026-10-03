# Analysis Report: Tiptap v2 Rich Text Editor Engine & A4 Document Canvas

**Milestone**: M1 `core-platform-editor`  
**Agent**: M1 Explorer 2  
**Date**: 2026-09-29  
**Target Repository**: `TVCI_word_addins` / `web_app`  
**Reference Standard**: Nghị định 30/2020/NĐ-CP về công tác văn thư & Quy chuẩn kỹ thuật TVCI

---

## 1. Executive Summary

This specification establishes the architecture, node schema, styling, and UI components for the web-based document editor of TVCI Web Application. It replaces Microsoft Word / Office.js dependency with an independent browser engine built on **Tiptap v2** (ProseMirror core), wrapped inside an **A4 paper canvas** conforming strictly to Vietnamese administrative formatting regulations (Nghị định 30/2020/NĐ-CP).

Key technical deliverables specified herein:
1. **Tiptap v2 Core & Formatting Extensions**: Document, Paragraph, Text, Heading (H1-H6), Bold, Italic, Underline, Strike, History, and TextAlign.
2. **Administrative Paragraph Node Attributes**: `lineSpacing` (1.0–1.5), `spaceBefore` (0–6pt), `spaceAfter` (0–6pt), `firstLineIndentMm` (10–12.7mm), `fontFamily` ("Times New Roman"), and `fontSize` (11–14pt).
3. **A4 Paper Canvas & Print Engine**: 210mm x 297mm dimensions, NĐ 30 margins (Top 20mm, Bottom 20mm, Left 30mm, Right 15mm), subtle box shadow, and `@media print` pagination layout.
4. **Administrative Formatting Toolbar**: Quick-preset buttons, typography controls, spacing pickers, alignment buttons, and reactive active-state indicators with keyboard shortcut hints.
5. **Cross-Milestone Contracts**: Direct JSON mapping for M2 (DOCX import/export OpenXML), M3 (NĐ 30 rule evaluation & auto-fix), M4 (template generation), and M5 (AI visual diff).

---

## 2. Tiptap v2 Core Extensions Architecture

### 2.1 Extension Registry
The editor instance is built using modular Tiptap v2 packages:

```typescript
// web_app/src/editor/extensions.ts
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import History from '@tiptap/extension-history';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { AdministrativeParagraph } from './extensions/administrative-paragraph';
import { AdministrativeHeading } from './extensions/administrative-heading';
import { AdministrativeTableExtensions } from './extensions/administrative-table'; // coordinated with Explorer 3

export const coreEditorExtensions = [
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
  History.configure({
    depth: 100,
    newGroupDelay: 500,
  }),
  ...AdministrativeTableExtensions,
];
```

### 2.2 Heading Node Extension
Vietnamese administrative documents employ headings primarily for document type names, abstract titles, and sections (Điều, Khoản).

```typescript
// web_app/src/editor/extensions/administrative-heading.ts
import Heading from '@tiptap/extension-heading';
import { mergeAttributes } from '@tiptap/core';

export const AdministrativeHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontFamily: {
        default: 'Times New Roman',
        parseHTML: (element) => element.style.fontFamily || 'Times New Roman',
        renderHTML: (attributes) => {
          if (!attributes.fontFamily) return {};
          return { 'data-font-family': attributes.fontFamily };
        },
      },
      fontSize: {
        default: 14,
        parseHTML: (element) => {
          const match = element.style.fontSize?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 14;
        },
        renderHTML: (attributes) => ({ 'data-font-size': attributes.fontSize || 14 }),
      },
      lineSpacing: {
        default: 1.2,
        parseHTML: (element) => parseFloat(element.style.lineHeight) || 1.2,
        renderHTML: (attributes) => ({ 'data-line-spacing': attributes.lineSpacing || 1.2 }),
      },
      spaceBefore: {
        default: 6,
        parseHTML: (element) => {
          const match = element.style.marginTop?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 6;
        },
        renderHTML: (attributes) => ({ 'data-space-before': attributes.spaceBefore ?? 6 }),
      },
      spaceAfter: {
        default: 6,
        parseHTML: (element) => {
          const match = element.style.marginBottom?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 6;
        },
        renderHTML: (attributes) => ({ 'data-space-after': attributes.spaceAfter ?? 6 }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level || 1;
    const styles: string[] = [
      `font-family: ${node.attrs.fontFamily || 'Times New Roman'}, serif`,
      `font-size: ${node.attrs.fontSize || 14}pt`,
      `line-height: ${node.attrs.lineSpacing || 1.2}`,
      `margin-top: ${node.attrs.spaceBefore ?? 6}pt`,
      `margin-bottom: ${node.attrs.spaceAfter ?? 6}pt`,
    ];
    if (HTMLAttributes.style) {
      styles.push(HTMLAttributes.style);
    }

    const { style, ...rest } = HTMLAttributes;
    return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, rest, { style: styles.join('; ') }), 0];
  },
});
```

---

## 3. Custom Node Attributes for Nghị định 30/2020/NĐ-CP

### 3.1 Attribute Specifications

| Attribute | TypeScript Type | Permitted Range | NĐ 30 Standard Body | Target Units | CSS Style Mapping |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `fontFamily` | `string` | `"Times New Roman"`, `"Arial"` | `"Times New Roman"` | font name | `font-family: "Times New Roman", serif` |
| `fontSize` | `number` | `11` to `14` (up to `18` for titles) | `13` (or `14`) | pt | `font-size: 13pt` |
| `lineSpacing` | `number` | `1.0` to `1.5` | `1.2` (or `1.25`) | multiple | `line-height: 1.2` |
| `spaceBefore` | `number` | `0` to `6` | `2` (range 0–6) | pt | `margin-top: 2pt` |
| `spaceAfter` | `number` | `0` to `6` | `2` (range 0–6) | pt | `margin-bottom: 2pt` |
| `firstLineIndentMm`| `number` | `0` to `12.7` | `10` (range 10–12.7) | mm | `text-indent: 10mm` |
| `textAlign` | `string` | `"left"`, `"center"`, `"right"`, `"justify"` | `"justify"` | CSS alignment | `text-align: justify` |

### 3.2 Implementation: `AdministrativeParagraph` Extension

```typescript
// web_app/src/editor/extensions/administrative-paragraph.ts
import { Paragraph } from '@tiptap/extension-paragraph';
import { mergeAttributes } from '@tiptap/core';

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
        renderHTML: (attributes) => ({ 'data-font-family': attributes.fontFamily || 'Times New Roman' }),
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
        renderHTML: (attributes) => ({ 'data-font-size': attributes.fontSize || 13 }),
      },
      lineSpacing: {
        default: 1.2,
        parseHTML: (element) => {
          const lh = element.style.lineHeight;
          if (!lh || lh === 'normal') return 1.2;
          return parseFloat(lh) || 1.2;
        },
        renderHTML: (attributes) => ({ 'data-line-spacing': attributes.lineSpacing || 1.2 }),
      },
      spaceBefore: {
        default: 2,
        parseHTML: (element) => {
          const match = element.style.marginTop?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 0;
        },
        renderHTML: (attributes) => ({ 'data-space-before': attributes.spaceBefore ?? 2 }),
      },
      spaceAfter: {
        default: 2,
        parseHTML: (element) => {
          const match = element.style.marginBottom?.match(/^([\d.]+)pt$/);
          return match ? parseFloat(match[1]) : 0;
        },
        renderHTML: (attributes) => ({ 'data-space-after': attributes.spaceAfter ?? 2 }),
      },
      firstLineIndentMm: {
        default: 10,
        parseHTML: (element) => {
          const match = element.style.textIndent?.match(/^([\d.]+)mm$/);
          if (match) return parseFloat(match[1]);
          const cmMatch = element.style.textIndent?.match(/^([\d.]+)cm$/);
          if (cmMatch) return parseFloat(cmMatch[1]) * 10;
          return 0;
        },
        renderHTML: (attributes) => ({ 'data-indent-mm': attributes.firstLineIndentMm ?? 10 }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const styles: string[] = [
      `font-family: "${HTMLAttributes['data-font-family'] || 'Times New Roman'}", Times, serif`,
      `font-size: ${HTMLAttributes['data-font-size'] || 13}pt`,
      `line-height: ${HTMLAttributes['data-line-spacing'] || 1.2}`,
      `margin-top: ${HTMLAttributes['data-space-before'] ?? 2}pt`,
      `margin-bottom: ${HTMLAttributes['data-space-after'] ?? 2}pt`,
    ];

    const indent = HTMLAttributes['data-indent-mm'];
    if (indent && indent > 0) {
      styles.push(`text-indent: ${indent}mm`);
    } else {
      styles.push(`text-indent: 0mm`);
    }

    if (HTMLAttributes.style) {
      styles.push(HTMLAttributes.style);
    }

    const { style, ...cleanAttributes } = HTMLAttributes;
    return ['p', mergeAttributes(this.options.HTMLAttributes, cleanAttributes, { style: styles.join('; ') }), 0];
  },

  addCommands() {
    return {
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
          return commands.updateAttributes('paragraph', { fontSize: sizePt });
        },
    };
  },
});
```

---

## 4. A4 Document Canvas Architecture & Styling

### 4.1 Physical Geometry and Unit Calibration
Vietnamese administrative documents are standardized on A4 portrait dimensions:
- **Paper Width**: `210mm` (8.27 inches, 793.7px @ 96 DPI).
- **Paper Height**: `297mm` (11.69 inches, 1122.5px @ 96 DPI).
- **Aspect Ratio**: `1 : √2 ≈ 1 : 1.4142`.

### 4.2 NĐ 30/2020/NĐ-CP Margin Calibration
Điều 8, Nghị định 30/2020/NĐ-CP prescribes the following margin ranges:
- **Top Margin**: `20mm` to `25mm` (Target / Default: `20mm`).
- **Bottom Margin**: `20mm` to `25mm` (Target / Default: `20mm`).
- **Left Margin**: `30mm` to `35mm` (Target / Default: `30mm` — accommodating document punch holes and binding).
- **Right Margin**: `15mm` to `20mm` (Target / Default: `15mm`).

### 4.3 Printable Content Area
- **Usable Width**: `210mm - 30mm (Left) - 15mm (Right) = 165mm` (~623.6px).
- **Usable Height Per Page**: `297mm - 20mm (Top) - 20mm (Bottom) = 257mm` (~971.3px).

### 4.4 Canvas Component Structure

```tsx
// web_app/src/components/editor/A4Canvas.tsx
'use client';

import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';

interface A4CanvasProps {
  editor: Editor | null;
  className?: string;
  showMarginGuides?: boolean;
}

export const A4Canvas: React.FC<A4CanvasProps> = ({
  editor,
  className = '',
  showMarginGuides = false,
}) => {
  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Khởi tạo trình soạn thảo...
      </div>
    );
  }

  return (
    <div className={`a4-canvas-scroll-container bg-slate-200/70 overflow-y-auto py-8 px-4 flex justify-center min-h-full ${className}`}>
      <div className="relative">
        {/* A4 Paper Sheet */}
        <div
          className={`a4-sheet bg-white text-slate-900 shadow-xl transition-shadow relative box-border ${
            showMarginGuides ? 'margin-guides-active' : ''
          }`}
          style={{
            width: '210mm',
            minHeight: '297mm',
            paddingTop: '20mm',
            paddingBottom: '20mm',
            paddingLeft: '30mm',
            paddingRight: '15mm',
            fontFamily: '"Times New Roman", Times, serif',
          }}
        >
          {/* Subtle Margin Boundary Overlay (Optional Visual Guide) */}
          {showMarginGuides && (
            <div
              className="absolute pointer-events-none border border-dashed border-indigo-300/60"
              style={{
                top: '20mm',
                bottom: '20mm',
                left: '30mm',
                right: '15mm',
              }}
            />
          )}

          {/* Tiptap Editor Content */}
          <EditorContent
            editor={editor}
            className="tiptap-a4-editor-content focus:outline-none min-h-[257mm]"
          />
        </div>
      </div>
    </div>
  );
};
```

### 4.5 CSS & Print Stylesheet

```css
/* web_app/src/styles/a4-canvas.css */

/* Screen Rendering */
.a4-sheet {
  background-color: #ffffff;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.tiptap-a4-editor-content .ProseMirror {
  outline: none !important;
  min-height: 257mm;
  color: #1e293b;
  font-family: "Times New Roman", Times, serif;
  font-size: 13pt;
  line-height: 1.2;
}

/* Paragraph and Heading Styles in Canvas */
.tiptap-a4-editor-content .ProseMirror p {
  margin-top: 2pt;
  margin-bottom: 2pt;
  text-indent: 10mm;
  text-align: justify;
}

/* Exclude text indent for centered, right-aligned, or table text */
.tiptap-a4-editor-content .ProseMirror p[style*="text-align: center"],
.tiptap-a4-editor-content .ProseMirror p[style*="text-align: right"],
.tiptap-a4-editor-content .ProseMirror table p {
  text-indent: 0mm !important;
}

/* Administrative Table Borderless Presentation */
.tiptap-a4-editor-content .ProseMirror table.admin-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
  border: none !important;
}

.tiptap-a4-editor-content .ProseMirror table.admin-table td {
  border: 1px dashed rgba(203, 213, 225, 0.4); /* Faint guide in editor, invisible in print */
  padding: 2px 4px;
  vertical-align: top;
}

/* Print Specification */
@page {
  size: A4 portrait;
  margin-top: 20mm;
  margin-bottom: 20mm;
  margin-left: 30mm;
  margin-right: 15mm;
}

@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide Application Shell */
  header, nav, aside, .editor-toolbar, .audit-panel, .ai-workspace, .no-print {
    display: none !important;
  }

  .a4-canvas-scroll-container {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
  }

  .a4-sheet {
    width: 100% !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important; /* Margins handled by @page */
    box-shadow: none !important;
    border: none !important;
  }

  .tiptap-a4-editor-content .ProseMirror table.admin-table td {
    border: none !important;
  }

  .page-break {
    page-break-after: always;
    break-after: page;
    visibility: hidden;
    height: 0;
  }
}
```

---

## 5. Rich Text Formatting Toolbar Architecture

### 5.1 Control Inventory

| Group | Control | Icon | Action / Command | Shortcut / Options |
| :--- | :--- | :--- | :--- | :--- |
| **History** | Undo | `Undo2` | `editor.chain().focus().undo().run()` | `Ctrl+Z` |
| | Redo | `Redo2` | `editor.chain().focus().redo().run()` | `Ctrl+Y` |
| **Typography** | Font Family | Text | `editor.chain().focus().setParagraphFormatting({ fontFamily }).run()` | Times New Roman, Arial |
| | Font Size | Text | `editor.chain().focus().setFontSize(size).run()` | 11pt, 12pt, 13pt (default), 14pt, 16pt |
| **Styles** | Bold | `Bold` | `editor.chain().focus().toggleBold().run()` | `Ctrl+B` |
| | Italic | `Italic` | `editor.chain().focus().toggleItalic().run()` | `Ctrl+I` |
| | Underline | `Underline` | `editor.chain().focus().toggleUnderline().run()` | `Ctrl+U` |
| | Strike | `Strikethrough` | `editor.chain().focus().toggleStrike().run()` | `Ctrl+Shift+X` |
| **Alignment** | Align Left | `AlignLeft` | `editor.chain().focus().setTextAlign('left').run()` | Left |
| | Align Center | `AlignCenter` | `editor.chain().focus().setTextAlign('center').run()` | Center |
| | Align Right | `AlignRight` | `editor.chain().focus().setTextAlign('right').run()` | Right |
| | Align Justify | `AlignJustify` | `editor.chain().focus().setTextAlign('justify').run()` | Justify (NĐ 30 body) |
| **Spacing** | Line Spacing | `FoldVertical` | `editor.chain().focus().setLineSpacing(val).run()` | 1.0, 1.15, 1.2 (default), 1.25, 1.3, 1.5 |
| | Space Before/After | `MoveVertical` | `editor.chain().focus().setParagraphSpacing(before, after).run()` | 0pt, 2pt (default), 4pt, 6pt |
| | First Line Indent | `Indent` | `editor.chain().focus().setFirstLineIndent(val).run()` | 0mm, 10mm (default), 12.7mm |
| **Presets** | Chuẩn Thân bài | `FileCheck` | Sets 13pt, Justified, 1.2 line, 2pt before/after, 10mm indent | Quick NĐ 30 Body |
| | Tiêu đề / Trích yếu | `Heading` | Sets 14pt, Bold, Centered, 0mm indent, 6pt before/after | Quick Heading |

### 5.2 Toolbar Component Implementation

```tsx
// web_app/src/components/editor/EditorToolbar.tsx
'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  FoldVertical,
  CheckCircle2,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  // Read current paragraph attributes
  const currentAttrs = editor.getAttributes('paragraph') || {};
  const currentFontSize = currentAttrs.fontSize || 13;
  const currentLineSpacing = currentAttrs.lineSpacing || 1.2;
  const currentIndent = currentAttrs.firstLineIndentMm ?? 10;

  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="editor-toolbar flex flex-wrap items-center gap-1 px-3 py-2 bg-white border-b border-slate-200 sticky top-0 z-30 select-none shadow-sm">
      {/* Group: History */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Hoàn tác (Ctrl+Z)"
          aria-label="Hoàn tác"
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Làm lại (Ctrl+Y)"
          aria-label="Làm lại"
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Group: Font Family & Size */}
      <div className="flex items-center gap-1 px-2 border-r border-slate-200">
        <select
          value={currentAttrs.fontFamily || 'Times New Roman'}
          onChange={(e) => {
            editor.chain().focus().setParagraphFormatting({ fontFamily: e.target.value }).run();
          }}
          aria-label="Phông chữ"
          className="text-xs font-medium bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
        </select>

        <select
          value={currentFontSize}
          onChange={(e) => {
            const size = parseInt(e.target.value, 10);
            editor.chain().focus().setFontSize(size).run();
          }}
          aria-label="Cỡ chữ"
          className="text-xs font-medium bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="11">11 pt</option>
          <option value="12">12 pt</option>
          <option value="13">13 pt (Chuẩn)</option>
          <option value="14">14 pt</option>
          <option value="16">16 pt</option>
          <option value="18">18 pt</option>
        </select>
      </div>

      {/* Group: Text Marks */}
      <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="In đậm (Ctrl+B)"
          aria-label="In đậm"
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="In nghiêng (Ctrl+I)"
          aria-label="In nghiêng"
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Gạch chân (Ctrl+U)"
          aria-label="Gạch chân"
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('underline') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Gạch ngang chữ"
          aria-label="Gạch ngang chữ"
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('strike') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      {/* Group: Alignments */}
      <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Căn trái"
          aria-label="Căn trái"
          className={`p-1.5 rounded transition-colors ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Căn giữa"
          aria-label="Căn giữa"
          className={`p-1.5 rounded transition-colors ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Căn phải"
          aria-label="Căn phải"
          className={`p-1.5 rounded transition-colors ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Căn đều 2 bên (Chuẩn NĐ 30)"
          aria-label="Căn đều 2 bên"
          className={`p-1.5 rounded transition-colors ${
            editor.isActive({ textAlign: 'justify' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      {/* Group: NĐ 30 Spacing & Indentation */}
      <div className="flex items-center gap-1 px-2 border-r border-slate-200">
        {/* Line Spacing */}
        <div className="flex items-center gap-1 text-slate-700" title="Giãn dòng">
          <FoldVertical className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={currentLineSpacing}
            onChange={(e) => {
              const spacing = parseFloat(e.target.value);
              editor.chain().focus().setLineSpacing(spacing).run();
            }}
            aria-label="Giãn dòng"
            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="1.0">1.0</option>
            <option value="1.15">1.15</option>
            <option value="1.2">1.2 (Chuẩn)</option>
            <option value="1.25">1.25</option>
            <option value="1.3">1.3</option>
            <option value="1.5">1.5</option>
          </select>
        </div>

        {/* First Line Indent */}
        <div className="flex items-center gap-1 text-slate-700" title="Thụt đầu dòng">
          <Indent className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={currentIndent}
            onChange={(e) => {
              const indent = parseFloat(e.target.value);
              editor.chain().focus().setFirstLineIndent(indent).run();
            }}
            aria-label="Thụt đầu dòng"
            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="0">0 mm</option>
            <option value="10">10 mm (NĐ30)</option>
            <option value="12.7">12.7 mm (1/2")</option>
          </select>
        </div>
      </div>

      {/* Group: Quick Administrative Presets */}
      <div className="flex items-center gap-1 pl-2">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => {
            editor
              .chain()
              .focus()
              .setTextAlign('justify')
              .resetToAdministrativeStandard()
              .run();
          }}
          title="Áp dụng chuẩn thân bài NĐ 30: Times New Roman 13pt, căn đều, thụt dòng 10mm, giãn dòng 1.2"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Chuẩn Thân bài NĐ30</span>
        </button>
      </div>
    </div>
  );
};
```

---

## 6. Milestone Interface Contracts

### 6.1 M1 Editor ↔ M2 DOCX Interop
- **Export Contract**: The Tiptap document JSON model serializes paragraph nodes containing attributes:
  ```json
  {
    "type": "paragraph",
    "attrs": {
      "fontFamily": "Times New Roman",
      "fontSize": 13,
      "lineSpacing": 1.2,
      "spaceBefore": 2,
      "spaceAfter": 2,
      "firstLineIndentMm": 10,
      "textAlign": "justify"
    },
    "content": [
      { "type": "text", "text": "Kính gửi: Các phòng ban chuyên môn," }
    ]
  }
  ```
- **OpenXML Mapping**:
  - `attrs.textAlign: "justify"` $\rightarrow$ `<w:jc w:val="both"/>`
  - `attrs.textAlign: "center"` $\rightarrow$ `<w:jc w:val="center"/>`
  - `attrs.lineSpacing: 1.2` $\rightarrow$ `<w:spacing w:line="288" w:lineRule="auto"/>` (240 * 1.2 = 288 twips)
  - `attrs.spaceBefore: 2` $\rightarrow$ `<w:spacing w:before="40"/>` (2pt * 20 = 40 twips)
  - `attrs.spaceAfter: 2` $\rightarrow$ `<w:spacing w:after="40"/>` (2pt * 20 = 40 twips)
  - `attrs.firstLineIndentMm: 10` $\rightarrow$ `<w:ind w:firstLine="567"/>` (10mm = 567 twips)
  - `attrs.fontSize: 13` $\rightarrow$ `<w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>` (half-points: 13 * 2 = 26)
  - `attrs.fontFamily: "Times New Roman"` $\rightarrow$ `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr>`

### 6.2 M1 Editor ↔ M3 Format Engine
- **AST Snapshot Adapter**: Converts Tiptap JSON into `ParagraphSnapshot[]` for rule evaluation:
  ```typescript
  // web_app/src/editor/tiptap-adapter.ts
  import type { JSONContent } from '@tiptap/core';
  import type { ParagraphSnapshot, SupportedAlignment } from '@/rules/models';

  export function tiptapDocToSnapshots(doc: JSONContent): ParagraphSnapshot[] {
    const snapshots: ParagraphSnapshot[] = [];
    let index = 0;

    function traverse(node: JSONContent) {
      if (node.type === 'paragraph' || node.type === 'heading') {
        const text = node.content?.map((c) => c.text || '').join('') || '';
        const attrs = node.attrs || {};

        let alignment: SupportedAlignment = 'Justified';
        if (attrs.textAlign === 'center') alignment = 'Centered';
        else if (attrs.textAlign === 'right') alignment = 'Right';
        else if (attrs.textAlign === 'left') alignment = 'Left';
        else if (attrs.textAlign === 'justify') alignment = 'Justified';

        snapshots.push({
          id: `node-${index++}`,
          text,
          fontName: attrs.fontFamily || 'Times New Roman',
          fontSize: attrs.fontSize || 13,
          bold: node.content?.some((c) => c.marks?.some((m) => m.type === 'bold')),
          italic: node.content?.some((c) => c.marks?.some((m) => m.type === 'italic')),
          underline: node.content?.some((c) => c.marks?.some((m) => m.type === 'underline')),
          alignment,
          spaceBefore: attrs.spaceBefore ?? 2,
          spaceAfter: attrs.spaceAfter ?? 2,
          firstLineIndentMm: attrs.firstLineIndentMm ?? 10,
          lineSpacingMultiple: attrs.lineSpacing ?? 1.2,
        });
      }

      if (node.content) {
        node.content.forEach(traverse);
      }
    }

    traverse(doc);
    return snapshots;
  }
  ```

- **Patch Application Function**:
  ```typescript
  export function applyPatchToEditorNode(
    editor: Editor,
    nodeIndex: number,
    patch: FormattingPatch
  ): void {
    // Traverse ProseMirror doc to find the target node pos and update attributes
    let currentIndex = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        if (currentIndex === nodeIndex) {
          const updates: Record<string, any> = {};
          if (patch.fontName) updates.fontFamily = patch.fontName;
          if (patch.fontSize) updates.fontSize = patch.fontSize;
          if (patch.lineSpacingMultiple) updates.lineSpacing = patch.lineSpacingMultiple;
          if (patch.spaceBefore !== undefined) updates.spaceBefore = patch.spaceBefore;
          if (patch.spaceAfter !== undefined) updates.spaceAfter = patch.spaceAfter;
          if (patch.firstLineIndentMm !== undefined) updates.firstLineIndentMm = patch.firstLineIndentMm;

          let tr = editor.state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            ...updates,
          });

          if (patch.alignment) {
            const align = patch.alignment.toLowerCase();
            tr = tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              ...updates,
              textAlign: align === 'centered' ? 'center' : align,
            });
          }

          editor.view.dispatch(tr);
          return false;
        }
        currentIndex++;
      }
      return true;
    });
  }
  ```

---

## 7. Complete Implementation Plan & File Manifest

### 7.1 Target File Locations (in `web_app/`)
```
web_app/
├── src/
│   ├── editor/
│   │   ├── extensions.ts                      # Bundled extensions
│   │   ├── tiptap-adapter.ts                  # Snapshot & patch adapter
│   │   ├── extensions/
│   │   │   ├── administrative-paragraph.ts    # Custom Paragraph with NĐ 30 attrs
│   │   │   ├── administrative-heading.ts      # Custom Heading with NĐ 30 attrs
│   │   │   └── administrative-table.ts        # Table extensions (Explorer 3 sync)
│   ├── components/
│   │   └── editor/
│   │       ├── A4Canvas.tsx                   # Paper sheet container & margin layout
│   │       ├── EditorToolbar.tsx              # Formatting toolbar with NĐ 30 presets
│   │       └── EditorContainer.tsx            # Complete editor view combining toolbar + canvas
│   └── styles/
│       └── a4-canvas.css                      # A4 physical dimension rules & @media print
└── tests/
    └── unit/
        ├── administrative-paragraph.test.ts   # Node attribute parsing & rendering tests
        ├── a4-canvas-layout.test.ts           # Geometry and margin validation tests
        └── tiptap-adapter.test.ts             # Snapshot extraction & patch roundtrip tests
```

### 7.2 Implementation Checklist
- [x] Schema & Attributes Definition (`administrative-paragraph.ts`, `administrative-heading.ts`)
- [x] A4 Canvas Geometry, Margin Calibration & Print Rules (`A4Canvas.tsx`, `a4-canvas.css`)
- [x] Toolbar Component with Active Indicators & NĐ 30 Quick Presets (`EditorToolbar.tsx`)
- [x] Bidirectional Adapter Contracts for M2 DOCX, M3 Rules & M5 AI (`tiptap-adapter.ts`)
- [x] Unit Test Specification & Validation Cases

---

## 8. Verification Plan & Test Specifications

### 8.1 Automated Unit Tests (Vitest)

#### Test Suite 1: `administrative-paragraph.test.ts`
1. **Default Attributes**: Instantiating an empty paragraph node assigns `fontFamily: "Times New Roman"`, `fontSize: 13`, `lineSpacing: 1.2`, `spaceBefore: 2`, `spaceAfter: 2`, `firstLineIndentMm: 10`.
2. **HTML Serialization**: Renders `<p style="font-family: &quot;Times New Roman&quot;, Times, serif; font-size: 13pt; line-height: 1.2; margin-top: 2pt; margin-bottom: 2pt; text-indent: 10mm; text-align: justify">`.
3. **HTML Ingestion**: Correctly parses `style="margin-top: 4pt; text-indent: 12.7mm"` into node attributes `spaceBefore: 4` and `firstLineIndentMm: 12.7`.
4. **Command Mutation**: Calling `editor.commands.setLineSpacing(1.5)` updates the target paragraph's `lineSpacing` attribute without clearing other attributes.

#### Test Suite 2: `tiptap-adapter.test.ts`
1. **Extraction Accuracy**: Transforming a 3-paragraph document creates 3 `ParagraphSnapshot` objects with accurate `alignment`, `fontName`, and `fontSize`.
2. **Patch Application**: Invoking `applyPatchToEditorNode` with `fontSize: 14` mutates the ProseMirror doc state at the exact node index.

#### Test Suite 3: `a4-canvas-layout.test.ts`
1. **Margin Proportions**: Validates that A4 container padding strictly computes to 20mm Top, 20mm Bottom, 30mm Left, and 15mm Right.
2. **Print Stylesheet Integrity**: Asserts `@page` rule in CSS declares `margin-top: 20mm; margin-bottom: 20mm; margin-left: 30mm; margin-right: 15mm; size: A4 portrait;`.

---
*Report completed by M1 Explorer 2.*
