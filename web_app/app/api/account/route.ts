import { deleteAccount } from '@/auth/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const DELETE = (request: Request) => deleteAccount(request);
