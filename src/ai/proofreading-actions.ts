import type { ProofreadingIssue } from "./proofreading";

const SAFE_CATEGORIES = new Set(["spelling", "grammar", "capitalization", "punctuation"]);

export function applyProofreadingIssueToText(text: string, issue: ProofreadingIssue): string {
  if (!issue.original || issue.original === issue.suggestion) return text;
  const index = text.indexOf(issue.original);
  if (index < 0) return text;
  return `${text.slice(0, index)}${issue.suggestion}${text.slice(index + issue.original.length)}`;
}

export function applySafeProofreadingIssues(text: string, issues: ProofreadingIssue[]): string {
  return issues
    .filter((issue) => SAFE_CATEGORIES.has(issue.category))
    .reduce((current, issue) => applyProofreadingIssueToText(current, issue), text);
}

export function isSafeProofreadingIssue(issue: ProofreadingIssue): boolean {
  return SAFE_CATEGORIES.has(issue.category);
}
