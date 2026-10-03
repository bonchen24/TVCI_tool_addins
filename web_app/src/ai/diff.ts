/**
 * Visual Diff Engine for TVCI AI Workspace
 * Computes word-level diffs using 'diff' package, groups changes, and manages Accept/Reject resolution.
 */

import { diffWordsWithSpace, Change } from 'diff';
import {
  DiffWordSpan,
  DiffChangeGroup,
  DiffDecision,
  DiffAnalysisResult,
} from './types';

export const DIFF_THEME = {
  addedBg: '#D1FAE5', // Emerald-100
  addedColor: '#065F46', // Emerald-800
  addedToken: '#10B981', // Emerald-500
  removedBg: '#FEE2E2', // Rose-100
  removedColor: '#991B1B', // Rose-800
  removedToken: '#EF4444', // Rose-500
};

/**
 * Calculates word-level diff spans between original and updated text.
 * Strictly conforms to F22 contract:
 * - If original === updated: returns 1 unchanged span with added: undefined, removed: undefined.
 */
export function calculateWordDiff(original: string, updated: string): DiffWordSpan[] {
  if (original === updated) {
    return [{ value: original, type: 'unchanged' }];
  }

  const rawChanges: Change[] = diffWordsWithSpace(original, updated);
  const spans: DiffWordSpan[] = [];

  let currentGroupId = 0;
  let inChangeSequence = false;

  for (let i = 0; i < rawChanges.length; i++) {
    const change = rawChanges[i];

    if (change.added || change.removed) {
      if (!inChangeSequence) {
        currentGroupId++;
        inChangeSequence = true;
      }
      spans.push({
        value: change.value,
        type: change.added ? 'added' : 'removed',
        added: change.added,
        removed: change.removed,
        groupId: `group-${currentGroupId}`,
      });
    } else {
      // Check if this unchanged block is just intra-word whitespace between changes
      const isWhitespace = /^\s+$/.test(change.value);
      const nextIsChange =
        i + 1 < rawChanges.length && (rawChanges[i + 1].added || rawChanges[i + 1].removed);

      if (inChangeSequence && isWhitespace && nextIsChange) {
        // Keep in same change sequence across inter-word space
        spans.push({
          value: change.value,
          type: 'unchanged',
        });
      } else {
        inChangeSequence = false;
        spans.push({
          value: change.value,
          type: 'unchanged',
        });
      }
    }
  }

  return spans;
}

/**
 * Generates structured DiffAnalysisResult with grouped changes for granular Accept/Reject
 */
export function generateAiDiff(original: string, updated: string): DiffAnalysisResult {
  const spans = calculateWordDiff(original, updated);
  const groupMap = new Map<string, { orig: string[]; rep: string[] }>();

  for (const span of spans) {
    if (span.groupId) {
      if (!groupMap.has(span.groupId)) {
        groupMap.set(span.groupId, { orig: [], rep: [] });
      }
      const entry = groupMap.get(span.groupId)!;
      if (span.removed) {
        entry.orig.push(span.value);
      } else if (span.added) {
        entry.rep.push(span.value);
      }
    }
  }

  const groups: DiffChangeGroup[] = [];
  for (const [id, val] of groupMap.entries()) {
    const origText = val.orig.join('');
    const repText = val.rep.join('');

    let type: 'addition' | 'deletion' | 'modification' = 'modification';
    if (!origText && repText) type = 'addition';
    else if (origText && !repText) type = 'deletion';

    groups.push({
      id,
      originalText: origText,
      replacementText: repText,
      type,
    });
  }

  return {
    originalText: original,
    updatedText: updated,
    spans,
    groups,
    hasChanges: original !== updated,
  };
}

/**
 * Resolves final text given user decisions ('accept' | 'reject') for each change group.
 * Default decision if unchosen is 'accept'.
 */
export function resolveAcceptedDiff(
  diff: DiffAnalysisResult,
  decisions: Record<string, DiffDecision> = {}
): string {
  let result = '';

  // Process span by span
  // If groupId is present:
  // - If decision is 'reject', include only 'removed' spans for that group, discard 'added' spans.
  // - If decision is 'accept' (or unspecified default), include only 'added' spans, discard 'removed' spans.
  for (const span of diff.spans) {
    if (!span.groupId) {
      result += span.value;
      continue;
    }

    const decision = decisions[span.groupId] || 'accept';
    if (decision === 'accept') {
      if (span.added) {
        result += span.value;
      }
    } else {
      // reject: keep original (removed text)
      if (span.removed) {
        result += span.value;
      }
    }
  }

  return result;
}

/**
 * Extracts selected text from a Tiptap editor instance
 */
interface DiffEditor {
  state?: {
    selection?: { from: number; to: number };
    doc?: { content?: { size: number }; textBetween?: (from: number, to: number, separator: string) => string };
  };
  chain?: () => {
    focus(): DiffEditorChain;
  };
}

interface DiffEditorChain {
  deleteRange(range: { from: number; to: number }): DiffEditorChain;
  insertContent(content: string): DiffEditorChain;
  run(): boolean;
}

export function getEditorSelectedText(editor: DiffEditor | null | undefined): string {
  if (!editor?.state?.selection || !editor.state.doc?.textBetween) return '';
  const { from, to } = editor.state.selection;
  if (from === to) return '';
  return editor.state.doc.textBetween(from, to, '\n');
}

/**
 * Extracts full plain text from a Tiptap editor instance
 */
export function getEditorFullText(editor: DiffEditor | null | undefined): string {
  if (!editor?.state?.doc?.textBetween) return '';
  return editor.state.doc.textBetween(0, editor.state.doc.content?.size ?? 0, '\n');
}

export interface ApplyAiDiffOptions {
  isFullDocument?: boolean;
  range?: { from: number; to: number };
}

/**
 * Applies accepted text to replace editor selection or full document
 */
export function applyAiDiffToSelection(
  editor: DiffEditor | null | undefined,
  acceptedText: string,
  options?: ApplyAiDiffOptions
): void {
  if (!editor?.chain) return;
  const chain = editor.chain();

  if (options?.range && options.range.from !== options.range.to) {
    chain.focus().deleteRange(options.range).insertContent(acceptedText).run();
    return;
  }

  const { from, to } = editor.state?.selection || { from: 0, to: 0 };
  const isCollapsed = from === to;
  const shouldReplaceFull = options?.isFullDocument ?? isCollapsed;

  if (shouldReplaceFull) {
    const docSize = editor.state?.doc?.content?.size || 0;
    if (docSize > 0) {
      chain.focus().deleteRange({ from: 0, to: docSize }).insertContent(acceptedText).run();
    } else {
      chain.focus().insertContent(acceptedText).run();
    }
  } else if (!isCollapsed) {
    chain.focus().deleteRange({ from, to }).insertContent(acceptedText).run();
  } else {
    chain.focus().insertContent(acceptedText).run();
  }
}
