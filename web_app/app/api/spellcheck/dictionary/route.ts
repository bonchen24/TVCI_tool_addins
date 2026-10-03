import { addUserDictionaryTerm, deleteUserDictionaryTerm, getUserDictionary } from '@/spellcheck/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const GET = (request: Request) => getUserDictionary(request);
export const POST = (request: Request) => addUserDictionaryTerm(request);
export const DELETE = (request: Request) => deleteUserDictionaryTerm(request);
