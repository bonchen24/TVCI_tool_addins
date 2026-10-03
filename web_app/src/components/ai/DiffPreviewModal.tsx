'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Sparkles,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  DiffAnalysisResult,
  DiffDecision,
  resolveAcceptedDiff,
  DIFF_THEME,
} from '@/ai';

export interface DiffPreviewModalProps {
  isOpen: boolean;
  diff: DiffAnalysisResult | null;
  title?: string;
  onClose: () => void;
  onApply: (acceptedText: string) => void;
}

export function DiffPreviewModal({
  isOpen,
  diff,
  title = 'Xem trước khác biệt (Visual Diff)',
  onClose,
  onApply,
}: DiffPreviewModalProps) {
  const [decisions, setDecisions] = useState<Record<string, DiffDecision>>({});

  useEffect(() => {
    if (diff) {
      // Default all groups to 'accept'
      const initial: Record<string, DiffDecision> = {};
      diff.groups.forEach((g) => {
        initial[g.id] = 'accept';
      });
      setDecisions(initial);
    }
  }, [diff]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !diff) return null;

  const handleToggleDecision = (groupId: string) => {
    setDecisions((prev) => ({
      ...prev,
      [groupId]: prev[groupId] === 'reject' ? 'accept' : 'reject',
    }));
  };

  const handleAcceptAll = () => {
    const updated: Record<string, DiffDecision> = {};
    diff.groups.forEach((g) => {
      updated[g.id] = 'accept';
    });
    setDecisions(updated);
  };

  const handleRejectAll = () => {
    const updated: Record<string, DiffDecision> = {};
    diff.groups.forEach((g) => {
      updated[g.id] = 'reject';
    });
    setDecisions(updated);
  };

  const handleConfirm = () => {
    const finalText = resolveAcceptedDiff(diff, decisions);
    onApply(finalText);
    onClose();
  };

  const resolvedPreview = resolveAcceptedDiff(diff, decisions);
  const acceptedCount = Object.values(decisions).filter((d) => d === 'accept').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-dialog-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="diff-dialog-title" className="text-base font-semibold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500">
                Phê duyệt từng thay đổi trước khi áp dụng vào tài liệu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Visual Diff Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Văn bản so sánh chi tiết
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
                  <span className="text-emerald-800 font-medium">Nội dung thêm mới</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" />
                  <span className="text-rose-800 font-medium">Nội dung lược bỏ</span>
                </span>
              </div>
            </div>

            <div
              className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 font-serif text-[14px] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto"
              data-testid="diff-preview-content"
            >
              {diff.spans.map((span, idx) => {
                if (span.added) {
                  return (
                    <span
                      key={idx}
                      className="bg-emerald-100 text-emerald-800 px-0.5 rounded font-medium"
                      style={{ backgroundColor: DIFF_THEME.addedBg, color: DIFF_THEME.addedColor }}
                    >
                      {span.value}
                    </span>
                  );
                }
                if (span.removed) {
                  return (
                    <span
                      key={idx}
                      className="bg-rose-100 text-rose-800 line-through px-0.5 rounded opacity-80"
                      style={{ backgroundColor: DIFF_THEME.removedBg, color: DIFF_THEME.removedColor }}
                    >
                      {span.value}
                    </span>
                  );
                }
                return <span key={idx} className="text-slate-800">{span.value}</span>;
              })}
            </div>
          </div>

          {/* Granular Change Cards */}
          {diff.groups.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Danh sách thay đổi ({diff.groups.length} điểm thay đổi, đã chấp nhận {acceptedCount})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAcceptAll}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Chấp nhận tất cả
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={handleRejectAll}
                    className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Từ chối tất cả
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {diff.groups.map((group) => {
                  const isAccepted = decisions[group.id] === 'accept';
                  return (
                    <div
                      key={group.id}
                      className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 text-xs ${
                        isAccepted
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-slate-50/60 opacity-70'
                      }`}
                    >
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {group.originalText && (
                          <div className="text-rose-700 line-through truncate">
                            <span className="font-semibold text-rose-800 mr-1.5">Gốc:</span>
                            {group.originalText}
                          </div>
                        )}
                        {group.replacementText && (
                          <div className="text-emerald-700 truncate">
                            <span className="font-semibold text-emerald-800 mr-1.5">Mới:</span>
                            {group.replacementText}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleDecision(group.id)}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                          isAccepted
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        data-testid={`toggle-diff-group-${group.id}`}
                      >
                        {isAccepted ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Đã nhận
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            Bỏ qua
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final Resolution Preview */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Kết quả sau khi áp dụng ({acceptedCount}/{diff.groups.length} chấp nhận):
            </span>
            <div className="text-xs text-slate-700 font-serif leading-relaxed line-clamp-3">
              {resolvedPreview || '(Văn bản rỗng)'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-600">
            Hủy bỏ
          </Button>

          <Button
            variant="action"
            size="sm"
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium shadow-sm"
            data-testid="apply-diff-button"
          >
            <Check className="w-4 h-4" />
            Áp dụng vào tài liệu
          </Button>
        </div>
      </div>
    </div>
  );
}
