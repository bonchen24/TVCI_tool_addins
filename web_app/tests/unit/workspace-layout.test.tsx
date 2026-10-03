import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EditorWorkspace from '@/components/editor/EditorWorkspace';

vi.mock('@tiptap/react', () => ({ useEditor: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/editor/extensions', () => ({ coreEditorExtensions: [], createCoreEditorExtensions: () => [] }));
vi.mock('@/editor/schema', () => ({ defaultDocumentState: { type: 'doc', content: [] } }));
vi.mock('@/hooks/useDocumentAudit', () => ({
  useDocumentAudit: () => ({
    healthScore: 100,
    issueCount: 0,
    issues: [],
    activeProfile: 'NĐ 30/2020 TVCI',
    setProfile: vi.fn(),
    reevaluate: vi.fn(),
  }),
}));
vi.mock('@/docx', () => ({ importDocx: vi.fn(), exportDocx: vi.fn(), downloadDocx: vi.fn() }));
vi.mock('@/rules/auto-fixer', () => ({ applySafeFixes: vi.fn(), applySingleFix: vi.fn() }));
vi.mock('@/components/editor/EditorToolbar', () => ({ EditorToolbar: () => null }));
vi.mock('@/components/editor/A4Canvas', () => ({ A4Canvas: () => null }));
vi.mock('@/components/ai/AiWorkspacePanel', () => ({ AiWorkspacePanel: () => <div>AI workspace</div> }));

function renderWorkspace() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, connected: false }), { status: 200 })));
  return render(<EditorWorkspace user={{ username: 'test_user', role: 'user' }} />);
}

function getSidebarElement() {
  return document.querySelector('aside');
}

function mockDesktopMediaQuery() {
  const previousDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  });

  return () => {
    if (previousDescriptor) Object.defineProperty(window, 'matchMedia', previousDescriptor);
    else Reflect.deleteProperty(window, 'matchMedia');
  };
}

