import { adminListUsers } from '@/auth/admin-api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const GET = (request: Request) => adminListUsers(request);
