import Image from 'next/image';
import { FileCheck2, ShieldCheck, Sparkles } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

function LoginLogos() {
  return (
    <div className="flex w-full items-center justify-between gap-4" role="group" aria-label="Logo IEMM và TVCI">
      <div className="flex h-24 min-w-0 flex-1 items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:shadow-md">
        <Image
          src="/brand/iemm.jpg"
          alt="IEMM"
          width={400}
          height={389}
          unoptimized
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex h-24 min-w-0 flex-[1.6] items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
        <Image
          src="/brand/tvci.png"
          alt="TVCI"
          width={247}
          height={144}
          unoptimized
          className="max-h-16 w-full object-contain"
        />
      </div>
    </div>
  );
}

const productValues = [
  {
    label: 'Soạn thảo & chuẩn hóa',
    description: 'Định dạng và biểu mẫu chuẩn văn bản hành chính Việt Nam',
    Icon: FileCheck2,
  },
  {
    label: 'AI hỗ trợ',
    description: 'Trợ lý thông minh biên tập và hoàn thiện văn bản',
    Icon: Sparkles,
  },
  {
    label: 'Dữ liệu do người dùng kiểm soát',
    description: 'Lưu trữ cục bộ an toàn, tích hợp lưu trữ theo chủ quyền',
    Icon: ShieldCheck,
  },
];

export function LoginExperience() {
  return (
    <main className="grid min-h-screen w-full grid-cols-1 overflow-x-hidden bg-slate-50/60 lg:grid-cols-[46fr_54fr]">
      <aside
        aria-label="Thông tin sản phẩm TVCI"
        className="relative hidden min-h-screen overflow-hidden border-r border-slate-200/80 bg-gradient-to-br from-slate-50 via-slate-100/60 to-indigo-50/40 px-10 py-12 lg:flex lg:flex-col xl:px-16"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-12 right-10 z-0 hidden h-[21rem] w-[16rem] lg:block opacity-60"
        >
          <div className="absolute inset-0 translate-x-3 -translate-y-3 rounded-2xl border border-indigo-200/60 bg-white/40 backdrop-blur-sm" />
          <div className="relative h-full rounded-2xl border border-slate-200/90 bg-white/85 p-7 shadow-lg shadow-indigo-100/50 backdrop-blur-sm">
            <div className="mb-6 h-2 w-2/5 rounded-full bg-indigo-500/80" />
            <div className="space-y-3.5">
              <div className="h-2 w-full rounded-full bg-slate-100" />
              <div className="h-2 w-5/6 rounded-full bg-slate-100" />
              <div className="h-2 w-full rounded-full bg-slate-100" />
              <div className="h-2 w-3/4 rounded-full bg-slate-100" />
              <div className="h-2 w-11/12 rounded-full bg-slate-100" />
            </div>
            <div className="mt-8 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
              <div className="h-2 w-1/3 rounded-full bg-indigo-300" />
              <div className="mt-2 h-2 w-2/3 rounded-full bg-indigo-100" />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-full flex-1 flex-col justify-between">
          <div className="max-w-xs">
            <LoginLogos />
          </div>

          <div className="my-auto max-w-lg py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
              <Sparkles size={13} className="text-indigo-600" />
              <span>CÔNG NGHỆ SOẠN THẢO THÔNG MINH</span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 xl:text-4xl">
              TVCI Document Platform
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600 xl:text-lg">
              Soạn thảo, chuẩn hóa và hỗ trợ xử lý văn bản
            </p>

            <ul className="mt-10 space-y-4">
              {productValues.map(({ label, description, Icon }) => (
                <li
                  key={label}
                  className="flex items-start gap-3.5 rounded-xl border border-slate-200/60 bg-white/80 p-3.5 shadow-xs backdrop-blur-xs transition hover:border-indigo-200 hover:bg-white"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Icon aria-hidden="true" size={20} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="text-sm font-semibold text-slate-900">{label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{description}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-xs text-slate-500">
            Bản quyền © 2026 Viện IEMM & TVCI. Bảo lưu mọi quyền.
          </div>
        </div>
      </aside>

      <section
        aria-labelledby="login-heading"
        className="flex min-h-screen w-full min-w-0 items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12"
      >
        <div className="w-full max-w-[27rem]">
          <section
            aria-label="Thương hiệu TVCI trên thiết bị di động"
            className="mb-8 lg:hidden"
          >
            <div className="max-w-xs">
              <LoginLogos />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
              TVCI Document Platform
            </h2>
          </section>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h1 id="login-heading" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Đăng nhập
              </h1>
            </div>

            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
