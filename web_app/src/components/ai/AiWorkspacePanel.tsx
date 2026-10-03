'use client';

import React, { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Sparkles,
  FileText,
  SpellCheck,
  FormInput,
  Key,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  AiProviderName,
  AiClientConfig,
  AdministrativeDocType,
  AdministrativeSection,
  ProofreadingResult,
  TemplateFillResult,
  DiffAnalysisResult,
  generateAiDiff,
  getEditorSelectedText,
  getEditorFullText,
  applyAiDiffToSelection,
} from '@/ai';
import {
  ALL_SCHEMAS,
  ADMINISTRATIVE_TEMPLATES,
  isOfficialTemplateVerified,
  requireVerifiedTemplate,
  renderTemplateToTiptapDoc,
  applyTemplateFieldsToEditor,
} from '@/templates';
import { DiffPreviewModal } from './DiffPreviewModal';
import { combineSelectedContext } from '@/ai/context';
import type { ResourceEntry } from '@/drive/resources';
import type { TemplateFormValues } from '@/templates/types';

export interface AiWorkspacePanelProps {
  editor?: Editor | null;
  onApplyTemplate?: (templateId: string, values: TemplateFormValues, mode: 'insert' | 'fill') => void;
  selectedContext?: string;
  selectedContextItems?: ResourceEntry[];
  onRemoveSelectedContextItem?: (fileId: string) => void;
  onSelectedContextConsumed?: () => void;
}

type AiSubsystemTab = 'drafting' | 'proofreading' | 'template_fill';
const AI_SUBSYSTEM_TABS: AiSubsystemTab[] = ['drafting', 'proofreading', 'template_fill'];

