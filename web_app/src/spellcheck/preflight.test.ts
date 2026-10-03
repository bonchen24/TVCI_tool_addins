import { describe, expect, it, vi } from 'vitest';
import { runSpellcheckPreflight } from './preflight';
import type { SpellcheckIssue } from './types';

const spellingIssue: SpellcheckIssue = {
  id: 'spelling:unknown-syllable:1:5:bảnn',
  category: 'spelling',
  ruleId: 'unknown-syllable',
  message: 'Nghi ngờ sai chính tả: “bảnn”.',
  text: 'bảnn',
  from: 1,
  to: 5,
  suggestions: ['bản'],
};

describe('spell-check preflight', () => {
  it('does not warn about presentation-only findings', async () => {
    const confirm = vi.fn<(message: string) => boolean>(() => false);

    await expect(runSpellcheckPreflight('xuất DOCX', async () => [{
      ...spellingIssue,
      category: 'presentation',
      ruleId: 'double-space',
    }], confirm)).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before continuing when spelling findings remain', async () => {
    const confirm = vi.fn<(message: string) => boolean>(() => false);

    await expect(runSpellcheckPreflight('lưu văn bản', async () => [spellingIssue], confirm)).resolves.toBe(false);
    expect(confirm.mock.calls[0][0]).toContain('1');
    expect(confirm.mock.calls[0][0]).toContain('lưu văn bản');
  });

  it('lets a user continue after an unavailable dictionary warning', async () => {
    const confirm = vi.fn<(message: string) => boolean>(() => true);

    await expect(runSpellcheckPreflight('xuất DOCX', async () => [], confirm, () => 'Không tải được từ điển.'))
      .resolves.toBe(true);
    expect(confirm.mock.calls[0][0]).toContain('Không tải được từ điển');
  });
});
