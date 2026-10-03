import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { fireEvent } from '@testing-library/react';
import { VietnameseSpellcheck } from './spellcheck-extension';
import type { DictionaryProvider, SpellcheckIssue } from '@/spellcheck/types';

const dictionary: DictionaryProvider = {
  has: (word) => word !== 'bảnn',
  suggest: () => ['bản'],
};

describe('Vietnamese spell-check editor extension', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    editor?.destroy();
    editor = undefined;
    vi.useRealTimers();
  });

  it('debounces highlights without changing text and opens the finding from click or context menu', async () => {
    vi.useFakeTimers();
    const onIssues = vi.fn<(issues: SpellcheckIssue[]) => void>();
    const onIssueClick = vi.fn<(issue: SpellcheckIssue) => void>();
    editor = new Editor({
      extensions: [StarterKit, VietnameseSpellcheck.configure({
        enabled: true,
        dictionary,
        debounceMs: 250,
        onIssues,
        onIssueClick,
      })],
      content: '<p>Văn bảnn</p>',
    });
    document.body.append(editor.view.dom);

    expect(editor.view.dom.querySelector('.spellcheck-issue')).toBeNull();
    await vi.advanceTimersByTimeAsync(250);

    const highlighted = editor.view.dom.querySelector<HTMLElement>('.spellcheck-issue');
    expect(highlighted).not.toBeNull();
    expect(editor.getText()).toBe('Văn bảnn');
    expect(onIssues.mock.lastCall?.[0][0]).toMatchObject({ text: 'bảnn', suggestions: ['bản'] });

    fireEvent.click(highlighted!);
    expect(onIssueClick).toHaveBeenCalledWith(expect.objectContaining({ text: 'bảnn' }));

    onIssueClick.mockClear();
    fireEvent.contextMenu(highlighted!);
    expect(onIssueClick).toHaveBeenCalledWith(expect.objectContaining({ text: 'bảnn' }));
  });

  it('notifies the workspace when document edits should reset one-time ignores', () => {
    const onDocumentChange = vi.fn();
    editor = new Editor({
      extensions: [StarterKit, VietnameseSpellcheck.configure({
        enabled: true,
        dictionary,
        onDocumentChange,
      })],
      content: '<p>Văn bản</p>',
    });

    editor.commands.insertContent(' mới');

    expect(onDocumentChange).toHaveBeenCalledTimes(1);
  });

  it('clears stale findings immediately after a document edit while scheduling the next scan', async () => {
    vi.useFakeTimers();
    const onIssues = vi.fn<(issues: SpellcheckIssue[]) => void>();
    editor = new Editor({
      extensions: [StarterKit, VietnameseSpellcheck.configure({
        enabled: true,
        dictionary,
        debounceMs: 250,
        onIssues,
      })],
      content: '<p>Bảnn</p>',
    });
    await vi.advanceTimersByTimeAsync(250);
    expect(onIssues.mock.lastCall?.[0]).toHaveLength(1);

    editor.commands.insertContent('x');

    expect(onIssues.mock.lastCall?.[0]).toEqual([]);
  });
});
