'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import type { Transaction } from '@tiptap/pm/state';
import type {
  ValidationIssue,
  PageSetupSnapshot,
  ParagraphSnapshot,
  DocumentEvaluationSummary,
} from '@/rules/models';
import { tiptapDocToSnapshots } from '@/editor/tiptap-adapter';
import { evaluateDocumentRules } from '@/rules';

export interface UseDocumentAuditOptions {
  editor: Editor | null;
  debounceMs?: number;
  initialProfile?: string;
  pageSetup?: PageSetupSnapshot;
}

export interface UseDocumentAuditReturn {
  healthScore: number;
  issueCount: number;
  issues: ValidationIssue[];
  summary: DocumentEvaluationSummary | null;
  activeProfile: string;
  setProfile: (profileId: string) => void;
  isAuditing: boolean;
  reevaluate: () => void;
  lastEvaluatedAt: Date | null;
}

const DEFAULT_PAGE_SETUP: PageSetupSnapshot = {
  topMarginMm: 20,
  topMm: 20,
  bottomMarginMm: 20,
  bottomMm: 20,
  leftMarginMm: 30,
  leftMm: 30,
  rightMarginMm: 15,
  rightMm: 15,
  paperSize: 'A4',
  orientation: 'Portrait',
};

export function useDocumentAudit({
  editor,
  debounceMs = 150,
  initialProfile = 'NĐ 30/2020 TVCI',
  pageSetup = DEFAULT_PAGE_SETUP,
}: UseDocumentAuditOptions): UseDocumentAuditReturn {
  const [activeProfile, setActiveProfileState] = useState<string>(initialProfile);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [summary, setSummary] = useState<DocumentEvaluationSummary | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const runEvaluation = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    try {
      setIsAuditing(true);
      const json = editor.getJSON();
      const snapshots: ParagraphSnapshot[] = tiptapDocToSnapshots(json);

      const result: DocumentEvaluationSummary = evaluateDocumentRules({
        profileId: activeProfile,
        validationScope: 'document',
        paragraphSnapshots: snapshots,
        pageSnapshot: pageSetup,
        horizontalRuleSnapshot: null,
      });

      if (isMountedRef.current) {
        setSummary(result);
        setHealthScore(result.healthScore ?? 100);
        setIssues(result.issues ?? []);
        setLastEvaluatedAt(new Date());
      }
    } catch (err) {
      console.error('[useDocumentAudit] Evaluation error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsAuditing(false);
      }
    }
  }, [editor, activeProfile, pageSetup]);

  const scheduleEvaluation = useCallback(
    (immediate = false) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (immediate) {
        runEvaluation();
      } else {
        debounceTimerRef.current = setTimeout(() => {
          runEvaluation();
        }, debounceMs);
      }
    },
    [debounceMs, runEvaluation]
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    const handleTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (transaction && transaction.docChanged) {
        scheduleEvaluation(false);
      }
    };

    editor.on('transaction', handleTransaction);
    scheduleEvaluation(true);

    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, scheduleEvaluation]);

  const setProfile = useCallback((newProfileId: string) => {
    setActiveProfileState(newProfileId);
  }, []);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      scheduleEvaluation(true);
    }
  }, [activeProfile, editor, scheduleEvaluation]);

  return {
    healthScore,
    issueCount: issues.length,
    issues,
    summary,
    activeProfile,
    setProfile,
    isAuditing,
    reevaluate: () => scheduleEvaluation(true),
    lastEvaluatedAt,
  };
}
