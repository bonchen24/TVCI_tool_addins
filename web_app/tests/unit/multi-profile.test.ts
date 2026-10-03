import { describe, it, expect } from 'vitest';
import {
  RULE_PROFILES,
  getRuleProfile,
  resolveRuleProfileForOrganization,
  evaluateDocumentRules,
  getComponentRule,
  resolveAddresseeAlignment,
  type ParagraphSnapshot,
} from '@/rules';

describe('Multi-Profile Engine: NĐ 30 vs TKV vs IEMM vs Đảng', () => {
  it('registers all 4 administrative profiles', () => {
    const profileIds = RULE_PROFILES.map((p) => p.id);
    expect(profileIds).toContain('NĐ30_TVCI');
    expect(profileIds).toContain('TKV');
    expect(profileIds).toContain('IEMM');
    expect(profileIds).toContain('DANG_05_HD_VPTW_2026');
  });

  it('resolves profile aliases correctly', () => {
    expect(getRuleProfile('ND30_TVCI').id).toBe('NĐ30_TVCI');
    expect(getRuleProfile('NĐ30_TVCI').id).toBe('NĐ30_TVCI');
    expect(getRuleProfile('tvci-default').id).toBe('NĐ30_TVCI');
    expect(getRuleProfile('STRICT').id).toBe('NĐ30_TVCI');
    expect(getRuleProfile('ENTERPRISE').id).toBe('TKV');
    expect(getRuleProfile('TKV').id).toBe('TKV');
    expect(getRuleProfile('IEMM').id).toBe('IEMM');
    expect(getRuleProfile('DANG').id).toBe('DANG_05_HD_VPTW_2026');
    expect(getRuleProfile('DANG_05_HD_VPTW_2026').id).toBe('DANG_05_HD_VPTW_2026');
  });

  it('resolves organization to matching rule profile', () => {
    expect(resolveRuleProfileForOrganization('TVCI').id).toBe('NĐ30_TVCI');
    expect(resolveRuleProfileForOrganization('TKV').id).toBe('TKV');
    expect(resolveRuleProfileForOrganization('IEMM').id).toBe('IEMM');
    expect(resolveRuleProfileForOrganization('DANG').id).toBe('DANG_05_HD_VPTW_2026');
  });

  it('applies profile-specific component rules (NĐ 30 vs IEMM vs Đảng)', () => {
    // Addressee alignment
    expect(resolveAddresseeAlignment('DANG_05_HD_VPTW_2026')).toBe('Centered');
    expect(resolveAddresseeAlignment('NĐ30_TVCI', 'QUYẾT ĐỊNH')).toBe('Left');
    expect(resolveAddresseeAlignment('NĐ30_TVCI', 'CÔNG VĂN')).toBe('Centered');

    // Party Title
    const partyRule = getComponentRule('DANG_05_HD_VPTW_2026', 'PARTY_TITLE');
    expect(partyRule.bold).toBe(true);
    expect(partyRule.alignment).toBe('Centered');

    // IEMM rules
    const iemmDocTypeRule = getComponentRule('IEMM', 'DOCUMENT_TYPE');
    expect(iemmDocTypeRule.fontSize).toBe(13);
  });

  it('evaluates document dynamically switching between NĐ30 and Party profile', () => {
    const partySnapshots: ParagraphSnapshot[] = [
      {
        id: 'node-0',
        text: 'ĐẢNG BỘ TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: false,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-1',
        text: 'ĐẢNG CỘNG SẢN VIỆT NAM',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-2',
        text: 'Số: 45-QĐ/ĐU',
        fontName: 'Times New Roman',
        fontSize: 13,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-3',
        text: 'Hà Nội, ngày 29 tháng 9 năm 2026',
        fontName: 'Times New Roman',
        fontSize: 13,
        italic: true,
        alignment: 'Right',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-4',
        text: 'QUYẾT ĐỊNH',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 6,
        spaceAfter: 6,
      },
      {
        id: 'node-5',
        text: 'Về việc kết nạp đảng viên mới',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 2,
        spaceAfter: 2,
      },
      {
        id: 'node-6',
        text: 'Căn cứ Điều lệ Đảng Cộng sản Việt Nam,',
        fontName: 'Times New Roman',
        fontSize: 13,
        italic: true,
        alignment: 'Left',
        spaceBefore: 2,
        spaceAfter: 2,
      },
      {
        id: 'node-7',
        text: 'Nội dung quyết định kết nạp đồng chí theo đúng quy định của Ban Bí thư.',
        fontName: 'Times New Roman',
        fontSize: 13,
        alignment: 'Justified',
        firstLineIndentMm: 10,
        lineSpacingMultiple: 1.2,
        spaceBefore: 2,
        spaceAfter: 2,
      },
      {
        id: 'node-8',
        text: 'BÍ THƯ',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-9',
        text: 'Nguyễn Văn B',
        fontName: 'Times New Roman',
        fontSize: 13,
        bold: true,
        alignment: 'Centered',
        spaceBefore: 0,
        spaceAfter: 0,
      },
      {
        id: 'node-10',
        text: 'Nơi nhận:\n- Như trên;\n- Lưu: VT.',
        fontName: 'Times New Roman',
        fontSize: 12,
        italic: true,
        alignment: 'Left',
        spaceBefore: 0,
        spaceAfter: 0,
      },
    ];

    // Under NĐ30_TVCI: National emblem is MISSING
    const nd30Summary = evaluateDocumentRules(partySnapshots, 'NĐ30_TVCI');
    const emblemResult = nd30Summary.results.find((r) => r.ruleId === 'header.national_emblem');
    expect(emblemResult?.status).toBe('MISSING');
    const partyTitleResult1 = nd30Summary.results.find((r) => r.ruleId === 'header.party_title');
    expect(partyTitleResult1?.status).toBe('NOT_APPLICABLE');

    // Under Party 05-HD/VPTW: National emblem is NOT_APPLICABLE, Party title is PASS
    const partySummary = evaluateDocumentRules(partySnapshots, 'DANG_05_HD_VPTW_2026');
    const partyEmblemResult = partySummary.results.find((r) => r.ruleId === 'header.national_emblem');
    expect(partyEmblemResult?.status).toBe('NOT_APPLICABLE');
    const partyTitleResult2 = partySummary.results.find((r) => r.ruleId === 'header.party_title');
    expect(partyTitleResult2?.status).toBe('PASS');
    expect(partySummary.healthScore).toBeGreaterThanOrEqual(90);
  });
});
