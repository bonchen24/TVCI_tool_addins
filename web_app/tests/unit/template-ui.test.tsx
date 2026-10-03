import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

describe('Unit: Template Tab UI in Sidebar', () => {
  it('renders the template catalog browser when activeTab is "templates"', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Kho biểu mẫu TVCI/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Tìm kiếm mẫu biểu/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Công văn TVCI chuẩn')).toBeInTheDocument();
  });

  it('keeps template card titles and metadata wrapped within the sidebar width', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const title = screen.getByText('Công văn TVCI chuẩn');
    const card = screen.getByTestId('template-card-tvci-cv');
    const footer = card.querySelector('.mt-2')!;

    expect(card.className).toContain('min-w-0');
    expect(title.className).toContain('min-w-0');
    expect(title.className).toContain('break-words');
    expect(footer.className).toContain('flex-wrap');
  });

  it('filters template cards by search input (case and accent insensitive)', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm mẫu biểu/i);

    // Search "công văn"
    fireEvent.change(searchInput, { target: { value: 'công văn' } });
    expect(screen.getByText('Công văn TVCI chuẩn')).toBeInTheDocument();
    expect(screen.queryByText('Quyết định Tập đoàn TKV')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Quyết định Tập đoàn TKV')).toBeInTheDocument();
  });

  it('filters template cards by category buttons', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const qdButton = screen.getByRole('button', { name: 'Quyết định' });
    fireEvent.click(qdButton);

    expect(screen.getByText('Quyết định Tập đoàn TKV')).toBeInTheDocument();
    expect(screen.queryByText('Công văn TVCI chuẩn')).not.toBeInTheDocument();
  });

  it('navigates to dynamic form fill view upon selecting a template', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const cvCard = screen.getByTestId('template-card-tvci-cv');
    fireEvent.click(cvCard);

    // View switched to Form
    expect(screen.getByText(/Danh sách mẫu/i)).toBeInTheDocument();
    expect(screen.getByText('Chèn toàn bộ biểu mẫu (Tier 1)')).toBeInTheDocument();
    expect(screen.getByText('Điền vào tài liệu hiện tại (Tier 2)')).toBeInTheDocument();

    // Verify dynamic form inputs exist
    expect(screen.getByDisplayValue('102/TVCI-VP')).toBeInTheDocument();
    expect(screen.getByText(/Xem trước:/i)).toBeInTheDocument();
  });

  it('updates live date preview when place is modified in the form', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('template-card-tvci-cv'));

    const placeInput = screen.getAllByDisplayValue('Hà Nội')[0];
    fireEvent.change(placeInput, { target: { value: 'Quảng Ninh' } });

    // Live preview must reflect the updated place
    expect(screen.getByText(/Quảng Ninh, ngày/i)).toBeInTheDocument();
  });

  it('triggers onApplyTemplate callback with Tier 1 mode and displays success feedback', () => {
    const handleApply = vi.fn();

    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        onApplyTemplate={handleApply}
      />
    );

    // Open template form
    fireEvent.click(screen.getByTestId('template-card-tvci-cv'));

    // Click Tier 1 insert button
    const insertBtn = screen.getByText('Chèn toàn bộ biểu mẫu (Tier 1)');
    fireEvent.click(insertBtn);

    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith('tvci-cv', expect.any(Object), 'insert');

    // Feedback message displayed
    expect(screen.getByText(/Đã chèn toàn bộ biểu mẫu/i)).toBeInTheDocument();
  });

  it('triggers onApplyTemplate callback with Tier 2 mode and displays success feedback', () => {
    const handleApply = vi.fn();

    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        onApplyTemplate={handleApply}
      />
    );

    fireEvent.click(screen.getByTestId('template-card-tvci-cv'));

    // Click Tier 2 fill button
    const fillBtn = screen.getByText('Điền vào tài liệu hiện tại (Tier 2)');
    fireEvent.click(fillBtn);

    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith('tvci-cv', expect.any(Object), 'fill');

    expect(screen.getByText(/Đã cập nhật các trường vào tài liệu hiện tại!/i)).toBeInTheDocument();
  });

  it('navigates back to template catalog list when "Danh sách mẫu" is clicked', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="templates"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('template-card-tvci-cv'));
    expect(screen.getByText('Chèn toàn bộ biểu mẫu (Tier 1)')).toBeInTheDocument();

    const backButton = screen.getByText(/Danh sách mẫu/i);
    fireEvent.click(backButton);

    expect(screen.queryByText('Chèn toàn bộ biểu mẫu (Tier 1)')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tìm kiếm mẫu biểu/i)).toBeInTheDocument();
  });
});
