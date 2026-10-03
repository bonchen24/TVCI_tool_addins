import { adminIssueRecovery } from '@/auth/admin-api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return adminIssueRecovery(request, id);
}
