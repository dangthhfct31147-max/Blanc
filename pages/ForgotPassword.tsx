import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/ui/Common';
import OtpInput from '../components/OtpInput';
import { api } from '../lib/api';
import { ArrowLeft, Mail, CheckCircle, Lock, KeyRound } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

// Generate session token (UUID-like)
function generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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
    const { locale } = useI18n();
    const isEn = locale === 'en';

    const copy = useMemo(() => isEn ? {
        backToLogin: 'Back to login',
        forgotTitle: 'Forgot password?',
        forgotDescription: 'Enter your registered email to receive an OTP verification code.',
        sending: 'Sending...',
        sendOtp: 'Send OTP',
        rememberPassword: 'Remember your password?',
        login: 'Log in',
        setNewTitle: 'Set new password',
        setNewDescription: 'Create a new password for your account.',
        newPasswordLabel: 'New password',
        newPasswordPlaceholder: 'At least 8 characters',
        confirmPasswordLabel: 'Confirm password',
        confirmPasswordPlaceholder: 'Re-enter your password',
        processing: 'Processing...',
        setNewBtn: 'Set new password',
        successTitle: 'Password reset successful!',
        successDescription: 'Your password has been updated. You can log in with your new password.',
        loginNow: 'Log in now',
        defaultError: 'An error occurred',
        passwordMinLength: 'Password must be at least 8 characters.',
        passwordMismatch: 'Passwords do not match.',
        requestErrors: {
            'Email và session token là bắt buộc.': 'Please enter your email address.',
            'Email không hợp lệ.': 'Invalid email address.',
            'Email này chưa được đăng ký trong hệ thống.': 'This email is not registered in the system.',
            'RATE_LIMITED': 'Too many requests. Please try again later.',
        } as Record<string, string>,
        resetErrors: {
            'Token and new password are required.': 'Missing authentication information.',
            'Password must be at least 8 characters.': 'Password must be at least 8 characters.',
            'Invalid or expired reset token.': 'Password reset session has expired. Please try again.',
        } as Record<string, string>,
    } : {
        backToLogin: 'Quay lại đăng nhập',
        forgotTitle: 'Quên mật khẩu?',
        forgotDescription: 'Nhập email đã đăng ký để nhận mã xác thực OTP.',
        sending: 'Đang gửi...',
        sendOtp: 'Gửi mã OTP',
        rememberPassword: 'Nhớ mật khẩu rồi?',
        login: 'Đăng nhập',
        setNewTitle: 'Đặt mật khẩu mới',
        setNewDescription: 'Tạo mật khẩu mới cho tài khoản của bạn.',
        newPasswordLabel: 'Mật khẩu mới',
        newPasswordPlaceholder: 'Ít nhất 8 ký tự',
        confirmPasswordLabel: 'Xác nhận mật khẩu',
        confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
        processing: 'Đang xử lý...',
        setNewBtn: 'Đặt mật khẩu mới',
        successTitle: 'Đặt lại mật khẩu thành công!',
        successDescription: 'Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập với mật khẩu mới.',
        loginNow: 'Đăng nhập ngay',
        defaultError: 'Đã xảy ra lỗi',
        passwordMinLength: 'Mật khẩu phải có ít nhất 8 ký tự.',
        passwordMismatch: 'Mật khẩu xác nhận không khớp.',
        requestErrors: {
            'Email và session token là bắt buộc.': 'Vui lòng nhập địa chỉ email.',
            'Email không hợp lệ.': 'Địa chỉ email không hợp lệ.',
            'Email này chưa được đăng ký trong hệ thống.': 'Email này chưa được đăng ký trong hệ thống.',
            'RATE_LIMITED': 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.',
        } as Record<string, string>,
        resetErrors: {
            'Token and new password are required.': 'Thiếu thông tin xác thực.',
            'Password must be at least 8 characters.': 'Mật khẩu phải có ít nhất 8 ký tự.',
            'Invalid or expired reset token.': 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thử lại.',
        } as Record<string, string>,
    }, [isEn]);

    // Form state
    const [email, setEmail] = useState('');
    const [sessionToken, setSessionToken] = useState('');
    const [verificationToken, setVerificationToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

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
            // Generate new session token
            const newSessionToken = generateSessionToken();
            setSessionToken(newSessionToken);

            const response = await api.post<OtpResponse>('/otp/request', {
                email,
                sessionToken: newSessionToken,
                action: 'reset_password',
            });

            setOtpData({
                ttlSeconds: response.ttlSeconds,
                expiresAt: response.expiresAt,
            });
            setStep('otp');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : copy.defaultError;
            setError(copy.requestErrors[errorMessage] || errorMessage);
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
        const response = await api.post<OtpResponse>('/otp/resend', {
            email,
            action: 'reset_password',
        });

        const newToken = response.sessionToken || generateSessionToken();
        setSessionToken(newToken);

        return {
            sessionToken: newToken,
            ttlSeconds: response.ttlSeconds,
            expiresAt: response.expiresAt,
        };
    };

    // Step 3: Set new password
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            setError(copy.passwordMinLength);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(copy.passwordMismatch);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await api.post('/auth/reset-password', {
                token: verificationToken,
                password: newPassword,
            });

            setStep('success');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : copy.defaultError;
            setError(copy.resetErrors[errorMessage] || errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="max-w-md w-full p-8 md:p-12 shadow-xl border-0">

                {/* Step 1: Enter Email */}
                {step === 'email' && (
                    <>
                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center text-slate-500 hover:text-slate-700 mb-6 text-sm"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            {copy.backToLogin}
                        </button>

                        <div className="mb-8">
                            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                                <Mail className="w-6 h-6 text-primary-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {copy.forgotTitle}
                            </h2>
                            <p className="text-slate-500 text-sm">
                                {copy.forgotDescription}
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={handleRequestOtp}>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <Input
                                label="Email"
                                type="email"
                                name="email"
                                placeholder="example@email.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError(null);
                                }}
                                required
                            />

                            <Button type="submit" className="w-full h-12" disabled={isLoading}>
                                {isLoading ? copy.sending : copy.sendOtp}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-slate-500">
                            {copy.rememberPassword}{' '}
                            <span
                                onClick={() => navigate('/login')}
                                className="text-primary-600 hover:text-primary-700 font-bold cursor-pointer"
                            >
                                {copy.login}
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
                    />
                )}

                {/* Step 3: Set New Password */}
                {step === 'newPassword' && (
                    <>
                        <div className="mb-8 text-center">
                            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <Lock className="w-6 h-6 text-primary-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {copy.setNewTitle}
                            </h2>
                            <p className="text-slate-500 text-sm">
                                {copy.setNewDescription}
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSetPassword}>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <Input
                                label={copy.newPasswordLabel}
                                type="password"
                                name="newPassword"
                                placeholder={copy.newPasswordPlaceholder}
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    setError(null);
                                }}
                                autoComplete="new-password"
                                required
                            />

                            <Input
                                label={copy.confirmPasswordLabel}
                                type="password"
                                name="confirmPassword"
                                placeholder={copy.confirmPasswordPlaceholder}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError(null);
                                }}
                                autoComplete="new-password"
                                required
                            />

                            <Button type="submit" className="w-full h-12" disabled={isLoading}>
                                {isLoading ? copy.processing : copy.setNewBtn}
                            </Button>
                        </form>
                    </>
                )}

                {/* Step 4: Success */}
                {step === 'success' && (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">
                            {copy.successTitle}
                        </h2>
                        <p className="text-slate-500 text-sm mb-6">
                            {copy.successDescription}
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => navigate('/login')}
                        >
                            <KeyRound className="w-4 h-4 mr-2" />
                            {copy.loginNow}
                        </Button>
                    </div>
                )}

            </Card>
        </div>
    );
};

export default ForgotPassword;

