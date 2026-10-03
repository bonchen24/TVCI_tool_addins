import { currentSession } from '@/auth/api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const GET = (request: Request) => currentSession(request);
