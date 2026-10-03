import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditorWorkspace from '@/components/editor/EditorWorkspace';

const workspaceMocks = vi.hoisted(() => {
  const documentJson = { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
  return {
    documentJson,
    editor: {
      getJSON: () => documentJson,
      getText: () => '',
      commands: { setContent: vi.fn() },
      state: { selection: { from: 0, to: 0 } },
    },
    onUpdate: undefined as ((event: { editor: any }) => void) | undefined,
  };
});

vi.mock('@tiptap/react', () => ({
  useEditor: (options: { onUpdate?: (event: { editor: any }) => void }) => {
    workspaceMocks.onUpdate = options.onUpdate;
    return workspaceMocks.editor;
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/editor/extensions', () => ({
  createCoreEditorExtensions: (options: { onReady?: (controls: { refresh: () => void; scanNow: () => Promise<never[]> }) => void }) => {
    options.onReady?.({ refresh: () => undefined, scanNow: async () => [] });
    return [];
  },
}));
vi.mock('@/editor/schema', () => ({ defaultDocumentState: { type: 'doc', content: [] } }));
vi.mock('@/hooks/useDocumentAudit', () => ({
  useDocumentAudit: () => ({ healthScore: 100, issueCount: 0, issues: [], activeProfile: 'Default', setProfile: vi.fn(), reevaluate: vi.fn() }),
}));
vi.mock('@/rules/auto-fixer', () => ({ applySafeFixes: vi.fn(), applySingleFix: vi.fn() }));
vi.mock('@/components/editor/EditorToolbar', () => ({ EditorToolbar: () => null }));
vi.mock('@/components/editor/A4Canvas', () => ({ A4Canvas: () => null }));
vi.mock('@/docx', () => ({ importDocx: vi.fn(), exportDocx: vi.fn(), downloadDocx: vi.fn() }));

const reference = {
  fileId: 'reference-1',
  category: 'references',
  title: 'Reference Manual',
  createdAt: '2026-10-02T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  schemaVersion: 1,
  content: 'REFERENCE_CONTEXT_SENTINEL',
};

async function openReferenceCategory() {
  fireEvent.click(document.getElementById('workspace-tab-personal')!);
  await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(5));
  const tabs = await screen.findAllByRole('tab');
  fireEvent.click(tabs[tabs.length - 1]);
}

async function clickReferenceCategory() {
  await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(5));
  const tabs = await screen.findAllByRole('tab');
  fireEvent.click(tabs[tabs.length - 1]);
}

function switchToAi() {
  fireEvent.click(document.getElementById('workspace-tab-ai')!);
}

