'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusBarProps {
  wordCount: number;
  paragraphCount: number;
  healthScore: number;
  profileName?: string;
  activeProfile?: string;
  issueCount?: number;
  onProfileChange?: (profileId: string) => void;
  onOpenAudit?: () => void;
}

export function StatusBar({
  wordCount,
  paragraphCount,
  healthScore,
  profileName = 'NĐ 30/2020 TVCI',
  activeProfile = 'NĐ 30/2020 TVCI',
  issueCount = 0,
  onProfileChange,
  onOpenAudit,
}: StatusBarProps) {
  const isEmerald = healthScore >= 90;
  const isAmber = healthScore >= 70 && healthScore < 90;
  const isRose = healthScore < 70;

  return (
    <footer className="flex h-6 min-w-0 shrink-0 items-center justify-between gap-2 overflow-hidden border-t border-slate-200 bg-white px-2 text-xs text-slate-500 select-none z-10 sm:px-4">
      <div className="flex min-w-0 shrink items-center gap-2 overflow-hidden sm:gap-4">
        <span className="shrink-0 whitespace-nowrap">
          Từ: <strong className="text-slate-700">{wordCount}</strong>
        </span>
        <span data-testid="status-paragraph-count" className="hidden shrink-0 whitespace-nowrap sm:inline">
          Đoạn: <strong className="text-slate-700">{paragraphCount}</strong>
        </span>
        <span data-testid="status-paper-size" className="hidden shrink-0 whitespace-nowrap md:inline">
          Khổ giấy: <strong className="text-slate-700">A4 (210×297mm)</strong>
        </span>
      </div>

      <div className="flex min-w-0 shrink items-center justify-end gap-1.5 overflow-hidden sm:gap-3">
        <div className="flex min-w-0 shrink items-center gap-1.5 overflow-hidden">
          <span className="hidden shrink-0 sm:inline">Tiêu chuẩn:</span>
          {onProfileChange ? (
            <select
              value={activeProfile}
              onChange={(e) => onProfileChange(e.target.value)}
              aria-label="Tiêu chuẩn quy cách"
              className="w-[5.5rem] min-w-0 max-w-full truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0 text-[11px] font-semibold text-slate-800 cursor-pointer hover:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-auto sm:max-w-[12rem]"
            >
              <option value="NĐ 30/2020 TVCI">NĐ 30/2020 TVCI</option>
              <option value="Tập đoàn TKV">Tập đoàn TKV</option>
              <option value="Viện IEMM">Viện IEMM</option>
              <option value="Văn bản Đảng">Văn bản Đảng</option>
            </select>
          ) : (
            <strong className="min-w-0 truncate text-slate-700">{profileName}</strong>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenAudit}
          className={cn(
            'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:px-2',
            isEmerald && 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
            isAmber && 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
            isRose && 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
          )}
          title={`Điểm chuẩn: ${healthScore}%. Bấm để mở danh sách chi tiết.`}
        >
          {isEmerald && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
          {isAmber && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          {isRose && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
          <span data-testid="status-score-label" className="hidden sm:inline">Điểm chuẩn: </span>
          <span>{healthScore}%</span>
          {issueCount > 0 && (
            <span className="ml-0.5 text-[10px] opacity-75 font-semibold">({issueCount})</span>
          )}
        </button>
      </div>
    </footer>
  );
}
