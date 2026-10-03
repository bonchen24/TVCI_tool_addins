export type IssueSeverity = 'pass' | 'warning' | 'error' | 'info';
export type SupportedAlignment = 'Left' | 'Centered' | 'Right' | 'Justified';
export type LineSpacingRule = 'single' | 'exact' | 'multiple' | 'exactly' | 'atLeast';

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
  paperSize?: 'A4' | string;
  orientation?: 'Portrait' | 'Landscape' | 'portrait' | 'landscape';
  topMm?: MeasurementRule;
  bottomMm?: MeasurementRule;
  leftMm?: MeasurementRule;
  rightMm?: MeasurementRule;
}

export interface PageSetupSnapshot {
  paperSize?: 'A4' | 'Other' | string;
  orientation?: 'Portrait' | 'Landscape' | 'portrait' | 'landscape';
  topMm?: number;
  topMarginMm?: number;
  bottomMm?: number;
  bottomMarginMm?: number;
  leftMm?: number;
  leftMarginMm?: number;
  rightMm?: number;
  rightMarginMm?: number;
}

export interface DocumentRuleSet {
  id: string;
  name: string;
  body: ParagraphRules;
  page?: PageRules;
}

export interface ParagraphSnapshot {
  id: string;
  index?: number;
  text: string;
  fontName: string;
  fontSize: number;
  fontSizePt?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment: SupportedAlignment;
  spaceBefore: number;
  spaceBeforePt?: number;
  spaceAfter: number;
  spaceAfterPt?: number;
  firstLineIndentMm?: number;
  lineSpacingPt?: number;
  lineSpacingRule?: LineSpacingRule;
  lineSpacingMultiple?: number;
  context?: string;
  componentType?: string;
  leftIndentMm?: number;
  rightIndentMm?: number;
}

export type RuleEvaluationStatus = 'PASS' | 'FAIL' | 'MISSING' | 'NOT_APPLICABLE';

export type RuleCategory = 'page' | 'header' | 'symbol_date' | 'title' | 'recipients' | 'body' | 'signer';

export interface ValidationIssue {
  id: string;
  ruleId: string;
  targetId: string;
  paragraphIndex?: number;
  category?: RuleCategory;
  componentType?: string;
  message: string;
  severity: IssueSeverity;
  status?: RuleEvaluationStatus;
  autoFixable: boolean;
  actual: string | number | boolean;
  expected: string | number | boolean;
  fixValue?: string | number | boolean;
}

export interface FormattingPatch {
  paragraphIndex?: number;
  fontName?: string;
  fontSize?: number;
  fontSizePt?: number;
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
  textReplacement?: string;
  pageMargins?: {
    topMm: number;
    bottomMarginMm?: number;
    bottomMm: number;
    leftMarginMm?: number;
    leftMm: number;
    rightMarginMm?: number;
    rightMm: number;
  };
}

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
