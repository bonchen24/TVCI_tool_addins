import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Header } from '@/components/layout/Header';
import { StatusBar } from '@/components/layout/StatusBar';
import { Sidebar } from '@/components/layout/Sidebar';

function renderHeader() {
  return render(
    <Header
      documentTitle={'A long administrative document title that must stay constrained'}
      isSaved={false}
      sidebarOpen={true}
      onTitleChange={vi.fn()}
      onToggleSidebar={vi.fn()}
      onNewDocument={vi.fn()}
      onImportDocx={vi.fn()}
      onExportDocx={vi.fn()}
      onOpenSettings={vi.fn()}
      username="responsive_user"
      role="user"
      driveConnected={false}
      onSaveToDrive={vi.fn()}
      onSaveAsToDrive={vi.fn()}
      onOpenDrive={vi.fn()}
      onLogout={vi.fn()}
    />
  );
}

describe('responsive workspace chrome', () => {
  it('keeps all header actions available while hiding secondary labels at narrow widths', () => {
    renderHeader();

    const actionGroup = screen.getByTestId('header-action-group');
    expect(actionGroup.className).toContain('min-w-0');
    expect(actionGroup.className).not.toContain('overflow-x-auto');
    expect(actionGroup.className).toContain('shrink-0');
    expect(actionGroup.className).toContain('gap-0');
    expect(actionGroup.querySelectorAll('button')).toHaveLength(6);

    expect(screen.getByTestId('header-new-document')).toBeInTheDocument();
    expect(screen.getByTestId('header-new-label').className).toContain('hidden');
    expect(screen.getByTestId('header-import-label').className).toContain('hidden');
    expect(screen.getByTestId('header-export-label').className).toContain('hidden');
    expect(screen.getByRole('link', { name: /Kết nối Google Drive/i })).toBeInTheDocument();
    const exportButton = screen.getByTestId('header-export-label').closest('button');
    expect(exportButton).not.toBeNull();
    expect(exportButton!.className).toContain('bg-action-500');
  });

  it('shows secondary action labels only as header space grows and names icon-only actions', () => {
    renderHeader();

    expect(screen.getByTestId('header-new-label').className).toContain('xl:inline');
    expect(screen.getByTestId('header-import-label').className).toContain('lg:inline');
    expect(screen.getByTestId('header-export-label').className).toContain('sm:inline');
    expect(screen.getByRole('button', { name: 'Văn bản mới' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kết nối Google Drive/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhập DOCX' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xuất DOCX' })).toBeInTheDocument();
  });

  it('constrains and truncates the document title without losing its control', () => {
    renderHeader();

    const titleContainer = screen.getByTestId('header-title-container');
    const titleButton = screen.getByRole('button', {
      name: 'A long administrative document title that must stay constrained',
    });

    expect(titleContainer.className).toContain('min-w-0');
    expect(titleContainer.className).toContain('flex-1');
    expect(titleButton.className).toContain('max-w-full');
    expect(titleButton.className).toContain('truncate');

    fireEvent.click(titleButton);
    const titleInput = screen.getByRole('textbox');
    expect(titleInput.className).toContain('min-w-0');
    expect(titleInput.className).toContain('w-full');
  });

  it('keeps the status bar compact and hides secondary metrics at narrow widths', () => {
    render(
      <StatusBar
        wordCount={245}
        paragraphCount={8}
        healthScore={100}
        profileName={'Default profile'}
        activeProfile={'Default profile'}
        onProfileChange={vi.fn()}
        onOpenAudit={vi.fn()}
      />
    );

    const statusBar = screen.getByRole('contentinfo');
    expect(statusBar.className).toContain('min-w-0');
    expect(statusBar.className).toContain('overflow-hidden');
    expect(statusBar.className).not.toContain('overflow-x-auto');
    expect(screen.getByTestId('status-paragraph-count').className).toContain('hidden');
    expect(screen.getByTestId('status-paper-size').className).toContain('hidden');
    const profile = screen.getByRole('combobox');
    expect(profile).toBeInTheDocument();
    expect(profile.className).toContain('w-[5.5rem]');
    expect(profile.className).toContain('min-w-0');
    expect(screen.getByTestId('status-score-label').className).toContain('hidden');
    expect(screen.getByTestId('status-score-label').className).toContain('sm:inline');
    expect(screen.getByRole('button', { name: /100%/i })).toBeInTheDocument();
  });

  it('wraps template category filters within the sidebar instead of scrolling horizontally', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const categoryFilters = screen.getByRole('button', { name: 'Công văn' }).parentElement!;
    expect(categoryFilters.className).toContain('flex-wrap');
    expect(categoryFilters.className).not.toContain('overflow-x-auto');
    expect(categoryFilters.querySelector('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('announces the selected template organization filter', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const tvciOrganization = screen.getByRole('button', { name: 'TVCI' });
    const allOrganizations = tvciOrganization.parentElement!.querySelector('button')!;
    expect(allOrganizations).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(tvciOrganization);
    expect(tvciOrganization).toHaveAttribute('aria-pressed', 'true');
    expect(allOrganizations).toHaveAttribute('aria-pressed', 'false');
  });
});
