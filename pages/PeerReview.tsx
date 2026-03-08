import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    Shield, Upload, FileText, Star, ChevronDown, ChevronRight, Eye, EyeOff,
    Award, Sparkles, Clock, CheckCircle2, AlertCircle, Search, Filter,
    ThumbsUp, MessageSquare, Zap, Trophy, BookOpen, X, Check, Loader2,
    BarChart3, Users, Target, ArrowRight, Send
} from 'lucide-react';
import { Button, Card, Badge, cn } from '../components/ui/Common';
import { useI18n } from '../contexts/I18nContext';
import { useAppAuth } from '../contexts/AppAuthContext';

/* ─────────── Types ─────────── */
type SubmissionStatus = 'pending' | 'in_review' | 'reviewed';
type TabId = 'submissions' | 'review' | 'leaderboard';

interface RubricCriterion {
    id: string;
    label: string;
    labelEn: string;
    description: string;
    descriptionEn: string;
    maxScore: number;
    icon: React.ReactNode;
}

interface Submission {
    id: string;
    title: string;
    contestName: string;
    type: 'slide' | 'report';
    status: SubmissionStatus;
    submittedAt: string;
    reviewCount: number;
    avgScore: number | null;
    anonymousId: string;
}

interface ReviewTask {
    id: string;
    submissionTitle: string;
    contestName: string;
    type: 'slide' | 'report';
    deadline: string;
    anonymousId: string;
    pointsReward: number;
}

interface LeaderEntry {
    rank: number;
    displayName: string;
    points: number;
    reviewsDone: number;
    avgRating: number;
    isCurrentUser: boolean;
}

/* ─────────── Constants ─────────── */
const RUBRIC_CRITERIA: RubricCriterion[] = [
    {
        id: 'clarity',
        label: 'Tính rõ ràng & Logic',
        labelEn: 'Clarity & Logic',
        description: 'Nội dung trình bày logic, mạch lạc, dễ theo dõi',
        descriptionEn: 'Clear, logical, and easy to follow presentation',
        maxScore: 10,
        icon: <Target className="w-4 h-4" />,
    },
    {
        id: 'creativity',
        label: 'Sáng tạo & Độc đáo',
        labelEn: 'Creativity & Originality',
        description: 'Ý tưởng mới lạ, cách tiếp cận sáng tạo',
        descriptionEn: 'Fresh ideas and creative approaches',
        maxScore: 10,
        icon: <Sparkles className="w-4 h-4" />,
    },
    {
        id: 'design',
        label: 'Thiết kế & Hình thức',
        labelEn: 'Design & Visuals',
        description: 'Bố cục đẹp, chuyên nghiệp, có thẩm mỹ',
        descriptionEn: 'Beautiful layout, professional, aesthetically pleasing',
        maxScore: 10,
        icon: <Eye className="w-4 h-4" />,
    },
    {
        id: 'depth',
        label: 'Chiều sâu phân tích',
        labelEn: 'Analysis Depth',
        description: 'Nghiên cứu kỹ lưỡng, dữ liệu thuyết phục',
        descriptionEn: 'Thorough research, convincing data presentation',
        maxScore: 10,
        icon: <BarChart3 className="w-4 h-4" />,
    },
    {
        id: 'impact',
        label: 'Tác động & Khả thi',
        labelEn: 'Impact & Feasibility',
        description: 'Giải pháp khả thi, có tiềm năng tạo tác động',
        descriptionEn: 'Feasible solution with real-world impact potential',
        maxScore: 10,
        icon: <Zap className="w-4 h-4" />,
    },
];

/* Mock data */
const MOCK_SUBMISSIONS: Submission[] = [
    { id: '1', title: 'Nền tảng học tập AI cá nhân hóa', contestName: 'Hackathon AI 2025', type: 'slide', status: 'reviewed', submittedAt: '2025-01-10', reviewCount: 3, avgScore: 42, anonymousId: 'Team-α' },
    { id: '2', title: 'Ứng dụng quản lý rác thải thông minh', contestName: 'Green Innovation', type: 'report', status: 'in_review', submittedAt: '2025-01-12', reviewCount: 1, avgScore: null, anonymousId: 'Team-β' },
    { id: '3', title: 'Hệ thống phân tích dữ liệu y tế', contestName: 'Health-Tech Challenge', type: 'slide', status: 'pending', submittedAt: '2025-01-14', reviewCount: 0, avgScore: null, anonymousId: 'Team-γ' },
];

