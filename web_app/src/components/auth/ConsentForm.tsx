'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TERMS_COPY } from '@/privacy/terms';

export function ConsentForm() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    const response = await fetch('/api/auth/terms', { method: 'POST' });
    if (!response.ok) return setError('Không thể ghi nhận chấp thuận. Vui lòng đăng nhập lại.');
    router.push('/');
    router.refresh();
  }

  return <section className="space-y-4">
    <h1 className="text-lg font-semibold">Cần chấp nhận điều khoản hiện hành</h1>
    <div data-testid="terms-copy" tabIndex={0} className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      {TERMS_COPY.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <p>Phiên bản: {TERMS_COPY.version}</p>
    </div>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />{TERMS_COPY.acceptanceLabel}</label>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <button disabled={!accepted} onClick={submit} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:bg-slate-300">Chấp nhận và tiếp tục</button>
  </section>;
}