describe('selected Drive context lifecycle in the editor workspace', () => {
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    request = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/drive/status') return Response.json({ connected: true });
      if (url === '/api/spellcheck/dictionary') return Response.json({ words: [] });
      if (url === '/api/drive/references?search=') return Response.json({ resources: [{
        fileId: reference.fileId, category: reference.category, title: reference.title,
        createdAt: reference.createdAt, updatedAt: reference.updatedAt,
      }] });
      if (url === '/api/drive/references/reference-1') return Response.json({ resource: reference });
      if (url === '/api/ai/draft') return Response.json({ content: 'Draft output', paragraphs: ['Draft output'], tokensUsed: 1 });
      if (url.startsWith('/api/drive/')) return Response.json({ resources: [] });
      return Response.json({ success: true });
    });
    vi.stubGlobal('fetch', request);
  });

  it('keeps a selected reference checked across Personal to AI to Personal and honors unchecking', async () => {
    render(<EditorWorkspace user={{ username: 'writer', role: 'user' }} />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/drive/status'));
    await openReferenceCategory();

    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());

    switchToAi();
    fireEvent.click(document.getElementById('workspace-tab-personal')!);
    await clickReferenceCategory();

    const returnedCheckbox = await screen.findByRole('checkbox');
    expect(returnedCheckbox).toBeChecked();
    fireEvent.click(returnedCheckbox);
    switchToAi();
    fireEvent.change(screen.getByTestId('input-draft-prompt'), { target: { value: 'Draft a document' } });
    fireEvent.click(screen.getByTestId('btn-run-drafting'));

    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/ai/draft', expect.anything()));
    const body = JSON.parse(String(request.mock.calls.find(([url]) => String(url) === '/api/ai/draft')?.[1]?.body));
    expect(String(body.context || '')).not.toContain('REFERENCE_CONTEXT_SENTINEL');
  });

  it('shows selected context in AI and clears the selection after a successful AI request uses it', async () => {
    render(<EditorWorkspace user={{ username: 'writer', role: 'user' }} />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/drive/status'));
    await openReferenceCategory();
    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    switchToAi();
    expect(screen.getByTestId('selected-ai-context')).toHaveTextContent('Reference Manual');
    fireEvent.change(screen.getByTestId('input-draft-prompt'), { target: { value: 'Draft a document' } });
    fireEvent.click(screen.getByTestId('btn-run-drafting'));

    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/ai/draft', expect.anything()));
    await waitFor(() => expect(screen.queryByTestId('selected-ai-context')).not.toBeInTheDocument());
    const body = JSON.parse(String(request.mock.calls.find(([url]) => String(url) === '/api/ai/draft')?.[1]?.body));
    expect(body.context).toContain('REFERENCE_CONTEXT_SENTINEL');

    fireEvent.click(document.getElementById('workspace-tab-personal')!);
    await clickReferenceCategory();
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
  });

  it('clears editor and selected AI context when the authenticated user changes', async () => {
    const { rerender } = render(<EditorWorkspace user={{ username: 'writer-a', role: 'user' }} />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/drive/status'));
    await openReferenceCategory();

    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    switchToAi();
    expect(screen.getByTestId('selected-ai-context')).toHaveTextContent('Reference Manual');

    rerender(<EditorWorkspace user={{ username: 'writer-b', role: 'user' }} />);

    expect(screen.queryByTestId('selected-ai-context')).not.toBeInTheDocument();
    await waitFor(() => expect(request.mock.calls.filter(([url]) => String(url) === '/api/drive/status')).toHaveLength(2));
    switchToAi();
    fireEvent.change(screen.getByTestId('input-draft-prompt'), { target: { value: 'Draft for the second user' } });
    fireEvent.click(screen.getByTestId('btn-run-drafting'));
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/ai/draft', expect.anything()));
    const draftCall = request.mock.calls.find(([url]) => String(url) === '/api/ai/draft');
    const body = JSON.parse(String(draftCall?.[1]?.body));
    expect(String(body.context || '')).not.toContain('REFERENCE_CONTEXT_SENTINEL');
  });

  it('keeps selected context through document edits and synchronizes the AI queue with its checkbox', async () => {
    render(<EditorWorkspace user={{ username: 'writer', role: 'user' }} />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/drive/status'));
    await openReferenceCategory();

    fireEvent.click(await screen.findByRole('checkbox'));
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked());

    act(() => {
      workspaceMocks.onUpdate?.({ editor: workspaceMocks.editor });
    });

    expect(screen.getByRole('checkbox')).toBeChecked();
    switchToAi();
    expect(screen.getByTestId('selected-ai-context')).toHaveTextContent('Reference Manual');

    fireEvent.click(screen.getByRole('button', { name: /Reference Manual/ }));
    expect(screen.queryByTestId('selected-ai-context')).not.toBeInTheDocument();
    fireEvent.click(document.getElementById('workspace-tab-personal')!);
    await clickReferenceCategory();
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
  });

  it('clears queued context when a new document is created while Personal is unmounted', async () => {
    render(<EditorWorkspace user={{ username: 'writer', role: 'user' }} />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/drive/status'));
    await openReferenceCategory();
    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    switchToAi();

    fireEvent.click(screen.getByTestId('header-new-document'));
    fireEvent.change(screen.getByTestId('input-draft-prompt'), { target: { value: 'Draft a new document' } });
    fireEvent.click(screen.getByTestId('btn-run-drafting'));
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/ai/draft', expect.anything()));
    const requests = request.mock.calls.filter(([url]) => String(url) === '/api/ai/draft');
    const body = JSON.parse(String(requests[requests.length - 1]?.[1]?.body));
    expect(String(body.context || '')).not.toContain('REFERENCE_CONTEXT_SENTINEL');

    fireEvent.click(document.getElementById('workspace-tab-personal')!);
    await clickReferenceCategory();
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
  });
});
