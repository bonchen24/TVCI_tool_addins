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
  it('does not return unverified system templates for official use', () => {
    expect(searchTemplates('')).toEqual([]);
    expect(getTemplateById('tvci-cv')).toBeUndefined();
  });
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

  it('does not return candidates by ID until their canonical DOCX is verified', () => {
    for (const template of ADMINISTRATIVE_TEMPLATES) {
      expect(getTemplateById(template.id)).toBeUndefined();
    }
    expect(getTemplateById('non_existent_xyz')).toBeUndefined();
  });

  it('keeps category and organization lookups empty while every record is unverified or quarantined', () => {
    expect(getTemplatesByCategory('cong_van')).toEqual([]);
    expect(getTemplatesByCategory('quyet_dinh')).toEqual([]);
    expect(getTemplatesByCategory('all')).toEqual([]);
    expect(getTemplatesByOrganization('IEMM')).toEqual([]);
    expect(getTemplatesByOrganization('TVCI')).toEqual([]);
    expect(getTemplatesByOrganization('all')).toEqual([]);
  });

  it('normalizes Vietnamese search text but never returns an unverified catalog record', () => {
    expect(normalizeVietnamese('Công văn')).toBe('cong van');
    expect(normalizeVietnamese('Quyết định')).toBe('quyet dinh');
    expect(normalizeVietnamese('ĐẢNG BỘ')).toBe('dang bo');
    expect(searchTemplates('công văn')).toEqual([]);
    expect(searchTemplates('cong van')).toEqual([]);
    expect(searchTemplates('iemm-01')).toEqual([]);
    expect(searchTemplates('nghi phep', { organization: 'IEMM', category: 'bieu_mau_noi_bo' })).toEqual([]);
  });
});
