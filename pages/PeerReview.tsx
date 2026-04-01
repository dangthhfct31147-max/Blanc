import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  EyeOff,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../components/ui/Common';
import { useI18n } from '../contexts/I18nContext';
import { useAppAuth } from '../contexts/AppAuthContext';
import peerReviewService, {
  type PeerReviewDashboardResponse,
  type PeerReviewSubmissionStatus,
  type PeerReviewSubmissionSummary,
  type PeerReviewSubmissionType,
  type PeerReviewTask,
  type ReceivedPeerReview,
} from '../services/peerReviewService';

type TabId = 'submissions' | 'review' | 'leaderboard';

type RubricCriterion = {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  icon: LucideIcon;
};

const RUBRIC_CRITERIA: RubricCriterion[] = [
  {
    id: 'clarity',
    label: 'Tính rõ ràng & logic',
    labelEn: 'Clarity & logic',
    description: 'Nội dung dễ theo dõi, có cấu trúc và lập luận mạch lạc.',
    descriptionEn: 'The submission is easy to follow with clear structure and reasoning.',
    icon: Target,
  },
  {
    id: 'creativity',
    label: 'Sáng tạo & độc đáo',
    labelEn: 'Creativity & originality',
    description: 'Ý tưởng có nét riêng, cách tiếp cận không rập khuôn.',
    descriptionEn: 'The idea shows originality and avoids a formulaic approach.',
    icon: Sparkles,
  },
  {
    id: 'design',
    label: 'Thiết kế & trình bày',
    labelEn: 'Design & presentation',
    description: 'Bố cục và hình thức hỗ trợ cho việc truyền đạt nội dung.',
    descriptionEn: 'Layout and presentation support the communication of the work.',
    icon: FileText,
  },
  {
    id: 'depth',
    label: 'Chiều sâu phân tích',
    labelEn: 'Depth of analysis',
    description: 'Lập luận, minh chứng và phần đào sâu đủ sức thuyết phục.',
    descriptionEn: 'Arguments, evidence, and depth make the work persuasive.',
    icon: BookOpen,
  },
  {
    id: 'impact',
    label: 'Tác động & tính khả thi',
    labelEn: 'Impact & feasibility',
    description: 'Giải pháp có khả năng triển khai và tạo giá trị thực tế.',
    descriptionEn: 'The solution appears practical and capable of real impact.',
    icon: Award,
  },
];

const ACCEPTED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function createEmptyRubricScores() {
  return Object.fromEntries(RUBRIC_CRITERIA.map((criterion) => [criterion.id, 0])) as Record<string, number>;
}

