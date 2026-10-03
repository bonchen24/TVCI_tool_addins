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
        <label htmlFor="login-username" className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-300">
          Tên đăng nhập
        </label>
        <div className="group relative mt-1.5 flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 transition-colors group-focus-within:text-indigo-400">
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
            className="h-12 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 pl-10 pr-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-indigo-400 focus:bg-slate-800/90 focus:ring-4 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-300">
          Mật khẩu
        </label>
        <div className="group relative mt-1.5 flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 transition-colors group-focus-within:text-indigo-400">
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
            className="h-12 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-indigo-400 focus:bg-slate-800/90 focus:ring-4 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="cursor-pointer absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
        <div role="alert" className="text-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-xs font-medium text-rose-300 animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="cursor-pointer relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:from-indigo-400 hover:to-blue-500 hover:shadow-indigo-600/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 disabled:cursor-wait disabled:opacity-60 disabled:shadow-none"
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
        <div className="w-full border-t border-white/10" />
        <span className="absolute rounded-full border border-white/5 bg-slate-900/90 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur-md">hoặc</span>
      </div>

      <div className="space-y-3 pt-1 text-center">
        <a
          href="/register"
          className="cursor-pointer flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-indigo-400/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
        >
          Tạo tài khoản
        </a>
        <a
          href="/recover"
          className="cursor-pointer inline-flex items-center justify-center text-xs font-medium text-slate-400 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:underline py-1"
        >
          Khôi phục tài khoản
        </a>
      </div>
    </form>
  );
}
