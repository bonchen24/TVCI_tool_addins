import Image from 'next/image';
import { CheckCircle2, FileCheck2, ShieldCheck, Sparkles } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

function LoginLogos({ isDark = false }: { isDark?: boolean }) {
  return (
    <div
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-2 backdrop-blur-md transition-all ${
        isDark
          ? 'border-white/10 bg-white/[0.04] shadow-inner'
          : 'border-slate-200/90 bg-white shadow-xs'
      }`}
      role="group"
      aria-label="Logo IEMM và TVCI"
    >
      <div className="flex h-16 min-w-0 flex-1 items-center justify-center rounded-xl bg-white p-2 shadow-2xs transition hover:scale-[1.02]">
        <Image
          src="/brand/iemm.jpg"
          alt="IEMM"
          width={400}
          height={389}
          unoptimized
          className="h-full w-full object-contain"
        />
      </div>
      <div
        className={`h-8 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}
        aria-hidden="true"
      />
      <div className="flex h-16 min-w-0 flex-[1.4] items-center justify-center rounded-xl bg-white px-3 py-1.5 shadow-2xs transition hover:scale-[1.02]">
        <Image
          src="/brand/tvci.png"
          alt="TVCI"
          width={247}
          height={144}
          unoptimized
          className="max-h-12 w-full object-contain"
        />
      </div>
    </div>
  );
}

const productValues = [
  {
    label: 'Soạn thảo & chuẩn hóa',
    description: 'Tự động định dạng thể thức theo chuẩn Nghị định 30/2020/NĐ-CP',
    Icon: FileCheck2,
  },
  {
    label: 'AI hỗ trợ',
    description: 'Trợ lý thông minh hoàn thiện ngữ cảnh và nội dung văn bản chuyên sâu',
    Icon: Sparkles,
  },
  {
    label: 'Dữ liệu do người dùng kiểm soát',
    description: 'Bảo mật quyền riêng tư tối đa, lưu trữ cục bộ và đám mây có chủ quyền',
    Icon: ShieldCheck,
  },
];

export function LoginExperience() {
  return (
    <main className="grid min-h-screen w-full grid-cols-1 overflow-x-hidden bg-slate-50 lg:grid-cols-[48fr_52fr]">
      {/* Left Showcase (Desktop Only) */}
      <aside
        aria-label="Thông tin sản phẩm TVCI"
        className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-slate-800/80 bg-slate-950 px-10 py-12 text-white lg:flex xl:px-16"
      >
        {/* Background ambient lighting and grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/60 via-slate-950 to-slate-950 opacity-90"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.9) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Ambient glow orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl"
        />

        {/* Top brand header */}
        <div className="relative z-10 max-w-xs">
          <LoginLogos isDark />
        </div>

        {/* Middle hero content */}
        <div className="relative z-10 my-auto max-w-lg py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-indigo-300 backdrop-blur-md">
            <Sparkles size={13} className="text-indigo-400" />
            <span>NỀN TẢNG VĂN BẢN ĐIỆN TỬ TIÊU CHUẨN</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white xl:text-4xl">
            TVCI Document Platform
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-300 xl:text-lg">
            Soạn thảo, chuẩn hóa và hỗ trợ xử lý văn bản
          </p>

          <ul className="mt-8 space-y-3.5">
            {productValues.map(({ label, description, Icon }) => (
              <li
                key={label}
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition-all duration-200 hover:border-indigo-400/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 transition-transform duration-200 group-hover:scale-105 group-hover:bg-indigo-500/25 group-hover:text-indigo-200">
                  <Icon aria-hidden="true" size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-sm font-semibold tracking-tight text-white">{label}</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-400">{description}</div>
                </div>
              </li>
            ))}
          </ul>

          {/* Realistic document card badge */}
          <div className="mt-8 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">
                Tuân thủ Nghị định 30/2020/NĐ-CP về công tác văn thư
              </span>
            </div>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              ĐÃ XÁC THỰC
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span>Bản quyền © 2026 Viện IEMM & TVCI.</span>
          <span>Bảo lưu mọi quyền.</span>
        </div>
      </aside>

      {/* Right Login Section */}
      <section
        aria-labelledby="login-heading"
        className="relative flex min-h-screen w-full min-w-0 items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12"
      >
        {/* Subtle background glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent"
        />

        <div className="relative z-10 w-full max-w-[28rem]">
          {/* Mobile brand header */}
          <section
            aria-label="Thương hiệu TVCI trên thiết bị di động"
            className="mb-6 lg:hidden"
          >
            <div className="max-w-xs">
              <LoginLogos isDark={false} />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
              TVCI Document Platform
            </h2>
          </section>

          {/* Elevated Login Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl shadow-slate-900/[0.03] sm:p-9">
            <div className="mb-6">
              <h1 id="login-heading" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Đăng nhập
              </h1>
            </div>

            <LoginForm />
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Hệ thống quản lý văn bản nghiệp vụ tiêu chuẩn Viện IEMM & TVCI
          </div>
        </div>
      </section>
    </main>
  );
}
