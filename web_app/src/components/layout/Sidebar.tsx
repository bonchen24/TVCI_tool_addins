'use client';

import React, { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  ShieldCheck,
  LayoutTemplate,
  Sparkles,
  ChevronLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  Wrench,
  BookOpen,
  CheckCircle2,
  Search,
  X,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  HardDrive,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { ValidationIssue } from '@/rules/models';
import {
  ADMINISTRATIVE_TEMPLATES,
  searchTemplates,
  getFormSchema,
  getDefaultValuesForSchema,
  formatAdministrativeDate,
  renderTemplateToTiptapDoc,
  applyTemplateFieldsToEditor,
  type AdministrativeTemplate,
  type TemplateCategory,
  type TemplateOrganization,
  type TemplateFormValues,
  type TemplateFormValue,
} from '@/templates';
import { AiWorkspacePanel } from '@/components/ai/AiWorkspacePanel';
import { PersonalStoragePanel } from '@/components/drive/PersonalStoragePanel';
import type { ResourceEntry } from '@/drive/resources';
import { SpellcheckPanel } from '@/components/editor/SpellcheckPanel';
import type { SpellcheckIssue } from '@/spellcheck/types';

export type SidebarTab = 'audit' | 'spellcheck' | 'templates' | 'ai' | 'personal';

export interface SidebarProps {
  isOpen: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  issueCount?: number;
  healthScore?: number;
  issues?: ValidationIssue[];
  onApplySafeFix?: () => void;
  onFixIssue?: (issue: ValidationIssue) => void;
  editor?: Editor | null;
  onApplyTemplate?: (templateId: string, values: TemplateFormValues, mode: 'insert' | 'fill') => void;
  driveConnected?: boolean;
  currentDocument?: { title: string; content: unknown };
  onOpenDriveDocument?: (document: ResourceEntry) => void;
  onApplyPersonalTemplate?: (template: ResourceEntry) => void;
  selectedContextItems?: ResourceEntry[];
  onSelectedContextItemsChange?: (items: ResourceEntry[]) => void;
  selectedContext?: string;
  onRemoveSelectedContextItem?: (fileId: string) => void;
  onSelectedContextConsumed?: () => void;
  spellcheckIssues?: SpellcheckIssue[];
  selectedSpellcheckIssueId?: string | null;
  userDictionaryWords?: string[];
  spellcheckLoading?: boolean;
  spellcheckError?: string | null;
  onSelectSpellcheckIssue?: (issue: SpellcheckIssue) => void;
  onApplySpellcheckSuggestion?: (issue: SpellcheckIssue, suggestion: string) => void;
  onIgnoreSpellcheckIssue?: (issue: SpellcheckIssue) => void;
  onAddSpellcheckTerm?: (issue: SpellcheckIssue) => void;
  onRemoveSpellcheckTerm?: (term: string) => void;
}

export function resolveElementType(issue: ValidationIssue): string {
  const comp = (issue.componentType || '').toUpperCase();
  const ruleId = (issue.ruleId || '').toUpperCase();
  const msg = issue.message || '';

  if (comp === 'NATIONAL_EMBLEM' || ruleId.includes('NATIONAL_EMBLEM') || msg.includes('Quốc hiệu')) return 'Quốc hiệu';
  if (comp === 'MOTTO' || ruleId.includes('MOTTO') || msg.includes('Tiêu ngữ')) return 'Tiêu ngữ';
  if (comp === 'NUMBER_SYMBOL' || ruleId.includes('NUMBER_SYMBOL') || msg.includes('Số, ký hiệu') || msg.includes('Số ký hiệu')) return 'Số ký hiệu';
  if (comp === 'PLACE_DATE' || ruleId.includes('PLACE_DATE') || msg.includes('Địa danh')) return 'Địa danh & Ngày tháng';
  if (comp === 'DOCUMENT_TYPE' || ruleId.includes('DOCUMENT_TYPE') || msg.includes('Tên loại')) return 'Tên loại văn bản';
  if (comp === 'ABSTRACT' || ruleId.includes('ABSTRACT') || msg.includes('Trích yếu')) return 'Trích yếu';
  if (comp === 'LEGAL_BASIS' || ruleId.includes('LEGAL_BASIS') || msg.includes('Căn cứ')) return 'Căn cứ ban hành';
  if (comp === 'ADDRESSEE' || ruleId.includes('ADDRESSEE') || msg.includes('Kính gửi')) return 'Kính gửi';
  if (comp === 'RECIPIENTS' || ruleId.includes('RECIPIENTS') || msg.includes('Nơi nhận')) return 'Nơi nhận';
  if (comp === 'SIGNER_ROLE' || comp === 'SIGNER' || ruleId.includes('SIGNER') || msg.includes('người ký') || msg.includes('Chức vụ')) return 'Người ký';
  if (comp === 'PAGE' || ruleId.startsWith('PAGE.') || msg.includes('khổ giấy') || msg.includes('lề')) return 'Khổ giấy & Căn lề';
  if (comp === 'BODY' || ruleId.startsWith('BODY.') || msg.includes('nội dung')) return 'Thân bài';
  return 'Thể thức khác';
}

function getOrgBadgeClass(org: TemplateOrganization | string): string {
  switch (org) {
    case 'TVCI':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'IEMM':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'TKV':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'DANG':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function Sidebar({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  issueCount = 0,
  healthScore = 100,
  issues = [],
  onApplySafeFix,
  onFixIssue,
  editor,
  onApplyTemplate,
  driveConnected = false,
  currentDocument,
  onOpenDriveDocument,
  onApplyPersonalTemplate,
  selectedContextItems = [],
  onSelectedContextItemsChange,
  selectedContext,
  onRemoveSelectedContextItem,
  onSelectedContextConsumed,
  spellcheckIssues = [],
  selectedSpellcheckIssueId,
  userDictionaryWords = [],
  spellcheckLoading = false,
  spellcheckError,
  onSelectSpellcheckIssue,
  onApplySpellcheckSuggestion,
  onIgnoreSpellcheckIssue,
  onAddSpellcheckTerm,
  onRemoveSpellcheckTerm,
}: SidebarProps) {
  // Template tab internal state
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AdministrativeTemplate | null>(null);
  const [formValues, setFormValues] = useState<TemplateFormValues>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [aria-modal="true"]')
      ) {
        return;
      }

      if (window.matchMedia?.('(min-width: 1280px)').matches) return;
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const effectiveIssueCount = issues.length > 0 ? issues.length : issueCount;

  // Filter templates list
  const filteredTemplates = searchTemplates(templateSearch, {
    category: selectedCategory === 'all' ? undefined : (selectedCategory as TemplateCategory),
    organization: selectedOrg === 'all' ? undefined : (selectedOrg as TemplateOrganization),
  });

  const handleSelectTemplate = (template: AdministrativeTemplate) => {
    setSelectedTemplate(template);
    const defaults = getDefaultValuesForSchema(template.schemaId);
    setFormValues({
      ...defaults,
      place: template.headerSetup.defaultLocation || 'Hà Nội',
      agencyName: template.headerSetup.agencyLower,
      parentAgencyName: template.headerSetup.agencyUpper,
      SO_KY_HIEU: defaults.SO_KY_HIEU || template.headerSetup.documentSymbolPrefix.replace('Số: ', ''),
      signerRole: template.footerSetup.signerPosition,
      NGUOI_KY: template.footerSetup.signerName,
      NOI_NHAN: template.footerSetup.defaultRecipients,
    });
    setFeedback(null);
  };

  const handleFieldChange = (fieldId: string, value: TemplateFormValue) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleRepeatableChange = (fieldId: string, index: number, value: string) => {
    setFormValues((prev) => {
      const currentList: string[] = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      currentList[index] = value;
      return {
        ...prev,
        [fieldId]: currentList,
      };
    });
  };

  const handleAddRepeatableRow = (fieldId: string) => {
    setFormValues((prev) => {
      const currentList: string[] = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      currentList.push('');
      return {
        ...prev,
        [fieldId]: currentList,
      };
    });
  };

  const handleRemoveRepeatableRow = (fieldId: string, index: number) => {
    setFormValues((prev) => {
      const currentList: string[] = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      currentList.splice(index, 1);
      return {
        ...prev,
        [fieldId]: currentList,
      };
    });
  };

  // Tier 1: Insert full document template
  const handleInsertFullTemplate = () => {
    if (!selectedTemplate) return;

    try {
      const doc = renderTemplateToTiptapDoc(selectedTemplate, formValues);

      if (editor?.commands?.setContent) {
        editor.commands.setContent(doc, { emitUpdate: true });
      }

      if (onApplyTemplate) {
        onApplyTemplate(selectedTemplate.id, formValues, 'insert');
      }

      setFeedback({
        type: 'success',
        message: `Đã chèn toàn bộ biểu mẫu "${selectedTemplate.name}" thành công!`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: `Lỗi chèn biểu mẫu: ${err instanceof Error ? err.message : 'Không rõ nguyên nhân'}`,
      });
    }
  };

  // Tier 2: Dynamic field fill
  const handleFillFieldsOnly = () => {
    if (!selectedTemplate) return;

    try {
      if (editor) {
        applyTemplateFieldsToEditor(editor, formValues);
      }

      if (onApplyTemplate) {
        onApplyTemplate(selectedTemplate.id, formValues, 'fill');
      }

      setFeedback({
        type: 'success',
        message: 'Đã cập nhật các trường vào tài liệu hiện tại!',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: `Lỗi cập nhật trường: ${err instanceof Error ? err.message : 'Không rõ nguyên nhân'}`,
      });
    }
  };

  const currentSchema = selectedTemplate ? getFormSchema(selectedTemplate.schemaId) : undefined;

  const tabOrder: SidebarTab[] = ['audit', 'spellcheck', 'personal', 'templates', 'ai'];
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: SidebarTab) => {
    let nextIndex = tabOrder.indexOf(tab);

    if (event.key === 'ArrowRight') nextIndex = (nextIndex + 1) % tabOrder.length;
    else if (event.key === 'ArrowLeft') nextIndex = (nextIndex - 1 + tabOrder.length) % tabOrder.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabOrder.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabOrder[nextIndex];
    onTabChange(nextTab);
    document.getElementById(`workspace-tab-${nextTab}`)?.focus();
  };

  return (
    <>
      <button
        type="button"
        data-testid="sidebar-backdrop"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] xl:hidden"
      />
      <aside
        id="workspace-sidebar"
        aria-label="Bảng công cụ"
        className="fixed top-14 bottom-6 left-0 z-40 flex h-auto w-[min(88vw,360px)] min-w-0 shrink-0 flex-col overflow-x-hidden border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 xl:static xl:inset-auto xl:z-auto xl:h-full xl:w-[336px] xl:shadow-none"
      >
      {/* 5-Tab Header Bar */}
      <div className="flex h-12 min-w-0 shrink-0 items-center justify-between gap-1 border-b border-slate-200 bg-slate-50/70 px-2">
        <div role="tablist" aria-label="Điều hướng công cụ" className="flex min-w-0 flex-1 items-center justify-between gap-0.5">
          {/* Tab 1: Audit */}
          <button
            type="button"
            id="workspace-tab-audit"
            role="tab"
            aria-label="Chuẩn hóa"
            aria-selected={activeTab === 'audit'}
            aria-controls="workspace-panel"
            tabIndex={activeTab === 'audit' ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, 'audit')}
            onClick={() => onTabChange('audit')}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1 px-1 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
              activeTab === 'audit'
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
            <span className="min-w-0 break-words text-center leading-tight">Chuẩn hóa</span>
            {effectiveIssueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                {effectiveIssueCount}
              </span>
            )}
          </button>
          <button
            type="button"
            id="workspace-tab-spellcheck"
            role="tab"
            aria-label="Chính tả"
            aria-selected={activeTab === 'spellcheck'}
            aria-controls="workspace-panel"
            tabIndex={activeTab === 'spellcheck' ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, 'spellcheck')}
            onClick={() => onTabChange('spellcheck')}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
              activeTab === 'spellcheck' ? 'border border-slate-200/80 bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Languages className="h-3.5 w-3.5 text-primary-500" />
            <span className="min-w-0 break-words text-center leading-tight">Chính tả</span>
            {spellcheckIssues.length > 0 && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">{spellcheckIssues.length}</span>}
          </button>
          <button
            type="button"
            id="workspace-tab-personal"
            role="tab"
            aria-label="Cá nhân"
            aria-selected={activeTab === 'personal'}
            aria-controls="workspace-panel"
            tabIndex={activeTab === 'personal' ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, 'personal')}
            onClick={() => onTabChange('personal')}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
              activeTab === 'personal' ? 'border border-slate-200/80 bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <HardDrive className="h-3.5 w-3.5 text-primary-500" />
            <span className="min-w-0 break-words text-center leading-tight">Cá nhân</span>
          </button>

          {/* Tab 2: Templates */}
          <button
            type="button"
            id="workspace-tab-templates"
            role="tab"
            aria-label="Biểu mẫu"
            aria-selected={activeTab === 'templates'}
            aria-controls="workspace-panel"
            tabIndex={activeTab === 'templates' ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, 'templates')}
            onClick={() => onTabChange('templates')}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1 px-1 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
              activeTab === 'templates'
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-primary-500" />
            <span className="min-w-0 break-words text-center leading-tight">Biểu mẫu</span>
          </button>

          {/* Tab 3: AI Workspace */}
          <button
            type="button"
            id="workspace-tab-ai"
            role="tab"
            aria-label="AI Trợ lý"
            aria-selected={activeTab === 'ai'}
            aria-controls="workspace-panel"
            tabIndex={activeTab === 'ai' ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, 'ai')}
            onClick={() => onTabChange('ai')}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1 px-1 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
              activeTab === 'ai'
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span className="min-w-0 break-words text-center leading-tight">AI Trợ lý</span>
          </button>
        </div>

        {/* Close Button */}
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng bảng công cụ" title="Đóng bảng công cụ" className="shrink-0">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </Button>
      </div>

      {/* Tab Panel Content Container */}
      <div
        id="workspace-panel"
        role="tabpanel"
        aria-labelledby={`workspace-tab-${activeTab}`}
        tabIndex={0}
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 sm:p-4"
      >
        {/* ================================================================= */}
        {/* Tab 1: Audit                                                      */}
        {/* ================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <div className="text-xs text-slate-500 font-medium">Điểm chuẩn thể thức</div>
                <div className="text-2xl font-bold text-slate-900">{healthScore}%</div>
              </div>
              <Button
                variant="action"
                size="sm"
                className="gap-1.5"
                onClick={onApplySafeFix}
                disabled={effectiveIssueCount === 0}
              >
                <Wrench className="w-3.5 h-3.5" />
                Sửa an toàn
              </Button>
            </div>

            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Danh sách phát hiện ({effectiveIssueCount})
            </div>

            {effectiveIssueCount === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400 space-y-3 bg-emerald-50/40 rounded-xl border border-emerald-200/80">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">
                    Tài liệu đạt chuẩn 100% Nghị định 30/2020!
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Không phát hiện lỗi định dạng font chữ, cỡ chữ, căn lề hoặc tiêu chuẩn trình bày.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Sẵn sàng ban hành & in ấn
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {issues.length > 0 ? (
                  issues.map((iss, idx) => {
                    const isCritical = iss.severity === 'error';
                    const isMajor = iss.severity === 'warning';
                    const elemType = resolveElementType(iss);

                    return (
                      <div
                        key={iss.id || `issue-${idx}`}
                        className={cn(
                          'p-3 rounded-lg border transition-all duration-150 bg-white hover:shadow-xs space-y-2',
                          isCritical
                            ? 'border-rose-200 bg-rose-50/20'
                            : isMajor
                            ? 'border-amber-200 bg-amber-50/20'
                            : 'border-slate-200 bg-slate-50/20'
                        )}
                      >
                        {/* Header row: Severity Badge + Element Tag */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {isCritical ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Nghiêm trọng
                              </span>
                            ) : isMajor ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Cảnh báo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <Info className="w-3 h-3 text-slate-500" />
                                Nhẹ
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {elemType}
                            </span>
                          </div>

                          {iss.autoFixable && (
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Có thể tự sửa
                            </span>
                          )}
                        </div>

                        {/* Message description */}
                        <div>
                          <p className="break-words font-semibold text-slate-900 leading-snug">{iss.message}</p>
                          {(iss.actual !== undefined || iss.expected !== undefined) && (
                            <div className="mt-1 text-[11px] text-slate-500 bg-white/80 rounded px-2 py-1 border border-slate-100">
                              {iss.actual !== undefined && (
                                <div>
                                  Hiện tại: <strong className="break-words text-rose-600">{String(iss.actual)}</strong>
                                </div>
                              )}
                              {iss.expected !== undefined && (
                                <div>
                                  Quy định: <strong className="break-words text-emerald-700">{String(iss.expected)}</strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action row */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          {iss.autoFixable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onFixIssue?.(iss)}
                              className="h-6 px-2 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 gap-1"
                            >
                              <Wrench className="w-3 h-3 text-emerald-600" />
                              Sửa mục này
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Cần chỉnh sửa thủ công
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-md space-y-1">
                    <div className="flex items-center justify-between font-semibold text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Cỡ chữ chưa đúng quy định
                      </span>
                      <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900">
                        Tiêu ngữ
                      </span>
                    </div>
                    <p className="text-amber-800 text-[11px]">
                      Tiêu ngữ hiện tại là 14pt, quy định Nghị định 30 yêu cầu 13pt đứng đậm.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'spellcheck' && (
          <SpellcheckPanel
            issues={spellcheckIssues}
            userWords={userDictionaryWords}
            selectedIssueId={selectedSpellcheckIssueId}
            isLoading={spellcheckLoading}
            error={spellcheckError}
            onSelectIssue={(issue) => onSelectSpellcheckIssue?.(issue)}
            onApplySuggestion={(issue, suggestion) => onApplySpellcheckSuggestion?.(issue, suggestion)}
            onIgnoreOnce={(issue) => onIgnoreSpellcheckIssue?.(issue)}
            onAddToDictionary={(issue) => onAddSpellcheckTerm?.(issue)}
            onRemoveFromDictionary={(term) => onRemoveSpellcheckTerm?.(term)}
          />
        )}

        {/* ================================================================= */}
        {/* Tab 2: Templates                                                  */}
        {/* ================================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-3.5 text-xs">
            {/* View A: Template Catalog Browser */}
            {!selectedTemplate ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Kho biểu mẫu TVCI ({ADMINISTRATIVE_TEMPLATES.length} mẫu)
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm mẫu biểu (vd: công văn, quyết định...)"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800"
                  />
                  {templateSearch && (
                    <button
                      type="button"
                      onClick={() => setTemplateSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1 pb-1 text-[11px]">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'cong_van', label: 'Công văn' },
                    { id: 'quyet_dinh', label: 'Quyết định' },
                    { id: 'thong_bao', label: 'Thông báo' },
                    { id: 'to_trinh', label: 'Tờ trình' },
                    { id: 'bieu_mau_noi_bo', label: 'Nội bộ' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      aria-pressed={selectedCategory === cat.id}
                      className={cn(
                        'px-2 py-1 rounded whitespace-nowrap transition-colors font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        selectedCategory === cat.id
                          ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Organization Filter */}
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="text-slate-400 font-medium">Đơn vị:</span>
                  {['all', 'TVCI', 'IEMM', 'TKV', 'DANG'].map((org) => (
                    <button
                      key={org}
                      type="button"
                      onClick={() => setSelectedOrg(org)}
                      aria-pressed={selectedOrg === org}
                      className={cn(
                        'px-1.5 py-0.5 rounded font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        selectedOrg === org
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {org === 'all' ? 'Tất cả' : org}
                    </button>
                  ))}
                </div>

                {/* Template Cards List */}
                <div className="space-y-2 pt-1">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Không tìm thấy biểu mẫu phù hợp
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        data-testid={`template-card-${template.id}`}
                        onClick={() => handleSelectTemplate(template)}
                        className="min-w-0 p-3 border border-slate-200 rounded-lg hover:border-primary-400 hover:shadow-xs cursor-pointer transition-all bg-white group"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2 mb-1">
                          <span className="min-w-0 flex-1 break-words font-semibold text-xs text-slate-800 group-hover:text-primary-600 transition-colors flex items-start gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            {template.name}
                          </span>
                          <span
                            className={cn(
                              'max-w-full shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border',
                              getOrgBadgeClass(template.organization)
                            )}
                          >
                            {template.organization}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span className="min-w-0 break-words bg-slate-50 px-1 rounded">{template.vietnameseCategory}</span>
                          <span className="text-primary-600 font-medium group-hover:underline">Chọn mẫu →</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* View B: Dynamic Form Fill View */
              <div className="space-y-4">
                {/* Navigation & Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Danh sách mẫu</span>
                  </button>
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border',
                      getOrgBadgeClass(selectedTemplate.organization)
                    )}
                  >
                    {selectedTemplate.organization}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900">{selectedTemplate.name}</h4>
                  <p className="text-[10px] text-slate-500">
                    {selectedTemplate.vietnameseCategory} • {selectedTemplate.defaultProfile}
                  </p>
                </div>

                {/* Feedback Banner */}
                {feedback && (
                  <div
                    className={cn(
                      'p-2.5 rounded-lg text-xs flex items-start gap-2 border',
                      feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    )}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-snug">{feedback.message}</span>
                  </div>
                )}

                {/* Dynamic Fields Form */}
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {currentSchema?.fields.map((field) => {
                    const val = formValues[field.id] ?? '';

                    if (field.type === 'date') {
                      return (
                        <div key={field.id} className="space-y-1.5 p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                            <span>{field.label} {field.required && <span className="text-rose-500">*</span>}</span>
                            <span className="text-[10px] text-slate-400 font-normal">Nghị định 30/2020</span>
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-500">Địa danh</span>
                              <input
                                type="text"
                                value={formValues.place || 'Hà Nội'}
                                onChange={(e) => handleFieldChange('place', e.target.value)}
                                placeholder="Hà Nội"
                                className="w-full mt-0.5 px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">Ngày chọn</span>
                              <input
                                type="date"
                                value={typeof val === 'string' && val.length === 10 ? val : '2026-09-29'}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                className="w-full mt-0.5 px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                              />
                            </div>
                          </div>

                          {/* Live Date Preview */}
                          <div className="text-[11px] p-2 bg-white border border-slate-200/80 rounded text-slate-700 italic flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            <span>
                              Xem trước: <strong>{formatAdministrativeDate(typeof formValues.place === 'string' ? formValues.place : 'Hà Nội', typeof val === 'string' ? val : new Date())}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (field.type === 'textarea') {
                      return (
                        <div key={field.id} className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                            <span>{field.label} {field.required && <span className="text-rose-500">*</span>}</span>
                          </label>
                          <textarea
                            rows={3}
                            value={String(val)}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}...`}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      );
                    }

                    if (field.type === 'repeatable') {
                      const items: string[] = Array.isArray(val) ? val : [];
                      return (
                        <div key={field.id} className="space-y-1.5 p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-700">
                              {field.label} {field.required && <span className="text-rose-500">*</span>}
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddRepeatableRow(field.id)}
                              className="text-[10px] text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Thêm dòng</span>
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {items.map((rowItem, rIdx) => (
                              <div key={rIdx} className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={rowItem}
                                  onChange={(e) => handleRepeatableChange(field.id, rIdx, e.target.value)}
                                  placeholder={field.placeholder || `Dòng ${rIdx + 1}...`}
                                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRepeatableRow(field.id, rIdx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                          <span>{field.label} {field.required && <span className="text-rose-500">*</span>}</span>
                        </label>
                        <input
                          type="text"
                          value={String(val)}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}...`}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Action Controls */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <Button
                    variant="action"
                    size="sm"
                    className="w-full gap-1.5 text-xs py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                    onClick={handleInsertFullTemplate}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Chèn toàn bộ biểu mẫu (Tier 1)
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    onClick={handleFillFieldsOnly}
                  >
                    <Wrench className="w-3.5 h-3.5 text-primary-500" />
                    Điền vào tài liệu hiện tại (Tier 2)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* Tab 3: AI Workspace                                               */}
        {/* ================================================================= */}
        {activeTab === 'ai' && (
          <AiWorkspacePanel editor={editor} onApplyTemplate={onApplyTemplate} selectedContext={selectedContext} selectedContextItems={selectedContextItems} onRemoveSelectedContextItem={onRemoveSelectedContextItem} onSelectedContextConsumed={onSelectedContextConsumed} />
        )}
        {activeTab === 'personal' && (
          <PersonalStoragePanel
            driveConnected={driveConnected}
            currentDocument={currentDocument}
            onOpenDocument={onOpenDriveDocument}
            onApplyTemplate={onApplyPersonalTemplate}
            selectedContextItems={selectedContextItems}
            onSelectedContextItemsChange={onSelectedContextItemsChange}
          />
        )}
      </div>
      </aside>
    </>
  );
}
