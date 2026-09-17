import type { DocumentRuleSet, PageRules } from './models';
import type { TemplateOrganization } from '../templates/library';

export type RuleProfileId = 'NĐ30_TVCI' | 'TKV' | 'IEMM' | 'DANG_05_HD_VPTW_2026';

export interface RuleProfile extends DocumentRuleSet {
  id: RuleProfileId;
  description: string;
  sourceLabel: string;
  page?: PageRules;
}

const COMMON_BODY = {
  fontName: 'Times New Roman',
  alignment: 'Justified' as const,
  spaceBefore: 2,
  spaceAfter: 2,
  firstLineIndentMm: 10,
  lineSpacingPt: 15.6,
  lineSpacingRule: 'multiple' as const,
  lineSpacingMultiple: 1.2,
};

export const RULE_PROFILES: RuleProfile[] = [
  {
    id: 'NĐ30_TVCI',
    name: 'NĐ30 / Trung tâm Thử nghiệm - Kiểm định Công nghiệp',
    description: 'Quy cách hành chính dùng làm chuẩn mặc định cho Trung tâm Thử nghiệm - Kiểm định Công nghiệp.',
    sourceLabel: 'Nghị định 30/2020/NĐ-CP',
    body: { ...COMMON_BODY, fontSize: 13 },
    page: { paperSize: 'A4', orientation: 'Portrait', topMm: 20, bottomMm: 20, leftMm: 30, rightMm: 15 },
  },
  {
    id: 'TKV',
    name: 'TKV',
    description: 'Bộ quy tắc TKV, tách riêng để có thể điều chỉnh theo quy định nội bộ.',
    sourceLabel: 'Quy định TKV (cấu hình nội bộ)',
    body: { ...COMMON_BODY, fontSize: 13 },
    page: { paperSize: 'A4', orientation: 'Portrait', topMm: 20, bottomMm: 20, leftMm: 30, rightMm: 15 },
  },
  {
    id: 'IEMM',
    name: 'Viện Cơ khí Năng lượng và Mỏ - Vinacomin',
    description: 'Bộ quy tắc của Viện Cơ khí Năng lượng và Mỏ - Vinacomin theo quy chế văn thư và Phụ lục IV về mẫu chữ.',
    sourceLabel: 'Quy chế văn thư Viện Cơ khí Năng lượng và Mỏ - Vinacomin · Phụ lục IV (mẫu chữ và chi tiết trình bày)',
    body: { ...COMMON_BODY, fontSize: 13 },
    page: { paperSize: 'A4', orientation: 'Portrait', topMm: 20, bottomMm: 20, leftMm: 30, rightMm: 15 },
  },
  {
    id: 'DANG_05_HD_VPTW_2026',
    name: 'Văn bản Đảng 05-HD/VPTW',
    description: 'Quy cách văn bản Đảng theo Hướng dẫn 05-HD/VPTW ngày 27/05/2026.',
    sourceLabel: '05-HD/VPTW (27/05/2026)',
    body: { ...COMMON_BODY, fontSize: 13 },
    page: { paperSize: 'A4', orientation: 'Portrait', topMm: 20, bottomMm: 20, leftMm: 30, rightMm: 15 },
  },
];

export const ACTIVE_RULE_PROFILES: RuleProfile[] = RULE_PROFILES.filter((profile) =>
  profile.id === 'IEMM' || profile.id === 'DANG_05_HD_VPTW_2026'
);

export function getRuleProfile(id: RuleProfileId): RuleProfile {
  const profile = RULE_PROFILES.find((item) => item.id === id);
  if (!profile) throw new Error(`Không tìm thấy bộ quy tắc ${id}.`);
  return profile;
}

export function resolveRuleProfileForOrganization(organization: TemplateOrganization): RuleProfile {
  if (organization === 'DANG') return getRuleProfile('DANG_05_HD_VPTW_2026');
  if (organization === 'TKV') return getRuleProfile('TKV');
  return getRuleProfile('IEMM');
}