const MOCK_REVIEW_TASKS: ReviewTask[] = [
    { id: 'r1', submissionTitle: 'Smart Campus Navigator', contestName: 'Hackathon AI 2025', type: 'slide', deadline: '2025-01-18', anonymousId: 'Team-δ', pointsReward: 15 },
    { id: 'r2', submissionTitle: 'Sustainable Fashion Marketplace', contestName: 'Green Innovation', type: 'report', deadline: '2025-01-20', anonymousId: 'Team-ε', pointsReward: 20 },
    { id: 'r3', submissionTitle: 'Virtual Lab Experiment Platform', contestName: 'EduTech Summit', type: 'slide', deadline: '2025-01-22', anonymousId: 'Team-ζ', pointsReward: 15 },
];

const MOCK_LEADERBOARD: LeaderEntry[] = [
    { rank: 1, displayName: 'Reviewer_Phoenix', points: 520, reviewsDone: 34, avgRating: 4.9, isCurrentUser: false },
    { rank: 2, displayName: 'Reviewer_Sage', points: 485, reviewsDone: 31, avgRating: 4.8, isCurrentUser: false },
    { rank: 3, displayName: 'Reviewer_Nova', points: 410, reviewsDone: 27, avgRating: 4.7, isCurrentUser: false },
    { rank: 4, displayName: 'Reviewer_Atlas', points: 365, reviewsDone: 24, avgRating: 4.6, isCurrentUser: true },
    { rank: 5, displayName: 'Reviewer_Echo', points: 310, reviewsDone: 20, avgRating: 4.5, isCurrentUser: false },
    { rank: 6, displayName: 'Reviewer_Zen', points: 275, reviewsDone: 18, avgRating: 4.4, isCurrentUser: false },
    { rank: 7, displayName: 'Reviewer_Flux', points: 240, reviewsDone: 16, avgRating: 4.3, isCurrentUser: false },
    { rank: 8, displayName: 'Reviewer_Pulse', points: 205, reviewsDone: 14, avgRating: 4.2, isCurrentUser: false },
];

const SCORE_BAR_WIDTH_CLASSES = [
    'w-0',
    'w-[10%]',
    'w-[20%]',
    'w-[30%]',
    'w-[40%]',
    'w-[50%]',
    'w-[60%]',
    'w-[70%]',
    'w-[80%]',
    'w-[90%]',
    'w-full',
] as const;

const STAGGER_DELAY_CLASSES = [
    '[animation-delay:0ms]',
    '[animation-delay:60ms]',
    '[animation-delay:120ms]',
    '[animation-delay:180ms]',
    '[animation-delay:240ms]',
    '[animation-delay:300ms]',
    '[animation-delay:360ms]',
    '[animation-delay:420ms]',
] as const;

const getScoreBarWidthClass = (value: number, max: number) => {
    if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
        return SCORE_BAR_WIDTH_CLASSES[0];
    }
    const ratioIndex = Math.round((Math.max(0, Math.min(value, max)) / max) * (SCORE_BAR_WIDTH_CLASSES.length - 1));
    return SCORE_BAR_WIDTH_CLASSES[ratioIndex];
};

const getStaggerDelayClass = (index: number) => STAGGER_DELAY_CLASSES[Math.min(index, STAGGER_DELAY_CLASSES.length - 1)];

/* ─────────── Utility components ─────────── */

