import { isOfficialTemplateVerified, isTemplateSelectable, searchTemplates } from '../../src/templates/library';
import { TEMPLATE_CATALOG } from '../../src/templates/catalog';
import type { TemplateRecord } from '../../src/templates/library';

function verifiedTestRecord(canonicalPath = '/canonical_templates/test.docx'): TemplateRecord {
  const sourceRecord = TEMPLATE_CATALOG.find((item) => item.id === 'iemm-cv-001')!;
  if (sourceRecord.source.kind !== 'bundled') throw new Error('Expected a bundled template fixture.');
  const hash = 'a'.repeat(64);
  return {
    ...sourceRecord,
    verification: {
      status: 'verified',
      reason: 'Test-only complete evidence fixture.',
      canonicalSource: {
        kind: 'official-canonical-docx',
        name: 'Test canonical DOCX',
        path: canonicalPath,
        sha256: hash,
      },
      runtime: {
        path: sourceRecord.source.path,
        sha256: hash,
        derivedFromCanonicalSha256: hash,
        comparison: 'byte-exact',
      },
    },
  };
}

describe('template selectability follows canonical provenance', () => {
  it('accepts complete evidence under either protected canonical root', () => {
    const candidate = verifiedTestRecord();
    expect(isOfficialTemplateVerified(candidate)).toBe(true);
    expect(isTemplateSelectable(candidate)).toBe(true);
    expect(isOfficialTemplateVerified(verifiedTestRecord('/templates/canonical/test.docx'))).toBe(true);
    expect(isOfficialTemplateVerified(verifiedTestRecord('/canonical_templates/../templates/tvci-cong-van-template.docx'))).toBe(false);
  });

  it('keeps unverified and quarantined built-ins out of search', () => {
    expect(searchTemplates(TEMPLATE_CATALOG, {})).toEqual([]);
    expect(TEMPLATE_CATALOG.filter((item) => item.verification?.status === 'quarantined').map((item) => item.id))
      .toEqual(expect.arrayContaining(['dang-sample-001', 'tvci-sample-001', 'iemm-sample-001']));
  });

  it('keeps personal templates selectable without calling them official', () => {
    const personal: TemplateRecord = {
      id: 'personal-test',
      name: 'Personal template',
      organization: 'TVCI',
      department: 'Test',
      documentType: 'Test',
      keywords: [],
      source: { kind: 'user', storageId: 'personal-test' },
      version: '1',
      status: 'active',
    };
    expect(isTemplateSelectable(personal)).toBe(true);
    expect(isOfficialTemplateVerified(personal)).toBe(false);
  });
});
