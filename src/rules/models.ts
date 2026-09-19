export type IssueSeverity = "pass" | "warning" | "error";
export type SupportedAlignment = "Left" | "Centered" | "Right" | "Justified";
export type LineSpacingRule = "single" | "exact" | "multiple";

export interface ParagraphRules {
  fontName?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: SupportedAlignment;
  spaceBefore?: number;
  spaceAfter?: number;
  firstLineIndentMm?: number;
  lineSpacingPt?: number;
  lineSpacingRule?: LineSpacingRule;
  lineSpacingMultiple?: number;
}

export type MeasurementRule = number | { min: number; max: number; target: number };

export interface PageRules {
  paperSize?: "A4";
  orientation?: "Portrait" | "Landscape";
  topMm?: MeasurementRule;
  bottomMm?: MeasurementRule;
  leftMm?: MeasurementRule;
  rightMm?: MeasurementRule;
}

export interface PageSetupSnapshot {
  paperSize: "A4" | "Other";
  orientation: "Portrait" | "Landscape";
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

export interface DocumentRuleSet {
  id: string;
  name: string;
  body: ParagraphRules;
  page?: PageRules;
}

export interface ParagraphSnapshot {
  id: string;
  text: string;
  fontName: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment: SupportedAlignment;
  spaceBefore: number;
  spaceAfter: number;
  firstLineIndentMm?: number;
  lineSpacingPt?: number;
  lineSpacingRule?: LineSpacingRule;
  lineSpacingMultiple?: number;
}

export interface ValidationIssue {
  id: string;
  ruleId: string;
  targetId: string;
  message: string;
  severity: IssueSeverity;
  autoFixable: boolean;
  actual: string | number | boolean;
  expected: string | number | boolean;
  fixValue?: string | number | boolean;
}

export interface FormattingPatch {
  fontName?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: SupportedAlignment;
  spaceBefore?: number;
  spaceAfter?: number;
  firstLineIndentMm?: number;
  lineSpacingPt?: number;
  lineSpacingRule?: LineSpacingRule;
  lineSpacingMultiple?: number;
}

export type RuleEvaluationStatus = "PASS" | "FAIL" | "MISSING" | "NOT_APPLICABLE";

export type RuleCategory = "page" | "header" | "symbol_date" | "title" | "recipients" | "body" | "signer";

export interface RuleEvaluationResult {
  ruleId: string;
  category: RuleCategory;
  title: string;
  status: RuleEvaluationStatus;
  message?: string;
  targetId?: string;
  autoFixable?: boolean;
  actual?: string | number | boolean;
  expected?: string | number | boolean;
  fixValue?: string | number | boolean;
}

export interface DocumentEvaluationSummary {
  isBlankDocument: boolean;
  totalRules: number;
  applicableRules: number;
  passedRules: number;
  failedRules: number;
  missingRules: number;
  notApplicableRules: number;
  healthScore: number;
  results: RuleEvaluationResult[];
  issues: ValidationIssue[];
}