describe('Workspace sidebar layout and interaction', () => {
  it('keeps toast feedback below the mobile drawer layer and inside the editor-safe region', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWorkspace();

    fireEvent.click(screen.getByTestId('header-new-document'));

    const toast = screen.getByRole('status');
    expect(toast.className).toContain('z-20');
    expect(toast.className).not.toContain('z-30');
    expect(toast.className).toContain('xl:left-[336px]');
    expect(toast.className).toContain('bottom-8');
    expect(toast.className).toContain('top-auto');
    expect(toast.className).not.toContain('top-16');
    expect(toast.className).toContain('pointer-events-none');
    expect(screen.getByTestId('sidebar-backdrop').className).toContain('z-30');
    expect(getSidebarElement()!.className).toContain('z-40');
  });

  it('renders the sidebar before the editor in document order', () => {
    renderWorkspace();

    const sidebar = getSidebarElement();
    const editor = screen.getByRole('main');
    expect(sidebar).not.toBeNull();
    expect(sidebar!.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(editor.className).toContain('min-w-0');
  });

  it('allows the header toggle to close and reopen the sidebar', () => {
    renderWorkspace();

    const closeToggle = screen.getByRole('button', { name: 'Ẩn bảng công cụ' });
    fireEvent.click(closeToggle);
    expect(getSidebarElement()).toBeNull();

    const openToggle = screen.getByRole('button', { name: 'Hiện bảng công cụ' });
    expect(openToggle).toHaveAttribute('aria-expanded', 'false');
    expect(openToggle).not.toHaveAttribute('aria-controls');
    expect(openToggle.querySelector('svg')).toHaveClass('lucide-panel-left-open');
    fireEvent.click(openToggle);
    expect(getSidebarElement()).not.toBeNull();
    expect(document.querySelector('header button[aria-expanded="true"] svg')).toHaveClass('lucide-panel-left-close');
  });

  it('exposes the sidebar toggle label, expanded state, and controlled panel', () => {
    renderWorkspace();

    const toggle = screen.getByRole('button', { name: 'Ẩn bảng công cụ' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'workspace-sidebar');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBe(getSidebarElement());
    expect(toggle.querySelector('svg')).toHaveClass('lucide-panel-left-close');
  });

  it('uses a 336px left pane at xl without a right-sidebar border', () => {
    renderWorkspace();

    const sidebar = getSidebarElement()!;
    expect(sidebar.className).toContain('border-r');
    expect(sidebar.className).not.toContain('border-l');
    expect(sidebar.className).toContain('xl:w-[336px]');
  });

  it('uses a fixed drawer below xl and renders a separate backdrop', () => {
    renderWorkspace();

    const sidebar = getSidebarElement()!;
    expect(sidebar.className).toContain('fixed');
    expect(sidebar.className).toContain('xl:static');
    expect(sidebar.className).toContain('w-[min(88vw,360px)]');
    expect(screen.getByTestId('sidebar-backdrop').className).toContain('xl:hidden');
  });

  it('closes the narrow-screen drawer from its backdrop and close button', () => {
    renderWorkspace();

    fireEvent.click(screen.getByTestId('sidebar-backdrop'));
    expect(getSidebarElement()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Hiện bảng công cụ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng bảng công cụ' }));
    expect(getSidebarElement()).toBeNull();
  });

  it('closes the drawer on Escape', () => {
    renderWorkspace();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(getSidebarElement()).toBeNull();
    expect(screen.getByRole('button', { name: 'Hiện bảng công cụ' })).toHaveFocus();
  });

  it('does not close the desktop pane on Escape', () => {
    renderWorkspace();
    const restoreMatchMedia = mockDesktopMediaQuery();

    try {
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(getSidebarElement()).not.toBeNull();
    } finally {
      restoreMatchMedia();
    }
  });

  it('keeps the drawer open when Escape is used in a template search field', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('tab', { name: 'Biểu mẫu' }));

    fireEvent.keyDown(screen.getByPlaceholderText('Tìm kiếm mẫu biểu (vd: công văn, quyết định...)'), {
      key: 'Escape',
    });

    expect(getSidebarElement()).not.toBeNull();
  });

  it('keeps all five named tabs selectable with tab semantics', () => {
    renderWorkspace();

    const tablist = screen.getByRole('tablist', { name: 'Điều hướng công cụ' });
    const auditTab = screen.getByRole('tab', { name: 'Chuẩn hóa' });
    const templatesTab = screen.getByRole('tab', { name: 'Biểu mẫu' });
    const aiTab = screen.getByRole('tab', { name: 'AI Trợ lý' });
    const personalTab = document.getElementById('workspace-tab-personal')!;
    const spellcheckTab = screen.getByRole('tab', { name: 'Chính tả' });

    expect(tablist).toBeInTheDocument();
    expect(auditTab).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(spellcheckTab);
    expect(spellcheckTab).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(templatesTab);
    expect(templatesTab).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(aiTab);
    expect(aiTab).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(personalTab);
    expect(personalTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Drive cần thiết/i)).toBeInTheDocument();
    expect(spellcheckTab).toHaveAttribute('aria-selected', 'false');
    expect(auditTab).toHaveAttribute('aria-selected', 'false');
  });

  it('supports roving keyboard navigation across tabs', () => {
    renderWorkspace();

    const auditTab = screen.getByRole('tab', { name: 'Chuẩn hóa' });
    const spellcheckTab = screen.getByRole('tab', { name: 'Chính tả' });
    auditTab.focus();
    fireEvent.keyDown(auditTab, { key: 'ArrowRight' });

    expect(spellcheckTab).toHaveFocus();
    expect(spellcheckTab).toHaveAttribute('aria-selected', 'true');
    expect(spellcheckTab).toHaveAttribute('tabindex', '0');
    expect(auditTab).toHaveAttribute('tabindex', '-1');
  });

  it('keeps tab content in its own vertically scrollable panel', () => {
    renderWorkspace();

    const panel = screen.getByRole('tabpanel');
    expect(panel.className).toContain('overflow-y-auto');
    expect(panel.className).toContain('min-h-0');
  });

  it('keeps the 336px sidebar navigation and panel free of horizontal scrolling', () => {
    renderWorkspace();

    const sidebar = getSidebarElement()!;
    const tablist = screen.getByRole('tablist', { name: 'Điều hướng công cụ' });
    const panel = screen.getByRole('tabpanel');

    expect(sidebar.className).toContain('min-w-0');
    expect(sidebar.className).toContain('overflow-x-hidden');
    expect(tablist.className).toContain('flex-1');
    expect(tablist.className).not.toContain('overflow-x-auto');
    expect(tablist.querySelectorAll('[role="tab"]')).toHaveLength(5);
    tablist.querySelectorAll('[role="tab"]').forEach((tab) => {
      expect(tab.className).toContain('min-w-0');
      expect(tab.className).toContain('flex-1');
    });
    expect(panel.className).toContain('overflow-x-hidden');
  });
});
