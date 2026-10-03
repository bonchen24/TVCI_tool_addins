import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { AccountPanel } from '@/components/auth/AccountPanel';

const { routerPush, routerRefresh } = vi.hoisted(() => ({ routerPush: vi.fn(), routerRefresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
}));

function renderPanel(props: Partial<ComponentProps<typeof AccountPanel>> = {}) {
  return render(<AccountPanel username="writer_01" driveConnected={false} mustChangePassword={false} role="user" {...props} />);
}

describe('account settings panel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    routerPush.mockReset();
    routerRefresh.mockReset();
  });

  it('always offers voluntary password change to a normal account', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Xác nhận mật khẩu mới')).toHaveAttribute('type', 'password');
  });

  it('keeps forced password changes prominent and does not offer normal-user deletion', () => {
    renderPanel({ mustChangePassword: true, role: 'superadmin' });

    expect(screen.getByRole('heading', { name: 'Đổi mật khẩu để tiếp tục' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Đổi mật khẩu để tiếp tục' }).closest('form')).toHaveClass('border-amber-300', 'bg-amber-50');
    expect(screen.getByRole('button', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Vùng nguy hiểm' })).not.toBeInTheDocument();
  });

  it('enforces the existing password length and confirmation rules before sending a request', async () => {
    const user = userEvent.setup();
    renderPanel();
    const current = screen.getByLabelText('Mật khẩu hiện tại');
    const next = screen.getByLabelText('Mật khẩu mới');
    const confirm = screen.getByLabelText('Xác nhận mật khẩu mới');

    expect(current).toBeRequired();
    expect(next).toHaveAttribute('minlength', '12');
    expect(next).toHaveAttribute('maxlength', '128');
    expect(confirm).toBeRequired();
    expect(confirm).toHaveAttribute('minlength', '12');
    expect(confirm).toHaveAttribute('maxlength', '128');
    await user.type(current, 'current-password-fixture');
    await user.type(next, 'new-password-fixture');
    await user.type(confirm, 'different-password-fixture');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu xác nhận không khớp.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('states that account metadata is deleted while all Google Drive files remain', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Vùng nguy hiểm' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Xóa tài khoản' })).toBeInTheDocument();
    expect(screen.getByText('Xóa tài khoản TVCI sẽ xóa thông tin tài khoản/bảo mật cục bộ của ứng dụng.')).toBeInTheDocument();
    expect(screen.getByText('Tệp Documents, Templates/Thư viện, Knowledge/Tri thức và References đã lưu trong Google Drive của người dùng KHÔNG bị xóa.')).toBeInTheDocument();
    expect(screen.getByText('Nếu muốn xóa file Drive, người dùng tự thực hiện trong Google Drive.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Nhập lại tên đăng nhập để xác nhận')).toBeInTheDocument();
  });

  it('does not submit account deletion without the explicit confirmation checkbox', async () => {
    const user = userEvent.setup();
    renderPanel();
    const checkbox = screen.getByRole('checkbox');
    await user.type(screen.getByLabelText('Mật khẩu hiện tại để xóa tài khoản'), 'current-password-fixture');
    await user.type(screen.getByLabelText('Nhập lại tên đăng nhập để xác nhận'), 'writer_01');
    await user.click(screen.getByRole('button', { name: 'Xóa tài khoản vĩnh viễn' }));

    expect(checkbox).toBeInvalid();
    expect(fetch).not.toHaveBeenCalled();
  });
});
