import { handleResourceCollection } from '@/drive/resource-api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ category: string }> }) {
  const { category } = await context.params;
  return handleResourceCollection(request, category);
}
export async function POST(request: Request, context: { params: Promise<{ category: string }> }) {
  const { category } = await context.params;
  return handleResourceCollection(request, category);
}
