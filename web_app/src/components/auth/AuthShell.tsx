import type { ReactNode } from 'react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="min-h-screen w-full overflow-y-auto bg-slate-100 px-4 py-8 sm:flex sm:items-center sm:justify-center sm:px-6">
      <section className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
        <a href="/login" className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">TV</span>
          <span><strong className="block text-sm tracking-wide text-slate-900">TVCI Document Platform</strong><span className="text-xs text-slate-500">Soạn thảo và chuẩn hóa văn bản</span></span>
        </a>
        <h1 className="text-xl font-bold text-slate-950">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-600">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
