import { describe, expect, it } from 'vitest';
import { buildSelectedAiContext } from '@/drive/client-context';

describe('browser-safe Drive context formatting', () => {
  it('formats only explicitly selected Knowledge and Reference items', () => {
    const selected = [
      { fileId: 'k1', category: 'knowledge' as const, title: 'Rule', content: 'Selected rule body', createdAt: '', updatedAt: '', schemaVersion: 1 },
      { fileId: 'r1', category: 'references' as const, title: 'Manual', content: 'Unselected manual body', createdAt: '', updatedAt: '', schemaVersion: 1 },
    ];
    const context = buildSelectedAiContext(selected, ['k1']);
    expect(context).toContain('[Knowledge: Rule]');
    expect(context).toContain('Selected rule body');
    expect(context).not.toContain('Unselected manual body');
  });
});
