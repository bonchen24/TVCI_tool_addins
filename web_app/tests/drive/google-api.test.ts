// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { GoogleDriveClient } from '@/drive/google-api';

describe('Google Drive REST scoping', () => {
  it('limits list queries to one app-managed category under its parent', async () => {
    let requested = '';
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      requested = String(input);
      return new Response(JSON.stringify({ files: [] }), { status: 200 });
    });
    const client = new GoogleDriveClient('access-token-fixture', fetcher);
    await client.listManagedFiles('folder-id', 'knowledge', 'rule');
    const url = new URL(requested);
    const query = url.searchParams.get('q') || '';
    expect(query).toContain("'folder-id' in parents");
    expect(query).toContain("value='Knowledge'");
    expect(query).toContain("key='tvciManaged'");
    expect(query).toContain("name contains 'rule'");
    expect(query).toContain('trashed=false');
    expect(query).not.toContain('corpora=allDrives');
  });

  it('refuses to download a file that is not tagged in the requested category', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('alt=media')) return new Response('should-not-be-read', { status: 200 });
      return new Response(JSON.stringify({ id: 'file-id', parents: ['other-parent'], appProperties: { tvciManaged: 'true', tvciCategory: 'Documents' } }), { status: 200 });
    });
    const client = new GoogleDriveClient('access-token-fixture', fetcher);
    await expect(client.getManagedText('file-id', 'folder-id', 'knowledge')).rejects.toThrow(/outside the selected/i);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
