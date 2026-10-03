import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { A4Canvas } from '@/components/editor/A4Canvas';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { Editor } from '@tiptap/core';
import { coreEditorExtensions } from '@/editor/extensions';

describe('UI & Layout Components', () => {
  it('renders Button with variants and sizes correctly', () => {
    const { rerender } = render(<Button variant="action">Thực hiện</Button>);
    const btn = screen.getByRole('button', { name: 'Thực hiện' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-action-500');

    rerender(<Button variant="primary" size="sm">Lưu</Button>);
    expect(screen.getByRole('button', { name: 'Lưu' }).className).toContain('bg-primary-500');
  });

  it('renders Badge with variants correctly', () => {
    const { rerender } = render(<Badge variant="success">Hoàn thành</Badge>);
    expect(screen.getByText('Hoàn thành').className).toContain('bg-emerald-50');

    rerender(<Badge variant="warning">Cảnh báo</Badge>);
    expect(screen.getByText('Cảnh báo').className).toContain('bg-amber-50');
  });

  it('renders Header with document title and triggers action callbacks', () => {
    const handleExport = vi.fn();
    const handleNewDoc = vi.fn();
    const handleTitleChange = vi.fn();

    render(
      <Header
        documentTitle="CV_Thu_Nghiem.docx"
        isSaved={true}
        sidebarOpen={true}
        onTitleChange={handleTitleChange}
        onToggleSidebar={vi.fn()}
        onNewDocument={handleNewDoc}
        onImportDocx={vi.fn()}
        onExportDocx={handleExport}
        onOpenSettings={vi.fn()}
        username="component_user"
        role="user"
        driveConnected={false}
        onSaveToDrive={vi.fn()}
        onSaveAsToDrive={vi.fn()}
        onOpenDrive={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText('TVCI Document')).toBeInTheDocument();
    expect(screen.getByText('CV_Thu_Nghiem.docx')).toBeInTheDocument();
    expect(screen.getByText(/phiên/i)).toBeInTheDocument();

    const exportBtn = screen.getByRole('button', { name: /Xuất DOCX/i });
    fireEvent.click(exportBtn);
    expect(handleExport).toHaveBeenCalledTimes(1);
  });

  it('renders Sidebar and switches between Audit, Templates, and AI tabs', () => {
    const handleTabChange = vi.fn();
    render(
      <Sidebar
        isOpen={true}
        activeTab="audit"
        onTabChange={handleTabChange}
        onClose={vi.fn()}
        healthScore={95}
        issueCount={2}
      />
    );

    expect(screen.getByText('Điểm chuẩn thể thức')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('Danh sách phát hiện (2)')).toBeInTheDocument();

    const templateTab = screen.getByRole('tab', { name: /Biểu mẫu/i });
    fireEvent.click(templateTab);
    expect(handleTabChange).toHaveBeenCalledWith('templates');
  });

  it('renders StatusBar with word and paragraph metrics', () => {
    render(
      <StatusBar
        wordCount={245}
        paragraphCount={8}
        healthScore={100}
        profileName="NĐ 30/2020 TVCI"
      />
    );

    expect(screen.getByText('245')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('NĐ 30/2020 TVCI')).toBeInTheDocument();
    expect(screen.getByTestId('status-score-label')).toHaveTextContent('Điểm chuẩn:');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders A4Canvas sheet with correct A4 proportions and margins', () => {
    const editor = new Editor({
      extensions: coreEditorExtensions,
      content: '<p>Văn bản thử nghiệm A4</p>',
    });

    render(<A4Canvas editor={editor} showMarginGuides={true} />);

    const sheet = screen.getByTestId('a4-sheet');
    expect(sheet).toBeInTheDocument();
    expect(sheet.style.width).toBe('210mm');
    expect(sheet.style.minHeight).toBe('297mm');
    expect(sheet.style.paddingTop).toBe('20mm');
    expect(sheet.style.paddingBottom).toBe('20mm');
    expect(sheet.style.paddingLeft).toBe('30mm');
    expect(sheet.style.paddingRight).toBe('15mm');

    editor.destroy();
  });

  it('renders EditorToolbar and triggers formatting commands', () => {
    const editor = new Editor({
      extensions: coreEditorExtensions,
      content: '<p>Đoạn văn định dạng</p>',
    });

    render(<EditorToolbar editor={editor} />);

    const boldBtn = screen.getByRole('button', { name: 'In đậm' });
    expect(boldBtn).toBeInTheDocument();

    const presetBtn = screen.getByRole('button', { name: /Chuẩn Thân bài NĐ30/i });
    expect(presetBtn).toBeInTheDocument();
    fireEvent.click(presetBtn);

    const attrs = editor.getAttributes('paragraph');
    expect(attrs.fontSize).toBe(13);
    expect(attrs.lineSpacing).toBe(1.2);
    expect(attrs.firstLineIndentMm).toBe(10);

    editor.destroy();
  });

  it('renders A4Canvas container with overflow-auto for horizontal scroll support', () => {
    const editor = new Editor({
      extensions: coreEditorExtensions,
      content: '<p>Nội dung thử nghiệm</p>',
    });

    render(<A4Canvas editor={editor} />);

    const container = screen.getByTestId('a4-canvas-container');
    expect(container.className).toContain('overflow-auto');
    expect(container.className).not.toContain('overflow-y-auto');

    editor.destroy();
  });
});
