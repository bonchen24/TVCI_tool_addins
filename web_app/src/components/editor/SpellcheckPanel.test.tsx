import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SpellcheckPanel } from './SpellcheckPanel';
import type { SpellcheckIssue } from '@/spellcheck/types';

const issues: SpellcheckIssue[] = [
  {
    id: 'spelling:unknown-syllable:5:9:bảnn',
    category: 'spelling',
    ruleId: 'unknown-syllable',
    message: 'Nghi ngờ sai chính tả: “bảnn”.',
    text: 'bảnn',
    from: 5,
    to: 9,
    suggestions: ['bản'],
  },
  {
    id: 'presentation:double-space:10:12:  ',
    category: 'presentation',
    ruleId: 'double-space',
    message: 'Có khoảng trắng kép.',
    text: '  ',
    from: 10,
    to: 12,
    suggestions: [' '],
  },
  {
    id: 'presentation:missing-space-after-punctuation:13:15:,b',
    category: 'presentation',
    ruleId: 'missing-space-after-punctuation',
    message: 'Thiếu khoảng trắng sau dấu câu.',
    text: ',b',
    from: 13,
    to: 15,
    suggestions: [', b'],
  },
];

describe('spell-check findings panel', () => {
  it('separates spelling from presentation and exposes explicit suggestion actions', () => {
    const onApply = vi.fn();
    const onIgnore = vi.fn();
    const onAdd = vi.fn();
    render(<SpellcheckPanel
      issues={issues}
      userWords={[]}
      onSelectIssue={vi.fn()}
      onApplySuggestion={onApply}
      onIgnoreOnce={onIgnore}
      onAddToDictionary={onAdd}
      onRemoveFromDictionary={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Sửa thành “bản”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sửa thành “Gộp khoảng trắng”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sửa thành “, b”' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Bỏ qua một lần' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào từ điển' }));

    expect(screen.getByText('Chính tả (1)')).toBeInTheDocument();
    expect(screen.getByText('Trình bày/ngữ pháp cơ bản (2)')).toBeInTheDocument();
    expect(onApply).toHaveBeenCalledWith(issues[0], 'bản');
    expect(onApply).toHaveBeenCalledWith(issues[1], ' ');
    expect(onApply).toHaveBeenCalledWith(issues[2], ', b');
    expect(onIgnore).toHaveBeenCalledWith(issues[0]);
    expect(onAdd).toHaveBeenCalledWith(issues[0]);
  });

  it('lets the user navigate to a finding and remove a saved dictionary term', () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(<SpellcheckPanel
      issues={issues.slice(0, 1)}
      userWords={['Vinacomin']}
      onSelectIssue={onSelect}
      onApplySuggestion={vi.fn()}
      onIgnoreOnce={vi.fn()}
      onAddToDictionary={vi.fn()}
      onRemoveFromDictionary={onRemove}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Chuyển đến lỗi “bảnn”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa Vinacomin khỏi từ điển' }));

    expect(onSelect).toHaveBeenCalledWith(issues[0]);
    expect(onRemove).toHaveBeenCalledWith('Vinacomin');
  });
});
