'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function RecoverForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) return setError('Mật khẩu xác nhận không khớp.');
    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, recoveryCode, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể khôi phục tài khoản.');
      setMessage('Mật khẩu đã được thay đổi. Mã khôi phục này đã được sử dụng.');
      setTimeout(() => router.push('/login'), 900);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-slate-800">Tên đăng nhập<input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="block text-sm font-medium text-slate-800">Mã khôi phục<input required autoComplete="off" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono" /></label>
      <label className="block text-sm font-medium text-slate-800">Mật khẩu mới<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="block text-sm font-medium text-slate-800">Xác nhận mật khẩu mới<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Đặt lại mật khẩu</button>
      <p className="text-center text-sm"><a href="/login" className="text-indigo-700">Quay lại đăng nhập</a></p>
    </form>
  );
}
