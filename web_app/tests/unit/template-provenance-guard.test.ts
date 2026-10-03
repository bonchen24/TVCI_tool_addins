import { describe, expect, it } from 'vitest';
import {
  ADMINISTRATIVE_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByOrganization,
  searchTemplates,
} from '@/templates/catalog';
import { renderTemplateToTiptapDoc } from '@/templates/engine';

describe('web template provenance guard', () => {
  it('keeps unverified and quarantined catalog records out of every official lookup', () => {
    expect(searchTemplates('')).toEqual([]);
    expect(getTemplateById('tvci-cv')).toBeUndefined();
    expect(getTemplatesByCategory('all')).toEqual([]);
    expect(getTemplatesByOrganization('all')).toEqual([]);
    expect(ADMINISTRATIVE_TEMPLATES.filter((item) => item.verification.status === 'verified')).toEqual([]);
  });

  it('rejects generic schema synthesis before rendering or applying any document', () => {
    expect(() => renderTemplateToTiptapDoc('cong_van', {})).toThrow(/canonical|xác minh|verified/i);
  });

  it('rejects a directly supplied unverified template object', () => {
    const unverified = ADMINISTRATIVE_TEMPLATES.find((item) => item.id === 'tvci-cv');
    expect(unverified).toBeDefined();
    expect(() => renderTemplateToTiptapDoc(unverified!, {})).toThrow(/canonical|xác minh|verified/i);
  });

  it('does not trust forged verified evidence attached to an unverified catalog row', () => {
    const catalogRecord = ADMINISTRATIVE_TEMPLATES.find((item) => item.id === 'tvci-cv')!;
    const forged = {
      ...catalogRecord,
      verification: {
        status: 'verified' as const,
        reason: 'forged caller data',
        canonicalSource: {
          kind: 'official-canonical-docx' as const,
          name: 'Not in the repo',
          path: '/templates/canonical/not-in-the-repo.docx',
          sha256: 'a'.repeat(64),
        },
        runtime: {
          path: `/templates/${catalogRecord.fileName}`,
          sha256: 'a'.repeat(64),
          derivedFromCanonicalSha256: 'a'.repeat(64),
          comparison: 'byte-exact' as const,
        },
      },
    };
    expect(() => renderTemplateToTiptapDoc(forged, {})).toThrow(/canonical|xác minh|verified/i);
  });

  it('quarantines the generic sample record', () => {
    const sample = ADMINISTRATIVE_TEMPLATES.find((item) => item.id === 'tvci-sample');
    expect(sample?.verification.status).toBe('quarantined');
    expect(searchTemplates('Tài liệu mẫu')).toEqual([]);
  });
});
