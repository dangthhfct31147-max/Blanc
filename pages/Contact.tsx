import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Bug, Info, MessageCircle, Send, Sparkles, User as UserIcon } from 'lucide-react';
import developerAvatar from '../developer.png';
import { Avatar, Badge, Button, Card, Dropdown, Input } from '../components/ui/Common';
import { api } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';

declare const __APP_VERSION__: string | undefined;

type FeedbackType = 'bug' | 'feature' | 'other';

type UserSettings = {
    id: string;
    name: string;
    email: string;
    avatar: string;
    phone: string;
};

const DEVELOPER = {
    name: 'Trần Hữu Hải Đăng',
    email: 'dangthfcst1147@gmail.com',
    zalo: '0339122620',
    avatar: developerAvatar,
};

const Contact: React.FC = () => {
    const navigate = useNavigate();
    const { locale } = useI18n();
    const isEn = locale === 'en';

    const copy = useMemo(() => isEn ? {
        pageTitle: 'Support & Feedback',
        pageDesc: 'Send feedback directly to the developer.',
        back: 'Back',
        yourInfo: 'Your information',
        loggedIn: 'Logged in',
        account: 'Account',
        phone: 'Phone number',
        infoNote: 'Email/Phone are taken from your profile',
        updateNote: 'You can update them on the Profile page',
        updateProfile: 'Update profile',
        devInfo: 'Developer info',
        name: 'Name',
        devNote: 'Feel free to reach out if you have any questions',
        devSubNote: 'I\'m always here to listen',
        sendFeedback: 'Send feedback',
        category: 'Category',
        webVersion: 'Website version',
        content: 'Content',
        contentPlaceholder: 'Describe your issue / feedback...',
        minChars: 'Minimum 10 characters.',
        close: 'Close',
        sending: 'Sending',
        send: 'Send',
        loading: 'Loading...',
        toastMinChars: 'Content must be at least 10 characters.',
        toastSuccess: 'Feedback sent. Thank you!',
        toastLoadFailed: 'Could not load account info',
        toastSendFailed: 'Could not send feedback',
        bugLabel: 'Bug report',
        featureLabel: 'Feature request',
        otherLabel: 'Other',
    } : {
        pageTitle: 'Hỗ trợ & góp ý',
        pageDesc: 'Gửi phản hồi trực tiếp tới nhà phát triển.',
        back: 'Quay lại',
        yourInfo: 'Thông tin của bạn',
        loggedIn: 'Đã đăng nhập',
        account: 'Tài khoản',
        phone: 'Số điện thoại',
        infoNote: 'Email/SDT được lấy từ hồ sơ',
        updateNote: 'Bạn có thể cập nhật trong trang Tôi',
        updateProfile: 'Cập nhật hồ sơ',
        devInfo: 'Thông tin nhà phát triển',
        name: 'Tên',
        devNote: 'Bạn hãy liên hệ tôi nếu có bất kỳ thắc mắc nào nhé',
        devSubNote: 'Mình luôn ở đây lắng nghe bạn',
        sendFeedback: 'Gửi góp ý',
        category: 'Phân loại',
        webVersion: 'Phiên bản trang web',
        content: 'Nội dung',
        contentPlaceholder: 'Mô tả vấn đề / góp ý của bạn...',
        minChars: 'Tối thiểu 10 ký tự.',
        close: 'Đóng',
        sending: 'Đang gửi',
        send: 'Gửi',
        loading: 'Đang tải...',
        toastMinChars: 'Nội dung tối thiểu 10 ký tự.',
        toastSuccess: 'Đã gửi góp ý. Cảm ơn bạn!',
        toastLoadFailed: 'Không thể tải thông tin tài khoản',
        toastSendFailed: 'Không thể gửi góp ý',
        bugLabel: 'Báo lỗi',
        featureLabel: 'Đề xuất tính năng',
        otherLabel: 'Khác',
    }, [isEn]);

    const [user, setUser] = useState<UserSettings | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    const [feedbackType, setFeedbackType] = useState<FeedbackType>('other');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const version = useMemo(() => {
        const raw = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) || import.meta.env.MODE || 'dev';
        const trimmed = String(raw).trim();
        if (!trimmed) return 'dev';
        if (/^[0-9a-f]{7,40}$/i.test(trimmed)) return trimmed;
        return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
    }, []);

    const feedbackOptions = useMemo(
        () => [
            { value: 'bug', label: copy.bugLabel, icon: <Bug className="w-4 h-4 text-red-500" /> },
            { value: 'feature', label: copy.featureLabel, icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
            { value: 'other', label: copy.otherLabel, icon: <MessageCircle className="w-4 h-4 text-primary-600" /> },
        ],
        [copy]
    );

    useEffect(() => {
        let isActive = true;

        const fetchUser = async () => {
            setIsLoadingUser(true);
            try {
                const data = await api.get<UserSettings>('/users/me/settings');
                if (!isActive) return;
                setUser(data);
            } catch (err) {
                if (!isActive) return;
                toast.error(err instanceof Error ? err.message : copy.toastLoadFailed);
            } finally {
                if (isActive) setIsLoadingUser(false);
            }
        };

        fetchUser();

        return () => {
            isActive = false;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = message.trim();
        if (trimmed.length < 10) {
            toast.error(copy.toastMinChars);
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/feedback/contact', {
                type: feedbackType,
                message: trimmed,
                version,
                pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
            });
            toast.success(copy.toastSuccess);
            setMessage('');
            setFeedbackType('other');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : copy.toastSendFailed);
        } finally {
            setIsSubmitting(false);
        }
    };

    const userName = user?.name || (isLoadingUser ? copy.loading : '—');
    const userEmail = user?.email || (isLoadingUser ? copy.loading : '—');
    const userPhone = user?.phone || (isLoadingUser ? copy.loading : '—');

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center border border-primary-100">
                            <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{copy.pageTitle}</h1>
                            <p className="text-sm text-slate-500">{copy.pageDesc}</p>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" className="gap-2 self-start" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4" />
                        {copy.back}
                    </Button>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-slate-400" />
                                <h2 className="font-semibold text-slate-900">{copy.yourInfo}</h2>
                            </div>
                            <Badge className="bg-primary-50 text-primary-700 border border-primary-100">{copy.loggedIn}</Badge>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <Avatar
                                src={user?.avatar || undefined}
                                name={user?.name || 'User'}
                                size="xl"
                                className="ring-4 ring-primary-100 shadow-sm w-28 h-28"
                            />
                        </div>

                        <div className="mt-6 space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500">{copy.account}</span>
                                <span className="text-slate-900 font-semibold text-right">{userName}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500">Email</span>
                                <span className="text-slate-900 font-semibold text-right">{userEmail}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500">{copy.phone}</span>
                                <span className="text-slate-900 font-semibold text-right">{userPhone}</span>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 relative">
                            <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <div className="text-xs text-slate-600 text-center px-8">
                                <div className="font-medium">{copy.infoNote}</div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/profile?tab=settings&settingsTab=profile')}
                                    className="text-primary-700 font-semibold hover:underline"
                                >
                                    {copy.updateNote}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            className="mt-4 w-full"
                            onClick={() => navigate('/profile?tab=settings&settingsTab=profile')}
                        >
                            {copy.updateProfile}
                        </Button>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-slate-400" />
                                <h2 className="font-semibold text-slate-900">{copy.devInfo}</h2>
                            </div>
                            <Badge className="bg-pink-50 text-pink-700 border border-pink-100">Admin</Badge>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <Avatar
                                src={DEVELOPER.avatar}
                                name={DEVELOPER.name}
                                size="xl"
                                className="ring-4 ring-primary-200 shadow-sm w-28 h-28"
                            />
                        </div>

                        <div className="mt-6 space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500">{copy.name}</span>
                                <span className="text-slate-900 font-semibold text-right">{DEVELOPER.name}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500">Email</span>
                                <span className="text-slate-900 font-semibold text-right">{DEVELOPER.email}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-slate-500">Zalo</span>
                                <span className="text-slate-900 font-semibold text-right">{DEVELOPER.zalo}</span>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 relative">
                            <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <div className="text-xs text-slate-600 text-center px-8">
                                <div className="font-medium">{copy.devNote}</div>
                                <div className="text-primary-700 font-semibold">{copy.devSubNote}</div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card className="mt-6 p-6">
                    <h2 className="text-lg font-bold text-slate-900">{copy.sendFeedback}</h2>

                    <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Dropdown
                                headerText={copy.category}
                                label={copy.category}
                                options={feedbackOptions}
                                value={feedbackType}
                                onChange={(value) => setFeedbackType(value as FeedbackType)}
                            />
                            <Input label={copy.webVersion} value={version} disabled />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{copy.content}</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={6}
                                maxLength={2000}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
                                placeholder={copy.contentPlaceholder}
                                disabled={isSubmitting}
                            />
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                <span>{copy.minChars}</span>
                                <span>{message.length}/2000</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                {copy.close}
                            </Button>
                            <Button type="submit" className="gap-2" disabled={isSubmitting}>
                                <Send className="w-4 h-4" />
                                {isSubmitting ? copy.sending : copy.send}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Contact;

