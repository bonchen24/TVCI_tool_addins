'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor, JSONContent } from '@tiptap/core';
import { useEditor } from '@tiptap/react';
import { useRouter } from 'next/navigation';
import { createCoreEditorExtensions } from '@/editor/extensions';
import type { SpellcheckControls } from '@/editor/spellcheck-extension';
import { defaultDocumentState } from '@/editor/schema';
import { Header } from '@/components/layout/Header';
import { Sidebar, type SidebarTab } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { A4Canvas } from '@/components/editor/A4Canvas';
import { importDocx, exportDocx, downloadDocx } from '@/docx';
import { useDocumentAudit } from '@/hooks/useDocumentAudit';
import { applySafeFixes, applySingleFix } from '@/rules/auto-fixer';
import type { ValidationIssue } from '@/rules/models';
import type { ResourceEntry } from '@/drive/resources';
import { buildSelectedAiContext } from '@/drive/client-context';
import { runSpellcheckPreflight } from '@/spellcheck/preflight';
import type { SpellcheckIssue } from '@/spellcheck/types';

type WorkspaceUser = { username: string; role: 'user' | 'superadmin' };

export default function EditorWorkspace({ user }: { user: WorkspaceUser }) {
  return <EditorWorkspaceForUser key={user.username} user={user} />;
}

