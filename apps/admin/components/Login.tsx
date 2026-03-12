/**
 * Login Page Component
 * Secure authentication form for admin users with 2FA support
 */

import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Eye, EyeOff, Shield, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, verify2FA, isLoading, error, errorCode, clearError, isAuthenticated, pending2FA, cancel2FA } = useAuth();

  const publicSiteUrl = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const profileSetupUrl = publicSiteUrl ? `${publicSiteUrl}/#/profile` : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA code state (TOTP from authenticator app)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error when inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password, otp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus first code input when 2FA is required
  useEffect(() => {
    if (pending2FA && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [pending2FA]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login({ email, password });
    // If success and no 2FA required, navigation happens via useEffect
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);

    // Focus last filled input or first empty
    const lastIndex = Math.min(pastedData.length, 5);
    otpRefs.current[lastIndex]?.focus();
  };

  const handleVerify2FA = async (e: FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;

    await verify2FA(otpCode);
  };

  const handleBack = () => {
    cancel2FA();
    setOtp(['', '', '', '', '', '']);
  };

  // 2FA Verification Screen
  if (pending2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 p-4">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <KeyRound className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white">Two-Factor Authentication</h1>
            <p className="text-emerald-200/70">Enter the 6-digit code from your authenticator app</p>
            <p className="mt-2 text-xs text-emerald-200/60">Google Authenticator / Authy / 1Password</p>
            <p className="mt-1 text-sm text-emerald-300/50">{pending2FA.email}</p>
          </div>

          {/* 2FA Card */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
            <form onSubmit={handleVerify2FA} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="animate-fade-in-up flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-200">Verification Failed</p>
                    <p className="mt-1 text-sm text-red-300/70">{error}</p>
                  </div>
                </div>
              )}

              {/* TOTP Input */}
              <div>
                <label className="mb-4 block text-center text-sm font-medium text-emerald-100">Authenticator Code</label>
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      placeholder="•"
                      aria-label={`Authenticator code digit ${index + 1}`}
                      className="h-14 w-12 rounded-lg border border-white/20 bg-white/10 text-center text-2xl font-bold text-white placeholder-white/30 transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={isLoading || otp.join('').length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    Verify & Sign In
                  </>
                )}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={handleBack}
                className="flex w-full items-center justify-center gap-2 py-2 text-emerald-300 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 p-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-white">Blanc Admin</h1>
          <p className="text-emerald-200/70">Sign in to access the admin dashboard</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="animate-fade-in-up flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-200">Authentication Failed</p>
                  <p className="mt-1 text-sm text-red-300/70">{error}</p>

                  {errorCode === 'TOTP_SETUP_REQUIRED' && (
                    <div className="mt-3">
                      {profileSetupUrl ? (
                        <a
                          href={profileSetupUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:bg-white/20"
                        >
                          Open Profile to set up 2FA
                        </a>
                      ) : (
                        <p className="text-xs text-emerald-100/80">Please set up 2FA (authenticator app) on your account, then sign in again.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-emerald-100">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@blanc.edu.vn"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-4 pl-11 text-white placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-emerald-100">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-12 pl-11 text-white placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="text-sm text-emerald-100/70">Remember me</span>
              </label>
              <span onClick={() => navigate('/forgot-password')} className="cursor-pointer text-sm text-emerald-400 transition-colors hover:text-emerald-300">
                Forgot password?
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-center text-xs text-emerald-100/50">
              This is a secure admin portal. All login attempts are monitored and logged.
              <br />
              Unauthorized access is strictly prohibited.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-emerald-200/50">© 2024 Blanc. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Login;
