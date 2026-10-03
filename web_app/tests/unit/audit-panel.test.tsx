import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';
import type { ValidationIssue } from '@/rules/models';

describe('Audit Panel UI: Sidebar Audit Tab & Interactions', () => {
  it('renders health score and issue list with severity badges and component tags', () => {
    const mockIssues: ValidationIssue[] = [
      {
        id: 'iss-1',
        ruleId: 'component.NATIONAL_EMBLEM.fontName',
        targetId: 'node-0',
        paragraphIndex: 0,
        category: 'header',
        componentType: 'NATIONAL_EMBLEM',
        message: '[Quốc hiệu] Sai phông chữ',
        severity: 'error',
        status: 'FAIL',
        autoFixable: true,
        actual: 'Arial',
        expected: 'Times New Roman',
      },
      {
        id: 'iss-2',
        ruleId: 'body.fontSize',
        targetId: 'node-3',
        paragraphIndex: 3,
        category: 'body',
        componentType: 'BODY',
        message: 'Sai cỡ chữ',
        severity: 'warning',
        status: 'FAIL',
        autoFixable: true,
        actual: 16,
        expected: '13-14',
      },
    ];

    render(
      <Sidebar
        isOpen={true}
        activeTab="audit"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        healthScore={82}
        issueCount={2}
        issues={mockIssues}
      />
    );

    expect(screen.getByText('Điểm chuẩn thể thức')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('Danh sách phát hiện (2)')).toBeInTheDocument();

    // Badges & elements
    expect(screen.getByText('Nghiêm trọng')).toBeInTheDocument();
    expect(screen.getByText('Cảnh báo')).toBeInTheDocument();
    expect(screen.getByText('Quốc hiệu')).toBeInTheDocument();
    expect(screen.getByText('Thân bài')).toBeInTheDocument();

    // Actual vs expected
    expect(screen.getByText(/Arial/)).toBeInTheDocument();
    expect(screen.getByText(/Times New Roman/)).toBeInTheDocument();
  });

  it('triggers onApplySafeFix when clicking Sửa an toàn button', () => {
    const handleApplySafeFix = vi.fn();
    render(
      <Sidebar
        isOpen={true}
        activeTab="audit"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        healthScore={70}
        issueCount={1}
        onApplySafeFix={handleApplySafeFix}
      />
    );

    const safeFixBtn = screen.getByRole('button', { name: /Sửa an toàn/i });
    expect(safeFixBtn).toBeEnabled();
    fireEvent.click(safeFixBtn);
    expect(handleApplySafeFix).toHaveBeenCalledTimes(1);
  });

  it('triggers onFixIssue when clicking Sửa mục này on an individual issue card', () => {
    const handleFixIssue = vi.fn();
    const mockIssue: ValidationIssue = {
      id: 'iss-test',
      ruleId: 'body.alignment',
      targetId: 'node-1',
      paragraphIndex: 1,
      category: 'body',
      componentType: 'BODY',
      message: 'Sai căn lề đoạn văn',
      severity: 'error',
      status: 'FAIL',
      autoFixable: true,
      actual: 'Left',
      expected: 'Justified',
    };

    render(
      <Sidebar
        isOpen={true}
        activeTab="audit"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        healthScore={90}
        issueCount={1}
        issues={[mockIssue]}
        onFixIssue={handleFixIssue}
      />
    );

    const singleFixBtn = screen.getByRole('button', { name: /Sửa mục này/i });
    fireEvent.click(singleFixBtn);
    expect(handleFixIssue).toHaveBeenCalledWith(mockIssue);
  });

  it('renders Green Shield 100% compliance empty state when no issues exist', () => {
    render(
      <Sidebar
        isOpen={true}
        activeTab="audit"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        healthScore={100}
        issueCount={0}
        issues={[]}
      />
    );

    expect(screen.getByText('Tài liệu đạt chuẩn 100% Nghị định 30/2020!')).toBeInTheDocument();
    expect(screen.getByText('Sẵn sàng ban hành & in ấn')).toBeInTheDocument();
    const safeFixBtn = screen.getByRole('button', { name: /Sửa an toàn/i });
    expect(safeFixBtn).toBeDisabled();
  });

  it('wraps long audit values inside the fixed-width sidebar panel', () => {
    const longMessage = 'Mã_lỗi_có_chuỗi_không_ngắt_'.repeat(8);
    render(
      <Sidebar
        isOpen={true}
        activeTab="audit"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        issueCount={1}
        issues={[{
          id: 'long-issue',
          ruleId: 'body.longValue',
          targetId: 'node-1',
          paragraphIndex: 1,
          category: 'body',
          componentType: 'BODY',
          message: longMessage,
          severity: 'warning',
          status: 'FAIL',
          autoFixable: false,
          actual: longMessage,
          expected: 'Giá trị theo quy định',
        }]}
      />
    );

    const panel = screen.getByRole('tabpanel');
    const message = screen.getByText(longMessage, { selector: 'p' });

    expect(panel.className).toContain('overflow-x-hidden');
    expect(message.className).toContain('break-words');
    expect(screen.getByText(longMessage, { selector: 'strong' }).className).toContain('break-words');
  });
});
