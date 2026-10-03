import { adminSetStatus } from '@/auth/admin-api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return adminSetStatus(request, id);
}
