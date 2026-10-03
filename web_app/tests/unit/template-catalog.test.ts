import { describe, it, expect } from 'vitest';
import {
  ADMINISTRATIVE_TEMPLATES,
  CATALOG,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByOrganization,
  searchTemplates,
  normalizeVietnamese,
} from '@/templates/catalog';

describe('Unit: Template Catalog (22 templates)', () => {
  it('contains at least 22 template records in the catalog', () => {
    expect(ADMINISTRATIVE_TEMPLATES.length).toBeGreaterThanOrEqual(22);
    expect(CATALOG.length).toBeGreaterThanOrEqual(22);
  });

  it('covers all 4 core administrative organizations (TVCI, IEMM, TKV, DANG)', () => {
    const orgs = new Set(ADMINISTRATIVE_TEMPLATES.map((t) => t.organization));
    expect(orgs.has('TVCI')).toBe(true);
    expect(orgs.has('IEMM')).toBe(true);
    expect(orgs.has('TKV')).toBe(true);
    expect(orgs.has('DANG')).toBe(true);
  });

  it('covers all 5 primary administrative template categories', () => {
    const validCategories = [
      'cong_van',
      'quyet_dinh',
      'thong_bao',
      'to_trinh',
      'bieu_mau_noi_bo',
    ];
    for (const t of ADMINISTRATIVE_TEMPLATES) {
      expect(validCategories).toContain(t.category);
    }
  });

  it('ensures every template record has a valid .docx fileName', () => {
    for (const t of ADMINISTRATIVE_TEMPLATES) {
      expect(t.fileName).toBeDefined();
      expect(t.fileName.endsWith('.docx')).toBe(true);
    }
  });

  it('validates mandatory metadata fields for all catalog items', () => {
    for (const t of ADMINISTRATIVE_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.organization).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.schemaId).toBeTruthy();
      expect(t.defaultProfile).toBeTruthy();
      expect(t.headerSetup).toBeDefined();
      expect(t.headerSetup.mottoUpper).toBeDefined();
      expect(t.headerSetup.mottoLower).toBeDefined();
      expect(t.footerSetup).toBeDefined();
      expect(t.footerSetup.signerPosition).toBeDefined();
    }
  });

  it('retrieves specific template by ID (case-insensitive)', () => {
    const tvciCv = getTemplateById('tvci-cv');
    expect(tvciCv).toBeDefined();
    expect(tvciCv?.name).toContain('Công văn');
    expect(tvciCv?.organization).toBe('TVCI');

    const tkvQd = getTemplateById('TKV-QD');
    expect(tkvQd).toBeDefined();
    expect(tkvQd?.organization).toBe('TKV');

    const dang = getTemplateById('dang-sample');
    expect(dang).toBeDefined();
    expect(dang?.organization).toBe('DANG');

    const notFound = getTemplateById('non_existent_xyz');
    expect(notFound).toBeUndefined();
  });

  it('filters templates by category', () => {
    const congVanList = getTemplatesByCategory('cong_van');
    expect(congVanList.length).toBeGreaterThan(0);
    expect(congVanList.every((t) => t.category === 'cong_van')).toBe(true);

    const quyetDinhList = getTemplatesByCategory('quyet_dinh');
    expect(quyetDinhList.length).toBeGreaterThan(0);
    expect(quyetDinhList.every((t) => t.category === 'quyet_dinh')).toBe(true);

    const allList = getTemplatesByCategory('all');
    expect(allList.length).toBe(ADMINISTRATIVE_TEMPLATES.length);
  });

  it('filters templates by organization', () => {
    const iemmList = getTemplatesByOrganization('IEMM');
    expect(iemmList.length).toBeGreaterThan(0);
    expect(iemmList.every((t) => t.organization === 'IEMM')).toBe(true);

    const tvciList = getTemplatesByOrganization('TVCI');
    expect(tvciList.length).toBeGreaterThan(0);
    expect(tvciList.every((t) => t.organization === 'TVCI')).toBe(true);
  });

  it('performs diacritic-insensitive Vietnamese search (normalizeVietnamese)', () => {
    expect(normalizeVietnamese('Công văn')).toBe('cong van');
    expect(normalizeVietnamese('Quyết định')).toBe('quyet dinh');
    expect(normalizeVietnamese('ĐẢNG BỘ')).toBe('dang bo');

    // Search with diacritics
    const resultsWithAccent = searchTemplates('công văn');
    expect(resultsWithAccent.length).toBeGreaterThan(0);

    // Search without diacritics
    const resultsWithoutAccent = searchTemplates('cong van');
    expect(resultsWithoutAccent.length).toBeGreaterThan(0);
    expect(resultsWithoutAccent.length).toBe(resultsWithAccent.length);

    // Search Quyết định
    const qdResults = searchTemplates('quyet dinh');
    expect(qdResults.length).toBeGreaterThan(0);

    // Search by ID keyword
    const idResults = searchTemplates('iemm-01');
    expect(idResults.length).toBe(1);
    expect(idResults[0].id).toBe('iemm-01');

    // Search with category and org filter options
    const filteredSearch = searchTemplates('nghi phep', {
      organization: 'IEMM',
      category: 'bieu_mau_noi_bo',
    });
    expect(filteredSearch.length).toBeGreaterThan(0);
    expect(filteredSearch.some((t) => t.id.includes('don-np'))).toBe(true);

    // Non-matching search
    const noResults = searchTemplates('khong_co_mau_nay_123456');
    expect(noResults.length).toBe(0);
  });
});
