import { cookies } from 'next/headers';
import { getDatabase } from '@/db/client';
import { SESSION_COOKIE_NAME, getSession } from './service';

export async function currentServerSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return getSession(token, getDatabase());
}
