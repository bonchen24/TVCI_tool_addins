import { AuthShell } from '@/components/auth/AuthShell';
import { RecoverForm } from '@/components/auth/RecoverForm';

export default function RecoverPage() {
  return <AuthShell title="Khôi phục tài khoản" subtitle="Dùng tên đăng nhập và mã khôi phục đã lưu khi tạo tài khoản."><RecoverForm /></AuthShell>;
}