function EditorWorkspaceForUser({ user }: { user: WorkspaceUser }) {
  const router = useRouter();
  const [currentDriveFileId, setCurrentDriveFileId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState('Văn_bản_TVCI_mới.docx');
  const [isSaved, setIsSaved] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('audit');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedAiResources, setSelectedAiResources] = useState<ResourceEntry[]>([]);
  const [spellcheckIssues, setSpellcheckIssues] = useState<SpellcheckIssue[]>([]);
  const [selectedSpellcheckIssueId, setSelectedSpellcheckIssueId] = useState<string | null>(null);
  const [userDictionaryWords, setUserDictionaryWords] = useState<string[]>([]);
  const [spellcheckLoading, setSpellcheckLoading] = useState(false);
  const [spellcheckError, setSpellcheckError] = useState<string | null>(null);
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  const spellcheckControlsRef = useRef<SpellcheckControls | null>(null);
  const ignoredSpellcheckIssueIdsRef = useRef(new Set<string>());
  const userDictionaryWordsRef = useRef<string[]>([]);
  const spellcheckErrorRef = useRef<string | null>(null);
  const dictionaryErrorRef = useRef<string | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [paragraphCount, setParagraphCount] = useState(1);

  const spellcheckCallbacksRef = useRef<{
    onIssues: (issues: SpellcheckIssue[]) => void;
    onError: (error: string | null) => void;
    onIssueClick: (issue: SpellcheckIssue) => void;
  }>({
    onIssues: setSpellcheckIssues,
    onError: (error) => {
      spellcheckErrorRef.current = error;
      setSpellcheckError(error);
      setSpellcheckLoading(false);
    },
    onIssueClick: (issue) => {
      setSelectedSpellcheckIssueId(issue.id);
      setSidebarOpen(true);
      setActiveTab('spellcheck');
    },
  });
  spellcheckCallbacksRef.current = {
    onIssues: (issues) => {
      setSpellcheckIssues(issues);
      setSpellcheckLoading(false);
    },
    onError: (error) => {
      spellcheckErrorRef.current = error;
      setSpellcheckError(error);
      setSpellcheckLoading(false);
    },
    onIssueClick: (issue) => {
      setSelectedSpellcheckIssueId(issue.id);
      setSidebarOpen(true);
      setActiveTab('spellcheck');
    },
  };

  const editorExtensions = useMemo(() => createCoreEditorExtensions({
    enabled: true,
    getUserWords: () => userDictionaryWordsRef.current,
    getIgnoredIssueIds: () => ignoredSpellcheckIssueIdsRef.current,
    onIssues: (issues) => spellcheckCallbacksRef.current.onIssues(issues),
    onError: (error) => spellcheckCallbacksRef.current.onError(error),
    onIssueClick: (issue) => spellcheckCallbacksRef.current.onIssueClick(issue),
    onDocumentChange: () => ignoredSpellcheckIssueIdsRef.current.clear(),
    onReady: (controls) => { spellcheckControlsRef.current = controls; },
  }), []);

  useEffect(() => {
    if (!sidebarOpen) sidebarToggleRef.current?.focus();
  }, [sidebarOpen]);

  useEffect(() => {
    let active = true;
    void fetch('/api/drive/status').then((response) => response.json()).then((result) => {
      if (active && result.connected) setDriveConnected(true);
    }).catch(() => { /* The default disconnected state remains in effect. */ });
    return () => { active = false; };
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const calculateStats = (ed: Editor | null | undefined) => {
    if (!ed) return;
    const json = ed.getJSON();
    let words = 0;
    let paragraphs = 0;
    function countNodes(node: JSONContent) {
      if (node.type === 'paragraph' || node.type === 'heading') {
        paragraphs++;
        const text = node.content?.map((child) => child.text || '').join(' ') || '';
        words += text.trim().split(/\s+/).filter(Boolean).length;
      }
      if (Array.isArray(node.content)) node.content.forEach(countNodes);
    }
    countNodes(json);
    setWordCount(words);
    setParagraphCount(Math.max(1, paragraphs));
  };

  const editor = useEditor({
    extensions: editorExtensions,
    content: defaultDocumentState,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: updatedEditor }) => {
      setIsSaved(false);
      calculateStats(updatedEditor);
    },
  });

  useEffect(() => {
    let active = true;
    void fetch('/api/spellcheck/dictionary')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.words)) {
          throw new Error(result.error || 'Không tải được từ điển của tài khoản.');
        }
        if (!active) return;
        const words = result.words.filter((word: unknown): word is string => typeof word === 'string');
        userDictionaryWordsRef.current = words;
        setUserDictionaryWords(words);
        dictionaryErrorRef.current = null;
        setDictionaryError(null);
        spellcheckControlsRef.current?.refresh();
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Không tải được từ điển của tài khoản.';
        dictionaryErrorRef.current = message;
        setDictionaryError(message);
      });
    return () => { active = false; };
  }, []);

  const { healthScore, issueCount, issues, activeProfile, setProfile, reevaluate } = useDocumentAudit({
    editor,
    debounceMs: 150,
    initialProfile: 'NĐ 30/2020 TVCI',
  });

  useEffect(() => { if (editor) calculateStats(editor); }, [editor]);

  const handleNewDocument = () => {
    if (!window.confirm('Khởi tạo tài liệu mới? Các thay đổi chưa lưu sẽ bị xóa.')) return;
    editor?.commands.setContent(defaultDocumentState);
    if (editor) calculateStats(editor);
    setCurrentDriveFileId(null);
    setDocumentTitle('Văn_bản_TVCI_mới.docx');
    setIsSaved(false);
    setSelectedAiResources([]);
    showToast('Đã khởi tạo văn bản mới');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    try {
      const importedJson = await importDocx(await file.arrayBuffer());
      editor.commands.setContent(importedJson);
      calculateStats(editor);
      setCurrentDriveFileId(null);
      setDocumentTitle(file.name);
      setIsSaved(false);
      setSelectedAiResources([]);
      showToast(`Đã nhập tài liệu "${file.name}"`);
    } catch (error) {
      console.error('[Editor] Failed to import DOCX:', error);
      window.alert('Không thể mở tệp DOCX. Vui lòng kiểm tra định dạng tệp.');
    } finally {
      event.target.value = '';
    }
  };

  const runPreflight = async (actionLabel: string): Promise<boolean> => {
    const controls = spellcheckControlsRef.current;
    setSpellcheckLoading(true);
    spellcheckErrorRef.current = null;
    setSpellcheckError(null);
    return runSpellcheckPreflight(
      actionLabel,
      async () => {
        if (!controls) throw new Error('Trình soạn thảo chưa sẵn sàng để quét văn bản.');
        return controls.scanNow();
      },
      (message) => window.confirm(message),
      () => spellcheckErrorRef.current || dictionaryErrorRef.current
    ).finally(() => setSpellcheckLoading(false));
  };

  const handleSpellcheck = async () => {
    setSidebarOpen(true);
    setActiveTab('spellcheck');
    setSpellcheckLoading(true);
    setSpellcheckError(null);
    spellcheckErrorRef.current = null;
    const controls = spellcheckControlsRef.current;
    if (!controls) {
      const message = 'Trình soạn thảo chưa sẵn sàng để quét văn bản.';
      spellcheckErrorRef.current = message;
      setSpellcheckError(message);
      setSpellcheckLoading(false);
      return;
    }
    await controls.scanNow();
  };

  const handleSelectSpellcheckIssue = (issue: SpellcheckIssue) => {
    if (!editor) return;
    setSelectedSpellcheckIssueId(issue.id);
    editor.chain()
      .setTextSelection({ from: issue.from, to: issue.to })
      .scrollIntoView()
      .focus()
      .run();
  };

  const handleApplySpellcheckSuggestion = (issue: SpellcheckIssue, suggestion: string) => {
    if (!editor || !issue.suggestions.includes(suggestion)) return;
    editor.chain()
      .focus()
      .insertContentAt({ from: issue.from, to: issue.to }, suggestion)
      .run();
    setSelectedSpellcheckIssueId(null);
    setIsSaved(false);
  };

  const handleIgnoreSpellcheckIssue = (issue: SpellcheckIssue) => {
    ignoredSpellcheckIssueIdsRef.current.add(issue.id);
    setSelectedSpellcheckIssueId(null);
    if (spellcheckControlsRef.current) void spellcheckControlsRef.current.scanNow();
  };

  const persistDictionaryChange = async (term: string, method: 'POST' | 'DELETE') => {
    const response = await fetch('/api/spellcheck/dictionary', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term }),
    });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.words)) {
      throw new Error(result.error || 'Không cập nhật được từ điển của tài khoản.');
    }
    const words = result.words.filter((word: unknown): word is string => typeof word === 'string');
    userDictionaryWordsRef.current = words;
    setUserDictionaryWords(words);
    if (spellcheckControlsRef.current) void spellcheckControlsRef.current.scanNow();
  };

  const handleAddSpellcheckTerm = async (issue: SpellcheckIssue) => {
    try {
      await persistDictionaryChange(issue.text, 'POST');
      setSelectedSpellcheckIssueId(null);
      showToast(`Đã thêm “${issue.text}” vào từ điển của tài khoản`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không cập nhật được từ điển của tài khoản.');
    }
  };

  const handleRemoveSpellcheckTerm = async (term: string) => {
    try {
      await persistDictionaryChange(term, 'DELETE');
      showToast(`Đã xóa “${term}” khỏi từ điển của tài khoản`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không cập nhật được từ điển của tài khoản.');
    }
  };

  const handleExportDocx = async () => {
    if (!editor) return;
    if (!await runPreflight('xuất DOCX')) return;
    try {
      const blob = await exportDocx(editor.getJSON(), { title: documentTitle, outputType: 'blob' }) as Blob;
      downloadDocx(blob, documentTitle);
      setIsSaved(true);
      showToast('Đã xuất DOCX về thiết bị này');
    } catch (error) {
      console.error('[Editor] Failed to export DOCX:', error);
      window.alert('Lỗi xuất tệp DOCX. Vui lòng thử lại.');
    }
  };

  const handleSaveToDrive = async (saveAs = false) => {
    if (!editor || !driveConnected) {
      if (!driveConnected) showToast('Kết nối Google Drive để lưu dài hạn');
      return;
    }
    if (!await runPreflight(saveAs ? 'lưu bản sao vào Google Drive' : 'lưu vào Google Drive')) return;
    const content = editor.getJSON();
    const endpoint = !saveAs && currentDriveFileId ? `/api/drive/documents/${currentDriveFileId}` : '/api/drive/documents';
    try {
      const response = await fetch(endpoint, {
        method: currentDriveFileId && !saveAs ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: documentTitle, content }),
      });
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || 'Không thể lưu vào Google Drive');
        return;
      }
      if (result.resource?.fileId) setCurrentDriveFileId(result.resource.fileId);
      setIsSaved(true);
      showToast(saveAs ? `Đã lưu bản sao "${documentTitle}" vào Drive` : `Đã lưu "${documentTitle}" vào Drive`);
    } catch {
      showToast('Không thể kết nối Google Drive. Nội dung vẫn chỉ nằm trong phiên hiện tại.');
    }
  };

  const handleOpenDriveDocument = (document: ResourceEntry) => {
    if (!editor || document.content === undefined) return;
    editor.commands.setContent(document.content as JSONContent);
    calculateStats(editor);
    setCurrentDriveFileId(document.fileId);
    setDocumentTitle(document.title);
    setIsSaved(true);
    setSelectedAiResources([]);
    showToast(`Đã mở "${document.title}" từ Drive`);
  };

  const handleApplyPersonalTemplate = (template: ResourceEntry) => {
    if (!editor || template.content === undefined) return;
    editor.commands.setContent(template.content as JSONContent);
    calculateStats(editor);
    setCurrentDriveFileId(null);
    setDocumentTitle(`${template.title} - Bản mới`);
    setIsSaved(false);
    setSelectedAiResources([]);
    showToast(`Đã tạo văn bản từ mẫu "${template.title}"`);
  };

  const handleApplySafeFix = () => {
    if (!editor) return;
    applySafeFixes(editor, issues);
    reevaluate();
    setIsSaved(false);
  };

  const handleFixIssue = (issue: ValidationIssue) => {
    if (!editor) return;
    applySingleFix(editor, issue);
    reevaluate();
    setIsSaved(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  const handleOpenDrive = () => {
    setSidebarOpen(true);
    setActiveTab('personal');
  };
  const currentDocument = editor ? { title: documentTitle, content: editor.getJSON() } : undefined;
  const selectedAiContext = useMemo(
    () => buildSelectedAiContext(selectedAiResources, selectedAiResources.map((resource) => resource.fileId)),
    [selectedAiResources]
  );
  const handleSelectedContextItemsChange = useCallback((items: ResourceEntry[]) => setSelectedAiResources(items), []);
  const handleSelectedContextConsumed = useCallback(() => setSelectedAiResources([]), []);
  const handleRemoveSelectedContextItem = useCallback((fileId: string) => {
    setSelectedAiResources((items) => items.filter((item) => item.fileId !== fileId));
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-100">
      {toastMessage && <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-3 bottom-8 top-auto z-20 flex justify-end sm:inset-x-4 xl:bottom-10 xl:left-[336px] xl:right-4">
        <span className="max-w-full break-words rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-right text-xs font-semibold text-white shadow-lg">{toastMessage}</span>
      </div>}
      <input type="file" ref={fileInputRef} accept=".docx" className="hidden" onChange={handleFileChange} />
      <Header
        documentTitle={documentTitle}
        isSaved={isSaved}
        sidebarOpen={sidebarOpen}
        username={user.username}
        role={user.role}
        driveConnected={driveConnected}
        onTitleChange={(title) => { setDocumentTitle(title); setIsSaved(false); }}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        sidebarToggleRef={sidebarToggleRef}
        onNewDocument={handleNewDocument}
        onImportDocx={() => fileInputRef.current?.click()}
        onExportDocx={handleExportDocx}
        onSaveToDrive={() => void handleSaveToDrive()}
        onSaveAsToDrive={() => void handleSaveToDrive(true)}
        onOpenDrive={handleOpenDrive}
        onLogout={() => void handleLogout()}
        onOpenSettings={() => showToast('Cài đặt AI có trong bảng Trợ lý AI')}
      />
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setSidebarOpen(false)}
          healthScore={healthScore}
          issueCount={issueCount}
          issues={issues}
          onApplySafeFix={handleApplySafeFix}
          onFixIssue={handleFixIssue}
          spellcheckIssues={spellcheckIssues}
          selectedSpellcheckIssueId={selectedSpellcheckIssueId}
          userDictionaryWords={userDictionaryWords}
          spellcheckLoading={spellcheckLoading}
          spellcheckError={dictionaryError || spellcheckError}
          onSelectSpellcheckIssue={handleSelectSpellcheckIssue}
          onApplySpellcheckSuggestion={handleApplySpellcheckSuggestion}
          onIgnoreSpellcheckIssue={handleIgnoreSpellcheckIssue}
          onAddSpellcheckTerm={handleAddSpellcheckTerm}
          onRemoveSpellcheckTerm={handleRemoveSpellcheckTerm}
          editor={editor}
          driveConnected={driveConnected}
          currentDocument={currentDocument}
          onOpenDriveDocument={handleOpenDriveDocument}
          onApplyPersonalTemplate={handleApplyPersonalTemplate}
          selectedContextItems={selectedAiResources}
          onSelectedContextItemsChange={handleSelectedContextItemsChange}
          selectedContext={selectedAiContext}
          onRemoveSelectedContextItem={handleRemoveSelectedContextItem}
          onSelectedContextConsumed={handleSelectedContextConsumed}
        />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-100">
          <EditorToolbar
            editor={editor}
            onSpellcheck={() => { void handleSpellcheck(); }}
            spellcheckIssueCount={spellcheckIssues.length}
            spellcheckLoading={spellcheckLoading}
          />
          <A4Canvas editor={editor} />
        </main>
      </div>
      <StatusBar wordCount={wordCount} paragraphCount={paragraphCount} healthScore={healthScore} issueCount={issueCount}
        activeProfile={activeProfile} profileName={activeProfile} onProfileChange={setProfile} onOpenAudit={() => { setSidebarOpen(true); setActiveTab('audit'); }} />
    </div>
  );
}
