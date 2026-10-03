'use client';

import React from 'react';
import { AlertTriangle, BookOpen, Check, X } from 'lucide-react';
import type { SpellcheckIssue } from '@/spellcheck/types';

export interface SpellcheckPanelProps {
  issues: SpellcheckIssue[];
  userWords: string[];
  selectedIssueId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onSelectIssue: (issue: SpellcheckIssue) => void;
  onApplySuggestion: (issue: SpellcheckIssue, suggestion: string) => void;
  onIgnoreOnce: (issue: SpellcheckIssue) => void;
  onAddToDictionary: (issue: SpellcheckIssue) => void;
  onRemoveFromDictionary: (term: string) => void;
}

export function SpellcheckPanel({
  issues,
  userWords,
  selectedIssueId,
  isLoading = false,
  error,
  onSelectIssue,
  onApplySuggestion,
  onIgnoreOnce,
  onAddToDictionary,
  onRemoveFromDictionary,
}: SpellcheckPanelProps) {
  const spellingIssues = issues.filter((issue) => issue.category === 'spelling');
  const presentationIssues = issues.filter((issue) => issue.category === 'presentation');

  const renderIssue = (issue: SpellcheckIssue) => (
    <article
      key={issue.id}
      data-testid={`spellcheck-issue-${issue.id}`}
      className={`rounded-lg border p-2.5 ${selectedIssueId === issue.id ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}
    >
      <button
        type="button"
        onClick={() => onSelectIssue(issue)}
        aria-label={`Chuyển đến lỗi “${issue.text}”`}
        className="block w-full break-words text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span className="block break-words text-sm font-semibold text-slate-900">{issue.text}</span>
        <span className="mt-0.5 block break-words text-xs text-slate-600">{issue.message}</span>
      </button>
      {issue.suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Gợi ý cho ${issue.text}`}>
          {issue.suggestions.map((suggestion) => {
            const suggestionLabel = /^\s+$/u.test(suggestion) ? 'Gộp khoảng trắng' : suggestion;
            return (
              <button
                type="button"
                key={suggestion}
                aria-label={`Sửa thành “${suggestionLabel}”`}
                onClick={() => onApplySuggestion(issue, suggestion)}
                className="inline-flex min-h-7 items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
              >
                <Check className="h-3 w-3" />{suggestionLabel}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onIgnoreOnce(issue)}
          className="min-h-7 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Bỏ qua một lần
        </button>
        {issue.category === 'spelling' && (
          <button
            type="button"
            onClick={() => onAddToDictionary(issue)}
            className="inline-flex min-h-7 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <BookOpen className="h-3 w-3" />Thêm vào từ điển
          </button>
        )}
      </div>
    </article>
  );

  return (
    <div className="space-y-4" aria-label="Kết quả kiểm tra chính tả">
      {error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}</div>}
      {isLoading && <p role="status" className="text-xs text-slate-500">Đang kiểm tra chính tả…</p>}
      <section aria-labelledby="spellcheck-spelling-heading" className="space-y-2.5">
        <h3 id="spellcheck-spelling-heading" className="text-xs font-bold uppercase tracking-wide text-slate-700">
          Chính tả ({spellingIssues.length})
        </h3>
        {spellingIssues.length ? <div className="space-y-2">{spellingIssues.map(renderIssue)}</div>
          : <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">Chưa phát hiện lỗi chính tả.</p>}
      </section>

      <section aria-labelledby="spellcheck-presentation-heading" className="space-y-2.5">
        <h3 id="spellcheck-presentation-heading" className="text-xs font-bold uppercase tracking-wide text-slate-700">
          Trình bày/ngữ pháp cơ bản ({presentationIssues.length})
        </h3>
        {presentationIssues.length ? <div className="space-y-2">{presentationIssues.map(renderIssue)}</div>
          : <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">Chưa phát hiện lỗi trình bày cơ bản.</p>}
      </section>

      <section aria-labelledby="spellcheck-dictionary-heading" className="space-y-2.5 border-t border-slate-200 pt-3">
        <h3 id="spellcheck-dictionary-heading" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
          <BookOpen className="h-3.5 w-3.5" />Từ điển của bạn ({userWords.length})
        </h3>
        {userWords.length ? <ul className="space-y-1">
          {userWords.map((term) => <li key={term} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
            <span className="min-w-0 break-words">{term}</span>
            <button type="button" aria-label={`Xóa ${term} khỏi từ điển`} onClick={() => onRemoveFromDictionary(term)} className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </li>)}
        </ul> : <p className="text-xs text-slate-500">Tên riêng và thuật ngữ bạn thêm sẽ được lưu cho tài khoản này.</p>}
      </section>

      {!isLoading && issues.length === 0 && <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p>Các phát hiện chỉ là gợi ý. Văn bản chỉ thay đổi khi bạn chọn một gợi ý sửa.</p>
      </div>}
    </div>
  );
}
