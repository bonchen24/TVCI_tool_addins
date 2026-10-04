import { describe, expect, it } from 'vitest';
import {
  ADMINISTRATIVE_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByOrganization,
  isOfficialTemplateVerified,
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

  it('rejects a canonical path that escapes its protected source root', () => {
    const base = ADMINISTRATIVE_TEMPLATES.find((item) => item.id === 'tvci-cv')!;
    const forged = {
      ...base,
      verification: {
        ...base.verification,
        status: 'verified' as const,
        canonicalSource: {
          kind: 'official-canonical-docx' as const,
          name: 'Escaped source',
          path: '/canonical_templates/../templates/tvci-cong-van-template.docx',
          sha256: 'a'.repeat(64),
        },
        runtime: {
          path: base.verification.runtime.path,
          sha256: 'a'.repeat(64),
          derivedFromCanonicalSha256: 'a'.repeat(64),
          comparison: 'byte-exact' as const,
        },
      },
    };
    expect(isOfficialTemplateVerified(forged)).toBe(false);
  });

  it('accepts generated canonical evidence only after structural and visual QA pass', () => {
    const base = ADMINISTRATIVE_TEMPLATES.find((item) => item.id === 'tvci-cv')!;
    const sha256 = 'a'.repeat(64);
    const generated = {
      ...base,
      verification: {
        status: 'verified' as const,
        reason: 'Generated canonical DOCX passed QA.',
        canonicalSource: {
          kind: 'generated-canonical' as const,
          name: 'TVCI Công văn',
          path: 'canonical_templates/generated/tvci-cong-van.docx',
          sha256,
          ruleSpecVersion: '1.0.0',
          generatorVersion: '1.0.0',
          generatorSha256: sha256,
          normativeSources: [{ label: 'Nghị định 30/2020/NĐ-CP', id: '30-2020' }],
          referenceSources: ['IEMM QĐ 731-2023, Appendix VII'],
          structuralQa: { status: 'passed' as const, reportPath: 'canonical_templates/generated/qa.json', sha256 },
          visualQa: { status: 'passed' as const, renderer: 'LibreOffice', reportPath: 'canonical_templates/generated/render.json', sha256 },
        },
        runtime: {
          path: '/templates/tvci-cong-van-template.docx',
          sha256,
          derivedFromCanonicalSha256: sha256,
          comparison: 'byte-exact' as const,
        },
      },
    };

    expect(isOfficialTemplateVerified(generated)).toBe(true);
    expect(isOfficialTemplateVerified({
      ...generated,
      verification: {
        ...generated.verification,
        canonicalSource: { ...generated.verification.canonicalSource, visualQa: { ...generated.verification.canonicalSource.visualQa, status: 'unverified' as const } },
      },
    })).toBe(false);
  });

  it('quarantines the generic sample record', () => {
    const sample = ADMINISTRATIVE_TEMPLATES.find((item) => item.id === 'tvci-sample');
    expect(sample?.verification.status).toBe('quarantined');
    expect(searchTemplates('Tài liệu mẫu')).toEqual([]);
  });
});
