'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react';

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
        <label htmlFor="login-username" className="block text-sm font-semibold text-slate-800">
          Tên đăng nhập
        </label>
        <div className="relative mt-1.5">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <User size={18} aria-hidden="true" />
          </div>
          <input
            id="login-username"
            name="username"
            required
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Nhập tên đăng nhập"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-100"
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-semibold text-slate-800">
          Mật khẩu
        </label>
        <div className="relative mt-1.5">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-12 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-100"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="cursor-pointer absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center self-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" size={19} />
            ) : (
              <Eye aria-hidden="true" size={19} />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800 animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="cursor-pointer flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition-all hover:bg-indigo-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-wait disabled:bg-slate-400 disabled:shadow-none"
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin" size={18} aria-hidden="true" />
            <span>Đang đăng nhập…</span>
          </>
        ) : (
          <span>Đăng nhập</span>
        )}
      </button>

      <div className="space-y-2 pt-2 text-center">
        <a
          href="/register"
          className="cursor-pointer flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
        >
          Tạo tài khoản
        </a>
        <a
          href="/recover"
          className="cursor-pointer mx-auto flex min-h-10 w-fit items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-500 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
        >
          Khôi phục tài khoản
        </a>
      </div>
    </form>
  );
}
