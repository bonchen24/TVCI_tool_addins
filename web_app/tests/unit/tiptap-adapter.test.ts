import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import TextAlign from '@tiptap/extension-text-align';
import { AdministrativeParagraph } from '@/editor/extensions';
import { tiptapDocToSnapshots, applyPatchToEditorNode } from '@/editor/tiptap-adapter';
import type { JSONContent } from '@tiptap/core';

describe('Tiptap Adapter to Rule Engine Snapshots', () => {
  it('converts Tiptap JSON content into ParagraphSnapshot array with correct attributes', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: 'center',
            fontFamily: 'Times New Roman',
            fontSize: 13,
            lineSpacing: 1.2,
            spaceBefore: 2,
            spaceAfter: 0,
            firstLineIndentMm: 0,
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
          type: 'paragraph',
          attrs: {
            textAlign: 'justify',
            fontFamily: 'Times New Roman',
            fontSize: 13,
            lineSpacing: 1.25,
            spaceBefore: 2,
            spaceAfter: 2,
            firstLineIndentMm: 10,
          },
          content: [
            {
              type: 'text',
              marks: [{ type: 'italic' }],
              text: 'Kính gửi các cơ quan chức năng,',
            },
          ],
        },
      ],
    };

    const snapshots = tiptapDocToSnapshots(doc);

    expect(snapshots).toHaveLength(2);

    expect(snapshots[0].text).toBe('Độc lập - Tự do - Hạnh phúc');
    expect(snapshots[0].alignment).toBe('Centered');
    expect(snapshots[0].fontName).toBe('Times New Roman');
    expect(snapshots[0].fontSize).toBe(13);
    expect(snapshots[0].bold).toBe(true);
    expect(snapshots[0].italic).toBe(false);

    expect(snapshots[1].text).toBe('Kính gửi các cơ quan chức năng,');
    expect(snapshots[1].alignment).toBe('Justified');
    expect(snapshots[1].lineSpacingMultiple).toBe(1.25);
    expect(snapshots[1].firstLineIndentMm).toBe(10);
    expect(snapshots[1].bold).toBe(false);
    expect(snapshots[1].italic).toBe(true);
  });

  it('preserves cellType context when traversing table cells', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { cellType: 'header-left' },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: { textAlign: 'center', fontSize: 12 },
                      content: [{ type: 'text', text: 'VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const snapshots = tiptapDocToSnapshots(doc);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].context).toBe('header-left');
    expect(snapshots[0].text).toBe('VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ');
  });

  it('applies formatting patch directly to ProseMirror editor state', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        Bold,
        Italic,
        TextAlign.configure({ types: ['paragraph'] }),
      ],
      content: '<p>Đoạn văn cần sửa cỡ chữ</p>',
    });

    applyPatchToEditorNode(editor, 0, {
      fontSize: 14,
      fontName: 'Times New Roman',
      alignment: 'Centered',
    });

    const attrs = editor.getAttributes('paragraph');
    expect(attrs.fontSize).toBe(14);
    expect(attrs.fontFamily).toBe('Times New Roman');
    expect(attrs.textAlign).toBe('center');

    editor.destroy();
  });

  it('applies patch ONLY to target paragraph without cascading mutations to subsequent paragraphs', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        Bold,
        Italic,
        TextAlign.configure({
          types: ['paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
        }),
      ],
      content: `
        <p>Đoạn 1: Tiêu đề cơ quan ban hành</p>
        <p>Đoạn 2: Nội dung công văn cần sửa định dạng</p>
        <p>Đoạn 3: Nơi nhận và chữ ký người có thẩm quyền</p>
      `,
    });

    // 1. Initial snapshot of paragraphs
    const initialNodes: Array<{ text: string; attrs: any }> = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'paragraph') {
        initialNodes.push({ text: node.textContent, attrs: { ...node.attrs } });
      }
    });

    expect(initialNodes).toHaveLength(3);
    const para0Initial = { ...initialNodes[0].attrs };
    const para2Initial = { ...initialNodes[2].attrs };

    // 2. Apply patch ONLY to paragraph index 1 (the middle paragraph)
    applyPatchToEditorNode(editor, 1, {
      fontSize: 16,
      alignment: 'Justified',
      lineSpacingMultiple: 1.5,
      spaceBefore: 6,
      spaceAfter: 8,
      firstLineIndentMm: 15,
    });

    // 3. Inspect all paragraph nodes after mutation
    const updatedNodes: Array<{ text: string; attrs: any }> = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'paragraph') {
        updatedNodes.push({ text: node.textContent, attrs: { ...node.attrs } });
      }
    });

    expect(updatedNodes).toHaveLength(3);

    // Assert: Paragraph 0 is completely untouched
    expect(updatedNodes[0].attrs.fontSize).toBe(para0Initial.fontSize);
    expect(updatedNodes[0].attrs.textAlign).toBe(para0Initial.textAlign);
    expect(updatedNodes[0].attrs.lineSpacing).toBe(para0Initial.lineSpacing);
    expect(updatedNodes[0].attrs.spaceBefore).toBe(para0Initial.spaceBefore);
    expect(updatedNodes[0].attrs.spaceAfter).toBe(para0Initial.spaceAfter);
    expect(updatedNodes[0].attrs.firstLineIndentMm).toBe(para0Initial.firstLineIndentMm);

    // Assert: Paragraph 1 has the applied patch
    expect(updatedNodes[1].attrs.fontSize).toBe(16);
    expect(updatedNodes[1].attrs.textAlign).toBe('justify');
    expect(updatedNodes[1].attrs.lineSpacing).toBe(1.5);
    expect(updatedNodes[1].attrs.spaceBefore).toBe(6);
    expect(updatedNodes[1].attrs.spaceAfter).toBe(8);
    expect(updatedNodes[1].attrs.firstLineIndentMm).toBe(15);

    // Assert: Paragraph 2 is completely untouched (NO CASCADE)
    expect(updatedNodes[2].attrs.fontSize).toBe(para2Initial.fontSize);
    expect(updatedNodes[2].attrs.textAlign).toBe(para2Initial.textAlign);
    expect(updatedNodes[2].attrs.lineSpacing).toBe(para2Initial.lineSpacing);
    expect(updatedNodes[2].attrs.spaceBefore).toBe(para2Initial.spaceBefore);
    expect(updatedNodes[2].attrs.spaceAfter).toBe(para2Initial.spaceAfter);
    expect(updatedNodes[2].attrs.firstLineIndentMm).toBe(para2Initial.firstLineIndentMm);

    editor.destroy();
  });

  it('correctly maps alignment strings (Justified -> justify, Centered -> center)', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        TextAlign.configure({
          types: ['paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
        }),
      ],
      content: '<p>Văn bản kiểm tra căn lề</p>',
    });

    // Test Justified
    applyPatchToEditorNode(editor, 0, { alignment: 'Justified' });
    let attrs = editor.getAttributes('paragraph');
    expect(attrs.textAlign).toBe('justify');

    // Test Centered
    applyPatchToEditorNode(editor, 0, { alignment: 'Centered' });
    attrs = editor.getAttributes('paragraph');
    expect(attrs.textAlign).toBe('center');

    // Test Right
    applyPatchToEditorNode(editor, 0, { alignment: 'Right' });
    attrs = editor.getAttributes('paragraph');
    expect(attrs.textAlign).toBe('right');

    // Test Left
    applyPatchToEditorNode(editor, 0, { alignment: 'Left' });
    attrs = editor.getAttributes('paragraph');
    expect(attrs.textAlign).toBe('left');

    editor.destroy();
  });

  it('handles falsy numeric values and clamps boundary values', () => {
    const editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        TextAlign.configure({ types: ['paragraph'] }),
      ],
      content: '<p>Văn bản kiểm tra giá trị biên</p>',
    });

    // Under-boundary values (fontSize 0 -> clamp to 6, lineSpacing 0.2 -> clamp to 1.0, negative indents -> 0)
    applyPatchToEditorNode(editor, 0, {
      fontSize: 0,
      lineSpacingMultiple: 0.2,
      spaceBefore: -10,
      spaceAfter: -5,
      firstLineIndentMm: -20,
    });

    let attrs = editor.getAttributes('paragraph');
    expect(attrs.fontSize).toBe(6);
    expect(attrs.lineSpacing).toBe(1.0);
    expect(attrs.spaceBefore).toBe(0);
    expect(attrs.spaceAfter).toBe(0);
    expect(attrs.firstLineIndentMm).toBe(0);

    // Over-boundary values (fontSize 999 -> clamp to 72, lineSpacing 10.0 -> clamp to 2.0)
    applyPatchToEditorNode(editor, 0, {
      fontSize: 999,
      lineSpacingMultiple: 10.0,
    });

    attrs = editor.getAttributes('paragraph');
    expect(attrs.fontSize).toBe(72);
    expect(attrs.lineSpacing).toBe(2.0);

    editor.destroy();
  });

  it('defensively handles null, undefined, and malformed JSONContent in tiptapDocToSnapshots', () => {
    // Null and undefined inputs
    expect(tiptapDocToSnapshots(null as any)).toEqual([]);
    expect(tiptapDocToSnapshots(undefined as any)).toEqual([]);
    expect(tiptapDocToSnapshots({} as any)).toEqual([]);

    // Malformed children and null content elements
    const malformedDoc: any = {
      type: 'doc',
      content: [
        null,
        undefined,
        {
          type: 'paragraph',
          content: [null, { type: 'text', text: 'An toàn' }, undefined],
        },
        {
          type: 'paragraph',
          content: 'not-an-array',
        },
      ],
    };

    const snapshots = tiptapDocToSnapshots(malformedDoc);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].text).toBe('An toàn');
    expect(snapshots[1].text).toBe('');
  });
});
