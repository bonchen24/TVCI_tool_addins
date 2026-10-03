import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

function renderTemplateSidebar(onApplyTemplate = vi.fn()) {
  return render(
    <Sidebar
      isOpen={true}
      activeTab="templates"
      onTabChange={vi.fn()}
      onClose={vi.fn()}
      onApplyTemplate={onApplyTemplate}
    />
  );
}

describe('Unit: fail-closed template Sidebar', () => {
  it('shows the verified-only catalog and explains when no official template is available', () => {
    renderTemplateSidebar();

    expect(screen.getByText(/Kho biểu mẫu chính thức đã xác minh \(0 mẫu\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tìm kiếm mẫu biểu/i)).toBeInTheDocument();
    expect(screen.getByTestId('official-template-empty')).toHaveTextContent(/chưa có biểu mẫu chính thức nào được xác minh/i);
  });

  it('does not reveal unverified records through catalog search', () => {
    renderTemplateSidebar();
    fireEvent.change(screen.getByPlaceholderText(/Tìm kiếm mẫu biểu/i), { target: { value: 'công văn' } });

    expect(screen.queryByTestId('template-card-tvci-cv')).not.toBeInTheDocument();
    expect(screen.getByTestId('official-template-empty')).toBeInTheDocument();
  });

  it('does not reveal unverified records through category filters', () => {
    renderTemplateSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Quyết định' }));

    expect(screen.queryByTestId('template-card-tkv-qd')).not.toBeInTheDocument();
    expect(screen.getByTestId('official-template-empty')).toBeInTheDocument();
  });

  it('does not expose selection or apply actions for an unverified catalog row', () => {
    const onApplyTemplate = vi.fn();
    renderTemplateSidebar(onApplyTemplate);

    expect(screen.queryByTestId('template-card-tvci-cv')).not.toBeInTheDocument();
    expect(screen.queryByText('Chèn toàn bộ biểu mẫu (Tier 1)')).not.toBeInTheDocument();
    expect(screen.queryByText('Điền vào tài liệu hiện tại (Tier 2)')).not.toBeInTheDocument();
    expect(onApplyTemplate).not.toHaveBeenCalled();
  });
});
