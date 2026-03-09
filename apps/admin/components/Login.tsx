import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, verify2FA, isLoading, error, errorCode, clearError, isAuthenticated, pending2FA, cancel2FA } = useAuth();

  const publicSiteUrl = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const profileSetupUrl = publicSiteUrl ? `${publicSiteUrl}/#/profile` : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [clearError, email, error, otp, password]);

  useEffect(() => {
    if (pending2FA) {
      otpRefs.current[0]?.focus();
    }
  }, [pending2FA]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await login({ email, password });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < otp.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];

    value.split('').forEach((digit, index) => {
      next[index] = digit;
    });

    setOtp(next);
    otpRefs.current[Math.min(value.length, otp.length - 1)]?.focus();
  };

  const handleVerify2FA = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    await verify2FA(code);
  };

  const handleBack = () => {
    cancel2FA();
    setOtp(['', '', '', '', '', '']);
  };

  const authError = error ? (
    <div className="rounded-[1.35rem] border border-rose-200/80 bg-rose-50/80 p-4 text-sm text-rose-700 shadow-[0_18px_45px_-36px_rgba(244,63,94,0.55)]">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
        <div>
          <p className="font-semibold text-rose-900">Authentication failed</p>
          <p className="mt-1 leading-6">{error}</p>
          {errorCode === 'TOTP_SETUP_REQUIRED' ? (
            <div className="mt-3">
              {profileSetupUrl ? (
                <a
                  href={profileSetupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full border border-rose-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:text-rose-900"
                >
                  Open profile to set up 2FA
                </a>
              ) : (
                <p className="text-xs text-rose-600">Set up your authenticator app on the main site, then sign in again.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  if (pending2FA) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="admin-surface-card hidden overflow-hidden px-7 py-8 lg:block">
            <div className="relative space-y-6">
              <span className="admin-pill inline-flex">Secure verification</span>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight text-slate-950">Confirm your authenticator code</h1>
                <p className="max-w-xl text-base leading-7 text-slate-600">
                  The admin workspace now relies on same-site cookie auth plus CSRF protection. Use your authenticator app to finish this session.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5">
                  <p className="text-sm font-semibold text-slate-900">Session target</p>
                  <p className="mt-2 text-sm text-slate-500">{pending2FA.email}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5">
                  <p className="text-sm font-semibold text-slate-900">Accepted apps</p>
                  <p className="mt-2 text-sm text-slate-500">Google Authenticator, Authy, 1Password, Microsoft Authenticator.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-surface-card px-6 py-7 sm:px-7 sm:py-8">
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,rgba(13,148,136,0.16),rgba(14,165,233,0.18))] text-teal-700 shadow-[0_20px_45px_-28px_rgba(13,148,136,0.35)]">
                  <KeyRound className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Two-factor authentication</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Verify this admin session</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Enter the 6-digit code from your authenticator app.</p>
                </div>
              </div>

              {authError}

              <form onSubmit={handleVerify2FA} className="space-y-6">
                <div>
                  <label className="block text-center text-sm font-semibold text-slate-700">Authenticator code</label>
                  <div className="mt-4 flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpRefs.current[index] = element;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        placeholder="•"
                        aria-label={`Authenticator digit ${index + 1}`}
                        className="h-14 w-12 rounded-2xl border border-slate-200 bg-white/90 text-center text-2xl font-bold text-slate-950 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[linear-gradient(135deg,#0f766e,#0891b2)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_20px_44px_-28px_rgba(8,145,178,0.55)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <Shield className="h-4 w-4" />}
                  {isLoading ? 'Verifying session...' : 'Verify and continue'}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] border border-slate-200/90 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="admin-surface-card overflow-hidden px-7 py-8 sm:px-8 sm:py-9">
          <div className="relative space-y-8">
            <div className="space-y-4">
              <span className="admin-pill inline-flex">Blanc operations</span>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  Run the platform from a calmer admin surface
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  The admin workspace now follows the same light, premium visual system as the public site while keeping security, moderation, and publishing flows dense enough for daily operations.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/80 bg-white/82 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(13,148,136,0.15),rgba(14,165,233,0.18))] text-teal-700">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">Cookie + CSRF protected</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Same-site session auth stays in httpOnly cookies. No persisted admin bearer token lives in local storage.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/80 bg-white/82 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.15),rgba(125,211,252,0.18))] text-indigo-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">Polished admin language</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Typography, glass surfaces, and motion now align with the main Blanc experience.</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(13,148,136,0.08),rgba(14,165,233,0.08))] p-5">
              <p className="text-sm font-semibold text-slate-900">Before you sign in</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>Use a privileged account: admin, super admin, or mentor reviewer.</li>
                <li>All login attempts are monitored and rate-limited.</li>
                <li>Accounts with required 2FA will be prompted for an authenticator code next.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="admin-surface-card px-6 py-7 sm:px-7 sm:py-8">
          <div className="space-y-6">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,rgba(13,148,136,0.16),rgba(14,165,233,0.18))] text-teal-700 shadow-[0_20px_45px_-28px_rgba(13,148,136,0.35)]">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Admin access</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Sign in to Blanc Admin</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Use your account to enter the admin workspace and continue with secure verification when required.</p>
              </div>
            </div>

            {authError}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@blanc.edu.vn"
                    autoComplete="email"
                    required
                    className="h-[3.25rem] w-full rounded-[1.2rem] border border-slate-200 bg-white/90 pl-12 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs font-semibold text-teal-700 transition hover:text-teal-900"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    className="h-[3.25rem] w-full rounded-[1.2rem] border border-slate-200 bg-white/90 pl-12 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[linear-gradient(135deg,#0f766e,#0891b2)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_20px_44px_-28px_rgba(8,145,178,0.55)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <Lock className="h-4 w-4" />}
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="rounded-[1.35rem] border border-slate-200/85 bg-white/72 px-4 py-4 text-sm leading-6 text-slate-500">
              This admin portal is monitored, rate-limited, and restricted to privileged roles only. Unauthorized access is prohibited.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
