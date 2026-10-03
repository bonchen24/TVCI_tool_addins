export type SpellcheckCategory = 'spelling' | 'presentation';

export type SpellcheckRuleId =
  | 'unknown-syllable'
  | 'contextual-phrase'
  | 'double-space'
  | 'space-before-punctuation'
  | 'missing-space-after-punctuation'
  | 'repeated-word'
  | 'sentence-capitalization';

export interface SpellcheckIssue {
  id: string;
  category: SpellcheckCategory;
  ruleId: SpellcheckRuleId;
  message: string;
  text: string;
  from: number;
  to: number;
  suggestions: string[];
}

export interface DictionaryProvider {
  has(word: string): boolean;
  suggest(word: string): string[];
}
