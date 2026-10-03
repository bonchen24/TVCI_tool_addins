import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { AdminUsersPanel } from '@/components/auth/AdminUsersPanel';
import LoginPage from '@app/(public)/login/page';

const { routerPush, routerRefresh } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerRefresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
}));

describe('login experience', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    routerPush.mockReset();
    routerRefresh.mockReset();
  });

  it('renders both real brand logos with accessible names and undistorted sizing', () => {
    render(<LoginPage />);

    const iemmLogos = screen.getAllByRole('img', { name: 'IEMM' });
    const tvciLogos = screen.getAllByRole('img', { name: 'TVCI' });

    expect(iemmLogos).toHaveLength(2);
    expect(tvciLogos).toHaveLength(2);
    expect(iemmLogos[0]).toHaveAttribute('src', '/brand/iemm.jpg');
    expect(tvciLogos[0]).toHaveAttribute('src', '/brand/tvci.png');
    [...iemmLogos, ...tvciLogos].forEach((logo) => expect(logo).toHaveClass('object-contain'));
    expect(screen.queryByText(/^TV$/)).not.toBeInTheDocument();
  });

  it('provides a desktop product panel and a compact mobile brand header', () => {
    render(<LoginPage />);

    const desktopPanel = screen.getByRole('complementary', { name: 'Thông tin sản phẩm TVCI' });
    const mobileBrand = screen.getByRole('region', { name: 'Thương hiệu TVCI trên thiết bị di động' });

    expect(desktopPanel).toHaveClass('hidden', 'lg:flex');
    expect(mobileBrand).toHaveClass('lg:hidden');
    expect(desktopPanel).toHaveTextContent('Soạn thảo & chuẩn hóa');
    expect(desktopPanel).toHaveTextContent('AI hỗ trợ');
    expect(desktopPanel).toHaveTextContent('Dữ liệu do người dùng kiểm soát');
  });

  it('renders the approved product, subtitle, and login heading without small subtitle copy', () => {
    render(<LoginPage />);

    expect(screen.getAllByText('TVCI DocMaster')).toHaveLength(2);
    expect(screen.getByText('Soạn thảo, chuẩn hóa và hỗ trợ xử lý văn bản')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.queryByText(/Tài khoản TVCI độc lập với Google Drive/i)).not.toBeInTheDocument();
  });

  it('starts with a hidden password and toggles visibility without submitting the form', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const password = screen.getByLabelText('Mật khẩu');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute('type', 'button');
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it.each([
    { mustChangePassword: false, destination: '/' },
    { mustChangePassword: true, destination: '/account' },
  ])('posts credentials and keeps the existing redirect to $destination', async ({ mustChangePassword, destination }) => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ user: { mustChangePassword } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Tên đăng nhập'), 'staff_01');
    await user.type(screen.getByLabelText('Mật khẩu'), 'fixture-password');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff_01', password: 'fixture-password' }),
    }));
    expect(routerPush).toHaveBeenCalledWith(destination);
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it('retains the busy state while the login request is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>(() => {}));
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Tên đăng nhập'), 'staff_01');
    await user.type(screen.getByLabelText('Mật khẩu'), 'fixture-password');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(screen.getByRole('button', { name: /đang đăng nhập/i })).toBeDisabled();
  });

  it('keeps account creation and recovery links and has no Google sign-in action', () => {
    render(<LoginPage />);

    expect(screen.getByRole('link', { name: 'Tạo tài khoản' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Khôi phục tài khoản' })).toHaveAttribute('href', '/recover');
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
  });

  it('keeps the login shell fluid at mobile widths', () => {
    render(<LoginPage />);

    const shell = screen.getByRole('main');
    const mobileBrand = screen.getByRole('region', { name: 'Thương hiệu TVCI trên thiết bị di động' });
    expect(shell).toHaveClass('w-full', 'overflow-x-hidden');
    expect(shell.className).not.toMatch(/(?:^|\s)(?:min-w|w)-\[\d+(?:px|rem|vw|%)\](?:\s|$)/);

    const fixedMobileWidths = [mobileBrand, ...mobileBrand.querySelectorAll<HTMLElement>('[class]')]
      .flatMap((element) => Array.from(element.classList))
      .filter((className) => /^w-(?:\d+|\[[^\]]+\])$/.test(className));
    expect(fixedMobileWidths).toEqual([]);
  });
});

