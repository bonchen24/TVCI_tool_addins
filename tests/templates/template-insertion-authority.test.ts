import { insertTemplate } from '../../src/word/template.service';
import { TEMPLATE_CATALOG } from '../../src/templates/catalog';
import type { TemplateRecord } from '../../src/templates/library';

describe('bundled template insertion authority', () => {
  it('rejects forged verified metadata for a catalog row before fetching its DOCX', async () => {
    const catalogRecord = TEMPLATE_CATALOG.find((item) => item.id === 'iemm-cv-001')!;
    if (catalogRecord.source.kind !== 'bundled') throw new Error('Expected a bundled catalog record.');
    const forgedRecord: TemplateRecord = {
      ...catalogRecord,
      verification: {
        status: 'verified',
        reason: 'Forged caller metadata.',
        canonicalSource: {
          kind: 'official-canonical-docx',
          name: 'Caller supplied source',
          path: '/templates/canonical/not-in-the-repository.docx',
          sha256: 'f'.repeat(64),
        },
        runtime: {
          path: catalogRecord.source.path,
          sha256: 'f'.repeat(64),
          derivedFromCanonicalSha256: 'f'.repeat(64),
          comparison: 'byte-exact',
        },
      },
    };
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    } as Response);

    try {
      await expect(insertTemplate(forgedRecord)).rejects.toThrow(/canonical|xác minh|verified/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
