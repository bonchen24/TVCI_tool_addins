import { driveStatus } from '@/drive/api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const GET = (request: Request) => driveStatus(request);
