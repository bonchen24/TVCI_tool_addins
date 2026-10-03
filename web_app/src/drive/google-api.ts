import { DRIVE_CATEGORIES, appManagedFilesQuery, type DriveCategory, type DriveFolderClient } from './folders';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  appProperties?: Record<string, string>;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

const FILE_FIELDS = 'id,name,mimeType,parents,appProperties,createdTime,modifiedTime,webViewLink,size';

export class GoogleDriveClient implements DriveFolderClient {
  constructor(private readonly accessToken: string, private readonly fetcher: typeof fetch = fetch) {}

  private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`https://www.googleapis.com${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.accessToken}`, ...(init.headers || {}) },
    });
    if (!response.ok) throw new Error(`Google Drive request failed (${response.status}).`);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async findAppFolder(name: string, parentId: string | null, category: string | null, isRoot: boolean): Promise<{ id: string } | null> {
    const terms = [
      `name='${this.escape(name)}'`,
      "mimeType='application/vnd.google-apps.folder'",
      'trashed=false',
      "appProperties has { key='tvciManaged' and value='true' }",
      ...(parentId ? [`'${this.escape(parentId)}' in parents`] : []),
      ...(category ? [`appProperties has { key='tvciCategory' and value='${this.escape(category)}' }`] : []),
      ...(isRoot ? ["appProperties has { key='tvciRoot' and value='true' }"] : []),
    ];
    const params = new URLSearchParams({ q: terms.join(' and '), fields: 'files(id)', pageSize: '10', spaces: 'drive' });
    const result = await this.api<{ files?: Array<{ id: string }> }>(`/drive/v3/files?${params}`);
    return result.files?.[0] || null;
  }

  async createAppFolder(name: string, parentId: string | null, appProperties: Record<string, string>): Promise<{ id: string }> {
    const body = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
      appProperties,
    };
    return this.api('/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  async listManagedFiles(parentId: string, category: DriveCategory, search = ''): Promise<DriveFile[]> {
    let query = appManagedFilesQuery(parentId, category);
    if (search.trim()) query += ` and name contains '${this.escape(search.trim())}'`;
    const params = new URLSearchParams({ q: query, fields: `files(${FILE_FIELDS}),nextPageToken`, pageSize: '100', orderBy: 'modifiedTime desc', spaces: 'drive' });
    const result = await this.api<{ files?: DriveFile[] }>(`/drive/v3/files?${params}`);
    return result.files || [];
  }

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    return this.api(`/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(FILE_FIELDS)}`);
  }

  async getManagedText(fileId: string, parentId: string, category: DriveCategory): Promise<string> {
    await this.assertManagedFile(fileId, parentId, category);
    const response = await this.fetcher(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) throw new Error(`Google Drive request failed (${response.status}).`);
    return response.text();
  }

  async createManagedText(name: string, parentId: string, category: DriveCategory, content: string, mimeType = 'application/json'): Promise<DriveFile> {
    const metadata = { name, mimeType, parents: [parentId], appProperties: { tvciManaged: 'true', tvciCategory: DRIVE_CATEGORIES[category] } };
    return this.multipartUpload(metadata, content, mimeType);
  }

  async updateManagedText(fileId: string, parentId: string, category: DriveCategory, content: string, mimeType = 'application/json'): Promise<void> {
    await this.assertManagedFile(fileId, parentId, category);
    const response = await this.fetcher(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': mimeType },
      body: content,
    });
    if (!response.ok) throw new Error(`Google Drive update failed (${response.status}).`);
  }

  async renameManagedFile(fileId: string, parentId: string, category: DriveCategory, name: string): Promise<void> {
    await this.assertManagedFile(fileId, parentId, category);
    await this.api(`/drive/v3/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
  }

  async deleteManagedFile(fileId: string, parentId: string, category: DriveCategory): Promise<void> {
    await this.assertManagedFile(fileId, parentId, category);
    const response = await this.fetcher(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok && response.status !== 204) throw new Error(`Google Drive delete failed (${response.status}).`);
  }

  async revoke(token: string): Promise<void> {
    const body = new URLSearchParams({ token });
    const response = await this.fetcher('https://oauth2.googleapis.com/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    if (!response.ok) throw new Error('Google token revocation failed.');
  }

  private async assertManagedFile(fileId: string, parentId: string, category: DriveCategory): Promise<void> {
    const file = await this.getFileMetadata(fileId);
    if (!file.parents?.includes(parentId) || file.appProperties?.tvciManaged !== 'true' || file.appProperties?.tvciCategory !== DRIVE_CATEGORIES[category]) {
      throw new Error('File is outside the selected TVCI Drive category.');
    }
  }

  private async multipartUpload(metadata: unknown, content: string, mimeType: string): Promise<DriveFile> {
    const boundary = `tvci_${crypto.randomUUID().replace(/-/g, '')}`;
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n`,
      `--${boundary}--`,
    ].join('');
    return this.api(`/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(FILE_FIELDS)}`, {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
    });
  }

  private escape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
