import { describe, it, expect } from 'vitest';
import {
  FORM_SCHEMAS,
  ALL_SCHEMAS,
  CANONICAL_SCHEMAS,
  getFormSchema,
  getDefaultValuesForSchema,
  getTemplateFormSchemaByDocumentType,
} from '@/templates/form-schema';
import {
  formatAdministrativeDate,
  isValidCalendarDate,
  validateDocumentNumber,
  validateFormValues,
  validateDocumentForm,
  normalizeTemplateFormValues,
  parseDateParts,
} from '@/templates/form-validation';

describe('Unit: Form Schemas & Administrative Validation', () => {
  it('registers all 8 canonical administrative form schemas in FORM_SCHEMAS', () => {
    expect(FORM_SCHEMAS.length).toBe(8);
    const ids = FORM_SCHEMAS.map((s) => s.id);

    const expectedCanonicalIds = [
      'cong_van',
      'quyet_dinh',
      'thong_bao',
      'to_trinh',
      'bao_cao',
      'bien_ban',
      'ke_hoach',
      'hop_dong',
    ];

    for (const reqId of expectedCanonicalIds) {
      expect(ids).toContain(reqId);
    }
  });

  it('includes internal schemas (thu_moi, don_nghi_phep) in ALL_SCHEMAS', () => {
    const allIds = ALL_SCHEMAS.map((s) => s.id);
    expect(allIds).toContain('thu_moi');
    expect(allIds).toContain('don_nghi_phep');
    expect(CANONICAL_SCHEMAS.length).toBeGreaterThanOrEqual(8);
  });

  it('resolves schema by ID, uppercase alias, and Vietnamese name', () => {
    expect(getFormSchema('cong_van')?.name).toBe('Công văn');
    expect(getFormSchema('CONG_VAN')?.id).toBe('cong_van');
    expect(getFormSchema('Công văn')?.id).toBe('cong_van');

    expect(getFormSchema('quyet_dinh')?.name).toBe('Quyết định');
    expect(getFormSchema('QUYET_DINH')?.id).toBe('quyet_dinh');
    expect(getFormSchema('Quyết định')?.id).toBe('quyet_dinh');

    expect(getFormSchema('ke_hoach')?.name).toBe('Kế hoạch');
    expect(getFormSchema('hop_dong')?.name).toBe('Hợp đồng');
  });

  it('throws an informative error when document type is not in registry', () => {
    expect(() => getTemplateFormSchemaByDocumentType('non_existent_type')).toThrow(
      'Mẫu biểu không tồn tại trong hệ thống: non_existent_type'
    );
  });

  it('validates dual-key support and required fields for Công văn', () => {
    const cvSchema = getFormSchema('cong_van');
    expect(cvSchema).toBeDefined();

    const fieldIds = cvSchema!.fields.map((f) => f.id);
    expect(fieldIds).toContain('SO_KY_HIEU');
    expect(fieldIds).toContain('NGAY_BAN_HANH');
    expect(fieldIds).toContain('TRICH_YEU');
    expect(fieldIds).toContain('KINH_GUI');
    expect(fieldIds).toContain('NOI_DUNG');
    expect(fieldIds).toContain('NGUOI_KY');

    // Dual key alias checks
    const soField = cvSchema!.fields.find((f) => f.id === 'SO_KY_HIEU');
    expect(soField?.aliases).toContain('documentNumber');

    const agencyField = cvSchema!.fields.find((f) => f.id === 'agencyName');
    expect(agencyField?.tag).toBe('CO_QUAN_BAN_HANH');
    expect(agencyField?.aliases).toContain('CO_QUAN_BAN_HANH');
  });

  it('validates repeatable fields for Quyết định (CAN_CU, QUYET_DINH_DIEU)', () => {
    const qdSchema = getFormSchema('quyet_dinh');
    expect(qdSchema).toBeDefined();

    const canCu = qdSchema!.fields.find((f) => f.id === 'CAN_CU');
    const dieuKhoan = qdSchema!.fields.find((f) => f.id === 'QUYET_DINH_DIEU');

    expect(canCu?.type).toBe('repeatable');
    expect(canCu?.aliases).toContain('legalBases');

    expect(dieuKhoan?.type).toBe('repeatable');
    expect(dieuKhoan?.aliases).toContain('decisionClauses');
  });

  it('generates default values dictionary populated with dual keys', () => {
    const defaults = getDefaultValuesForSchema('cong_van');
    expect(defaults.SO_KY_HIEU).toBeDefined();
    expect(defaults.documentNumber).toBe(defaults.SO_KY_HIEU);
    expect(defaults.agencyName).toBeDefined();
    expect(defaults.CO_QUAN_BAN_HANH).toBe(defaults.agencyName);
  });

  describe('NĐ 30/2020 Administrative Date Formatter Rules', () => {
    it('pads single-digit days (1..9) with leading zero (ngày 01..09)', () => {
      const date = new Date(2026, 8, 5); // 5th Sept 2026
      const formatted = formatAdministrativeDate('Hà Nội', date);
      expect(formatted).toContain('ngày 05');
    });

    it('does not pad two-digit days (10..31)', () => {
      const date = new Date(2026, 8, 29); // 29th Sept 2026
      const formatted = formatAdministrativeDate('Hà Nội', date);
      expect(formatted).toContain('ngày 29');
    });

    it('pads months 1 and 2 with leading zero (tháng 01, tháng 02)', () => {
      const jan = new Date(2026, 0, 15);
      const feb = new Date(2026, 1, 15);

      expect(formatAdministrativeDate('Hà Nội', jan)).toContain('tháng 01');
      expect(formatAdministrativeDate('Hà Nội', feb)).toContain('tháng 02');
    });

    it('does NOT pad months 3 through 12 (tháng 3 .. tháng 12)', () => {
      const mar = new Date(2026, 2, 10);
      const sep = new Date(2026, 8, 29);
      const dec = new Date(2026, 11, 25);

      expect(formatAdministrativeDate('Hà Nội', mar)).toContain('tháng 3');
      expect(formatAdministrativeDate('Hà Nội', sep)).toContain('tháng 9');
      expect(formatAdministrativeDate('Hà Nội', dec)).toContain('tháng 12');
    });

    it('supports 1-argument call defaulting place to Hà Nội', () => {
      const formatted = formatAdministrativeDate(new Date(2026, 8, 5));
      expect(formatted).toBe('Hà Nội, ngày 05 tháng 9 năm 2026');
    });

    it('supports ISO date string and slash format string inputs', () => {
      expect(formatAdministrativeDate('Quảng Ninh', '2026-01-08')).toBe(
        'Quảng Ninh, ngày 08 tháng 01 năm 2026'
      );
      expect(formatAdministrativeDate('Hải Phòng', '25/12/2026')).toBe(
        'Hải Phòng, ngày 25 tháng 12 năm 2026'
      );
    });

    it('validates calendar date validity and rejects non-existent dates', () => {
      expect(isValidCalendarDate(29, 9, 2026)).toBe(true);
      expect(isValidCalendarDate(31, 2, 2026)).toBe(false); // Feb 31 invalid
      expect(isValidCalendarDate(31, 4, 2026)).toBe(false); // April 31 invalid
      expect(isValidCalendarDate(29, 2, 2024)).toBe(true);  // Leap year Feb 29 valid
      expect(isValidCalendarDate(29, 2, 2025)).toBe(false); // Non-leap year Feb 29 invalid
    });
  });

  describe('Form Validation Engine', () => {
    it('validates document numbers conforming to regulatory pattern', () => {
      expect(validateDocumentNumber('123/QĐ-TVCI').valid).toBe(true);
      expect(validateDocumentNumber('102/TVCI-VP').valid).toBe(true);
      expect(validateDocumentNumber('01/2026/HĐKT-TVCI').valid).toBe(true);

      expect(validateDocumentNumber('').valid).toBe(false);
      expect(validateDocumentNumber('invalid number without slash').valid).toBe(false);
    });

    it('detects missing required fields and returns field-level error messages', () => {
      const schema = getFormSchema('cong_van')!;
      const emptyData = { SO_KY_HIEU: '' };

      const result = validateFormValues(schema, emptyData);
      expect(result.isValid).toBe(false);
      expect(result.errors.SO_KY_HIEU).toBeDefined();
      expect(result.errors.TRICH_YEU).toBeDefined();

      const errorMap = validateDocumentForm(schema, emptyData);
      expect(errorMap.SO_KY_HIEU).toContain('không được để trống');
    });

    it('detects invalid date range when end date precedes start date', () => {
      const schema = getFormSchema('don_nghi_phep')!;
      const invalidRangeData = {
        HO_TEN: 'Nguyễn Văn C',
        CHUC_VU: 'Kỹ sư',
        SO_NGAY_NGHI: '2 ngày',
        TU_NGAY: '2026-10-10',
        DEN_NGAY: '2026-10-05',
        LY_DO: 'Việc gia đình',
      };

      const result = validateFormValues(schema, invalidRangeData);
      expect(result.isValid).toBe(false);
      expect(result.errors.DEN_NGAY).toContain('không được trước ngày bắt đầu');
    });

    it('normalizes form values (deduplicates V/v: and trims whitespace)', () => {
      const schema = getFormSchema('cong_van')!;
      const input = {
        TRICH_YEU: 'V/v: V/v triển khai công việc',
        NOI_NHAN: ['Như trên  ', '  Lưu: VT.'],
      };

      const normalized = normalizeTemplateFormValues(schema, input);
      expect(normalized.TRICH_YEU).toBe('V/v: triển khai công việc');
      expect(normalized.NOI_NHAN).toEqual(['Như trên', 'Lưu: VT.']);
    });
  });
});
