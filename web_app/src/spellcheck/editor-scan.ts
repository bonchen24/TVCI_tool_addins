import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { checkText } from './engine';
import type { DictionaryProvider, SpellcheckIssue } from './types';

export function scanEditorDocument(
  document: ProseMirrorNode,
  dictionary: DictionaryProvider,
  userWords: Iterable<string> = [],
  ignoredIssueIds: ReadonlySet<string> = new Set()
): SpellcheckIssue[] {
  const findings: SpellcheckIssue[] = [];

  document.descendants((node, position) => {
    if (!node.isTextblock) return;
    const text = node.textContent;
    if (!text) return false;

    for (const issue of checkText(text, dictionary, userWords)) {
      const from = position + 1 + issue.from;
      const to = position + 1 + issue.to;
      const documentIssue = { ...issue, from, to, id: `${issue.category}:${issue.ruleId}:${from}:${to}:${issue.text}` };
      if (!ignoredIssueIds.has(documentIssue.id)) findings.push(documentIssue);
    }
    return false;
  });

  return findings.sort((left, right) => left.from - right.from || left.to - right.to);
}
