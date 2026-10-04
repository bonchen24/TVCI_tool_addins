/**
 * Type definitions for TVCI Administrative Template Library
 * Strictly conforms to Nghị định 30/2020/NĐ-CP & Enterprise Profiles (TVCI, IEMM, TKV, DANG).
 */

import type { JSONContent } from '@tiptap/core';

export type TemplateCategory =
  | 'cong_van'
  | 'quyet_dinh'
  | 'thong_bao'
  | 'to_trinh'
  | 'bieu_mau_noi_bo';

export type TemplateOrganization = 'TVCI' | 'IEMM' | 'TKV' | 'DANG';

export type AdministrativeProfile =
  | 'ND30_TVCI'
  | 'TKV'
  | 'IEMM'
  | 'DANG_05_HD_VPTW_2026';

export type TemplateFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'repeatable';

export type TemplateInjectionMode = 'tier1_full' | 'tier2_fill' | 'insert' | 'fill';

export type TemplateVerificationStatus = 'verified' | 'unverified' | 'quarantined';

export interface AdministrativeTemplateVerification {
  status: TemplateVerificationStatus;
  reason: string;
  canonicalSource: {
    kind: 'official-canonical-docx';
    name: string;
    path: string;
    id?: string;
    version?: string;
    effectiveDate?: string;
    sha256: string;
  } | {
    kind: 'generated-canonical';
    name: string;
    path: string;
    sha256: string;
    version?: string;
    ruleSpecVersion: string;
    generatorVersion: string;
    generatorSha256: string;
    normativeSources: Array<{ label: string; id: string }>;
    referenceSources: string[];
    structuralQa: { status: 'passed' | 'failed' | 'unverified'; reportPath: string; sha256: string };
    visualQa: { status: 'passed' | 'failed' | 'unverified'; renderer?: string; reportPath: string; sha256: string };
  } | null;
  runtime: {
    path: string;
    sha256: string | null;
    derivedFromCanonicalSha256?: string;
    comparison?: 'byte-exact' | 'content-controls-only';
  };
}

export interface TemplateFieldOption {
  value: string;
  label: string;
}

export interface TemplateField {
  id: string; // "SO_KY_HIEU", "NGAY_BAN_HANH", "TRICH_YEU"...
  label: string;
  type: TemplateFieldType;
  required?: boolean;
  defaultValue?: string | string[];
  placeholder?: string;
  helpText?: string;
  options?: string[] | TemplateFieldOption[];
  tag?: string;
  aliases?: string[];
  wordTarget?: 'content-control' | 'selection' | 'manual';
  validationType?: 'documentNumber' | 'date' | 'regex';
  validationRegex?: RegExp | string;
}

/** Alias for FormSchemaField requirement */
export type FormSchemaField = TemplateField;
export type FormFieldDefinition = TemplateField;
export type FormFieldOption = TemplateFieldOption;

export interface DocumentTypeSchema {
  id: string; // "cong_van" | "quyet_dinh" | "thong_bao" | "to_trinh" | "bao_cao" | "bien_ban" | "thu_moi" | "don_nghi_phep"
  name: string;
  category: 'hanh_chinh' | 'dang' | 'noi_bo';
  defaultProfile: AdministrativeProfile;
  description?: string;
  fields: TemplateField[];
  aliases?: string[];
}

export type DocumentFormSchema = DocumentTypeSchema;

export interface TwoColumnHeaderConfig {
  agencyUpper: string;       // e.g. "TẬP ĐOÀN CÔNG NGHIỆP THAN - KHOÁNG SẢN VIỆT NAM"
  agencyLower: string;       // e.g. "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"
  agencyDepartment?: string; // e.g. "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP"
  documentSymbolPrefix: string; // e.g. "Số: …/VCNM-TTTN"
  mottoUpper: string;        // "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
  mottoLower: string;        // "Độc lập - Tự do - Hạnh phúc"
  defaultLocation: string;   // e.g. "Hà Nội"
}

export interface TwoColumnFooterConfig {
  recipientsTitle: string;     // "Nơi nhận:"
  defaultRecipients: string[]; // ["- Như trên;", "- Lưu: VT..."]
  signerPosition: string;      // e.g. "GIÁM ĐỐC" | "VIỆN TRƯỞNG"
  signerName: string;          // e.g. "Nguyễn Văn An"
}

export interface AdministrativeTemplate {
  id: string;                  // e.g. "tvci-cv", "iemm-01"
  name: string;                // Vietnamese display title
  title: string;               // Compatible alias with tests (f13_template_catalog)
  category: TemplateCategory;
  vietnameseCategory: string;  // e.g. "Công văn", "Quyết định", "Tờ trình"...
  organization: TemplateOrganization;
  fileName: string;            // Physical .docx template asset filename
  description: string;
  schemaId: string;            // ID in canonical schemas registry
  defaultProfile: AdministrativeProfile;
  keywords: string[];
  headerSetup: TwoColumnHeaderConfig;
  footerSetup: TwoColumnFooterConfig;
  initialBodyParagraphs: string[];
  initialContent?: JSONContent;
  version: string;
  status: 'active' | 'draft' | 'archived';
  verification: AdministrativeTemplateVerification;
}

export interface TemplateEngineResult {
  success: boolean;
  document?: JSONContent;
  error?: string;
  appliedFieldCount?: number;
}

export interface DynamicFillReport {
  updatedFields: string[];
  replacedPlaceholders: number;
  unfilledPlaceholders: string[];
}

export type TemplateFormValue = string | string[] | null | undefined;
export type TemplateFormValues = Record<string, TemplateFormValue>;