describe('registration privacy and recovery UI', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('collects only username and password fields and gates creation on unchecked terms', () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/tên đăng nhập/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mật khẩu$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/xác nhận mật khẩu/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/họ tên|email|điện thoại|địa chỉ|ngày sinh|giới tính/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/không dùng họ tên thật, email hoặc số điện thoại/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /tạo tài khoản/i })).toBeDisabled();
    expect(screen.getByTestId('terms-copy')).toHaveClass('overflow-y-auto');
  });

  it('shows the approved product contact attribution and details', () => {
    render(<RegisterForm />);
    const termsCopy = screen.getByTestId('terms-copy');

    expect(termsCopy).toHaveTextContent('Đại diện nhóm tác giả: Lương Xuân Hùng');
    expect(termsCopy).toHaveTextContent('Zalo/Điện thoại: 0983565139');
    expect(termsCopy).toHaveTextContent('Email: luongxuanhung2402@gmail.com');
  });

  it('shows the recovery code once after successful registration', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      recoveryCode: 'one-time-recovery-code-fixture',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/tên đăng nhập/i), 'writer_01');
    await user.type(screen.getByLabelText(/^mật khẩu$/i), 'not-a-real-password-1');
    await user.type(screen.getByLabelText(/xác nhận mật khẩu/i), 'not-a-real-password-1');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /tạo tài khoản/i }));
    expect(await screen.findByText('one-time-recovery-code-fixture')).toBeInTheDocument();
    expect(screen.getByText(/lưu mã này an toàn/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ method: 'POST' }));
  });
});

describe('admin consent evidence table', () => {
  it('renders each consent state and the accepted/current version and timestamp fields', () => {
    render(<AdminUsersPanel initialUsers={[
      {
        id: 'accepted-user', username: 'accepted_user', role: 'user', status: 'enabled',
        createdAt: '2026-09-01T00:00:00.000Z', driveConnected: false, mustChangePassword: false,
        acceptedTermsVersion: 'terms-2026-v2', acceptedTermsAt: '2026-09-02T03:04:05.000Z',
        currentTermsVersion: 'terms-2026-v3', consentStatus: 'accepted',
      },
      {
        id: 'old-user', username: 'old_user', role: 'user', status: 'disabled',
        createdAt: '2026-09-03T00:00:00.000Z', driveConnected: true, mustChangePassword: true,
        acceptedTermsVersion: 'terms-2026-v2', acceptedTermsAt: '2026-09-04T03:04:05.000Z',
        currentTermsVersion: 'terms-2026-v3', consentStatus: 'needs_reacceptance',
      },
      {
        id: 'new-user', username: 'new_user', role: 'superadmin', status: 'enabled',
        createdAt: '2026-09-05T00:00:00.000Z', driveConnected: false, mustChangePassword: true,
        acceptedTermsVersion: null, acceptedTermsAt: null,
        currentTermsVersion: 'terms-2026-v3', consentStatus: 'not_accepted',
      },
    ]} />);

    expect(screen.getByRole('columnheader', { name: 'Cam kết' })).toBeInTheDocument();
    expect(screen.getByText('Đã đồng ý')).toBeInTheDocument();
    expect(screen.getByText('Cần đồng ý lại')).toBeInTheDocument();
    expect(screen.getByText('Chưa đồng ý')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tên đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Vai trò' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Trạng thái tài khoản' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Ngày tạo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Phiên bản đã đồng ý' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Thời điểm đồng ý' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Phiên bản hiện tại' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Google Drive' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument();
    expect(screen.getAllByText('terms-2026-v2')).toHaveLength(2);
    expect(screen.getAllByText('terms-2026-v3')).toHaveLength(3);
    expect(screen.getByText('2026-09-02T03:04:05.000Z')).toBeInTheDocument();
    expect(screen.getByText('2026-09-04T03:04:05.000Z')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /đồng ý/i })).not.toBeInTheDocument();
  });
});