export function AiWorkspacePanel({ editor, onApplyTemplate, selectedContext, selectedContextItems = [], onRemoveSelectedContextItem, onSelectedContextConsumed }: AiWorkspacePanelProps) {
  // Active Subsystem Tab
  const [subTab, setSubTab] = useState<AiSubsystemTab>('drafting');
  const handleSubTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: AiSubsystemTab) => {
    let nextIndex = AI_SUBSYSTEM_TABS.indexOf(tab);

    if (event.key === 'ArrowRight') nextIndex = (nextIndex + 1) % AI_SUBSYSTEM_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (nextIndex - 1 + AI_SUBSYSTEM_TABS.length) % AI_SUBSYSTEM_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = AI_SUBSYSTEM_TABS.length - 1;
    else return;

    event.preventDefault();
    const nextTab = AI_SUBSYSTEM_TABS[nextIndex];
    setSubTab(nextTab);
    setErrorMessage(null);
    document.getElementById(`ai-tab-${nextTab}`)?.focus();
  };

  // Settings State
  const [provider, setProvider] = useState<AiProviderName>('mock');
  const [apiKey, setApiKey] = useState<string>('mock');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Common UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templateFillSuccessMsg, setTemplateFillSuccessMsg] = useState<string | null>(null);

  // Diff Modal State
  const [activeDiff, setActiveDiff] = useState<DiffAnalysisResult | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [diffTitle, setDiffTitle] = useState<string>('Xem trước khác biệt');
  const [diffContext, setDiffContext] = useState<{
    source: 'drafting' | 'proofreading';
    isFullDocument: boolean;
    range?: { from: number; to: number } | null;
  }>({ source: 'drafting', isFullDocument: false });

  // --- 1. DRAFTING STATE ---
  const [docType, setDocType] = useState<AdministrativeDocType>('cong_van');
  const [section, setSection] = useState<AdministrativeSection>('noi_dung');
  const [draftPrompt, setDraftPrompt] = useState<string>('');
  const [draftContext, setDraftContext] = useState<string>('');

  // --- 2. PROOFREADING STATE ---
  const [proofreadText, setProofreadText] = useState<string>('');
  const [proofreadResult, setProofreadResult] = useState<ProofreadingResult | null>(null);
  const [proofreadRange, setProofreadRange] = useState<{ from: number; to: number } | null>(null);

  // --- 3. TEMPLATE FILL STATE ---
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('cong_van');
  const canApplySelectedTemplate = ADMINISTRATIVE_TEMPLATES.some(
    (template) => template.schemaId === selectedSchemaId && isOfficialTemplateVerified(template)
  );
  const [userNotes, setUserNotes] = useState<string>('');
  const [templateFillResult, setTemplateFillResult] = useState<TemplateFillResult | null>(null);

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem('tvci_ai_provider') as AiProviderName;
      const savedKey = localStorage.getItem('tvci_ai_key');
      if (savedProvider) setProvider(savedProvider);
      if (savedKey) setApiKey(savedKey);
    } catch {
      // LocalStorage not available
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('tvci_ai_provider', provider);
      localStorage.setItem('tvci_ai_key', apiKey);
    } catch {
      // Ignore
    }
    setShowSettings(false);
  };

  const getClientConfig = (): AiClientConfig => ({
    provider,
    apiKey: apiKey.trim() || 'mock',
  });

  // --- DRAFTING SUBMISSION ---
  const handleRunDrafting = async () => {
    setErrorMessage(null);
    if (!draftPrompt.trim()) {
      setErrorMessage('Vui lòng nhập yêu cầu nội dung cần soạn thảo.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          section,
          userPrompt: draftPrompt,
          context: combineSelectedContext(draftContext, selectedContext),
          config: getClientConfig(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Soạn thảo thất bại');
      }

      if (selectedContext) onSelectedContextConsumed?.();

      // Generate diff against current editor selection
      const currentSelected = editor ? getEditorSelectedText(editor) : '';
      const { from, to } = editor?.state?.selection || { from: 0, to: 0 };
      const hasSelection = from !== to;
      const diff = generateAiDiff(currentSelected, data.content);
      setActiveDiff(diff);
      setDiffContext({
        source: 'drafting',
        isFullDocument: false,
        range: hasSelection ? { from, to } : null,
      });
      setDiffTitle(`Xem trước soạn thảo: ${docType} (${section})`);
      setIsDiffModalOpen(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi kết nối dịch vụ AI');
    } finally {
      setLoading(false);
    }
  };

  // --- PROOFREADING SUBMISSION ---
  const handleGrabEditorSelection = () => {
    if (!editor) return;
    const selected = getEditorSelectedText(editor);
    if (selected) {
      setProofreadText(selected);
      const { from, to } = editor.state?.selection || { from: 0, to: 0 };
      setProofreadRange({ from, to });
    } else {
      const full = getEditorFullText(editor);
      setProofreadText(full);
      setProofreadRange(null);
    }
  };

  const handleRunProofreading = async () => {
    setErrorMessage(null);
    if (!proofreadText.trim()) {
      setErrorMessage('Vui lòng nhập hoặc lấy văn bản cần soát lỗi.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: proofreadText,
          context: selectedContext,
          config: getClientConfig(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Soát lỗi thất bại');
      }

      if (selectedContext) onSelectedContextConsumed?.();
      setProofreadResult(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi kết nối dịch vụ soát lỗi AI');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProofreadDiff = () => {
    if (!proofreadResult) return;
    const diff = generateAiDiff(proofreadText, proofreadResult.revisedText);
    setActiveDiff(diff);
    setDiffContext({
      source: 'proofreading',
      isFullDocument: !proofreadRange,
      range: proofreadRange,
    });
    setDiffTitle('Xem trước chuẩn hóa & Soát lỗi câu từ');
    setIsDiffModalOpen(true);
  };

  // --- TEMPLATE FILL SUBMISSION ---
  const handleRunTemplateFill = async () => {
    setErrorMessage(null);
    setTemplateFillSuccessMsg(null);
    if (!userNotes.trim()) {
      setErrorMessage('Vui lòng nhập ghi chú hoặc nội dung thô để trích xuất.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/template-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaId: selectedSchemaId,
          userNotes: combineSelectedContext(userNotes, selectedContext) || userNotes,
          config: getClientConfig(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Trích xuất biểu mẫu thất bại');
      }

      if (selectedContext) onSelectedContextConsumed?.();
      setTemplateFillResult(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi kết nối dịch vụ trích xuất mẫu AI');
    } finally {
      setLoading(false);
    }
  };

  // Callback when user accepts diff in modal
  const handleApplyDiffToEditor = (acceptedText: string) => {
    if (editor) {
      applyAiDiffToSelection(editor, acceptedText, {
        isFullDocument: diffContext.isFullDocument,
        range: diffContext.range || undefined,
      });
    }
  };

  // Action: Apply extracted template fields to editor
  const handleApplyTemplateFill = () => {
    if (!editor || !templateFillResult) {
      if (!editor) setErrorMessage('Không tìm thấy trình soạn thảo văn bản.');
      return;
    }
    setErrorMessage(null);
    setTemplateFillSuccessMsg(null);

    try {
      requireVerifiedTemplate(selectedSchemaId);
      const report = applyTemplateFieldsToEditor(editor, templateFillResult.fields);
      if (report.replacedPlaceholders > 0 || report.updatedFields.length > 0) {
        setTemplateFillSuccessMsg(`Đã cập nhật ${report.updatedFields.length} trường vào tài liệu!`);
      } else {
        const fullDoc = renderTemplateToTiptapDoc(selectedSchemaId, templateFillResult.fields);
        if (editor.commands?.setContent) {
          editor.commands.setContent(fullDoc, { emitUpdate: true });
          setTemplateFillSuccessMsg('Đã tạo và chèn biểu mẫu hoàn chỉnh vào tài liệu!');
        }
      }
      if (onApplyTemplate) {
        onApplyTemplate(selectedSchemaId, templateFillResult.fields, 'fill');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi áp dụng biểu mẫu vào tài liệu');
    }
  };

  // Action: Insert full newly rendered template doc
  const handleInsertFullTemplateDoc = () => {
    if (!editor || !templateFillResult) {
      if (!editor) setErrorMessage('Không tìm thấy trình soạn thảo văn bản.');
      return;
    }
    setErrorMessage(null);
    setTemplateFillSuccessMsg(null);

    try {
      requireVerifiedTemplate(selectedSchemaId);
      const fullDoc = renderTemplateToTiptapDoc(selectedSchemaId, templateFillResult.fields);
      if (editor.commands?.setContent) {
        editor.commands.setContent(fullDoc, { emitUpdate: true });
        setTemplateFillSuccessMsg('Đã chèn toàn bộ biểu mẫu mới vào tài liệu!');
      }
      if (onApplyTemplate) {
        onApplyTemplate(selectedSchemaId, templateFillResult.fields, 'insert');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi chèn biểu mẫu vào tài liệu');
    }
  };

  return (
    <div className="min-w-0 space-y-4 break-words text-xs" data-testid="ai-workspace-panel">
      {/* Header with Title and Settings Trigger */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 break-words font-semibold text-slate-700 uppercase tracking-wider flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-600" />
          AI Trợ lý văn phòng
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Cấu hình AI"
          aria-expanded={showSettings}
          aria-controls={showSettings ? 'ai-settings-panel' : undefined}
          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
          title="Cấu hình nhà cung cấp AI"
        >
          <Key className="w-3 h-3 text-slate-400" />
          <span>{provider}</span>
          {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {selectedContextItems.length > 0 && <section aria-label="Ngữ cảnh AI đã chọn" data-testid="selected-ai-context" className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/70 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 break-words text-[11px] font-semibold text-indigo-950">Ngữ cảnh AI đã chọn ({selectedContextItems.length})</p>
          <span className="shrink-0 text-[10px] text-indigo-700">Chỉ gửi trong yêu cầu AI</span>
        </div>
        <ul className="space-y-1">
          {selectedContextItems.map((item) => <li key={item.fileId} className="flex min-w-0 items-center justify-between gap-2 rounded border border-indigo-100 bg-white px-2 py-1.5">
            <span className="min-w-0 break-words text-[11px] text-slate-800">{item.category === 'references' ? 'Tham khảo' : 'Tri thức'}: {item.title}</span>
            <button type="button" aria-label={`Bỏ ${item.title} khỏi ngữ cảnh AI`} onClick={() => onRemoveSelectedContextItem?.(item.fileId)} className="shrink-0 rounded px-1.5 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Bỏ chọn</button>
          </li>)}
        </ul>
      </section>}

      {/* Settings Drawer */}
      {showSettings && (
        <div id="ai-settings-panel" className="min-w-0 break-words p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5 animate-in fade-in-50">
          <div className="font-medium text-slate-700">Cấu hình kết nối AI</div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500">Nhà cung cấp:</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProviderName)}
              className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
            >
              <option value="mock">Môi trường giả lập (Hermetic Mock / Test)</option>
              <option value="openai">OpenAI (gpt-4o-mini)</option>
              <option value="gemini">Google Gemini (gemini-2.0-flash)</option>
            </select>
          </div>

          {provider !== 'mock' && (
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500">API Key:</label>
              <input
                type="password"
                placeholder={provider === 'openai' ? 'sk-...' : 'AIzaSy...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
              />
            </div>
          )}

          <Button size="sm" variant="primary" onClick={handleSaveSettings} className="w-full py-1 h-7">
            Lưu cấu hình
          </Button>
        </div>
      )}

      {/* 3 Subsystem Tabs */}
      <div role="tablist" aria-label="Chức năng AI" className="grid min-w-0 grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          id="ai-tab-drafting"
          type="button"
          role="tab"
          aria-selected={subTab === 'drafting'}
          aria-controls="ai-workspace-tabpanel"
          tabIndex={subTab === 'drafting' ? 0 : -1}
          onKeyDown={(event) => handleSubTabKeyDown(event, 'drafting')}
          onClick={() => {
            setSubTab('drafting');
            setErrorMessage(null);
          }}
          className={`min-w-0 px-1 py-1.5 rounded text-[10px] leading-tight font-medium flex items-center justify-center gap-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            subTab === 'drafting'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          data-testid="tab-ai-drafting"
        >
          <FileText className="w-3.5 h-3.5" />
          Soạn thảo
        </button>
        <button
          id="ai-tab-proofreading"
          type="button"
          role="tab"
          aria-selected={subTab === 'proofreading'}
          aria-controls="ai-workspace-tabpanel"
          tabIndex={subTab === 'proofreading' ? 0 : -1}
          onKeyDown={(event) => handleSubTabKeyDown(event, 'proofreading')}
          onClick={() => {
            setSubTab('proofreading');
            setErrorMessage(null);
          }}
          className={`min-w-0 px-1 py-1.5 rounded text-[10px] leading-tight font-medium flex items-center justify-center gap-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            subTab === 'proofreading'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          data-testid="tab-ai-proofreading"
        >
          <SpellCheck className="w-3.5 h-3.5" />
          Soát lỗi
        </button>
        <button
          id="ai-tab-template_fill"
          type="button"
          role="tab"
          aria-selected={subTab === 'template_fill'}
          aria-controls="ai-workspace-tabpanel"
          tabIndex={subTab === 'template_fill' ? 0 : -1}
          onKeyDown={(event) => handleSubTabKeyDown(event, 'template_fill')}
          onClick={() => {
            setSubTab('template_fill');
            setErrorMessage(null);
          }}
          className={`min-w-0 px-1 py-1.5 rounded text-[10px] leading-tight font-medium flex items-center justify-center gap-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            subTab === 'template_fill'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          data-testid="tab-ai-template-fill"
        >
          <FormInput className="w-3.5 h-3.5" />
          Điền mẫu
        </button>
      </div>

      <div
        id="ai-workspace-tabpanel"
        role="tabpanel"
        aria-labelledby={`ai-tab-${subTab}`}
        tabIndex={0}
        className="min-w-0 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
      {/* Error Banner */}
      {errorMessage && (
        <div className="min-w-0 break-words p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0 break-words leading-tight">{errorMessage}</div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. DRAFTING TAB                                                     */}
      {/* =================================================================== */}
      {subTab === 'drafting' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">Loại văn bản:</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as AdministrativeDocType)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
            >
              <option value="cong_van">Công văn hành chính</option>
              <option value="quyet_dinh">Quyết định ban hành</option>
              <option value="to_trinh">Tờ trình phê duyệt</option>
              <option value="thong_bao">Thông báo điều hành</option>
              <option value="bao_cao">Báo cáo định kỳ / chuyên đề</option>
              <option value="bien_ban">Biên bản cuộc họp</option>
              <option value="ke_hoach">Kế hoạch công tác</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">Phần cần soạn:</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as AdministrativeSection)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
            >
              <option value="noi_dung">Nội dung chính (Thân bài)</option>
              <option value="mo_dau">Mở đầu / Kính gửi</option>
              <option value="can_cu">Căn cứ ban hành (Legal Basis)</option>
              <option value="dieu_khoan">Điều khoản quyết định (Quyết định)</option>
              <option value="ket_luan">Kết luận / Đề xuất kiến nghị</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">
              Yêu cầu nội dung (Prompt):
            </label>
            <textarea
              rows={3}
              placeholder="Ví dụ: Báo cáo công tác kiểm toán nội bộ quý 3/2026..."
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              className="w-full px-2.5 py-2 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              data-testid="input-draft-prompt"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">
              Bối cảnh / Số liệu bổ sung (tùy chọn):
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Đã kiểm toán tại 3 đơn vị thành viên..."
              value={draftContext}
              onChange={(e) => setDraftContext(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <Button
            size="sm"
            onClick={handleRunDrafting}
            disabled={loading}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white gap-1.5 font-medium"
            data-testid="btn-run-drafting"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang soạn thảo...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Soạn thảo & Xem khác biệt
              </>
            )}
          </Button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. PROOFREADING TAB                                                 */}
      {/* =================================================================== */}
      {subTab === 'proofreading' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-600">
              Văn bản cần kiểm tra:
            </label>
            <button
              onClick={handleGrabEditorSelection}
              className="text-[11px] text-primary-600 hover:text-primary-800 font-medium"
            >
              Lấy từ tài liệu
            </button>
          </div>

          <textarea
            rows={4}
            placeholder="Dán đoạn văn bản cần soát chính tả, ngữ pháp hoặc văn phong hành chính..."
            value={proofreadText}
            onChange={(e) => setProofreadText(e.target.value)}
            className="w-full px-2.5 py-2 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            data-testid="input-proofread-text"
          />

          <Button
            size="sm"
            onClick={handleRunProofreading}
            disabled={loading}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white gap-1.5 font-medium"
            data-testid="btn-run-proofread"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang thẩm tra 5 nhóm lỗi...
              </>
            ) : (
              <>
                <SpellCheck className="w-3.5 h-3.5" />
                Soát lỗi văn bản
              </>
            )}
          </Button>

          {/* Proofread Results Section */}
          {proofreadResult && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-xs">
                  Phát hiện ({proofreadResult.issues.length} lỗi)
                </span>
                {proofreadResult.issues.length > 0 && (
                  <Button
                    size="sm"
                    variant="action"
                    onClick={handleOpenProofreadDiff}
                    className="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    Xem Diff & Áp dụng
                  </Button>
                )}
              </div>

              {proofreadResult.issues.length === 0 ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Văn bản chuẩn xác! Không phát hiện lỗi chính tả hay văn phong.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {proofreadResult.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded border border-slate-200 bg-slate-50/70 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-primary-100 text-primary-800">
                          {issue.category}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {issue.position !== undefined ? `vị trí ${issue.position}` : ''}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-rose-700 line-through mr-1.5">{issue.original}</span>
                        <ArrowRight className="w-3 h-3 inline text-slate-400 mr-1.5" />
                        <span className="text-emerald-700 font-semibold">{issue.replacement}</span>
                      </div>
                      {issue.explanation && (
                        <p className="text-[11px] text-slate-500 italic">{issue.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. TEMPLATE FILL TAB                                                */}
      {/* =================================================================== */}
      {subTab === 'template_fill' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">
              Chọn mẫu biểu đích:
            </label>
            <select
              value={selectedSchemaId}
              onChange={(e) => setSelectedSchemaId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
            >
              {ALL_SCHEMAS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">
              Ghi chú thô / Dữ liệu cần trích:
            </label>
            <textarea
              rows={4}
              placeholder="Dán nội dung yêu cầu, email trao đổi hoặc tóm tắt công việc..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full px-2.5 py-2 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              data-testid="input-template-notes"
            />
          </div>

          <Button
            size="sm"
            onClick={handleRunTemplateFill}
            disabled={loading}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white gap-1.5 font-medium"
            data-testid="btn-run-template-fill"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang trích xuất dữ liệu...
              </>
            ) : (
              <>
                <FormInput className="w-3.5 h-3.5" />
                Trích xuất & Điền mẫu
              </>
            )}
          </Button>

          {/* Template Fill Results */}
          {templateFillResult && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-xs">
                  Kết quả trích xuất ({Object.keys(templateFillResult.fields).length} trường)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Độ tin cậy: {Math.round(templateFillResult.confidence * 100)}%
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {Object.entries(templateFillResult.fields).map(([tag, val]) => (
                  <div key={tag} className="p-2 rounded border border-slate-200 bg-slate-50/70">
                    <span className="text-[10px] font-bold text-slate-500">{tag}:</span>
                    <div className="text-xs text-slate-800 font-medium">
                      {Array.isArray(val) ? val.join(', ') : String(val)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons to Inject/Apply Fields into Editor */}
              <div className="pt-2 flex flex-col gap-2">
                {!canApplySelectedTemplate && (
                  <p role="status" data-testid="unverified-template-apply-blocked" className="text-[11px] text-amber-800">
                    Chưa có biểu mẫu nguồn canonical được xác minh cho loại văn bản này; thao tác áp dụng đang khóa.
                  </p>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleApplyTemplateFill}
                  disabled={!canApplySelectedTemplate}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium shadow-sm"
                  data-testid="btn-apply-template-fill"
                >
                  <Check className="w-3.5 h-3.5" />
                  Áp dụng vào tài liệu
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleInsertFullTemplateDoc}
                  disabled={!canApplySelectedTemplate}
                  className="w-full py-1.5 text-xs text-slate-700 hover:bg-slate-50 gap-1.5 border-slate-300"
                  data-testid="btn-insert-full-template"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Chèn mới toàn bộ biểu mẫu
                </Button>
              </div>

              {templateFillSuccessMsg && (
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5" data-testid="template-fill-success-msg">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{templateFillSuccessMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Visual Diff Preview Modal */}
      <DiffPreviewModal
        isOpen={isDiffModalOpen}
        diff={activeDiff}
        title={diffTitle}
        onClose={() => setIsDiffModalOpen(false)}
        onApply={handleApplyDiffToEditor}
      />
    </div>
  );
}
