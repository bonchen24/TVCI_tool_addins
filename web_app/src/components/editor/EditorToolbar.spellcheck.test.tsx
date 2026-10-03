import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { EditorToolbar } from './EditorToolbar';
import { coreEditorExtensions } from '@/editor/extensions';

describe('editor toolbar spell-check action', () => {
  it('runs an explicit full-document scan and shows the current finding count', () => {
    const editor = new Editor({ extensions: coreEditorExtensions, content: '<p>Văn bản</p>' });
    const onSpellcheck = vi.fn();
    const { unmount } = render(<EditorToolbar editor={editor} onSpellcheck={onSpellcheck} spellcheckIssueCount={3} />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra chính tả/i }));

    expect(onSpellcheck).toHaveBeenCalledTimes(1);
    expect(screen.getByText('3')).toBeInTheDocument();
    unmount();
    editor.destroy();
  });
});