function formatDateLabel(value: string | null | undefined, isEn: boolean) {
  if (!value) return isEn ? 'N/A' : 'Chưa có';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(isEn ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatHourLabel(value: number | null | undefined, isEn: boolean) {
  if (!Number.isFinite(Number(value))) return isEn ? 'N/A' : 'Chưa có';
  return `${Number(value).toFixed(1)} ${isEn ? 'hours' : 'giờ'}`;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getStatusMeta(status: PeerReviewSubmissionStatus, isEn: boolean) {
  if (status === 'reviewed') {
    return {
      label: isEn ? 'Fully reviewed' : 'Đủ review',
      className: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    };
  }
  if (status === 'in_review') {
    return {
      label: isEn ? 'In review' : 'Đang được review',
      className: 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    };
  }
  return {
    label: isEn ? 'Waiting for reviewers' : 'Đang chờ reviewer',
    className: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
}

function getTypeMeta(type: PeerReviewSubmissionType, isEn: boolean) {
  if (type === 'report') {
    return {
      label: isEn ? 'Report' : 'Báo cáo',
      className: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
      icon: BookOpen,
    };
  }
  return {
    label: isEn ? 'Slides' : 'Slides',
    className: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    icon: FileText,
  };
}

const ScoreInput: React.FC<{
  value: number;
  label: string;
  description: string;
  icon: LucideIcon;
  onChange: (nextValue: number) => void;
}> = ({ value, label, description, icon: Icon, onChange }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 p-4">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 text-violet-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 grow">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
          <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">{value}/10</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-4 h-2 w-full cursor-pointer accent-violet-600"
        />
      </div>
    </div>
  </div>
);

const HelpfulnessRating: React.FC<{
  rating: number | null;
  disabled?: boolean;
  onRate: (rating: number) => void;
}> = ({ rating, disabled = false, onRate }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
      <button
        key={value}
        type="button"
        disabled={disabled}
        onClick={() => onRate(value)}
        className={cn(
          'rounded-lg p-1 transition-colors',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-amber-50 dark:hover:bg-amber-900/30',
        )}
        aria-label={`Rate review ${value} out of 5`}
      >
        <Star
          className={cn(
            'h-4 w-4',
            value <= Number(rating || 0) ? 'fill-amber-400 text-amber-500' : 'text-slate-300',
          )}
        />
      </button>
    ))}
  </div>
);

const PeerReview: React.FC = () => {
  const { locale } = useI18n();
  const { authStatus, user } = useAppAuth();
  const { getToken } = useAuth();
  const isEn = locale === 'en';
  const isLoggedIn = authStatus === 'authenticated' && Boolean(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>('submissions');
  const [dashboard, setDashboard] = useState<PeerReviewDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadContestName, setUploadContestName] = useState('');
  const [uploadType, setUploadType] = useState<PeerReviewSubmissionType>('slide');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewingTask, setReviewingTask] = useState<PeerReviewTask | null>(null);
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(createEmptyRubricScores);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [helpfulnessBusyId, setHelpfulnessBusyId] = useState<string | null>(null);

  const copy = useMemo(() => (isEn ? {
    badge: 'Peer review workspace',
    heroTitle: 'Anonymous cross-review with daily quotas and reviewer trust',
    heroDesc: 'Teams submit anonymously, reviewers get a daily cap, and thoughtful feedback earns higher reputation so stronger reviewers matter more over time.',
    featureAnonymous: 'Anonymous submission and reviewer aliases',
    featureQuota: 'Daily review cap to prevent overload',
    featureTrust: 'Reviewer reputation affects community trust',
    tabSubmissions: 'My submissions',
    tabReview: 'Review queue',
    tabLeaderboard: 'Reviewer trust board',
    searchPlaceholder: 'Search by contest, anonymous ID, or reviewer alias...',
    loginTitle: 'Sign in to submit, review, and build reputation',
    loginDesc: 'Peer review data is tied to your account because quotas, trust scores, and ownership feedback all run on the server.',
    signIn: 'Sign in',
    uploadTitle: 'Submit work anonymously',
    uploadDesc: 'Upload one PDF, PPTX, or DOCX. The community only sees an anonymous code, not your account identity.',
    uploadCta: 'Create anonymous submission',
    titlePlaceholder: 'Project title',
    contestPlaceholder: 'Contest or challenge name',
    uploadHint: 'Accepted: PDF, PPTX, DOCX up to 20MB',
    noSubmissions: 'No submissions yet.',
    noTasks: 'No review tasks available right now.',
    noLeaderboard: 'No reviewer data yet.',
    reviews: 'reviews',
    avgScore: 'Average',
    weightedScore: 'Trust-adjusted',
    reviewDeadline: 'Review by',
    openFile: 'Open file',
    dailyQuota: 'Daily quota',
    remainingToday: 'Remaining today',
    reputation: 'Reputation',
    trustWeight: 'Trust weight',
    reviewsDone: 'Reviews done',
    submissionsReceived: 'Feedback received',
    turnaround: 'Average turnaround',
    startReview: 'Start review',
    finishReview: 'Submit review',
    backToQueue: 'Back to queue',
    rubricTitle: 'Rubric scoring',
    commentPlaceholder: 'Leave specific, constructive feedback that helps the team improve.',
    reviewPreviewTitle: 'Anonymous review package',
    hiddenIdentity: 'Identity hidden',
    helpfulnessLabel: 'How useful was this review?',
    uploadSuccess: 'Anonymous submission created.',
    uploadFailed: 'Unable to create submission.',
    reviewSuccess: 'Review submitted.',
    reviewFailed: 'Unable to submit review.',
    helpfulnessSaved: 'Reviewer helpfulness updated.',
    helpfulnessFailed: 'Unable to update helpfulness.',
    reload: 'Reload',
    reviewerBoard: 'Top trusted reviewers',
    points: 'Points',
    helpfulness: 'Helpfulness',
    currentYou: 'You',
    enoughReviews: 'Enough reviews reached',
    quotaReached: 'You reached your review limit for today.',
    reviewQuality: 'Review quality',
    anonymousCode: 'Anonymous code',
  } : {
    badge: 'Không gian chấm chéo',
    heroTitle: 'Chấm chéo ẩn danh, có quota theo ngày và điểm uy tín reviewer',
    heroDesc: 'Mỗi bài được nộp dưới mã ẩn danh, mỗi reviewer có giới hạn review mỗi ngày, và phản hồi tốt sẽ nâng uy tín để tiếng nói của reviewer chất lượng được tin cậy hơn theo thời gian.',
    featureAnonymous: 'Ẩn danh cả phía submitter lẫn reviewer',
    featureQuota: 'Giới hạn review mỗi ngày để tránh quá tải',
    featureTrust: 'Điểm uy tín ảnh hưởng mức độ tin cậy',
    tabSubmissions: 'Bài nộp của tôi',
    tabReview: 'Hàng đợi review',
    tabLeaderboard: 'Bảng uy tín reviewer',
    searchPlaceholder: 'Tìm theo cuộc thi, mã ẩn danh hoặc reviewer...',
    loginTitle: 'Đăng nhập để nộp bài, review và tích điểm uy tín',
    loginDesc: 'Quota, điểm uy tín và quyền đánh giá chất lượng feedback đều được xử lý ở server nên cần gắn với tài khoản của bạn.',
    signIn: 'Đăng nhập',
    uploadTitle: 'Nộp bài ẩn danh',
    uploadDesc: 'Tải lên một file PDF, PPTX hoặc DOCX. Cộng đồng chỉ nhìn thấy mã ẩn danh, không thấy danh tính tài khoản của bạn.',
    uploadCta: 'Tạo bài nộp ẩn danh',
    titlePlaceholder: 'Tên dự án / bài nộp',
    contestPlaceholder: 'Tên cuộc thi hoặc challenge',
    uploadHint: 'Chấp nhận PDF, PPTX, DOCX tối đa 20MB',
    noSubmissions: 'Bạn chưa có bài nộp nào.',
    noTasks: 'Hiện chưa có bài nào chờ review.',
    noLeaderboard: 'Chưa có dữ liệu reviewer.',
    reviews: 'đánh giá',
    avgScore: 'Điểm TB',
    weightedScore: 'Điểm theo trust',
    reviewDeadline: 'Review trước',
    openFile: 'Mở file',
    dailyQuota: 'Quota mỗi ngày',
    remainingToday: 'Còn lại hôm nay',
    reputation: 'Uy tín',
    trustWeight: 'Trọng số trust',
    reviewsDone: 'Đã review',
    submissionsReceived: 'Feedback nhận được',
    turnaround: 'Tốc độ phản hồi TB',
    startReview: 'Bắt đầu review',
    finishReview: 'Gửi review',
    backToQueue: 'Quay lại hàng đợi',
    rubricTitle: 'Chấm điểm theo rubric',
    commentPlaceholder: 'Để lại phản hồi cụ thể, có ích và đủ rõ để đội kia biết nên sửa gì tiếp theo.',
    reviewPreviewTitle: 'Gói bài review ẩn danh',
    hiddenIdentity: 'Danh tính đã được ẩn',
    helpfulnessLabel: 'Review này hữu ích đến mức nào?',
    uploadSuccess: 'Đã tạo bài nộp ẩn danh.',
    uploadFailed: 'Không thể tạo bài nộp.',
    reviewSuccess: 'Đã gửi review.',
    reviewFailed: 'Không thể gửi review.',
    helpfulnessSaved: 'Đã cập nhật độ hữu ích của review.',
    helpfulnessFailed: 'Không thể cập nhật độ hữu ích.',
    reload: 'Tải lại',
    reviewerBoard: 'Reviewer được tin cậy nhất',
    points: 'Điểm',
    helpfulness: 'Độ hữu ích',
    currentYou: 'Bạn',
    enoughReviews: 'Bài đã đủ số review',
    quotaReached: 'Bạn đã dùng hết quota review trong hôm nay.',
    reviewQuality: 'Chất lượng review',
    anonymousCode: 'Mã ẩn danh',
  }), [isEn]);

  const totalScore = useMemo(
    () => Object.values(rubricScores).reduce((sum, value) => sum + value, 0),
    [rubricScores],
  );

  const loadDashboard = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError('');
    try {
      const response = await peerReviewService.getDashboard();
      setDashboard(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load peer review data.');
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setDashboard(null);
      setReviewingTask(null);
      return;
    }
    void loadDashboard();
  }, [isLoggedIn, loadDashboard]);

  useEffect(() => {
    if (!dashboard || !reviewingTask) return;
    const refreshedTask = dashboard.availableTasks.find((task) => task.id === reviewingTask.id) || null;
    setReviewingTask(refreshedTask);
  }, [dashboard, reviewingTask]);

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return dashboard?.submissions || [];
    return (dashboard?.submissions || []).filter((submission) =>
      [submission.title, submission.contestName, submission.anonymousId].join(' ').toLowerCase().includes(query),
    );
  }, [dashboard?.submissions, searchQuery]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return dashboard?.availableTasks || [];
    return (dashboard?.availableTasks || []).filter((task) =>
      [task.contestName, task.anonymousId, task.file.name].join(' ').toLowerCase().includes(query),
    );
  }, [dashboard?.availableTasks, searchQuery]);

  const filteredLeaderboard = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return dashboard?.leaderboard || [];
    return (dashboard?.leaderboard || []).filter((entry) => entry.alias.toLowerCase().includes(query));
  }, [dashboard?.leaderboard, searchQuery]);

  const handleLoginClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('show-auth-modal', { detail: { mode: 'login' } }));
  }, []);

  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setUploadFile(null);
      return;
    }
    if (!ACCEPTED_FILE_TYPES.has(file.type)) {
      toast.error(isEn ? 'Only PDF, PPTX, and DOCX files are supported.' : 'Chỉ hỗ trợ PDF, PPTX và DOCX.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(isEn ? 'Each file must be 20MB or smaller.' : 'Mỗi file phải nhỏ hơn hoặc bằng 20MB.');
      event.target.value = '';
      return;
    }
    setUploadFile(file);
  }, [isEn]);

  const resetUploadForm = useCallback(() => {
    setUploadTitle('');
    setUploadContestName('');
    setUploadType('slide');
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleCreateSubmission = useCallback(async () => {
    if (!uploadTitle.trim() || !uploadContestName.trim() || !uploadFile) {
      toast.error(isEn ? 'Title, contest name, and file are required.' : 'Cần nhập tiêu đề, tên cuộc thi và chọn file.');
      return;
    }

    setUploading(true);
    try {
      const accessToken = await getToken().catch(() => null);
      await peerReviewService.createSubmission({
        title: uploadTitle.trim(),
        contestName: uploadContestName.trim(),
        type: uploadType,
        file: uploadFile,
        accessToken,
      });
      toast.success(copy.uploadSuccess);
      setIsUploadOpen(false);
      resetUploadForm();
      setActiveTab('submissions');
      await loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.uploadFailed);
    } finally {
      setUploading(false);
    }
  }, [copy.uploadFailed, copy.uploadSuccess, getToken, isEn, loadDashboard, resetUploadForm, uploadContestName, uploadFile, uploadTitle, uploadType]);

  const handleStartReview = useCallback((task: PeerReviewTask) => {
    if (!dashboard || dashboard.userState.reviewsRemainingToday <= 0) {
      toast.error(copy.quotaReached);
      return;
    }
    setRubricScores(createEmptyRubricScores());
    setReviewComment('');
    setReviewingTask(task);
  }, [copy.quotaReached, dashboard]);

  const handleSubmitReview = useCallback(async () => {
    if (!reviewingTask) return;
    if (totalScore <= 0) {
      toast.error(isEn ? 'Please score the submission before sending the review.' : 'Hãy chấm điểm trước khi gửi review.');
      return;
    }

    setSubmittingReview(true);
    try {
      await peerReviewService.submitReview({
        submissionId: reviewingTask.id,
        scores: rubricScores,
        comment: reviewComment.trim(),
      });
      toast.success(copy.reviewSuccess);
      setReviewingTask(null);
      setReviewComment('');
      setRubricScores(createEmptyRubricScores());
      await loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.reviewFailed);
    } finally {
      setSubmittingReview(false);
    }
  }, [copy.reviewFailed, copy.reviewSuccess, isEn, loadDashboard, reviewComment, reviewingTask, rubricScores, totalScore]);

  const handleRateHelpfulness = useCallback(async (review: ReceivedPeerReview, rating: number) => {
    setHelpfulnessBusyId(review.id);
    try {
      await peerReviewService.rateHelpfulness(review.id, rating);
      toast.success(copy.helpfulnessSaved);
      await loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.helpfulnessFailed);
    } finally {
      setHelpfulnessBusyId(null);
    }
  }, [copy.helpfulnessFailed, copy.helpfulnessSaved, loadDashboard]);

  const topStats = dashboard ? [
    { label: copy.dailyQuota, value: `${dashboard.userState.reviewsSubmittedToday}/${dashboard.userState.dailyReviewLimit}`, tone: 'from-violet-500 to-fuchsia-500', icon: Clock3 },
    { label: copy.remainingToday, value: String(dashboard.userState.reviewsRemainingToday), tone: 'from-emerald-500 to-teal-500', icon: Shield },
    { label: copy.reputation, value: String(dashboard.userState.reviewerProfile.reputationScore), tone: 'from-amber-400 to-orange-500', icon: Award },
    { label: copy.trustWeight, value: `${dashboard.userState.reviewerProfile.trustWeight}x`, tone: 'from-sky-500 to-cyan-500', icon: Gauge },
  ] : [];

  const tabs: { id: TabId; label: string }[] = [
    { id: 'submissions', label: copy.tabSubmissions },
    { id: 'review', label: copy.tabReview },
    { id: 'leaderboard', label: copy.tabLeaderboard },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_24px_80px_-40px_rgba(91,33,182,0.45)]">
        <div className="absolute inset-0 bg-linear-to-br from-violet-50 dark:from-violet-950/30 via-white dark:via-slate-950 to-cyan-50 dark:to-cyan-950/30" aria-hidden="true" />
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 h-56 w-56 translate-x-1/4 translate-y-1/4 rounded-full bg-cyan-200/40 blur-3xl" aria-hidden="true" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300 shadow-sm">
                <EyeOff className="h-3.5 w-3.5" />
                {copy.badge}
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 md:text-base">
                {copy.heroDesc}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  { icon: Lock, label: copy.featureAnonymous },
                  { icon: Clock3, label: copy.featureQuota },
                  { icon: Award, label: copy.featureTrust },
                ].map((item) => (
                  <div key={item.label} className="inline-flex items-center gap-2 rounded-2xl border border-white/70 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 shadow-sm">
                    <item.icon className="h-4 w-4 text-violet-500" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {isLoggedIn && dashboard ? topStats.map((stat) => (
                <div key={stat.label} className="overflow-hidden rounded-[1.5rem] border border-white/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 shadow-sm">
                  <div className={cn('h-1.5 w-full bg-linear-to-r', stat.tone)} />
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">{stat.label}</p>
                      <p className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">{stat.value}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-[1.75rem] border border-white/80 dark:border-slate-700 bg-white/92 dark:bg-slate-900/92 p-6 shadow-sm sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.loginTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{copy.loginDesc}</p>
                  <button
                    type="button"
                    onClick={handleLoginClick}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700"
                  >
                    <Shield className="h-4 w-4" />
                    {copy.signIn}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all',
                  activeTab === tab.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-0 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-300 outline-none transition-colors focus:border-violet-300 focus:bg-white dark:focus:bg-slate-900"
              />
            </label>
            {activeTab === 'submissions' && isLoggedIn && (
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700"
              >
                <Upload className="h-4 w-4" />
                {copy.uploadCta}
              </button>
            )}
          </div>
        </div>

        {isLoggedIn && (
          <div className="mt-4 grid gap-3 rounded-[1.5rem] border border-violet-100 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-900/30 p-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">{copy.reviewsDone}</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{dashboard?.stats.totalReviewsGiven ?? 0}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">{copy.submissionsReceived}</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{dashboard?.stats.submissionsReceived ?? 0}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">{copy.turnaround}</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{formatHourLabel(dashboard?.stats.avgTurnaroundHours, isEn)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">{copy.reviewerBoard}</p>
              <p className="mt-1 truncate text-lg font-black text-slate-900 dark:text-slate-100">
                {dashboard?.userState.reviewerProfile.alias || (isEn ? 'No profile yet' : 'Chưa có hồ sơ')}
              </p>
            </div>
          </div>
        )}

        {!isLoggedIn ? (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-6 py-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-violet-500" />
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{copy.loginTitle}</p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400">{copy.loginDesc}</p>
            <button
              type="button"
              onClick={handleLoginClick}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700"
            >
              <Shield className="h-4 w-4" />
              {copy.signIn}
            </button>
          </div>
        ) : loading ? (
          <div className="mt-8 flex items-center justify-center gap-3 rounded-[1.75rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-16 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{isEn ? 'Loading peer review data...' : 'Đang tải dữ liệu chấm chéo...'}</span>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[1.75rem] border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 p-6 text-rose-700 dark:text-rose-300">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm leading-6">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 shadow-sm"
              >
                <RefreshCw className="h-4 w-4" />
                {copy.reload}
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'submissions' && (
              <div className="mt-6 space-y-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noSubmissions}
                  </div>
                ) : filteredSubmissions.map((submission) => {
                  const statusMeta = getStatusMeta(submission.status, isEn);
                  const typeMeta = getTypeMeta(submission.type, isEn);
                  return (
                    <div key={submission.id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 p-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', typeMeta.className)}>
                              <typeMeta.icon className="h-3.5 w-3.5" />
                              {typeMeta.label}
                            </span>
                            <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', statusMeta.className)}>
                              {statusMeta.label}
                            </span>
                            <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              {copy.anonymousCode}: {submission.anonymousId}
                            </span>
                          </div>
                          <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-slate-100">{submission.title}</h2>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{submission.contestName}</p>
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatDateLabel(submission.submittedAt, isEn)}</span>
                            <span>{submission.reviewCount} {copy.reviews}</span>
                            <span>{submission.file.name} • {formatFileSize(submission.file.sizeBytes)}</span>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.avgScore}</p>
                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                              {submission.averageScore ?? '—'}
                              {submission.averageScore !== null && (
                                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500"> / {dashboard?.config.maxTotalScore ?? 50}</span>
                              )}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-500">{copy.weightedScore}</p>
                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                              {submission.weightedAverageScore ?? '—'}
                              {submission.weightedAverageScore !== null && (
                                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500"> / {dashboard?.config.maxTotalScore ?? 50}</span>
                              )}
                            </p>
                          </div>
                          <a
                            href={submission.file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors hover:border-violet-200 hover:text-violet-700 sm:col-span-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {copy.openFile}
                          </a>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{isEn ? 'Anonymous feedback received' : 'Feedback ẩn danh đã nhận'}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {isEn ? 'Rate usefulness to improve reviewer reputation.' : 'Đánh giá độ hữu ích để hệ thống cập nhật điểm uy tín reviewer.'}
                            </p>
                          </div>
                          <div className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {submission.receivedReviews.length}/{dashboard?.config.maxReviewsPerSubmission ?? 3}
                          </div>
                        </div>

                        {submission.receivedReviews.length === 0 ? (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            {isEn ? 'No anonymous feedback yet.' : 'Chưa có feedback ẩn danh nào.'}
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            {submission.receivedReviews.map((review) => (
                              <div key={review.id} className="rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{review.reviewerAlias}</p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateLabel(review.submittedAt, isEn)}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-sm">
                                      {copy.reputation}: {review.reviewerProfile.reputationScore}
                                    </span>
                                    <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-sm">
                                      {copy.trustWeight}: {review.reviewerProfile.trustWeight}x
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-end justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.weightedScore}</p>
                                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
                                      {review.totalScore}
                                      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500"> / {review.maxTotalScore}</span>
                                    </p>
                                  </div>
                                  <div className="rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-right shadow-sm">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.reviewQuality}</p>
                                    <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{Math.round(review.reviewerProfile.qualityScore * 100)}%</p>
                                  </div>
                                </div>

                                <p className="mt-4 rounded-2xl border border-white/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                  {review.comment}
                                </p>

                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                  {RUBRIC_CRITERIA.map((criterion) => (
                                    <div key={`${review.id}-${criterion.id}`} className="rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">
                                        {isEn ? criterion.labelEn : criterion.label}
                                      </p>
                                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{review.scores[criterion.id]} / 10</p>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-amber-100 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/30 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">{copy.helpfulnessLabel}</p>
                                  <HelpfulnessRating
                                    rating={review.helpfulnessRating}
                                    disabled={helpfulnessBusyId === review.id}
                                    onRate={(rating) => void handleRateHelpfulness(review, rating)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'review' && (
              <div className="mt-6 space-y-5">
                <div className={cn(
                  'rounded-[1.75rem] border p-5',
                  (dashboard?.userState.reviewsRemainingToday || 0) > 0 ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/30' : 'border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-900/30',
                )}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      {(dashboard?.userState.reviewsRemainingToday || 0) > 0 ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {isEn
                            ? `You can still review ${dashboard?.userState.reviewsRemainingToday ?? 0} submission(s) today.`
                            : `Hôm nay bạn còn review được ${dashboard?.userState.reviewsRemainingToday ?? 0} bài.`}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {isEn
                            ? 'Higher-quality feedback increases your reputation, and future reviews from you will carry more trust weight.'
                            : 'Feedback chất lượng sẽ tăng điểm uy tín của bạn, và các review sau này từ bạn sẽ có trọng số trust cao hơn.'}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.reputation}</p>
                        <p className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">{dashboard?.userState.reviewerProfile.reputationScore ?? 0}</p>
                      </div>
                      <div className="rounded-2xl bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.trustWeight}</p>
                        <p className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">{dashboard?.userState.reviewerProfile.trustWeight ?? 0.85}x</p>
                      </div>
                    </div>
                  </div>
                </div>

                {!reviewingTask ? (
                  filteredTasks.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                      {copy.noTasks}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {filteredTasks.map((task) => {
                        const typeMeta = getTypeMeta(task.type, isEn);
                        return (
                          <div key={task.id} className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', typeMeta.className)}>
                                <typeMeta.icon className="h-3.5 w-3.5" />
                                {typeMeta.label}
                              </span>
                              <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                +{task.pointsReward} {copy.points}
                              </span>
                            </div>

                            <div className="mt-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">{copy.anonymousCode}</p>
                              <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{task.anonymousId}</h3>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{task.contestName}</p>
                            </div>

                            <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-400">
                              <div className="flex items-center justify-between gap-3">
                                <span>{copy.reviewDeadline}</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateLabel(task.reviewDeadline, isEn)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>{copy.reviews}</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {task.currentReviewCount}/{dashboard?.config.maxReviewsPerSubmission ?? 3}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>{isEn ? 'Still needed' : 'Còn thiếu'}</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{task.reviewsNeeded}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>{isEn ? 'File' : 'Tệp'}</span>
                                <span className="max-w-[65%] truncate font-semibold text-slate-800 dark:text-slate-200">{task.file.name}</span>
                              </div>
                            </div>

                            <div className="mt-5 flex gap-3">
                              <a
                                href={task.file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex grow items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors hover:border-violet-200 hover:text-violet-700"
                              >
                                <ExternalLink className="h-4 w-4" />
                                {copy.openFile}
                              </a>
                              <button
                                type="button"
                                disabled={(dashboard?.userState.reviewsRemainingToday || 0) <= 0}
                                onClick={() => handleStartReview(task)}
                                className="inline-flex grow items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                              >
                                {copy.startReview}
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.75rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <button
                            type="button"
                            onClick={() => setReviewingTask(null)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            {copy.backToQueue}
                          </button>
                          <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-slate-100">{reviewingTask.anonymousId}</h2>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{reviewingTask.contestName}</p>
                        </div>
                        <div className="rounded-2xl border border-violet-100 dark:border-violet-800 bg-white dark:bg-slate-900 px-4 py-3 text-right shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-500">{copy.hiddenIdentity}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.reviewPreviewTitle}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <a
                          href={reviewingTask.file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {copy.openFile}
                        </a>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 shadow-sm">
                          {reviewingTask.file.name} • {formatFileSize(reviewingTask.file.sizeBytes)}
                        </div>
                      </div>

                      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        {reviewingTask.file.mimeType === 'application/pdf' ? (
                          <iframe
                            src={reviewingTask.file.url}
                            title={reviewingTask.file.name}
                            className="h-[620px] w-full"
                          />
                        ) : (
                          <div className="flex min-h-[620px] flex-col items-center justify-center gap-4 bg-linear-to-br from-slate-100 via-white to-slate-50 p-8 text-center">
                            <FileText className="h-14 w-14 text-violet-500" />
                            <div>
                              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{reviewingTask.file.name}</p>
                              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
                                {isEn
                                  ? 'This file type opens in a new tab for review. The anonymous code remains visible while the account identity stays hidden.'
                                  : 'Loại file này sẽ mở ở tab mới để review. Hệ thống vẫn chỉ hiển thị mã ẩn danh và không lộ danh tính tài khoản.'}
                              </p>
                            </div>
                            <a
                              href={reviewingTask.file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {copy.openFile}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.rubricTitle}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {isEn
                              ? 'A stronger review has both clear scoring and useful written feedback.'
                              : 'Một review tốt cần vừa có điểm rõ ràng, vừa có nhận xét đủ hữu ích.'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/30 px-4 py-3 text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-500">{copy.weightedScore}</p>
                          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
                            {totalScore}
                            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500"> / {dashboard?.config.maxTotalScore ?? 50}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        {RUBRIC_CRITERIA.map((criterion) => (
                          <ScoreInput
                            key={criterion.id}
                            value={rubricScores[criterion.id] || 0}
                            label={isEn ? criterion.labelEn : criterion.label}
                            description={isEn ? criterion.descriptionEn : criterion.description}
                            icon={criterion.icon}
                            onChange={(nextValue) => setRubricScores((current) => ({ ...current, [criterion.id]: nextValue }))}
                          />
                        ))}
                      </div>

                      <div className="mt-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-violet-500" />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{isEn ? 'Constructive feedback' : 'Nhận xét xây dựng'}</span>
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          rows={6}
                          placeholder={copy.commentPlaceholder}
                          className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-700 dark:text-slate-300 outline-none transition-colors focus:border-violet-300"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSubmitReview()}
                        disabled={submittingReview || totalScore <= 0 || reviewComment.trim().length < 24}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                      >
                        {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {copy.finishReview}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {filteredLeaderboard.slice(0, 3).map((entry) => (
                    <div key={entry.alias} className="rounded-[1.75rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">#{entry.rank}</p>
                          <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{entry.alias}</h3>
                        </div>
                        <Trophy className="h-8 w-8 text-amber-500" />
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.points}</p>
                          <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{entry.points}</p>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.reputation}</p>
                          <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{entry.reputationScore}</p>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.reviewsDone}</p>
                          <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{entry.reviewsDone}</p>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400">{copy.helpfulness}</p>
                          <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{entry.avgHelpfulness ?? '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredLeaderboard.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noLeaderboard}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="grid grid-cols-[4rem_1.4fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-3 bg-slate-50 dark:bg-slate-800 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      <span>#</span>
                      <span>{isEn ? 'Reviewer' : 'Reviewer'}</span>
                      <span className="text-right">{copy.points}</span>
                      <span className="text-right">{copy.reviewsDone}</span>
                      <span className="text-right">{copy.reputation}</span>
                      <span className="text-right">{copy.helpfulness}</span>
                    </div>
                    {filteredLeaderboard.map((entry) => (
                      <div
                        key={entry.alias}
                        className={cn(
                          'grid grid-cols-[4rem_1.4fr_0.9fr_0.9fr_0.9fr_0.9fr] items-center gap-3 border-t border-slate-100 dark:border-slate-800 px-5 py-4 text-sm',
                          entry.isCurrentUser ? 'bg-violet-50/60 dark:bg-violet-900/30' : 'bg-white dark:bg-slate-900',
                        )}
                      >
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">#{entry.rank}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {entry.alias} {entry.isCurrentUser && <span className="text-xs font-medium text-violet-500">({copy.currentYou})</span>}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.trustWeight}: {entry.trustWeight}x</p>
                        </div>
                        <span className="text-right font-bold text-slate-900 dark:text-slate-100">{entry.points}</span>
                        <span className="text-right text-slate-600 dark:text-slate-400">{entry.reviewsDone}</span>
                        <span className="text-right text-slate-600 dark:text-slate-400">{entry.reputationScore}</span>
                        <span className="text-right text-slate-600 dark:text-slate-400">{entry.avgHelpfulness ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => {
              setIsUploadOpen(false);
              resetUploadForm();
            }}
            aria-label={isEn ? 'Close upload dialog' : 'Đóng hộp thoại nộp bài'}
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/80 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_30px_90px_-40px_rgba(91,33,182,0.55)]">
            <div className="bg-linear-to-r from-violet-600 to-fuchsia-500 px-6 py-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">{copy.uploadTitle}</p>
              <h2 className="mt-2 text-2xl font-black">{copy.uploadCta}</h2>
              <p className="mt-2 text-sm leading-6 text-white/85">{copy.uploadDesc}</p>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{isEn ? 'Title' : 'Tiêu đề'}</span>
                  <input
                    value={uploadTitle}
                    onChange={(event) => setUploadTitle(event.target.value)}
                    placeholder={copy.titlePlaceholder}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none transition-colors focus:border-violet-300 focus:bg-white dark:focus:bg-slate-900"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{isEn ? 'Contest' : 'Cuộc thi'}</span>
                  <input
                    value={uploadContestName}
                    onChange={(event) => setUploadContestName(event.target.value)}
                    placeholder={copy.contestPlaceholder}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none transition-colors focus:border-violet-300 focus:bg-white dark:focus:bg-slate-900"
                  />
                </label>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{isEn ? 'Format' : 'Loại bài'}</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['slide', 'report'] as PeerReviewSubmissionType[]).map((type) => {
                    const typeMeta = getTypeMeta(type, isEn);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setUploadType(type)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                          uploadType === type ? 'border-violet-300 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-violet-200',
                        )}
                      >
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', typeMeta.className)}>
                          <typeMeta.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{typeMeta.label}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{type === 'slide' ? 'PDF / PPTX' : 'PDF / DOCX'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{isEn ? 'Review file' : 'File để review'}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.uploadHint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:text-violet-700"
                  >
                    <Upload className="h-4 w-4" />
                    {isEn ? 'Choose file' : 'Chọn file'}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.pptx,.docx"
                  className="hidden"
                  onChange={handleFileSelection}
                />

                <div className="mt-4 rounded-2xl bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
                  {uploadFile ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{uploadFile.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatFileSize(uploadFile.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
                      >
                        {isEn ? 'Remove' : 'Bỏ file'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{isEn ? 'No file selected yet.' : 'Chưa chọn file nào.'}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    resetUploadForm();
                  }}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void handleCreateSubmission()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {copy.uploadCta}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeerReview;
