import { describe, expect, it } from 'vitest';
import { combineSelectedContext } from '@/ai/context';
import { buildProofreadingPrompt } from '@/ai/proofreading';

describe('explicitly selected Knowledge and References context', () => {
  it('adds context only when a user selected content for the current AI request', () => {
    expect(combineSelectedContext('existing editor context', '')).toBe('existing editor context');
    expect(combineSelectedContext('existing editor context', 'selected note')).toContain('selected note');
    expect(combineSelectedContext('', 'selected note')).toContain('selected note');
  });

  it('includes only the supplied context in the proofreading prompt', () => {
    const prompt = buildProofreadingPrompt('Current document text', 'Selected reference only');
    expect(prompt).toContain('Selected reference only');
    expect(prompt).not.toContain('Unselected knowledge');
  });
});
