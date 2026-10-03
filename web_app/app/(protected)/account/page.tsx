import Link from 'next/link';
import { currentServerSession } from '@/auth/server';
import { getDatabase } from '@/db/client';
import { AccountPanel } from '@/components/auth/AccountPanel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AccountPage() {
  const session = (await currentServerSession())!;
  const driveConnected = Boolean(getDatabase().prepare('SELECT user_id FROM drive_connections WHERE user_id = ?').get(session.id));
  return <main className="min-h-screen overflow-y-auto bg-slate-100 px-4 py-8 sm:px-6">
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
      <Link href="/" className="text-sm text-indigo-700">← Quay lại trình soạn thảo</Link>
      <h1 className="mb-6 mt-4 text-2xl font-bold">Tài khoản</h1>
      <AccountPanel username={session.username} driveConnected={driveConnected} mustChangePassword={session.mustChangePassword} role={session.role} />
    </section>
  </main>;
}
