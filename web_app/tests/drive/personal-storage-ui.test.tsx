import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PersonalStoragePanel } from '@/components/drive/PersonalStoragePanel';

describe('personal Drive storage controls', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, resources: [] }), { status: 200 }))));

  it('explains Drive is required for long-term Knowledge and disables persistent saves offline', () => {
    render(<PersonalStoragePanel driveConnected={false} />);
    fireEvent.click(screen.getByRole('tab', { name: /tri thức/i }));
    expect(screen.getByText(/Drive cần thiết để lưu dài hạn/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lưu vào tri thức/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /kết nối Google Drive để lưu/i })).toHaveAttribute('href', '/api/drive/connect');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('writes Knowledge only after the explicit save action and keeps personal templates separately named', async () => {
    render(<PersonalStoragePanel driveConnected={true} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('tab', { name: /tri thức/i }));
    fireEvent.change(screen.getByLabelText(/tiêu đề tri thức/i), { target: { value: 'Rule' } });
    fireEvent.change(screen.getByLabelText(/nội dung tri thức/i), { target: { value: 'Chosen content' } });
    expect(fetch).not.toHaveBeenCalledWith('/api/drive/knowledge', expect.objectContaining({ method: 'POST' }));
    fireEvent.click(screen.getByRole('button', { name: /lưu vào tri thức/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/drive/knowledge', expect.objectContaining({ method: 'POST' })));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));
    fireEvent.click(screen.getByRole('tab', { name: /thư viện cá nhân/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));
    expect(screen.getByText(/mẫu hệ thống/i)).toBeInTheDocument();
  });

  it('keeps references in their own category and exposes only user-selected items to AI context', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input) === '/api/drive/references/r1') return new Response(JSON.stringify({ resource: { fileId: 'r1', category: 'references', title: 'Manual', content: 'manual context' } }), { status: 200 });
      return new Response(JSON.stringify({ success: true, resources: [{ fileId: 'r1', title: 'Manual', category: 'references' }] }), { status: 200 });
    });
    const onSelectedContextItemsChange = vi.fn();
    render(<PersonalStoragePanel driveConnected={true} onSelectedContextItemsChange={onSelectedContextItemsChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /tham khảo/i }));
    const checkbox = await screen.findByRole('checkbox', { name: /chọn cho yêu cầu ai/i });
    fireEvent.click(checkbox);
    await waitFor(() => expect(onSelectedContextItemsChange).toHaveBeenCalledWith([
      expect.objectContaining({ fileId: 'r1', category: 'references', content: 'manual context' }),
    ]));
    expect(fetch).not.toHaveBeenCalledWith('/api/drive/knowledge', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText(/không tự chuyển sang tri thức/i)).toBeInTheDocument();
  });
});
