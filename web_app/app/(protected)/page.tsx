import { redirect } from 'next/navigation';
import { currentServerSession } from '@/auth/server';
import EditorWorkspace from '@/components/editor/EditorWorkspace';

export default async function EditorPage() {
  const session = await currentServerSession();
  if (!session) redirect('/login');
  if (session?.mustChangePassword) redirect('/account');
  return <EditorWorkspace user={{ username: session.username, role: session.role }} />;
}
