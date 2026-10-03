import { normalizeDictionaryTerm } from './ignore-rules';

const TVCI_TERMS = [
  'TVCI',
  'IEMM',
  'TKV',
  'Vinacomin',
  'NĐ-CP',
  'NĐ30',
  'TCVN',
  'QCVN',
  'ASTM',
  'IEC',
  'ISO',
  'kWh',
  'kVA',
  'MPa',
  'TP.HCM',
  'ĐMTS',
];

const normalizedTerms = new Set(TVCI_TERMS.map(normalizeDictionaryTerm));

export function isTvciTerm(term: string): boolean {
  return normalizedTerms.has(normalizeDictionaryTerm(term));
}

export function getTvciTerms(): readonly string[] {
  return TVCI_TERMS;
}
