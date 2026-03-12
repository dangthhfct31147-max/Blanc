import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, Target } from 'lucide-react';
import { api } from '../lib/api';
import { useAppAuth } from '../contexts/AppAuthContext';
import { useI18n } from '../contexts/I18nContext';
import SkillTreeV2 from '../components/skilltree/SkillTreeV2';
import type { UserSkillTreeState, BranchId, XPActivity, UserNodeProgress, NodeState } from '../components/skilltree/types';
import { xpToLevel } from '../components/skilltree/data';

// ── Old API shape (backward-compatible) ──────────
interface OldBranchTier {
    id: string;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    xpRequired: number;
    status: 'locked' | 'in-progress' | 'unlocked';
}
interface OldBranch {
    id: string;
    icon: string;
    color: string;
    colorLight: string;
    xp: number;
    currentTier: number;
    tiers: OldBranchTier[];
    activities: { type: string; title: string; xp: number; status: string; date: string }[];
}
interface SkillTreeResponse {
    user: { id: string; name: string; avatar: string | null };
    totalXP: number;
    overallLevel: number;
    branches: OldBranch[];
    // v2 fields (added by updated backend)
    contestsCompleted?: number;
    projectsSubmitted?: number;
    coursesCompleted?: number;
    streakDays?: number;
}

// Map old backend branch IDs → new frontend BranchId
const BRANCH_ID_MAP: Record<string, BranchId> = {
    research: 'research',
    programming: 'coding',
    coding: 'coding',
    startup: 'entrepreneurship',
    entrepreneurship: 'entrepreneurship',
    creative: 'creativity',
    creativity: 'creativity',
    presentation: 'presentation',
};

/** Convert old API response → UserSkillTreeState consumed by SkillTreeV2 */
function apiToUserState(data: SkillTreeResponse): UserSkillTreeState {
    const branchXP: Record<BranchId, number> = {
        research: 0, coding: 0, entrepreneurship: 0, creativity: 0, presentation: 0,
    };
    const nodeProgress: Record<string, UserNodeProgress> = {};
    const recentActivities: XPActivity[] = [];
    let contestsCompleted = data.contestsCompleted ?? 0;
    let projectsSubmitted = data.projectsSubmitted ?? 0;
    let coursesCompleted = data.coursesCompleted ?? 0;

    for (const branch of data.branches) {
        const bid = BRANCH_ID_MAP[branch.id] || branch.id as BranchId;
        branchXP[bid] = (branchXP[bid] || 0) + branch.xp;

        // Estimate counts from activities if backend didn't provide v2 fields
        if (data.contestsCompleted == null) {
            for (const act of branch.activities || []) {
                if (act.type === 'contest' && act.status === 'completed') contestsCompleted++;
                if (act.type === 'contest') {
                    // contest_join counted by registration
                }
                if (act.type === 'course' && act.status === 'completed') coursesCompleted++;
            }
        }

        // Build nodeProgress from tier status
        for (const tier of branch.tiers) {
            const nodeId = tierIdToNewId(tier.id, bid);
            let state: NodeState = 'locked';
            if (tier.status === 'unlocked') state = 'completed';
            if (tier.status === 'in-progress') state = 'active';
            nodeProgress[nodeId] = {
                nodeId,
                state,
                xpEarned: tier.status !== 'locked' ? tier.xpRequired : 0,
                conditionsMet: {},
            };
        }

        // Convert activities → XPActivity
        for (const act of (branch.activities || []).slice(0, 3)) {
            recentActivities.push({
                id: `${branch.id}-${act.date}-${act.title}`,
                type: act.type === 'contest'
                    ? (act.status === 'completed' ? 'contest_complete' : 'contest_join')
                    : (act.status === 'completed' ? 'course_complete' : 'course_complete'),
                branchId: bid,
                title: act.title,
                xpAmount: act.xp,
                timestamp: act.date || new Date().toISOString(),
            });
        }
    }

    return {
        userId: data.user.id,
        userName: data.user.name,
        userAvatar: data.user.avatar,
        globalXP: data.totalXP,
        globalLevel: data.overallLevel || xpToLevel(data.totalXP),
        branchXP,
        nodeProgress,
        achievements: [],
        contestsCompleted,
        projectsSubmitted,
        coursesCompleted,
        streakDays: data.streakDays ?? 0,
        recentActivities: recentActivities.slice(0, 8),
    };
}

/** Map old tier IDs like "programming-1" → new IDs like "coding-1" */
function tierIdToNewId(tierId: string, branchId: BranchId): string {
    // If the tier ID already matches the new branch, keep it
    if (tierId.startsWith(branchId + '-')) return tierId;
    // Otherwise replace old prefix: "programming-2" → "coding-2"
    const tierNum = tierId.split('-').pop();
    return `${branchId}-${tierNum}`;
}

export default function SkillTreePage() {
    const { user } = useAppAuth();
    const { locale } = useI18n();
    const navigate = useNavigate();
    const [data, setData] = useState<SkillTreeResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const isEn = locale === 'en';
    const copy = useMemo(() => isEn ? {
        loadFailed: 'Unable to load data',
        loading: 'Loading skill tree...',
        errorTitle: 'Unable to load',
        back: 'Back',
        badge: 'Skill Tree',
        title: 'Skill Tree',
        description: 'Your personal growth journey through contests and courses',
        footer: 'Join contests and complete courses to unlock more skill branches',
    } : {
        loadFailed: 'Không thể tải dữ liệu',
        loading: 'Đang tải cây kỹ năng...',
        errorTitle: 'Không thể tải',
        back: 'Quay lại',
        badge: 'Skill Tree',
        title: 'Cây Kỹ Năng',
        description: 'Hành trình phát triển cá nhân qua các cuộc thi và khóa học',
        footer: 'Tham gia cuộc thi và hoàn thành khóa học để mở khóa thêm nhánh kỹ năng',
    }, [isEn]);

    useEffect(() => {
        if (!user?.id) return;

        const fetchSkillTree = async () => {
            try {
                setLoading(true);
                setError('');
                const result = await api.get<SkillTreeResponse>(`/skill-tree/${user.id}`);
                setData(result);
            } catch (err: any) {
                setError(err?.message || copy.loadFailed);
            } finally {
                setLoading(false);
            }
        };

        fetchSkillTree();
    }, [copy.loadFailed, user?.id]);

    // Convert API data to UserSkillTreeState
    const userState = useMemo<UserSkillTreeState | null>(() => {
        if (!data) return null;
        return apiToUserState(data);
    }, [data]);

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">{copy.loading}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                    >
                        <Target className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-200 mb-2">{copy.errorTitle}</h2>
                    <p className="text-slate-400 mb-4">{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {copy.back}
                    </button>
                </div>
            </div>
        );
    }

    if (!userState) return null;

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}>
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {copy.back}
                    </button>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-indigo-300 text-xs font-medium mb-3"
                                style={{
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                }}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                {copy.badge}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                                {copy.title}
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {copy.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* New Skill Tree V2 */}
                <SkillTreeV2 userState={userState} locale={locale} />

                {/* Info Footer */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-500">
                        {copy.footer}
                    </p>
                </div>
            </div>
        </div>
    );
}
