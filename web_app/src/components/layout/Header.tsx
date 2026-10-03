'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, PanelLeftClose, PanelLeftOpen, Plus, Save, Settings, Upload, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface HeaderProps {
  documentTitle: string;
  isSaved: boolean;
  sidebarOpen: boolean;
  username: string;
  role: 'user' | 'superadmin';
  driveConnected: boolean;
  onTitleChange: (newTitle: string) => void;
  onToggleSidebar: () => void;
  onNewDocument: () => void;
  onImportDocx: () => void;
  onExportDocx: () => void;
  onOpenSettings: () => void;
  onSaveToDrive: () => void;
  onSaveAsToDrive: () => void;
  onOpenDrive: () => void;
  onLogout: () => void;
  sidebarToggleRef?: React.Ref<HTMLButtonElement>;
}

export function Header({
  documentTitle,
  isSaved,
  sidebarOpen,
  username,
  role,
  driveConnected,
  onTitleChange,
  onToggleSidebar,
  onNewDocument,
  onImportDocx,
  onExportDocx,
  onOpenSettings,
  onSaveToDrive,
  onSaveAsToDrive,
  onOpenDrive,
  onLogout,
  sidebarToggleRef,
}: HeaderProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentTitle);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const handleTitleSubmit = () => {
    setEditingTitle(false);
    if (tempTitle.trim()) onTitleChange(tempTitle.trim());
    else setTempTitle(documentTitle);
  };

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-1 overflow-visible border-b border-slate-200 bg-white px-2 shadow-sm sm:gap-2 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-4">
        <div className="flex shrink-0 items-center gap-0 border-r-0 pr-0 sm:gap-2.5 sm:border-r sm:border-slate-200 sm:pr-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-sm font-bold text-white shadow-sm">TV</div>
          <div className="hidden flex-col md:flex">
            <span className="text-xs font-semibold uppercase leading-none tracking-tight text-slate-800">TVCI Document</span>
            <span className="text-[10px] font-medium text-slate-400">Nghị định 30/2020</span>
          </div>
        </div>

        <div data-testid="header-title-container" className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden sm:gap-2">
          {editingTitle ? (
            <input type="text" value={tempTitle} autoFocus onChange={(event) => setTempTitle(event.target.value)} onBlur={handleTitleSubmit}
              onKeyDown={(event) => { if (event.key === 'Enter') handleTitleSubmit(); if (event.key === 'Escape') { setTempTitle(documentTitle); setEditingTitle(false); } }}
              className="w-full min-w-0 rounded border border-primary-400 bg-white px-2 py-0.5 text-sm font-medium text-slate-900 outline-none ring-1 ring-primary-400" />
          ) : (
            <button onClick={() => { setTempTitle(documentTitle); setEditingTitle(true); }} title="Nhấn để đổi tên tài liệu"
              className="block min-w-0 max-w-full truncate rounded px-2 py-1 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              {documentTitle}
            </button>
          )}
          {!driveConnected ? <Badge variant="warning" className="hidden sm:inline-flex"><AlertCircle className="h-3 w-3 text-amber-600" />Chỉ trong phiên</Badge>
            : isSaved ? <Badge variant="success" className="hidden sm:inline-flex"><CheckCircle2 className="h-3 w-3 text-emerald-600" />Đã lưu vào Drive</Badge>
              : <Badge variant="warning" className="hidden sm:inline-flex"><AlertCircle className="h-3 w-3 text-amber-600" />Chưa lưu</Badge>}
        </div>
      </div>

      <div data-testid="header-action-group" className="ml-auto flex min-w-0 shrink-0 items-center gap-0 sm:gap-1">
        <Button variant="ghost" size="sm" onClick={onNewDocument} title="Tạo văn bản mới" aria-label="Văn bản mới" data-testid="header-new-document" className="shrink-0 whitespace-nowrap px-1 sm:px-2.5">
          <Plus className="h-4 w-4 text-slate-600" /><span data-testid="header-new-label" className="hidden xl:inline">Văn bản mới</span>
        </Button>

        {driveConnected ? <>
          <Button variant="secondary" size="sm" onClick={onSaveToDrive} title="Lưu tài liệu vào Google Drive" aria-label="Lưu vào Drive" className="shrink-0 whitespace-nowrap px-1 sm:px-2.5">
            <Save className="h-4 w-4 text-indigo-500" /><span className="hidden xl:inline">Lưu vào Drive</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenDrive} title="Mở tài liệu từ Google Drive" aria-label="Mở từ Drive" className="shrink-0 whitespace-nowrap px-1 sm:px-2.5">
            <span className="hidden lg:inline">Mở từ Drive</span><span className="lg:hidden">Mở</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onSaveAsToDrive} title="Lưu bản sao vào Google Drive" aria-label="Lưu bản sao" className="shrink-0 whitespace-nowrap px-1 sm:px-2.5">
            <span className="hidden xl:inline">Lưu bản sao</span><span className="xl:hidden">Bản sao</span>
          </Button>
        </> : <>
          {/* Keep full-page navigation so the server's OAuth redirect is followed by the browser. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/drive/connect" aria-label="Kết nối Google Drive để lưu" title="Kết nối Google Drive để lưu"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-2 text-[11px] font-semibold text-white hover:bg-indigo-700 sm:px-2.5 sm:text-xs">
          <Save className="h-4 w-4" /><span className="hidden md:inline">Kết nối Google Drive để lưu</span><span className="md:hidden">Kết nối Drive</span>
          </a>
        </>}

        <Button variant="secondary" size="sm" onClick={onImportDocx} title="Tải lên tệp DOCX có sẵn" aria-label="Nhập DOCX" className="shrink-0 whitespace-nowrap px-1 sm:px-2.5">
          <Upload className="h-4 w-4 text-slate-700" /><span data-testid="header-import-label" className="hidden lg:inline">Nhập DOCX</span>
        </Button>
        <Button variant="action" size="sm" onClick={onExportDocx} title="Xuất văn bản ra tệp DOCX" aria-label="Xuất DOCX" className="shrink-0 whitespace-nowrap px-1 font-semibold shadow-sm sm:px-2.5">
          <Download className="h-4 w-4" /><span data-testid="header-export-label" className="hidden sm:inline">Xuất DOCX</span>
        </Button>
        <div className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
        <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Cài đặt" title="Cài đặt" className="shrink-0"><Settings className="h-4 w-4 text-slate-600" /></Button>
        <div className="relative shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setAccountMenuOpen((open) => !open)} aria-label={`Tài khoản ${username}`} aria-expanded={accountMenuOpen} className="max-w-24 gap-1 px-1 sm:max-w-36 sm:px-2">
            <UserRound className="h-4 w-4 shrink-0" /><span className="truncate">{username}</span><span className="sr-only">{driveConnected ? 'Drive đã kết nối' : 'Drive chưa kết nối'}</span>
          </Button>
          {accountMenuOpen && <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl" role="menu" aria-label="Menu tài khoản">
            <p className="truncate px-2 py-1 text-xs font-semibold text-slate-700">{username}</p>
            <p className="px-2 pb-2 text-[11px] text-slate-500">Google Drive: {driveConnected ? 'đã kết nối' : 'chưa kết nối'}</p>
            <a role="menuitem" href="/account" className="block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">Tài khoản</a>
            {role === 'superadmin' && <a role="menuitem" href="/admin" className="block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">Quản trị</a>}
            <button role="menuitem" type="button" onClick={onLogout} className="block w-full rounded-lg px-2 py-2 text-left text-sm text-rose-700 hover:bg-rose-50">Đăng xuất</button>
          </div>}
        </div>
        <Button variant="ghost" size="icon" ref={sidebarToggleRef} onClick={onToggleSidebar} aria-label={sidebarOpen ? 'Ẩn bảng công cụ' : 'Hiện bảng công cụ'} aria-expanded={sidebarOpen} aria-controls={sidebarOpen ? 'workspace-sidebar' : undefined} title={sidebarOpen ? 'Ẩn bảng công cụ' : 'Hiện bảng công cụ'} className="shrink-0">
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4 text-slate-700" /> : <PanelLeftOpen className="h-4 w-4 text-slate-700" />}
        </Button>
      </div>
    </header>
  );
}
