import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, BookOpen, Trophy, Users, Sparkles, ChevronRight, Check, X } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { clientStorage } from '../lib/cache';

const ONBOARDING_DONE_KEY = clientStorage.buildKey('ui', 'onboarding_done');

// ---------------------------------------------------------------------------
// Interest options
// ---------------------------------------------------------------------------

interface Interest {
    id: string;
    icon: React.ReactNode;
    labelVi: string;
    labelEn: string;
}

const INTERESTS: Interest[] = [
    { id: 'contests', icon: <Trophy className="h-5 w-5" />, labelVi: 'Cuộc thi', labelEn: 'Contests' },
    { id: 'courses', icon: <BookOpen className="h-5 w-5" />, labelVi: 'Khóa học', labelEn: 'Courses' },
    { id: 'community', icon: <Users className="h-5 w-5" />, labelVi: 'Cộng đồng', labelEn: 'Community' },
    { id: 'mentors', icon: <Sparkles className="h-5 w-5" />, labelVi: 'Mentor', labelEn: 'Mentors' },
];

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function isOnboardingComplete(): boolean {
    try { return localStorage.getItem(ONBOARDING_DONE_KEY) === '1'; } catch { return true; }
}

export function markOnboardingComplete(): void {
    try { localStorage.setItem(ONBOARDING_DONE_KEY, '1'); } catch { /* noop */ }
}

interface Props {
    userName?: string;
    onComplete: () => void;
}

const OnboardingWizard: React.FC<Props> = ({ userName, onComplete }) => {
    const { locale } = useI18n();
    const isVi = locale === 'vi';
    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);
    const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());

    const totalSteps = 3;

    const goNext = useCallback(() => {
        setDir(1);
        if (step < totalSteps - 1) {
            setStep((s) => s + 1);
        } else {
            markOnboardingComplete();
            onComplete();
        }
    }, [step, onComplete]);

    const skip = useCallback(() => {
        markOnboardingComplete();
        onComplete();
    }, [onComplete]);

    const toggleInterest = useCallback((id: string) => {
        setSelectedInterests((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
            >
                {/* Close / skip */}
                <button
                    onClick={skip}
                    className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Skip"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 pt-5">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-indigo-500' : i < step ? 'w-3 bg-indigo-300' : 'w-3 bg-slate-200 dark:bg-slate-700'
                                }`}
                        />
                    ))}
                </div>

                {/* Step content */}
                <div className="relative min-h-80 overflow-hidden px-6 pb-6 pt-4">
                    <AnimatePresence mode="wait" custom={dir}>
                        {step === 0 && (
                            <motion.div
                                key="welcome"
                                custom={dir}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="flex flex-col items-center text-center"
                            >
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200 dark:shadow-indigo-900">
                                    <Rocket className="h-8 w-8 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                    {isVi ? `Chào mừng${userName ? `, ${userName}` : ''}! 🎉` : `Welcome${userName ? `, ${userName}` : ''}! 🎉`}
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                    {isVi
                                        ? 'ContestHub là nền tảng giúp bạn phát triển kỹ năng, tham gia cuộc thi và kết nối cộng đồng.'
                                        : 'ContestHub helps you grow your skills, compete in contests, and connect with a vibrant community.'}
                                </p>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                key="interests"
                                custom={dir}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="flex flex-col items-center"
                            >
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    {isVi ? 'Bạn quan tâm đến gì?' : 'What are you interested in?'}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {isVi ? 'Chọn để cá nhân hoá trải nghiệm' : 'Select to personalise your experience'}
                                </p>
                                <div className="mt-5 grid grid-cols-2 gap-3 w-full">
                                    {INTERESTS.map((item) => {
                                        const selected = selectedInterests.has(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => toggleInterest(item.id)}
                                                className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${selected
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                <span className={selected ? 'text-indigo-500' : 'text-slate-400'}>{item.icon}</span>
                                                {isVi ? item.labelVi : item.labelEn}
                                                {selected && <Check className="ml-auto h-4 w-4 text-indigo-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="ready"
                                custom={dir}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="flex flex-col items-center text-center"
                            >
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900">
                                    <Sparkles className="h-8 w-8 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                    {isVi ? 'Bạn đã sẵn sàng!' : "You're all set!"}
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                    {isVi
                                        ? 'Khám phá cuộc thi, khóa học và kết nối cộng đồng ngay bây giờ.'
                                        : 'Explore contests, courses, and connect with the community now.'}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bottom action */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4">
                    <button onClick={skip} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                        {isVi ? 'Bỏ qua' : 'Skip'}
                    </button>
                    <button
                        onClick={goNext}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-600 active:scale-[0.98]"
                    >
                        {step === totalSteps - 1 ? (isVi ? 'Bắt đầu' : 'Get started') : (isVi ? 'Tiếp tục' : 'Next')}
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default OnboardingWizard;
