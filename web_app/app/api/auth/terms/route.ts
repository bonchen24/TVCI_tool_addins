import { acceptTerms } from '@/auth/api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const POST = (request: Request) => acceptTerms(request);
