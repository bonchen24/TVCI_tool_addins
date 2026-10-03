import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditorWorkspace from './EditorWorkspace';

const harness = vi.hoisted(() => ({
  exportDocx: vi.fn(async () => new Blob(['docx'])),
  downloadDocx: vi.fn(),
}));
let accountDictionaryWords: string[] = [];

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/docx', () => ({
  importDocx: vi.fn(),
  exportDocx: harness.exportDocx,
  downloadDocx: harness.downloadDocx,
}));
vi.mock('@/hooks/useDocumentAudit', () => ({
  useDocumentAudit: () => ({ healthScore: 100, issueCount: 0, issues: [], activeProfile: 'test', setProfile: vi.fn(), reevaluate: vi.fn() }),
}));
vi.mock('@/spellcheck/dictionary', () => ({
  getVietnameseDictionary: async () => ({
    has: (word: string) => word.toLocaleLowerCase('vi') === 'bản',
    suggest: (word: string) => word.toLocaleLowerCase('vi') === 'bảnn' ? ['bản'] : [],
  }),
}));
vi.mock('@/components/layout/Header', () => ({
  Header: ({ onExportDocx, onSaveToDrive }: { onExportDocx: () => void; onSaveToDrive: () => void }) => (
    <div>
      <button type="button" onClick={onExportDocx}>Xuất DOCX</button>
      <button type="button" onClick={onSaveToDrive}>Lưu Drive</button>
    </div>
  ),
}));
vi.mock('@/components/editor/A4Canvas', () => ({
  A4Canvas: ({ editor }: { editor: import('@tiptap/core').Editor | null }) => (
    <div>
      <button type="button" onClick={() => editor?.commands.setContent('<p>Bảnn</p>')}>Chèn văn bản kiểm thử</button>
      <button type="button" onClick={() => editor?.commands.insertContent('!')}>Sửa văn bản kiểm thử</button>
      <button type="button" onClick={() => {
        editor?.commands.setContent('<p><strong>bold</strong> plain</p>');
        editor?.commands.setTextSelection({ from: 1, to: 5 });
      }}>Prepare formatting selection</button>
      <button type="button" onClick={() => editor?.commands.setTextSelection(6)}>Move formatting selection</button>
      <output data-testid="editor-text">{editor?.getText()}</output>
    </div>
  ),
}));
vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: ({
    spellcheckIssues = [],
    activeTab,
    onApplySpellcheckSuggestion,
    onIgnoreSpellcheckIssue,
    onAddSpellcheckTerm,
  }: {
    spellcheckIssues: Array<{ id: string; text: string; suggestions: string[] }>;
    activeTab: string;
    onApplySpellcheckSuggestion: (issue: { id: string; text: string; suggestions: string[] }, suggestion: string) => void;
    onIgnoreSpellcheckIssue: (issue: { id: string; text: string; suggestions: string[] }) => void;
    onAddSpellcheckTerm: (issue: { id: string; text: string; suggestions: string[] }) => void;
  }) => (
    <section aria-label="Spellcheck results" data-active-tab={activeTab}>
      {spellcheckIssues.map((issue) => <article key={issue.id}>
        <span>{issue.text}</span>
        {issue.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => onApplySpellcheckSuggestion(issue, suggestion)}>{suggestion}</button>)}
        <button type="button" onClick={() => onIgnoreSpellcheckIssue(issue)}>Bỏ qua một lần</button>
        <button type="button" onClick={() => onAddSpellcheckTerm(issue)}>Thêm vào từ điển</button>
      </article>)}
    </section>
  ),
}));
vi.mock('@/components/layout/StatusBar', () => ({ StatusBar: () => null }));

describe('EditorWorkspace spell-check integration', () => {
  beforeEach(() => {
    harness.exportDocx.mockClear();
    harness.downloadDocx.mockClear();
    accountDictionaryWords = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/drive/status') return new Response(JSON.stringify({ connected: true }), { status: 200 });
      if (url === '/api/spellcheck/dictionary') {
        if (init?.method === 'POST') {
          const payload = JSON.parse(String(init.body)) as { term: string };
          accountDictionaryWords = [...accountDictionaryWords, payload.term];
        }
        if (init?.method === 'DELETE') {
          const payload = JSON.parse(String(init.body)) as { term: string };
          accountDictionaryWords = accountDictionaryWords.filter((term) => term !== payload.term);
        }
        return new Response(JSON.stringify({ success: true, words: accountDictionaryWords }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, resource: { fileId: 'drive-1' } }), { status: 200 });
    }));
  });

  it('refreshes formatting state after a selection-only editor transaction', async () => {
    render(<EditorWorkspace user={{ username: 'writer', role: 'user' }} />);
    await waitFor(() => expect(screen.getByTitle(/Ctrl\+B/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Prepare formatting selection' }));
    const boldButton = screen.getByTitle(/Ctrl\+B/);
    await waitFor(() => expect(boldButton).toHaveClass('bg-indigo-100'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Move formatting selection' }));
    await waitFor(() => expect(boldButton).not.toHaveClass('bg-indigo-100'));
  });

  it('scans the whole document on request and only changes text after a chosen suggestion', async () => {
    render(<EditorWorkspace user={{ username: 'writer', role: 'user' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chèn văn bản kiểm thử' }));

    expect(screen.getByTestId('editor-text')).toHaveTextContent('Bảnn');
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra chính tả' }));

    await waitFor(() => expect(screen.getByLabelText('Spellcheck results')).toHaveAttribute('data-active-tab', 'spellcheck'));
    await screen.findByRole('button', { name: 'bản' });
    expect(screen.getByTestId('editor-text')).toHaveTextContent('Bảnn');
    fireEvent.click(screen.getByRole('button', { name: 'bản' }));
    await waitFor(() => expect(screen.getByTestId('editor-text')).toHaveTextContent('bản'));
  });

  it('ignores a finding once until text changes and persists only a chosen dictionary term', async () => {
    render(<EditorWorkspace user={{ username: 'writer', role: 'user' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chèn văn bản kiểm thử' }));
    await screen.findByRole('button', { name: 'Thêm vào từ điển' });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra chính tả' }));

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua một lần' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Bỏ qua một lần' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Sửa văn bản kiểm thử' }));
    await screen.findByRole('button', { name: 'Thêm vào từ điển' });

    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào từ điển' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/spellcheck/dictionary', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ term: 'Bảnn' }),
    })));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Bỏ qua một lần' })).not.toBeInTheDocument());
  });

  it('asks before export and Drive save when spelling findings remain, then honors the answer', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<EditorWorkspace user={{ username: 'writer', role: 'user' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chèn văn bản kiểm thử' }));

    fireEvent.click(screen.getByRole('button', { name: 'Xuất DOCX' }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls.at(-1)?.[0]).toContain('nghi ngờ chính tả');
    expect(harness.exportDocx).not.toHaveBeenCalled();

    confirm.mockImplementation(() => true);
    fireEvent.click(screen.getByRole('button', { name: 'Xuất DOCX' }));
    await waitFor(() => expect(harness.downloadDocx).toHaveBeenCalledTimes(1));

    confirm.mockClear();
    confirm.mockImplementation(() => false);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu Drive' }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls.at(-1)?.[0]).toContain('lưu');
    expect(fetch).not.toHaveBeenCalledWith('/api/drive/documents', expect.anything());

    confirm.mockImplementation(() => true);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu Drive' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/drive/documents', expect.objectContaining({ method: 'POST' })));
    confirm.mockRestore();
  });
});
