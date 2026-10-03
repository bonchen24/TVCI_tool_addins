'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, Loader2, ArrowRight } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể đăng nhập.');
      router.push(result.user.mustChangePassword ? '/account' : '/');
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="login-username" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
          Tên đăng nhập
        </label>
        <div className="group relative mt-1.5 flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 transition-colors group-focus-within:text-indigo-600">
            <User size={18} aria-hidden="true" />
          </div>
          <input
            id="login-username"
            name="username"
            required
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Nhập tên tài khoản"
            className="h-12 w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
          Mật khẩu
        </label>
        <div className="group relative mt-1.5 flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 transition-colors group-focus-within:text-indigo-600">
            <Lock size={18} aria-hidden="true" />
          </div>
          <input
            id="login-password"
            name="password"
            required
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            className="h-12 w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-10 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="cursor-pointer absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" size={18} />
            ) : (
              <Eye aria-hidden="true" size={18} />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-800 animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="cursor-pointer relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all duration-200 hover:from-indigo-500 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 disabled:cursor-wait disabled:opacity-60 disabled:shadow-none"
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin" size={18} aria-hidden="true" />
            <span>Đang đăng nhập…</span>
          </>
        ) : (
          <>
            <span>Đăng nhập</span>
            <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <div className="relative my-6 flex items-center justify-center">
        <div className="w-full border-t border-slate-200/80" />
        <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">hoặc</span>
      </div>

      <div className="space-y-3 pt-1 text-center">
        <a
          href="/register"
          className="cursor-pointer flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-700 shadow-2xs transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
        >
          Tạo tài khoản
        </a>
        <a
          href="/recover"
          className="cursor-pointer inline-flex items-center justify-center text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600 focus-visible:outline-none focus-visible:underline py-1"
        >
          Khôi phục tài khoản
        </a>
      </div>
    </form>
  );
}
