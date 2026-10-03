import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PersonalStoragePanel } from '@/components/drive/PersonalStoragePanel';

describe('personal Drive resource editing and deletion', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/drive/templates?search=') return Response.json({ resources: [{ fileId: 'tpl1', title: 'Notice', category: 'templates' }] });
      if (url === '/api/drive/templates/tpl1') return Response.json({ resource: { fileId: 'tpl1', title: 'Notice', category: 'templates', content: { type: 'doc', content: [] } } });
      return Response.json({ success: true, resources: [] });
    }));
  });

  it('edits a personal template in Drive and keeps its category', async () => {
    render(<PersonalStoragePanel driveConnected />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/drive/documents?search='));
    fireEvent.click(screen.getByRole('tab', { name: /thư viện cá nhân/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    const editor = await screen.findByLabelText(/nội dung mẫu cá nhân/i);
    fireEvent.change(screen.getByLabelText(/tên mục/i), { target: { value: 'Updated notice' } });
    fireEvent.change(editor, { target: { value: '{"type":"doc","content":[]}' } });
    fireEvent.click(screen.getByRole('button', { name: /cập nhật mẫu cá nhân/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/drive/templates/tpl1', expect.objectContaining({ method: 'PUT' })));
    const [, request] = vi.mocked(fetch).mock.calls.find(([url, init]) => String(url) === '/api/drive/templates/tpl1' && init?.method === 'PUT')!;
    expect(JSON.parse(String(request?.body))).toMatchObject({ title: 'Updated notice', content: { type: 'doc' } });
  });

  it('requires an explicit confirmation before deleting a managed resource', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<PersonalStoragePanel driveConnected />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/drive/documents?search='));
    fireEvent.click(screen.getByRole('tab', { name: /thư viện cá nhân/i }));
    await screen.findByText('Notice');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(confirm).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalledWith('/api/drive/templates/tpl1', expect.objectContaining({ method: 'DELETE' }));

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/drive/templates/tpl1', expect.objectContaining({ method: 'DELETE' })));
  });
});
