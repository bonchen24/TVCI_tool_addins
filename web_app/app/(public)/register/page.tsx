import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return <AuthShell title="Tạo tài khoản" subtitle="Chỉ cần tên đăng nhập và mật khẩu. Không cần thông tin hồ sơ cá nhân."><RegisterForm /></AuthShell>;
}
