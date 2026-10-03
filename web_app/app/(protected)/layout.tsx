import { redirect } from 'next/navigation';
import { currentServerSession } from '@/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await currentServerSession();
  if (!session) redirect('/login');
  if (!session.termsAccepted) redirect('/consent');
  return children;
}
