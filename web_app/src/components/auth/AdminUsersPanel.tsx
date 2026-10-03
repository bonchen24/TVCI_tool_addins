'use client';

import { useState } from 'react';
import type { AdminUser } from '@/auth/service';

const consentBadges: Record<AdminUser['consentStatus'], { label: string; className: string }> = {
  accepted: { label: 'Đã đồng ý', className: 'bg-emerald-100 text-emerald-800' },
  needs_reacceptance: { label: 'Cần đồng ý lại', className: 'bg-amber-100 text-amber-900' },
  not_accepted: { label: 'Chưa đồng ý', className: 'bg-slate-200 text-slate-800' },
};

export function AdminUsersPanel({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState('');

  async function changeStatus(user: AdminUser) {
    const status = user.status === 'enabled' ? 'disabled' : 'enabled';
    if (status === 'disabled' && !window.confirm(`Vô hiệu hóa tài khoản ${user.username}?`)) return;
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    if (!response.ok) return setError('Không thể cập nhật tài khoản.');
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status } : item));
  }

  async function issueCode(user: AdminUser) {
    setRecoveryCode('');
    const response = await fetch(`/api/admin/users/${user.id}/recovery`, { method: 'POST' });
    const result = await response.json();
    if (!response.ok) return setError('Không thể tạo mã đặt lại.');
    setRecoveryCode(`${user.username}: ${result.recoveryCode}`);
  }

  return <div className="space-y-4">
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {recoveryCode && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3"><p className="text-sm font-semibold">Mã khôi phục hiển thị một lần</p><code className="mt-2 block break-all">{recoveryCode}</code></div>}
    <div className="overflow-x-auto rounded-xl border border-slate-200" role="region" aria-label="Danh sách tài khoản quản trị" tabIndex={0}>
      <table className="min-w-[1320px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="whitespace-nowrap p-3">Tên đăng nhập</th>
            <th scope="col" className="whitespace-nowrap p-3">Vai trò</th>
            <th scope="col" className="whitespace-nowrap p-3">Trạng thái tài khoản</th>
            <th scope="col" className="whitespace-nowrap p-3">Ngày tạo</th>
            <th scope="col" className="whitespace-nowrap p-3">Cam kết</th>
            <th scope="col" className="whitespace-nowrap p-3">Phiên bản đã đồng ý</th>
            <th scope="col" className="whitespace-nowrap p-3">Thời điểm đồng ý</th>
            <th scope="col" className="whitespace-nowrap p-3">Phiên bản hiện tại</th>
            <th scope="col" className="whitespace-nowrap p-3">Google Drive</th>
            <th scope="col" className="whitespace-nowrap p-3">Đổi mật khẩu</th>
            <th scope="col" className="whitespace-nowrap p-3">Thao tác</th>
          </tr>
        </thead>
        <tbody>{users.map((user) => {
          const consent = consentBadges[user.consentStatus];
          return <tr key={user.id} className="border-t border-slate-100">
            <td className="whitespace-nowrap p-3 font-medium">{user.username}</td>
            <td className="whitespace-nowrap p-3">{user.role === 'superadmin' ? 'Superadmin' : 'Người dùng'}</td>
            <td className="whitespace-nowrap p-3">{user.status === 'enabled' ? 'Đang bật' : 'Đã tắt'}</td>
            <td className="whitespace-nowrap p-3">{user.createdAt}</td>
            <td className="whitespace-nowrap p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${consent.className}`}>{consent.label}</span></td>
            <td className="whitespace-nowrap p-3">{user.acceptedTermsVersion ?? '—'}</td>
            <td className="whitespace-nowrap p-3">{user.acceptedTermsAt ?? '—'}</td>
            <td className="whitespace-nowrap p-3">{user.currentTermsVersion}</td>
            <td className="whitespace-nowrap p-3">{user.driveConnected ? 'Có' : 'Không'}</td>
            <td className="whitespace-nowrap p-3">{user.mustChangePassword ? 'Có' : 'Không'}</td>
            <td className="space-x-2 whitespace-nowrap p-3">
              <button type="button" onClick={() => changeStatus(user)} className="text-indigo-700">{user.status === 'enabled' ? 'Vô hiệu hóa' : 'Bật lại'}</button>
              <button type="button" onClick={() => issueCode(user)} className="text-indigo-700">Tạo mã đặt lại</button>
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
