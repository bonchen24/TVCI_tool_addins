import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiWorkspacePanel } from '@/components/ai/AiWorkspacePanel';
import { DiffPreviewModal } from '@/components/ai/DiffPreviewModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { generateAiDiff } from '@/ai/diff';

describe('AI Workspace UI & Diff Workflow', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends only the context explicitly selected for the current AI request', async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ content: 'Draft output', paragraphs: ['Draft output'], tokensUsed: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', request);
    render(<AiWorkspacePanel selectedContext="Selected knowledge item" />);
    fireEvent.change(screen.getByTestId('input-draft-prompt'), { target: { value: 'Draft this' } });
    fireEvent.click(screen.getByTestId('btn-run-drafting'));
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body || '{}'));
    expect(body.context).toContain('Selected knowledge item');
    expect(body.context).not.toContain('Unselected knowledge');
  });

  it('renders AiWorkspacePanel with 3 subsystem tabs', () => {
    render(<AiWorkspacePanel />);

    expect(screen.getByTestId('ai-workspace-panel')).toBeInTheDocument();
    expect(screen.getByTestId('tab-ai-drafting')).toBeInTheDocument();
    expect(screen.getByTestId('tab-ai-proofreading')).toBeInTheDocument();
    expect(screen.getByTestId('tab-ai-template-fill')).toBeInTheDocument();
  });

  it('exposes narrow AI navigation as accessible, keyboard-operable tabs', () => {
    render(<AiWorkspacePanel />);

    const panel = screen.getByTestId('ai-workspace-panel');
    const tablist = screen.getByRole('tablist', { name: 'Chức năng AI' });
    const draftingTab = screen.getByRole('tab', { name: 'Soạn thảo' });
    const proofreadingTab = screen.getByRole('tab', { name: 'Soát lỗi' });

    expect(panel.className).toContain('min-w-0');
    expect(panel.className).toContain('break-words');
    expect(draftingTab).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(draftingTab, { key: 'ArrowRight' });

    expect(proofreadingTab).toHaveFocus();
    expect(proofreadingTab).toHaveAttribute('aria-selected', 'true');
    expect(proofreadingTab).toHaveAttribute('tabindex', '0');
    expect(draftingTab).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'ai-tab-proofreading');
  });

  it('connects the AI settings disclosure to its visible panel', () => {
    render(<AiWorkspacePanel />);

    const settingsButton = screen.getByRole('button', { name: 'Cấu hình AI' });
    expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    expect(settingsButton).not.toHaveAttribute('aria-controls');

    fireEvent.click(settingsButton);
    expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    expect(settingsButton).toHaveAttribute('aria-controls', 'ai-settings-panel');
    expect(document.getElementById(settingsButton.getAttribute('aria-controls')!)).toBeInTheDocument();
  });

  it('switches between subsystem tabs smoothly', () => {
    render(<AiWorkspacePanel />);

    // Default tab is drafting
    expect(screen.getByTestId('input-draft-prompt')).toBeInTheDocument();

    // Switch to proofreading
    fireEvent.click(screen.getByTestId('tab-ai-proofreading'));
    expect(screen.getByTestId('input-proofread-text')).toBeInTheDocument();

    // Switch to template fill
    fireEvent.click(screen.getByTestId('tab-ai-template-fill'));
    expect(screen.getByTestId('input-template-notes')).toBeInTheDocument();
  });

  it('validates empty prompt on drafting submission and shows error message', async () => {
    render(<AiWorkspacePanel />);

    const runBtn = screen.getByTestId('btn-run-drafting');
    fireEvent.click(runBtn);

    expect(
      await screen.findByText(/Vui lòng nhập yêu cầu nội dung cần soạn thảo/i)
    ).toBeInTheDocument();
  });

  it('renders DiffPreviewModal with visual Emerald additions and Rose deletions', () => {
    const original = 'Văn bản cũ có lỗi';
    const updated = 'Văn bản mới đã chuẩn hóa';
    const diff = generateAiDiff(original, updated);
    const onApply = vi.fn();
    const onClose = vi.fn();

    render(
      <DiffPreviewModal
        isOpen={true}
        diff={diff}
        onClose={onClose}
        onApply={onApply}
      />
    );

    expect(screen.getByText(/Xem trước khác biệt/i)).toBeInTheDocument();
    expect(screen.getByTestId('diff-preview-content')).toBeInTheDocument();
    expect(screen.getByTestId('apply-diff-button')).toBeInTheDocument();
  });

  it('toggles Accept / Reject decision per change group in DiffPreviewModal', () => {
    const original = 'Hội đồng quản trị';
    const updated = 'Hội đồng thành viên';
    const diff = generateAiDiff(original, updated);
    const onApply = vi.fn();
    const onClose = vi.fn();

    render(
      <DiffPreviewModal
        isOpen={true}
        diff={diff}
        onClose={onClose}
        onApply={onApply}
      />
    );

    // Initial state: Accepted
    const toggleBtn = screen.getByTestId('toggle-diff-group-group-1');
    expect(toggleBtn).toHaveTextContent(/Đã nhận/i);

    // Toggle to Rejected
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent(/Bỏ qua/i);

    // Click confirm: onApply should receive the rejected text (original: 'Hội đồng quản trị')
    const applyBtn = screen.getByTestId('apply-diff-button');
    fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledWith('Hội đồng quản trị');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders AiWorkspacePanel inside Sidebar when activeTab is "ai"', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="ai"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('ai-workspace-panel')).toBeInTheDocument();
    expect(screen.getByText(/AI Trợ lý văn phòng/i)).toBeInTheDocument();
  });
});
