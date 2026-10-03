import { handleResourceItem } from '@/drive/resource-api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await context.params;
  return handleResourceItem(request, category, id);
}
export async function PUT(request: Request, context: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await context.params;
  return handleResourceItem(request, category, id);
}
export async function PATCH(request: Request, context: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await context.params;
  return handleResourceItem(request, category, id);
}
export async function DELETE(request: Request, context: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await context.params;
  return handleResourceItem(request, category, id);
}
