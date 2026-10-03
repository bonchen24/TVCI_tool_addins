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
      <div className="flex h-16 min-w-0 flex-1 basis-0 items-center justify-center rounded-xl bg-white p-2 shadow-2xs transition hover:scale-[1.02]">
        <Image
          src="/brand/iemm.jpg"
          alt="IEMM"
          width={400}
          height={389}
          unoptimized
          className="max-h-12 w-full object-contain"
        />
      </div>
      <div
        className={`h-8 w-px shrink-0 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}
        aria-hidden="true"
      />
      <div className="flex h-16 min-w-0 flex-1 basis-0 items-center justify-center rounded-xl bg-white p-2 shadow-2xs transition hover:scale-[1.02]">
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
    <main className="relative grid min-h-screen w-full grid-cols-1 overflow-x-hidden bg-[#090D16] text-slate-100 lg:grid-cols-[48fr_52fr]">
      {/* Background ambient lighting effects spanning the full page */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.18),rgba(255,255,255,0))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.9) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 left-1/4 h-[32rem] w-[32rem] rounded-full bg-indigo-600/15 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 right-1/4 h-[28rem] w-[28rem] rounded-full bg-blue-600/10 blur-[100px]"
      />

      {/* Left Showcase (Desktop Only) */}
      <aside
        aria-label="Thông tin sản phẩm TVCI"
        className="relative z-10 hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/5 bg-slate-950/60 px-10 py-12 backdrop-blur-2xl lg:flex xl:px-16"
      >
        {/* Top brand header */}
        <div className="relative z-10 max-w-xs">
          <LoginLogos isDark />
        </div>

        {/* Middle hero content */}
        <div className="relative z-10 my-auto max-w-lg py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-indigo-300 backdrop-blur-md shadow-sm shadow-indigo-500/10">
            <Sparkles size={13} className="text-indigo-400 animate-pulse" />
            <span>NỀN TẢNG VĂN BẢN ĐIỆN TỬ TIÊU CHUẨN</span>
          </div>

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white xl:text-4xl">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-slate-300 bg-clip-text text-transparent">
              TVCI DocMaster
            </span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-300 xl:text-lg">
            Soạn thảo, chuẩn hóa và hỗ trợ xử lý văn bản
          </p>

          <ul className="mt-8 space-y-3.5">
            {productValues.map(({ label, description, Icon }) => (
              <li
                key={label}
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition-all duration-300 hover:border-indigo-400/40 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-500/25 group-hover:text-indigo-200 group-hover:border-indigo-400/50 shadow-sm shadow-indigo-500/10">
                  <Icon aria-hidden="true" size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-sm font-semibold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                    {label}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-400">
                    {description}
                  </div>
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
        className="relative z-10 flex min-h-screen w-full min-w-0 items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12"
      >
        <div className="relative z-10 w-full max-w-[28rem]">
          {/* Mobile brand header */}
          <section
            aria-label="Thương hiệu TVCI trên thiết bị di động"
            className="mb-8 flex flex-col items-center text-center lg:hidden"
          >
            <div className="w-full max-w-xs">
              <LoginLogos isDark={true} />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-white">
              <span className="bg-gradient-to-r from-white via-indigo-100 to-slate-300 bg-clip-text text-transparent">
                TVCI DocMaster
              </span>
            </h2>
          </section>

          {/* Elevated Glassmorphic Login Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-7 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl sm:p-9 ring-1 ring-white/5">
            {/* Top radiant border accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
            />

            <div className="mb-6 text-center">
              <h1 id="login-heading" className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Đăng nhập
              </h1>
            </div>

            <LoginForm />
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/80 animate-ping" />
            <span>Hệ thống quản lý văn bản nghiệp vụ tiêu chuẩn Viện IEMM & TVCI</span>
          </div>
        </div>
      </section>
    </main>
  );
}
