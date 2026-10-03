import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import type { SpellcheckIssue } from '@/spellcheck/types';

const issue: SpellcheckIssue = {
  id: 'spelling:unknown-syllable:1:5:bảnn',
  category: 'spelling',
  ruleId: 'unknown-syllable',
  message: 'Nghi ngờ sai chính tả: “bảnn”.',
  text: 'bảnn',
  from: 1,
  to: 5,
  suggestions: ['bản'],
};

describe('spell-check sidebar navigation', () => {
  it('opens the spelling panel from its tab and keeps suggestion actions connected', () => {
    const onTabChange = vi.fn();
    const onApply = vi.fn();
    const onIgnore = vi.fn();
    render(<Sidebar
      isOpen
      activeTab="spellcheck"
      onTabChange={onTabChange}
      onClose={vi.fn()}
      spellcheckIssues={[issue]}
      userDictionaryWords={[]}
      onSelectSpellcheckIssue={vi.fn()}
      onApplySpellcheckSuggestion={onApply}
      onIgnoreSpellcheckIssue={onIgnore}
      onAddSpellcheckTerm={vi.fn()}
      onRemoveSpellcheckTerm={vi.fn()}
    />);

    expect(screen.getByRole('tab', { name: 'Chính tả' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Chính tả (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa thành “bản”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua một lần' }));
    expect(onApply).toHaveBeenCalledWith(issue, 'bản');
    expect(onIgnore).toHaveBeenCalledWith(issue);
  });
});
