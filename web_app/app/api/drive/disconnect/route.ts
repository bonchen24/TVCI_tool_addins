import { disconnectDrive } from '@/drive/api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const POST = (request: Request) => disconnectDrive(request);