const ScoreInput: React.FC<{
    value: number;
    max: number;
    onChange: (v: number) => void;
}> = ({ value, max, onChange }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-400';
    return (
        <div className="flex items-center gap-3">
            <div className="relative h-2 grow rounded-full bg-slate-100 overflow-hidden">
                <div
                    className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
                        color,
                        getScoreBarWidthClass(value, max),
                    )}
                />
            </div>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-label="Decrease score"
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-medium transition-colors"
                    onClick={() => onChange(Math.max(0, value - 1))}
                >−</button>
                <span className="w-10 text-center text-sm font-bold tabular-nums">{value}/{max}</span>
                <button
                    type="button"
                    aria-label="Increase score"
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-medium transition-colors"
                    onClick={() => onChange(Math.min(max, value + 1))}
                >+</button>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: SubmissionStatus; isEn: boolean }> = ({ status, isEn }) => {
    const config = {
        pending: { label: isEn ? 'Pending' : 'Chờ duyệt', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
        in_review: { label: isEn ? 'In Review' : 'Đang đánh giá', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Eye className="w-3 h-3" /> },
        reviewed: { label: isEn ? 'Reviewed' : 'Đã đánh giá', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
    }[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}>
            {config.icon} {config.label}
        </span>
    );
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{rank}</span>;
};

/* ─────────── Main component ─────────── */
const PeerReview: React.FC = () => {
    const { locale } = useI18n();
    const { authStatus, user } = useAppAuth();
    const isEn = locale === 'en';
    const isLoggedIn = authStatus === 'authenticated' && Boolean(user);

    /* Local UI state */
    const [activeTab, setActiveTab] = useState<TabId>('submissions');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [reviewingTask, setReviewingTask] = useState<ReviewTask | null>(null);
    const [rubricScores, setRubricScores] = useState<Record<string, number>>(
        Object.fromEntries(RUBRIC_CRITERIA.map(c => [c.id, 0]))
    );
    const [reviewComment, setReviewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadInputId = 'peer-review-upload-input';

    /* Copy */
    const copy = useMemo(() => isEn ? {
        badge: '⚔️ Peer-Review Battle Room',
        heroTitle: 'Sharpen your work through anonymous peer feedback',
        heroDesc: 'Submit your slides & reports anonymously before the deadline. Review others\' work with our rubric system and earn Contribution Points redeemable for courses & resources.',
        featureAnonymous: 'Anonymous submissions',
        featureRubric: 'Rubric-based scoring',
        featurePoints: 'Earn contribution points',
        tabSubmissions: 'My Submissions',
        tabReview: 'Review Queue',
        tabLeaderboard: 'Leaderboard',
        uploadTitle: 'Submit Your Work',
        uploadDesc: 'Upload your presentation or report for anonymous peer review. Your identity stays hidden.',
        uploadBtn: 'Upload File',
        uploadHint: 'Accepted: PDF, PPTX, DOCX (max 20MB)',
        titlePlaceholder: 'Submission title...',
        contestPlaceholder: 'Contest name...',
        typeSlide: 'Slides',
        typeReport: 'Report',
        submit: 'Submit Anonymously',
        cancel: 'Cancel',
        mySubmissions: 'Your Submissions',
        noSubmissions: 'No submissions yet. Upload your first work to get anonymous feedback!',
        reviews: 'reviews',
        avgScore: 'Avg score',
        reviewQueue: 'Available Reviews',
        noReviews: 'No review tasks available right now. Check back soon!',
        deadline: 'Deadline',
        reward: 'Reward',
        pts: 'pts',
        startReview: 'Start Review',
        reviewTitle: 'Reviewing',
        rubricTitle: 'Rubric Scoring',
        commentPlaceholder: 'Leave constructive feedback for the team...',
        submitReview: 'Submit Review',
        totalScore: 'Total Score',
        leaderboard: 'Top Reviewers',
        contributor: 'Contributor',
        points: 'Points',
        reviewsDone: 'Reviews',
        rating: 'Rating',
        you: '(You)',
        statsReviews: 'Total reviews given',
        statsSubmissions: 'Submissions received',
        statsAvgTurnaround: 'Avg turnaround',
        hours: 'hours',
        loginPrompt: 'Sign in to start submitting and reviewing!',
        signIn: 'Sign In',
    } : {
        badge: '⚔️ Không gian Đánh giá chéo',
        heroTitle: 'Mài sắc bài thi qua phản hồi ẩn danh từ đồng đẳng',
        heroDesc: 'Nộp Slides & Báo cáo ẩn danh trước deadline. Đánh giá bài của đội khác theo Rubric và nhận Điểm cống hiến đổi khóa học, tài liệu miễn phí.',
        featureAnonymous: 'Nộp bài ẩn danh',
        featureRubric: 'Chấm điểm Rubric',
        featurePoints: 'Tích điểm cống hiến',
        tabSubmissions: 'Bài nộp của tôi',
        tabReview: 'Hàng đợi đánh giá',
        tabLeaderboard: 'Bảng xếp hạng',
        uploadTitle: 'Nộp bài của bạn',
        uploadDesc: 'Tải lên bài thuyết trình hoặc báo cáo để nhận đánh giá ẩn danh. Danh tính của bạn được giấu kín.',
        uploadBtn: 'Tải tệp lên',
        uploadHint: 'Chấp nhận: PDF, PPTX, DOCX (tối đa 20MB)',
        titlePlaceholder: 'Tiêu đề bài nộp...',
        contestPlaceholder: 'Tên cuộc thi...',
        typeSlide: 'Slides',
        typeReport: 'Báo cáo',
        submit: 'Nộp ẩn danh',
        cancel: 'Hủy',
        mySubmissions: 'Bài nộp của bạn',
        noSubmissions: 'Chưa có bài nộp nào. Tải lên bài đầu tiên để nhận phản hồi ẩn danh!',
        reviews: 'đánh giá',
        avgScore: 'Điểm TB',
        reviewQueue: 'Đánh giá khả dụng',
        noReviews: 'Chưa có bài cần đánh giá. Quay lại sau nhé!',
        deadline: 'Hạn chót',
        reward: 'Thưởng',
        pts: 'đ',
        startReview: 'Bắt đầu đánh giá',
        reviewTitle: 'Đang đánh giá',
        rubricTitle: 'Chấm điểm theo Rubric',
        commentPlaceholder: 'Gửi nhận xét mang tính xây dựng cho đội...',
        submitReview: 'Gửi đánh giá',
        totalScore: 'Tổng điểm',
        leaderboard: 'Reviewer xuất sắc',
        contributor: 'Người đóng góp',
        points: 'Điểm',
        reviewsDone: 'Đánh giá',
        rating: 'Xếp hạng',
        you: '(Bạn)',
        statsReviews: 'Tổng đánh giá',
        statsSubmissions: 'Bài nộp nhận được',
        statsAvgTurnaround: 'Thời gian phản hồi TB',
        hours: 'giờ',
        loginPrompt: 'Đăng nhập để bắt đầu nộp bài và đánh giá!',
        signIn: 'Đăng nhập',
    }, [isEn]);

    /* Handlers */
    const totalScore = useMemo(() => Object.values(rubricScores).reduce((a, b) => a + b, 0), [rubricScores]);
    const maxTotal = RUBRIC_CRITERIA.reduce((a, c) => a + c.maxScore, 0);

    const handleRubricChange = useCallback((criterionId: string, val: number) => {
        setRubricScores(prev => ({ ...prev, [criterionId]: val }));
    }, []);

    const handleSubmitReview = useCallback(async () => {
        setSubmitting(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1200));
        setSubmitting(false);
        setReviewingTask(null);
        setRubricScores(Object.fromEntries(RUBRIC_CRITERIA.map(c => [c.id, 0])));
        setReviewComment('');
    }, []);

    const handleLoginClick = useCallback(() => {
        window.dispatchEvent(new CustomEvent('show-auth-modal', { detail: { mode: 'login' } }));
    }, []);

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'submissions', label: copy.tabSubmissions, icon: <FileText className="w-4 h-4" /> },
        { id: 'review', label: copy.tabReview, icon: <Eye className="w-4 h-4" /> },
        { id: 'leaderboard', label: copy.tabLeaderboard, icon: <Trophy className="w-4 h-4" /> },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* ═══════ Hero Section ═══════ */}
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-violet-100/60 mb-10">
                {/* Background blobs */}
                <div className="absolute inset-0 bg-linear-to-br from-violet-50 via-white to-fuchsia-50 opacity-90" aria-hidden="true" />
                <div className="absolute -top-20 right-12 h-44 w-44 rounded-full bg-violet-200/50 blur-3xl" aria-hidden="true" />
                <div className="absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-fuchsia-200/40 blur-3xl" aria-hidden="true" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-indigo-100/30 blur-3xl" aria-hidden="true" />

                <div className="relative p-6 md:p-8 lg:p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-8 items-center">
                        {/* Left */}
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-white/70 text-xs font-semibold text-violet-700 shadow-sm">
                                <Shield className="w-3.5 h-3.5" />
                                {copy.badge}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                                {copy.heroTitle}
                            </h1>
                            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-xl">
                                {copy.heroDesc}
                            </p>
                            <div className="flex flex-wrap gap-3 pt-1">
                                <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                                    <EyeOff className="w-4 h-4 text-violet-500" />
                                    {copy.featureAnonymous}
                                </div>
                                <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    {copy.featureRubric}
                                </div>
                                <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                                    <Award className="w-4 h-4 text-emerald-500" />
                                    {copy.featurePoints}
                                </div>
                            </div>
                        </div>

                        {/* Right stats */}
                    <div className="space-y-4 animate-fade-in-up [animation-delay:100ms] [animation-fill-mode:both]">
                            <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-md backdrop-blur-sm">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-slate-900">128</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">{copy.statsReviews}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-900">47</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">{copy.statsSubmissions}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-900">18</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">{copy.statsAvgTurnaround} ({copy.hours})</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-violet-100 bg-violet-50/80 px-4 py-3">
                                    <div className="text-xs font-semibold text-violet-700">{copy.featureRubric}</div>
                                    <div className="mt-1 text-2xl font-bold text-violet-800">{RUBRIC_CRITERIA.length}</div>
                                    <div className="text-[11px] text-violet-600 mt-0.5">{isEn ? 'criteria' : 'tiêu chí'}</div>
                                </div>
                                <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                                    <div className="text-xs font-semibold text-amber-700">{copy.featurePoints}</div>
                                    <div className="mt-1 text-2xl font-bold text-amber-800">15-20</div>
                                    <div className="text-[11px] text-amber-600 mt-0.5">{isEn ? 'pts / review' : 'đ / đánh giá'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════ Not logged in prompt ═══════ */}
            {!isLoggedIn && (
                <div className="mb-8 rounded-2xl border border-violet-100 bg-violet-50/50 p-6 text-center animate-fade-in-up">
                    <AlertCircle className="w-8 h-8 text-violet-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-600 mb-4">{copy.loginPrompt}</p>
                    <button
                        type="button"
                        onClick={handleLoginClick}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all"
                    >
                        {copy.signIn}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ═══════ Tab Navigation ═══════ */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl mb-8 max-w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-white text-violet-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                            }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══════ Tab Content ═══════ */}

            {/* ── Submissions Tab ── */}
            {activeTab === 'submissions' && (
                <div className="space-y-6 animate-fade-in-up">
                    {/* Upload Section */}
                    <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 p-6">
                        {!isUploadOpen ? (
                            <div className="text-center">
                                <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                                    <Upload className="w-6 h-6 text-violet-600" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-800 mb-1">{copy.uploadTitle}</h3>
                                <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">{copy.uploadDesc}</p>
                                <button
                                    type="button"
                                    onClick={() => isLoggedIn ? setIsUploadOpen(true) : handleLoginClick()}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    <Upload className="w-4 h-4" />
                                    {copy.uploadBtn}
                                </button>
                            </div>
                        ) : (
                            <div className="max-w-lg mx-auto space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-slate-800">{copy.uploadTitle}</h3>
                                    <button
                                        type="button"
                                        aria-label={isEn ? 'Close dialog' : 'Đóng hộp thoại'}
                                        onClick={() => setIsUploadOpen(false)}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder={copy.titlePlaceholder}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all"
                                />
                                <input
                                    type="text"
                                    placeholder={copy.contestPlaceholder}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all"
                                />
                                <div className="flex gap-3">
                                    <label className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-violet-300 transition-colors">
                                        <input type="radio" name="type" value="slide" defaultChecked className="accent-violet-600" />
                                        <FileText className="w-4 h-4 text-violet-500" />
                                        <span className="text-sm">{copy.typeSlide}</span>
                                    </label>
                                    <label className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-violet-300 transition-colors">
                                        <input type="radio" name="type" value="report" className="accent-violet-600" />
                                        <BookOpen className="w-4 h-4 text-violet-500" />
                                        <span className="text-sm">{copy.typeReport}</span>
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all"
                                >
                                    <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                    <p className="text-sm text-slate-500">{copy.uploadHint}</p>
                                </button>
                                <input id={uploadInputId} ref={fileInputRef} type="file" className="hidden" accept=".pdf,.pptx,.docx" title="Upload file" />
                                <div className="flex gap-3 justify-end">
                                    <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                                        {copy.cancel}
                                    </button>
                                    <button type="button" className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all">
                                        <Shield className="w-4 h-4" />
                                        {copy.submit}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submissions List */}
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">{copy.mySubmissions}</h2>
                        {MOCK_SUBMISSIONS.length === 0 ? (
                            <div className="text-center py-12 text-sm text-slate-400">{copy.noSubmissions}</div>
                        ) : (
                            <div className="grid gap-4">
                                {MOCK_SUBMISSIONS.map((sub, i) => (
                                    <div
                                        key={sub.id}
                                        className={cn(
                                            'flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-violet-100 hover:shadow-md animate-fade-in-up [animation-fill-mode:both]',
                                            getStaggerDelayClass(i),
                                        )}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sub.type === 'slide' ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600'
                                            }`}>
                                            {sub.type === 'slide' ? <FileText className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                                        </div>
                                        <div className="grow min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-slate-800 truncate">{sub.title}</span>
                                                <StatusBadge status={sub.status} isEn={isEn} />
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                <span>{sub.contestName}</span>
                                                <span>·</span>
                                                <span>{sub.anonymousId}</span>
                                                <span>·</span>
                                                <span>{sub.submittedAt}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xs text-slate-500">{sub.reviewCount} {copy.reviews}</div>
                                            {sub.avgScore !== null && (
                                                <div className="text-sm font-bold text-violet-600">{copy.avgScore}: {sub.avgScore}/{maxTotal}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Review Tab ── */}
            {activeTab === 'review' && !reviewingTask && (
                <div className="space-y-6 animate-fade-in-up">
                    <h2 className="text-lg font-semibold text-slate-800">{copy.reviewQueue}</h2>
                    {MOCK_REVIEW_TASKS.length === 0 ? (
                        <div className="text-center py-12 text-sm text-slate-400">{copy.noReviews}</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {MOCK_REVIEW_TASKS.map((task, i) => (
                                <div
                                    key={task.id}
                                    className={cn(
                                        'group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-violet-100 hover:shadow-lg animate-fade-in-up [animation-fill-mode:both]',
                                        getStaggerDelayClass(i),
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${task.type === 'slide' ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600'
                                            }`}>
                                            {task.type === 'slide' ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                        </div>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                                            <Zap className="w-3 h-3" />
                                            +{task.pointsReward} {copy.pts}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-2">{task.submissionTitle}</h3>
                                    <p className="text-xs text-slate-500 mb-1">{task.contestName}</p>
                                    <p className="text-xs text-slate-400 mb-auto">{task.anonymousId}</p>
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {copy.deadline}: {task.deadline}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => isLoggedIn ? setReviewingTask(task) : handleLoginClick()}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5"
                                        >
                                            {copy.startReview}
                                            <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Active Review (Rubric Panel) ── */}
            {activeTab === 'review' && reviewingTask && (
                <div className="animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-6">
                        <button
                            type="button"
                            aria-label={isEn ? 'Back to review queue' : 'Quay lại hàng đợi đánh giá'}
                            onClick={() => setReviewingTask(null)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                        >
                            <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                {copy.reviewTitle}: <span className="text-violet-600">{reviewingTask.submissionTitle}</span>
                            </h2>
                            <p className="text-xs text-slate-500">{reviewingTask.contestName} · {reviewingTask.anonymousId}</p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                        {/* Preview placeholder */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 min-h-100 flex items-center justify-center">
                            <div className="text-center text-slate-400">
                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">{isEn ? 'Document preview area' : 'Khu vực xem trước tài liệu'}</p>
                            </div>
                        </div>

                        {/* Rubric scoring panel */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-500" />
                                {copy.rubricTitle}
                            </h3>

                            <div className="space-y-4">
                                {RUBRIC_CRITERIA.map(criterion => (
                                    <div key={criterion.id} className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-violet-500">{criterion.icon}</span>
                                            <span className="text-xs font-semibold text-slate-700">
                                                {isEn ? criterion.labelEn : criterion.label}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">
                                            {isEn ? criterion.descriptionEn : criterion.description}
                                        </p>
                                        <ScoreInput
                                            value={rubricScores[criterion.id]}
                                            max={criterion.maxScore}
                                            onChange={(v) => handleRubricChange(criterion.id, v)}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="rounded-xl bg-linear-to-r from-violet-50 to-fuchsia-50 border border-violet-100 p-3 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700">{copy.totalScore}</span>
                                <span className={`text-xl font-bold tabular-nums ${totalScore >= maxTotal * 0.7 ? 'text-emerald-600' : totalScore >= maxTotal * 0.4 ? 'text-amber-600' : 'text-rose-500'
                                    }`}>
                                    {totalScore}<span className="text-sm text-slate-400">/{maxTotal}</span>
                                </span>
                            </div>

                            {/* Comment */}
                            <textarea
                                value={reviewComment}
                                onChange={e => setReviewComment(e.target.value)}
                                placeholder={copy.commentPlaceholder}
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all"
                            />

                            {/* Submit */}
                            <button
                                type="button"
                                onClick={handleSubmitReview}
                                disabled={submitting || totalScore === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {copy.submitReview}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Leaderboard Tab ── */}
            {activeTab === 'leaderboard' && (
                <div className="space-y-6 animate-fade-in-up">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        {copy.leaderboard}
                    </h2>

                    {/* Top 3 podium */}
                    <div className="grid grid-cols-3 gap-3 mb-2">
                        {MOCK_LEADERBOARD.slice(0, 3).map((entry, i) => {
                            const order = [1, 0, 2]; // silver, gold, bronze column order
                            const idx = order[i];
                            const e = MOCK_LEADERBOARD[idx];
                            const heights = ['h-28', 'h-36', 'h-24'];
                            const colors = [
                                'from-slate-300 to-slate-400', // silver
                                'from-amber-300 to-amber-500', // gold
                                'from-orange-300 to-orange-400', // bronze
                            ];
                            return (
                                <div key={e.rank} className={cn('flex flex-col items-center animate-fade-in-up [animation-fill-mode:both]', getStaggerDelayClass(i))}>
                                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mb-2 text-xs font-bold text-violet-600">
                                        {e.displayName.slice(-2)}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 mb-1 truncate max-w-full text-center">{e.displayName}</span>
                                    <span className="text-[11px] text-slate-500 mb-2">{e.points} {copy.pts}</span>
                                    <div className={`w-full ${heights[i]} rounded-t-xl bg-linear-to-t ${colors[i]} flex items-start justify-center pt-3`}>
                                        <RankBadge rank={e.rank} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Rest of leaderboard */}
                    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                        <div className="grid grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 px-4 py-2.5 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>#</span>
                            <span>{copy.contributor}</span>
                            <span className="text-right">{copy.points}</span>
                            <span className="text-right">{copy.reviewsDone}</span>
                            <span className="text-right">{copy.rating}</span>
                        </div>
                        {MOCK_LEADERBOARD.map((entry, i) => (
                            <div
                                key={entry.rank}
                                className={cn(
                                    'grid grid-cols-[3rem_1fr_5rem_4rem_4rem] items-center gap-2 border-t border-slate-50 px-4 py-3 text-sm transition-colors animate-fade-in-up [animation-fill-mode:both]',
                                    entry.isCurrentUser ? 'bg-violet-50/50' : 'hover:bg-slate-50',
                                    getStaggerDelayClass(i),
                                )}
                            >
                                <span><RankBadge rank={entry.rank} /></span>
                                <span className={`font-medium truncate ${entry.isCurrentUser ? 'text-violet-700' : 'text-slate-700'}`}>
                                    {entry.displayName} {entry.isCurrentUser && <span className="text-xs text-violet-500">{copy.you}</span>}
                                </span>
                                <span className="text-right font-bold text-slate-800 tabular-nums">{entry.points}</span>
                                <span className="text-right text-slate-500 tabular-nums">{entry.reviewsDone}</span>
                                <span className="text-right tabular-nums">
                                    <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium">
                                        <Star className="w-3 h-3 fill-amber-400" />
                                        {entry.avgRating}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PeerReview;
