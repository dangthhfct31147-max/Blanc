/**
 * Forgot Password Page
 * Multi-step password reset flow:
 * 1. Enter email to request OTP
 * 2. Verify OTP
 * 3. Set new password
 * 4. Success confirmation
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, Lock, KeyRound, AlertCircle } from 'lucide-react';
import api from '../services/api';
import OtpInput from './OtpInput';

// Generate session token (UUID-like)
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

type Step = 'email' | 'otp' | 'newPassword' | 'success';

interface OtpResponse {
  ok: boolean;
  message: string;
  ttlSeconds: number;
  expiresAt: string;
  sessionToken?: string;
}

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpData, setOtpData] = useState<{ ttlSeconds: number; expiresAt: string } | null>(null);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const newSessionToken = generateSessionToken();
      setSessionToken(newSessionToken);

      const response = await api.post<OtpResponse>(
        '/otp/request',
        {
          email,
          sessionToken: newSessionToken,
          action: 'reset_password',
        },
        { skipAuth: true }
      );

      setOtpData({
        ttlSeconds: response.data.ttlSeconds,
        expiresAt: response.data.expiresAt,
      });
      setStep('otp');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      const vietnameseErrors: Record<string, string> = {
        'Email và session token là bắt buộc.': 'Vui lòng nhập địa chỉ email.',
        'Email không hợp lệ.': 'Địa chỉ email không hợp lệ.',
        'Email này chưa được đăng ký trong hệ thống.': 'Email này chưa được đăng ký trong hệ thống.',
        RATE_LIMITED: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.',
        'User not found': 'Email không tồn tại trong hệ thống.',
      };
      setError(vietnameseErrors[errorMessage] || errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification success
  const handleOtpSuccess = (token: string) => {
    setVerificationToken(token);
    setStep('newPassword');
  };

  // Handle resend OTP
  const handleResendOtp = async (): Promise<{ sessionToken: string; ttlSeconds: number; expiresAt: string }> => {
    const response = await api.post<OtpResponse>(
      '/otp/resend',
      {
        email,
        action: 'reset_password',
      },
      { skipAuth: true }
    );

    const newToken = response.data.sessionToken || generateSessionToken();
    setSessionToken(newToken);

    return {
      sessionToken: newToken,
      ttlSeconds: response.data.ttlSeconds,
      expiresAt: response.data.expiresAt,
    };
  };

  // Step 3: Set new password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post(
        '/auth/reset-password',
        {
          token: verificationToken,
          password: newPassword,
        },
        { skipAuth: true }
      );

      setStep('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      const vietnameseErrors: Record<string, string> = {
        'Token and new password are required.': 'Thiếu thông tin xác thực.',
        'Password must be at least 8 characters.': 'Mật khẩu phải có ít nhất 8 ký tự.',
        'Invalid or expired reset token.': 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thử lại.',
      };
      setError(vietnameseErrors[errorMessage] || errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 p-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
          {/* Step 1: Enter Email */}
          {step === 'email' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mb-6 flex items-center text-sm text-emerald-100/50 transition-colors hover:text-emerald-100/70"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Quay lại đăng nhập
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <Mail className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">Quên mật khẩu?</h2>
                <p className="text-sm text-emerald-100/70">Nhập email đã đăng ký để nhận mã xác thực OTP.</p>
              </div>

              <form className="space-y-5" onSubmit={handleRequestOtp}>
                {error && (
                  <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-emerald-100">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="admin@contesthub.edu.vn"
                      required
                      className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-4 pl-11 text-white placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi mã OTP'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-emerald-100/50">
                Nhớ mật khẩu rồi?{' '}
                <span onClick={() => navigate('/login')} className="cursor-pointer font-bold text-emerald-400 transition-colors hover:text-emerald-300">
                  Đăng nhập
                </span>
              </div>
            </>
          )}

          {/* Step 2: Enter OTP */}
          {step === 'otp' && otpData && (
            <OtpInput
              email={email}
              sessionToken={sessionToken}
              ttlSeconds={otpData.ttlSeconds}
              expiresAt={otpData.expiresAt}
              onVerifySuccess={handleOtpSuccess}
              onResendOtp={handleResendOtp}
              onCancel={() => {
                setStep('email');
                setError(null);
              }}
              title="Xác thực email"
              subtitle={`Nhập mã OTP đã gửi đến ${email}`}
            />
          )}

          {/* Step 3: Set New Password */}
          {step === 'newPassword' && (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <Lock className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">Đặt mật khẩu mới</h2>
                <p className="text-sm text-emerald-100/70">Tạo mật khẩu mới cho tài khoản của bạn.</p>
              </div>

              <form className="space-y-5" onSubmit={handleSetPassword}>
                {error && (
                  <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-emerald-100">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Ít nhất 6 ký tự"
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-12 pl-11 text-white placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-white"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-emerald-100">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Nhập lại mật khẩu"
                      required
                      className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pr-12 pl-11 text-white placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-white"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Đặt mật khẩu mới'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-white">Đặt lại mật khẩu thành công!</h2>
              <p className="mb-6 text-sm text-emerald-100/70">Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập với mật khẩu mới.</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700"
              >
                <KeyRound className="h-5 w-5" />
                Đăng nhập ngay
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-emerald-200/50">© 2024 ContestHub. All rights reserved.</p>
      </div>
    </div>
  );
};

export default ForgotPassword;
