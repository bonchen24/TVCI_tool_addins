import Link from 'next/link';
import { notFound } from 'next/navigation';
import { canAccessAdmin } from '@/auth/access-control';
import { currentServerSession } from '@/auth/server';
import { listAdminUsers } from '@/auth/service';
import { AdminUsersPanel } from '@/components/auth/AdminUsersPanel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminPage() {
  const session = await currentServerSession();
  if (!canAccessAdmin(session)) notFound();
  const users = listAdminUsers();
  return <main className="min-h-screen overflow-y-auto bg-slate-100 px-4 py-8 sm:px-6">
    <section className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
      <Link href="/" className="text-sm text-indigo-700">← Quay lại trình soạn thảo</Link>
      <h1 className="mt-4 text-2xl font-bold">Quản trị tài khoản</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Chỉ hiển thị trạng thái tài khoản và kết nối. Không có quyền truy cập nội dung cá nhân.</p>
      <AdminUsersPanel initialUsers={users} />
    </section>
  </main>;
}
