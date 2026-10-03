import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import {
  createCoreEditorExtensions,
  AdministrativeParagraph,
  AdministrativeHeading,
  AdministrativeTable,
  AdministrativeTableCell,
  AdminRule,
} from '@/editor/extensions';
import { TableRow, TableHeader } from '@tiptap/extension-table';

describe('Tiptap Administrative Extensions', () => {
  it('preserves undo and redo with the full editor extension set', () => {
    const editor = new Editor({
      extensions: createCoreEditorExtensions({ enabled: false }),
      content: '<p>Base</p>',
    });

    editor.commands.setTextSelection(5);
    editor.commands.insertContent(' edited');
    expect(editor.getText()).toBe('Base edited');

    editor.commands.undo();
    expect(editor.getText()).toBe('Base');

    editor.commands.redo();
    expect(editor.getText()).toBe('Base edited');
    editor.destroy();
  });

  it('assigns legal NĐ 30 defaults to AdministrativeParagraph', () => {
    const editor = new Editor({
      extensions: [Document, AdministrativeParagraph, Text],
      content: '<p>Văn bản hành chính</p>',
    });

    const attrs = editor.getAttributes('paragraph');
    expect(attrs.fontFamily).toBe('Times New Roman');
    expect(attrs.fontSize).toBe(13);
    expect(attrs.lineSpacing).toBe(1.2);
    expect(attrs.spaceBefore).toBe(2);
    expect(attrs.spaceAfter).toBe(2);
    expect(attrs.firstLineIndentMm).toBe(10);
    editor.destroy();
  });

  it('updates paragraph attributes via dedicated commands', () => {
    const editor = new Editor({
      extensions: [Document, AdministrativeParagraph, Text],
      content: '<p>Nội dung thử nghiệm</p>',
    });

    editor.commands.setFontSize(14);
    expect(editor.getAttributes('paragraph').fontSize).toBe(14);

    editor.commands.setLineSpacing(1.5);
    expect(editor.getAttributes('paragraph').lineSpacing).toBe(1.5);

    editor.commands.setFirstLineIndent(12.7);
    expect(editor.getAttributes('paragraph').firstLineIndentMm).toBe(12.7);

    editor.commands.setParagraphSpacing(4, 6);
    expect(editor.getAttributes('paragraph').spaceBefore).toBe(4);
    expect(editor.getAttributes('paragraph').spaceAfter).toBe(6);

    // Reset to administrative standard
    editor.commands.resetToAdministrativeStandard();
    const resetAttrs = editor.getAttributes('paragraph');
    expect(resetAttrs.fontSize).toBe(13);
    expect(resetAttrs.lineSpacing).toBe(1.2);
    expect(resetAttrs.spaceBefore).toBe(2);
    expect(resetAttrs.spaceAfter).toBe(2);
    expect(resetAttrs.firstLineIndentMm).toBe(10);

    editor.destroy();
  });

  it('configures AdministrativeHeading with NĐ 30 title defaults', () => {
    const editor = new Editor({
      extensions: [Document, AdministrativeParagraph, AdministrativeHeading, Text],
      content: '<h1>QUYẾT ĐỊNH</h1>',
    });

    const attrs = editor.getAttributes('heading');
    expect(attrs.fontFamily).toBe('Times New Roman');
    expect(attrs.fontSize).toBe(14);
    expect(attrs.lineSpacing).toBe(1.2);
    expect(attrs.spaceBefore).toBe(6);
    expect(attrs.spaceAfter).toBe(6);
    editor.destroy();
  });

  it('configures AdministrativeTable and AdministrativeTableCell attributes', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        AdministrativeTable,
        TableRow,
        TableHeader,
        AdministrativeTableCell,
      ],
      content: `
        <table data-table-type="admin-header" data-borderless="true" data-column-ratio="40-60">
          <tr>
            <td data-cell-type="header-left" data-colwidth="250"><p>Cơ quan ban hành</p></td>
            <td data-cell-type="header-right" data-colwidth="374"><p>Quốc hiệu</p></td>
          </tr>
        </table>
      `,
    });

    const tableAttrs = editor.getAttributes('table');
    expect(tableAttrs.tableType).toBe('admin-header');
    expect(tableAttrs.isBorderless).toBe(true);
    expect(tableAttrs.columnRatio).toBe('40-60');

    editor.destroy();
  });

  it('inserts and renders AdminRule atom nodes for agency and motto rules', () => {
    const editor = new Editor({
      extensions: [Document, AdministrativeParagraph, Text, AdminRule],
      content: '<p>Đoạn 1</p>',
    });

    editor.commands.setAdminRule({ kind: 'MOTTO', widthPercent: 95 });
    const json = editor.getJSON();
    const ruleNode = json.content?.find((node) => node.type === 'adminRule');

    expect(ruleNode).toBeDefined();
    expect(ruleNode?.attrs?.kind).toBe('MOTTO');
    expect(ruleNode?.attrs?.widthPercent).toBe(95);

    editor.destroy();
  });

  it('updates heading font size via setFontSize command', () => {
    const editor = new Editor({
      extensions: [Document, AdministrativeParagraph, AdministrativeHeading, Text],
      content: '<h2>TIÊU ĐỀ MỤC</h2>',
    });

    editor.commands.setFontSize(16);
    expect(editor.getAttributes('heading').fontSize).toBe(16);
    editor.destroy();
  });

  it('supports attribute aliases isBorderless/borderless and columnRatio/columnRatios', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        AdministrativeTable,
        TableRow,
        TableHeader,
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

  it('renders borderless and header ratio classes when initialized via fixture AST', () => {
    const editor = new Editor({
      extensions: [Document, AdministrativeParagraph, Text, AdministrativeTable, TableRow, TableHeader, AdministrativeTableCell],
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
});
