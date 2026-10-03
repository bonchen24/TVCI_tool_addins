import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Header } from '@/components/layout/Header';

function renderHeader(overrides: Partial<React.ComponentProps<typeof Header>> = {}) {
  return render(<Header
    documentTitle="Current document"
    isSaved={false}
    sidebarOpen
    username="private_user"
    role="user"
    driveConnected={false}
    onTitleChange={vi.fn()}
    onToggleSidebar={vi.fn()}
    onNewDocument={vi.fn()}
    onImportDocx={vi.fn()}
    onExportDocx={vi.fn()}
    onOpenSettings={vi.fn()}
    onSaveToDrive={vi.fn()}
    onSaveAsToDrive={vi.fn()}
    onOpenDrive={vi.fn()}
    onLogout={vi.fn()}
    {...overrides}
  />);
}

describe('privacy-correct header storage actions', () => {
  it('offers Drive connection and local DOCX export while disconnected', () => {
    const onExportDocx = vi.fn();
    renderHeader({ onExportDocx });

    expect(screen.getByRole('link', { name: 'Kết nối Google Drive để lưu' })).toHaveAttribute('href', '/api/drive/connect');
    fireEvent.click(screen.getByRole('button', { name: 'Xuất DOCX' }));
    expect(onExportDocx).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Lưu DB|SQLite|Kho tài liệu DB/i)).not.toBeInTheDocument();
  });

  it('offers Drive save, open, and copy actions when connected', () => {
    const onSaveToDrive = vi.fn();
    const onSaveAsToDrive = vi.fn();
    const onOpenDrive = vi.fn();
    renderHeader({ driveConnected: true, onSaveToDrive, onSaveAsToDrive, onOpenDrive });

    fireEvent.click(screen.getByRole('button', { name: 'Lưu vào Drive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở từ Drive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản sao' }));
    expect(onSaveToDrive).toHaveBeenCalledOnce();
    expect(onOpenDrive).toHaveBeenCalledOnce();
    expect(onSaveAsToDrive).toHaveBeenCalledOnce();
  });

  it('shows the account identity and provides account and role-appropriate admin links', () => {
    renderHeader({ role: 'superadmin' });
    fireEvent.click(screen.getByRole('button', { name: /private_user/i }));

    expect(screen.getByRole('menuitem', { name: 'Tài khoản' })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('menuitem', { name: 'Quản trị' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
  });
});
