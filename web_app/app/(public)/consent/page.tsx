import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { ConsentForm } from '@/components/auth/ConsentForm';
import { currentServerSession } from '@/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function ConsentPage() {
  const session = await currentServerSession();
  if (!session) redirect('/login');
  if (session.termsAccepted) redirect('/');
  return <AuthShell title="Điều khoản đã được cập nhật" subtitle="Hãy xem và chấp nhận phiên bản hiện hành để tiếp tục."><ConsentForm /></AuthShell>;
}
