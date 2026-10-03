/**
 * Types & Interfaces for TVCI AI Workspace Subsystem
 * Strictly conforms to Nghị định 30/2020/NĐ-CP & TVCI Standards.
 */

export type AiProviderName = 'openai' | 'gemini' | 'mock';

export interface AiClientConfig {
  provider: AiProviderName;
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export type AiErrorCode =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE';

export interface NormalizedAiError {
  code: AiErrorCode;
  status: number;
  message: string;
  rawError?: unknown;
}

export class AiServiceError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;
  readonly rawError?: unknown;

  constructor(code: AiErrorCode, status: number, message: string, rawError?: unknown) {
    super(message);
    this.name = 'AiServiceError';
    this.code = code;
    this.status = status;
    this.rawError = rawError;
  }
}

// --- DRAFTING ---

export type AdministrativeDocType =
  | 'cong_van'
  | 'quyet_dinh'
  | 'to_trinh'
  | 'thong_bao'
  | 'bao_cao'
  | 'bien_ban'
  | 'ke_hoach'
  | 'hop_dong'
  | 'thu_moi'
  | 'don_nghi_phep';

export type AdministrativeSection =
  | 'mo_dau'
  | 'can_cu'
  | 'noi_dung'
  | 'dieu_khoan'
  | 'ket_luan';

export interface DraftingRequest {
  docType: AdministrativeDocType | string;
  section: AdministrativeSection | string;
  userPrompt: string;
  context?: string;
  config?: AiClientConfig;
}

export interface DraftingResult {
  content: string;
  paragraphs: string[];
  tokensUsed: number;
  model?: string;
}

// --- PROOFREADING ---

export type ProofreadCategory =
  | 'spelling'
  | 'grammar'
  | 'capitalization'
  | 'punctuation'
  | 'administrative_style';

export interface ProofreadIssue {
  category: ProofreadCategory;
  original: string;
  replacement: string;
  suggestion?: string; // alias for compatibility
  explanation: string;
  severity?: 'error' | 'warning' | 'suggestion';
  position?: number;
  endIndex?: number;
  context?: string;
}

export interface ProofreadingRequest {
  text: string;
  context?: string;
  config?: AiClientConfig;
}

export interface ProofreadingResult {
  revisedText: string;
  issues: ProofreadIssue[];
  tokensUsed?: number;
}

// --- TEMPLATE FILL ---

export interface ExtractedFieldItem {
  tag: string;
  value: string | string[] | null;
  confidence: number;
  source?: string;
  reviewed?: boolean;
}

export interface TemplateFillRequest {
  schemaId: string;
  userNotes: string;
  config?: AiClientConfig;
}

export interface TemplateFillResult {
  schemaId: string;
  fields: Record<string, string | string[]>;
  fieldDetails: ExtractedFieldItem[];
  confidence: number;
  unmappedTags?: string[];
}

// --- DIFF ENGINE ---

export interface DiffWordSpan {
  value: string;
  type: 'added' | 'removed' | 'unchanged';
  added?: boolean;
  removed?: boolean;
  groupId?: string;
}

export interface DiffChangeGroup {
  id: string;
  originalText: string;
  replacementText: string;
  type: 'addition' | 'deletion' | 'modification';
}

export type DiffDecision = 'accept' | 'reject';

export interface DiffAnalysisResult {
  originalText: string;
  updatedText: string;
  spans: DiffWordSpan[];
  groups: DiffChangeGroup[];
  hasChanges: boolean;
}
