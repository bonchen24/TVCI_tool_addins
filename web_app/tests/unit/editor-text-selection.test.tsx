import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { A4Canvas } from '@/components/editor/A4Canvas';

const a4CanvasStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/a4-canvas.css'),
  'utf8'
);

describe('A4 editor text selection', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    cleanup();
    editor?.destroy();
    editor = undefined;
  });

  it('allows selecting ProseMirror text while workspace chrome remains nonselectable', () => {
    editor = new Editor({
      extensions: [StarterKit],
      content: '<p>Selectable document text</p>',
    });

    render(
      <div>
        <style>{`${a4CanvasStyles}\n.select-none { -webkit-user-select: none; user-select: none; }`}</style>
        <div className="select-none" data-testid="workspace-chrome">
          <A4Canvas editor={editor} />
        </div>
      </div>
    );

    const chrome = document.querySelector('[data-testid="workspace-chrome"]');
    const proseMirror = document.querySelector('.tiptap-a4-editor-content .ProseMirror');

    expect(chrome).not.toBeNull();
    expect(proseMirror).not.toBeNull();
    expect(window.getComputedStyle(chrome!).userSelect).toBe('none');
    expect(window.getComputedStyle(proseMirror!).minHeight).toBe('257mm');
    expect(window.getComputedStyle(proseMirror!).userSelect).toBe('text');
  });
});
