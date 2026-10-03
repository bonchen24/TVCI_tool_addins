import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditorWorkspace from '@/components/editor/EditorWorkspace';
import { downloadDocx, exportDocx } from '@/docx';

const mocks = vi.hoisted(() => {
  const json = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Private current-session content' }] }] };
  return { documentJson: json, editor: { getJSON: () => json, getText: () => 'Private current-session content', commands: { setContent: vi.fn() } } };
});

vi.mock('@tiptap/react', () => ({ useEditor: () => mocks.editor }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/editor/extensions', () => ({
  coreEditorExtensions: [],
  createCoreEditorExtensions: (options: { onReady?: (controls: { refresh: () => void; scanNow: () => Promise<never[]> }) => void }) => {
    options.onReady?.({ refresh: () => undefined, scanNow: async () => [] });
    return [];
  },
}));
vi.mock('@/editor/schema', () => ({ defaultDocumentState: { type: 'doc', content: [] } }));
vi.mock('@/hooks/useDocumentAudit', () => ({ useDocumentAudit: () => ({ healthScore: 100, issueCount: 0, issues: [], activeProfile: 'Default', setProfile: vi.fn(), reevaluate: vi.fn() }) }));
vi.mock('@/rules/auto-fixer', () => ({ applySafeFixes: vi.fn(), applySingleFix: vi.fn() }));
vi.mock('@/components/editor/EditorToolbar', () => ({ EditorToolbar: () => null }));
vi.mock('@/components/editor/A4Canvas', () => ({ A4Canvas: () => null }));
vi.mock('@/docx', () => ({ importDocx: vi.fn(), exportDocx: vi.fn(async () => new Blob(['docx'])), downloadDocx: vi.fn() }));
vi.mock('@/components/ai/AiWorkspacePanel', () => ({ AiWorkspacePanel: () => null }));

describe('editor storage privacy when Drive is disconnected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ success: true, connected: false, words: [] })));
  });

  it('exports the current document locally without sending content to the TVCI server', async () => {
    render(<EditorWorkspace user={{ username: 'local_user', role: 'user' }} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/drive/status'));

    fireEvent.click(screen.getByRole('button', { name: 'Xuất DOCX' }));

    await waitFor(() => expect(exportDocx).toHaveBeenCalledWith(mocks.documentJson, expect.objectContaining({ outputType: 'blob' })));
    expect(downloadDocx).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalledWith('/api/documents', expect.anything());
    expect(fetch).not.toHaveBeenCalledWith('/api/audits', expect.anything());
    expect(vi.mocked(fetch).mock.calls.some(([, init]) => ['POST', 'PUT'].includes(String(init?.method)))).toBe(false);
  });
});
