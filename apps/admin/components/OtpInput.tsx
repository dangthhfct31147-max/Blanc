/**
 * OTP Input Component
 * Secure 6-digit OTP input with:
 * - Auto-focus navigation
 * - Paste support
 * - Countdown timer
 * - Resend functionality
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

interface OtpInputProps {
  email: string;
  sessionToken: string;
  ttlSeconds: number;
  expiresAt: string;
  onVerifySuccess: (verificationToken: string) => void;
  onResendOtp: () => Promise<{ sessionToken: string; ttlSeconds: number; expiresAt: string }>;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

const OtpInput: React.FC<OtpInputProps> = ({
  email,
  sessionToken: initialSessionToken,
  ttlSeconds: initialTtl,
  onVerifySuccess,
  onResendOtp,
  onCancel,
  title = 'Nhập mã OTP',
  subtitle,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [sessionToken, setSessionToken] = useState(initialSessionToken);
  const [timeRemaining, setTimeRemaining] = useState(initialTtl);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionToken]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    cooldownRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldownSeconds]);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle input change
  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  // Handle key down
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  // Verify OTP
  const handleVerify = useCallback(
    async (otpCode?: string) => {
      const code = otpCode || otp.join('');
      if (code.length !== 6) {
        setError('Vui lòng nhập đủ 6 số.');
        return;
      }

      if (timeRemaining <= 0) {
        setError('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
        return;
      }

      setIsVerifying(true);
      setError(null);

      try {
        const response = await api.post<{
          ok: boolean;
          verificationToken: string;
          error?: string;
          remainingAttempts?: number;
        }>(
          '/otp/verify',
          {
            email,
            sessionToken,
            otp: code,
          },
          { skipAuth: true }
        );

        setSuccess(true);
        setTimeout(() => {
          onVerifySuccess(response.data.verificationToken);
        }, 1000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
        const attemptsMatch = errorMsg.match(/Còn (\d+) lần thử/);
        if (attemptsMatch) {
          setRemainingAttempts(parseInt(attemptsMatch[1], 10));
        }
        setError(errorMsg);
        setOtp(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      } finally {
        setIsVerifying(false);
      }
    },
    [otp, email, sessionToken, timeRemaining, onVerifySuccess]
  );

  // Resend OTP
  const handleResend = async () => {
    if (cooldownSeconds > 0) return;

    setIsResending(true);
    setError(null);

    try {
      const result = await onResendOtp();
      setSessionToken(result.sessionToken);
      setTimeRemaining(result.ttlSeconds);
      setOtp(Array(6).fill(''));
      setRemainingAttempts(5);
      setCooldownSeconds(60);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi lại mã');
    } finally {
      setIsResending(false);
    }
  };

  const isExpired = timeRemaining <= 0;
  const isLowTime = timeRemaining <= 30 && timeRemaining > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${success ? 'bg-green-500/20' : 'bg-emerald-500/20'}`}>
          {success ? <CheckCircle className="h-8 w-8 text-green-400" /> : <ShieldCheck className="h-8 w-8 text-emerald-400" />}
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">{success ? 'Xác thực thành công!' : title}</h3>
        <p className="text-sm text-emerald-100/70">
          {subtitle || (
            <>
              Mã xác thực 6 số đã được gửi đến
              <br />
              <span className="font-medium text-emerald-300">{email}</span>
            </>
          )}
        </p>
      </div>

      {/* Timer */}
      <div
        className={`flex items-center justify-center gap-2 text-sm font-medium ${isExpired ? 'text-red-400' : isLowTime ? 'text-red-400' : 'text-emerald-200'}`}
      >
        <Clock className="h-4 w-4" />
        {isExpired ? (
          <span>Mã đã hết hạn</span>
        ) : (
          <>
            <span>Mã hết hạn sau:</span>
            <span className={`font-mono text-lg ${isLowTime ? 'animate-pulse text-red-400' : ''}`}>{formatTime(timeRemaining)}</span>
          </>
        )}
      </div>

      {/* OTP Input */}
      {!success && (
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isVerifying || success || isExpired}
              aria-label={`Số thứ ${index + 1}`}
              placeholder="•"
              className={`h-14 w-11 rounded-xl border-2 bg-white/10 text-center text-2xl font-bold text-white placeholder-white/30 transition-all duration-200 outline-none sm:h-16 sm:w-12 ${digit ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/20'} ${error ? 'animate-shake border-red-400 bg-red-500/20' : ''} ${isExpired ? 'cursor-not-allowed opacity-50' : ''} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30`}
            />
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Remaining Attempts */}
      {remainingAttempts < 5 && !success && <p className="text-center text-sm text-amber-400">Còn {remainingAttempts} lần thử</p>}

      {/* Actions */}
      {!success && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={otp.some((d) => !d) || isVerifying || isExpired}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Đang xác thực...
              </>
            ) : (
              'Xác nhận'
            )}
          </button>

          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-emerald-100/50">Không nhận được mã?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || cooldownSeconds > 0}
              className={`flex items-center gap-1 font-medium ${
                cooldownSeconds > 0 ? 'cursor-not-allowed text-emerald-100/30' : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
              {cooldownSeconds > 0 ? `Gửi lại (${cooldownSeconds}s)` : 'Gửi lại'}
            </button>
          </div>

          <button type="button" onClick={onCancel} className="w-full py-2 text-sm text-emerald-100/50 transition-colors hover:text-emerald-100/70">
            ← Quay lại
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="text-center text-green-400">
          <p className="text-sm">Đang chuyển hướng...</p>
        </div>
      )}

      {/* CSS for shake animation */}
      <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
            `}</style>
    </div>
  );
};

export default OtpInput;
