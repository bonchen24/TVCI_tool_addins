import { Extension } from '@tiptap/core';
import type { DictionaryProvider, SpellcheckIssue } from '@/spellcheck/types';
import { getVietnameseDictionary } from '@/spellcheck/dictionary';
import { scanEditorDocument } from '@/spellcheck/editor-scan';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface SpellcheckControls {
  refresh: () => void;
  scanNow: () => Promise<SpellcheckIssue[]>;
}

export interface VietnameseSpellcheckOptions {
  enabled: boolean;
  debounceMs: number;
  dictionary?: DictionaryProvider;
  getDictionary: () => Promise<DictionaryProvider>;
  getUserWords: () => Iterable<string>;
  getIgnoredIssueIds: () => ReadonlySet<string>;
  onIssues?: (issues: SpellcheckIssue[]) => void;
  onError?: (error: string | null) => void;
  onIssueClick?: (issue: SpellcheckIssue) => void;
  onDocumentChange?: () => void;
  onReady?: (controls: SpellcheckControls) => void;
}

interface SpellcheckPluginState {
  issues: SpellcheckIssue[];
  decorations: DecorationSet;
}

const spellcheckPluginKey = new PluginKey<SpellcheckPluginState>('tvciVietnameseSpellcheck');

export const VietnameseSpellcheck = Extension.create<VietnameseSpellcheckOptions>({
  name: 'vietnameseSpellcheck',

  addOptions() {
    return {
      enabled: false,
      debounceMs: 350,
      getDictionary: getVietnameseDictionary,
      getUserWords: () => [],
      getIgnoredIssueIds: () => new Set<string>(),
      onIssues: undefined,
      onError: undefined,
      onIssueClick: undefined,
      onDocumentChange: undefined,
      onReady: undefined,
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.enabled) return [];
    const options = this.options;

    return [new Plugin<SpellcheckPluginState>({
      key: spellcheckPluginKey,
      state: {
        init: () => ({ issues: [], decorations: DecorationSet.empty }),
        apply: (transaction, previous, _oldState, newState) => {
          if (transaction.docChanged) return { issues: [], decorations: DecorationSet.empty };
          const updatedIssues = transaction.getMeta(spellcheckPluginKey) as SpellcheckIssue[] | undefined;
          if (updatedIssues) {
            const decorations = updatedIssues.map((issue) => Decoration.inline(issue.from, issue.to, {
              class: 'spellcheck-issue',
              'data-spellcheck-id': issue.id,
              'data-spellcheck-category': issue.category,
              'aria-label': issue.message,
            }, { inclusiveStart: false, inclusiveEnd: false }));
            return { issues: updatedIssues, decorations: DecorationSet.create(newState.doc, decorations) };
          }
          return previous;
        },
      },
      props: {
        attributes: { spellcheck: 'false' },
        decorations: (state) => spellcheckPluginKey.getState(state)?.decorations ?? DecorationSet.empty,
        handleDOMEvents: {
          click: (view, event) => handleIssueEvent(view.state, event, options, false),
          contextmenu: (view, event) => handleIssueEvent(view.state, event, options, true),
        },
      },
      view: (initialView) => {
        let view = initialView;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let destroyed = false;

        const scanNow = async (): Promise<SpellcheckIssue[]> => {
          if (timer !== undefined) clearTimeout(timer);
          timer = undefined;
          try {
            const dictionary = options.dictionary ?? await options.getDictionary();
            if (destroyed) return [];
            const sourceDocument = view.state.doc;
            const issues = scanEditorDocument(
              sourceDocument,
              dictionary,
              options.getUserWords(),
              options.getIgnoredIssueIds()
            );
            view.dispatch(view.state.tr.setMeta(spellcheckPluginKey, issues));
            options.onIssues?.(issues);
            options.onError?.(null);
            return issues;
          } catch (error) {
            if (destroyed) return [];
            const message = error instanceof Error ? error.message : 'Không tải được từ điển chính tả.';
            view.dispatch(view.state.tr.setMeta(spellcheckPluginKey, []));
            options.onIssues?.([]);
            options.onError?.(message);
            return [];
          }
        };

        const refresh = () => {
          if (destroyed) return;
          if (timer !== undefined) clearTimeout(timer);
          timer = setTimeout(() => { void scanNow(); }, options.debounceMs);
        };

        options.onReady?.({ refresh, scanNow });
        refresh();

        return {
          update(updatedView, previousState) {
            view = updatedView;
            if (!previousState.doc.eq(updatedView.state.doc)) {
              options.onDocumentChange?.();
              options.onIssues?.([]);
              options.onError?.(null);
              refresh();
            }
          },
          destroy() {
            destroyed = true;
            if (timer !== undefined) clearTimeout(timer);
          },
        };
      },
    })];
  },
});

function handleIssueEvent(
  state: Parameters<typeof spellcheckPluginKey.getState>[0],
  event: Event,
  options: VietnameseSpellcheckOptions,
  preventDefault: boolean
): boolean {
  const target = event.target as Element | null;
  const element = target?.closest?.('[data-spellcheck-id]') ?? target?.parentElement?.closest('[data-spellcheck-id]');
  const issueId = element?.getAttribute('data-spellcheck-id');
  if (!issueId) return false;
  const issue = spellcheckPluginKey.getState(state)?.issues.find((finding) => finding.id === issueId);
  if (!issue) return false;
  options.onIssueClick?.(issue);
  if (preventDefault) event.preventDefault();
  return preventDefault;
}
