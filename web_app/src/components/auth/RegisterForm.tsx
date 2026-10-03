'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TERMS_COPY } from '@/privacy/terms';

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận không khớp.');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword, acceptedTerms }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể tạo tài khoản.');
      setRecoveryCode(result.recoveryCode);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard?.writeText(recoveryCode);
    setCopied(true);
  }

  if (recoveryCode) {
    return (
      <section className="space-y-4" aria-labelledby="recovery-code-title">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 id="recovery-code-title" className="font-semibold">Mã khôi phục chỉ hiển thị một lần</h2>
          <p className="mt-1">Lưu mã này an toàn. Mã này không thể xem lại sau khi rời trang.</p>
        </div>
        <code className="block break-all rounded-xl bg-slate-950 p-4 font-mono text-sm text-emerald-200" data-testid="recovery-code">
          {recoveryCode}
        </code>
        <button type="button" onClick={copyCode} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          {copied ? 'Đã sao chép' : 'Sao chép mã khôi phục'}
        </button>
        <button type="button" onClick={() => router.push('/')} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Tôi đã lưu mã, tiếp tục
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-slate-800">
        Tên đăng nhập
        <input required minLength={3} maxLength={32} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      </label>
      <p className="-mt-2 text-xs text-slate-500">Không dùng họ tên thật, email hoặc số điện thoại làm tên đăng nhập.</p>
      <label className="block text-sm font-medium text-slate-800">
        Mật khẩu
        <input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      </label>
      <p className="-mt-3 text-xs text-slate-500">Dùng ít nhất 12 ký tự.</p>
      <label className="block text-sm font-medium text-slate-800">
        Xác nhận mật khẩu
        <input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      </label>

      <section aria-label={TERMS_COPY.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">{TERMS_COPY.title}</h2>
        <div data-testid="terms-copy" tabIndex={0} className="max-h-56 space-y-3 overflow-y-auto pr-2 text-xs leading-5 text-slate-700">
          {TERMS_COPY.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div>
            <p className="font-semibold">{TERMS_COPY.feedback.heading}</p>
            <p>Đại diện nhóm tác giả: {TERMS_COPY.feedback.author}</p>
            <p>Zalo/Điện thoại: {TERMS_COPY.feedback.phone}</p>
            <p>Email: {TERMS_COPY.feedback.email}</p>
          </div>
          <p className="font-medium">Phiên bản điều khoản: {TERMS_COPY.version}</p>
        </div>
      </section>
      <label className="flex items-start gap-2 text-sm leading-5 text-slate-700">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
        <span>{TERMS_COPY.acceptanceLabel}</span>
      </label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={!acceptedTerms || !username || !password || !confirmPassword || busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
        {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
      </button>
    </form>
  );
}
