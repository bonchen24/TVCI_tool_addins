import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { coreEditorExtensions } from '@/editor/extensions';
import { scanEditorDocument } from './editor-scan';
import type { DictionaryProvider } from './types';

const dictionary: DictionaryProvider = {
  has: (word) => ['văn', 'bản', 'chính', 'tả'].includes(word.toLocaleLowerCase('vi')),
  suggest: () => ['bản'],
};

describe('Tiptap document spell-check scan', () => {
  let editor: Editor | undefined;
  afterEach(() => {
    editor?.destroy();
    editor = undefined;
  });

  it('maps Vietnamese findings through text marks and separate paragraphs to document positions', () => {
    editor = new Editor({
      extensions: coreEditorExtensions,
      content: '<p>Văn <strong>bảnn</strong></p><p>Chính tả</p>',
    });

    const issues = scanEditorDocument(editor.state.doc, dictionary);

    expect(issues).toEqual([
      expect.objectContaining({ text: 'bảnn', from: 5, to: 9, category: 'spelling' }),
    ]);
  });

  it('honors one-time ignore ids after converting local offsets to document positions', () => {
    editor = new Editor({
      extensions: coreEditorExtensions,
      content: '<p>Văn bảnn</p>',
    });
    const firstScan = scanEditorDocument(editor.state.doc, dictionary);

    expect(firstScan).toHaveLength(1);
    expect(scanEditorDocument(editor.state.doc, dictionary, [], new Set([firstScan[0].id]))).toEqual([]);
  });
});
