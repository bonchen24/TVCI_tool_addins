'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function AccountPanel({ username, driveConnected, mustChangePassword, role }: { username: string; driveConnected: boolean; mustChangePassword: boolean; role: 'user' | 'superadmin' }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [usernameConfirmation, setUsernameConfirmation] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) return setError('Mật khẩu xác nhận không khớp.');
    const response = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể đổi mật khẩu.');
    setMessage('Đã đổi mật khẩu.');
    router.push('/');
    router.refresh();
  }

  async function deleteOwnAccount(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!deleteConfirmed) return setError('Vui lòng xác nhận bạn hiểu dữ liệu Drive không bị xóa.');
    if (usernameConfirmation.trim().toLowerCase() !== username.trim().toLowerCase()) return setError('Tên đăng nhập xác nhận không khớp.');
    const response = await fetch('/api/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: deletePassword, confirmedDataDeletion: deleteConfirmed, usernameConfirmation }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể xóa tài khoản.');
    router.push('/login');
    router.refresh();
  }

  async function issueRecoveryCode() {
    setRecoveryCode('');
    const response = await fetch('/api/account/recovery', { method: 'POST' });
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể tạo mã khôi phục.');
    setRecoveryCode(result.recoveryCode);
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return <div className="space-y-6">
    <section className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">Tên đăng nhập</p><p className="mt-1 font-semibold text-slate-900">{username}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm">Google Drive: <strong>{driveConnected ? 'Đã kết nối' : 'Chưa kết nối'}</strong></span>
        {driveConnected ? <button type="button" onClick={async () => { await fetch('/api/drive/disconnect', { method: 'POST' }); router.refresh(); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Ngắt kết nối</button> : <>
          {/* Keep full-page navigation so the server's OAuth redirect is followed by the browser. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/drive/connect" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Kết nối Google Drive để lưu</a>
        </>}
      </div>
      {!driveConnected && <p className="mt-2 text-xs text-slate-500">Không kết nối Drive thì tài liệu và Tri thức chỉ tồn tại trong phiên; bạn vẫn có thể xuất tệp.</p>}
    </section>

    <form onSubmit={updatePassword} className={`space-y-3 rounded-xl border p-4 ${mustChangePassword ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
      <h2 className={`font-semibold ${mustChangePassword ? 'text-amber-950' : 'text-slate-900'}`}>{mustChangePassword ? 'Đổi mật khẩu để tiếp tục' : 'Đổi mật khẩu'}</h2>
      {mustChangePassword && <p className="text-sm text-amber-900">Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng tài khoản.</p>}
      <label className="block text-sm">Mật khẩu hiện tại<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="block text-sm">Mật khẩu mới<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="block text-sm">Xác nhận mật khẩu mới<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Đổi mật khẩu</button>
    </form>

    {!mustChangePassword && <section className="space-y-3 rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold">Mã khôi phục</h2>
      <p className="text-sm text-slate-600">Tạo mã mới nếu cần. Mã cũ sẽ mất hiệu lực và mã mới chỉ hiển thị một lần.</p>
      <button type="button" onClick={issueRecoveryCode} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">Tạo mã khôi phục mới</button>
      {recoveryCode && <div className="space-y-2"><code className="block break-all rounded-lg bg-slate-950 p-3 text-sm text-emerald-200">{recoveryCode}</code><p className="text-xs text-amber-800">Lưu mã này an toàn. Mã không thể xem lại.</p><button type="button" onClick={() => navigator.clipboard?.writeText(recoveryCode)} className="text-sm text-indigo-700">Sao chép mã</button></div>}
    </section>}

    {role === 'user' && <section className="space-y-3 rounded-xl border border-rose-300 bg-rose-50/40 p-4">
      <h2 className="font-semibold text-rose-950">Vùng nguy hiểm</h2>
      <div className="space-y-2">
        <h3 className="font-semibold text-rose-900">Xóa tài khoản</h3>
        <p className="text-sm text-slate-700">Xóa tài khoản TVCI sẽ xóa thông tin tài khoản/bảo mật cục bộ của ứng dụng.</p>
        <p className="text-sm text-slate-700">Tệp Documents, Templates/Thư viện, Knowledge/Tri thức và References đã lưu trong Google Drive của người dùng KHÔNG bị xóa.</p>
        <p className="text-sm text-slate-700">Nếu muốn xóa file Drive, người dùng tự thực hiện trong Google Drive.</p>
      </div>
      <form onSubmit={deleteOwnAccount} className="space-y-3">
        <label className="block text-sm">Mật khẩu hiện tại để xóa tài khoản<input required type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input required type="checkbox" checked={deleteConfirmed} onChange={(event) => setDeleteConfirmed(event.target.checked)} className="mt-1" />
          <span>Tôi hiểu TVCI sẽ xóa dữ liệu tài khoản/bảo mật cục bộ, nhưng các tệp Google Drive sẽ không bị xóa.</span>
        </label>
        <label className="block text-sm">Nhập lại tên đăng nhập để xác nhận<input required maxLength={32} type="text" autoComplete="off" value={usernameConfirmation} onChange={(event) => setUsernameConfirmation(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        <button className="rounded-lg border border-rose-700 bg-rose-700 px-4 py-2 text-sm font-semibold text-white">Xóa tài khoản vĩnh viễn</button>
      </form>
    </section>}

    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <button type="button" onClick={signOut} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Đăng xuất</button>
  </div>;
}
