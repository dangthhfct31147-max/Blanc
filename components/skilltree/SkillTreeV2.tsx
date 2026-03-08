// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Skill Tree — Main responsive orchestrator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, TrendingUp, Trophy, Target, Sparkles,
    ChevronRight, Info, X,
} from 'lucide-react';
import type { BranchId, ComputedBranch, ComputedNode, Locale, UserSkillTreeState } from './types';
import { xpToNextLevel } from './data';
import { computeSkillTree } from './engine';
import SkillTree from './SkillTree';
import MobileBranchExplorer from './MobileBranchExplorer';
import NodeDetailPanel from './NodeDetailPanel';
import ProgressRing from './ProgressRing';

interface SkillTreeV2Props {
    userState: UserSkillTreeState;
    locale?: Locale;
}

type StatTone = 'indigo' | 'emerald' | 'amber' | 'pink';

type BranchAccentClasses = {
    recommendationCard: string;
    recommendationIcon: string;
    accentText: string;
    activeButton: string;
    progressDot: string;
    activityDot: string;
    activityText: string;
};

const STAT_TONE_CLASSES: Record<StatTone, { card: string; icon: string; label: string }> = {
    indigo: {
        card: 'border border-[#6366f120] bg-[linear-gradient(135deg,_#6366f110,_#6366f105)]',
        icon: 'text-[#6366f1]',
        label: 'text-[#6366f1cc]',
    },
    emerald: {
        card: 'border border-[#10b98120] bg-[linear-gradient(135deg,_#10b98110,_#10b98105)]',
        icon: 'text-[#10b981]',
        label: 'text-[#10b981cc]',
    },
    amber: {
        card: 'border border-[#f59e0b20] bg-[linear-gradient(135deg,_#f59e0b10,_#f59e0b05)]',
        icon: 'text-[#f59e0b]',
        label: 'text-[#f59e0bcc]',
    },
    pink: {
        card: 'border border-[#ec489920] bg-[linear-gradient(135deg,_#ec489910,_#ec489905)]',
        icon: 'text-[#ec4899]',
        label: 'text-[#ec4899cc]',
    },
};

const BRANCH_ACCENT_CLASSES: Record<BranchId, BranchAccentClasses> = {
    research: {
        recommendationCard: 'border border-[#3b82f620] bg-[linear-gradient(135deg,_#3b82f608,_transparent)]',
        recommendationIcon: 'bg-[#3b82f615]',
        accentText: 'text-[#3b82f6]',
        activeButton: 'border border-[#3b82f640] bg-[#3b82f612]',
        progressDot: 'bg-[#3b82f630]',
        activityDot: 'bg-[#3b82f6]',
        activityText: 'text-[#93c5fd]',
    },
    coding: {
        recommendationCard: 'border border-[#10b98120] bg-[linear-gradient(135deg,_#10b98108,_transparent)]',
        recommendationIcon: 'bg-[#10b98115]',
        accentText: 'text-[#10b981]',
        activeButton: 'border border-[#10b98140] bg-[#10b98112]',
        progressDot: 'bg-[#10b98130]',
        activityDot: 'bg-[#10b981]',
        activityText: 'text-[#6ee7b7]',
    },
    entrepreneurship: {
        recommendationCard: 'border border-[#f59e0b20] bg-[linear-gradient(135deg,_#f59e0b08,_transparent)]',
        recommendationIcon: 'bg-[#f59e0b15]',
        accentText: 'text-[#f59e0b]',
        activeButton: 'border border-[#f59e0b40] bg-[#f59e0b12]',
        progressDot: 'bg-[#f59e0b30]',
        activityDot: 'bg-[#f59e0b]',
        activityText: 'text-[#fcd34d]',
    },
    creativity: {
        recommendationCard: 'border border-[#ec489920] bg-[linear-gradient(135deg,_#ec489908,_transparent)]',
        recommendationIcon: 'bg-[#ec489915]',
        accentText: 'text-[#ec4899]',
        activeButton: 'border border-[#ec489940] bg-[#ec489912]',
        progressDot: 'bg-[#ec489930]',
        activityDot: 'bg-[#ec4899]',
        activityText: 'text-[#f9a8d4]',
    },
    presentation: {
        recommendationCard: 'border border-[#8b5cf620] bg-[linear-gradient(135deg,_#8b5cf608,_transparent)]',
        recommendationIcon: 'bg-[#8b5cf615]',
        accentText: 'text-[#8b5cf6]',
        activeButton: 'border border-[#8b5cf640] bg-[#8b5cf612]',
        progressDot: 'bg-[#8b5cf630]',
        activityDot: 'bg-[#8b5cf6]',
        activityText: 'text-[#c4b5fd]',
    },
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia(query).matches : false
    );
    useEffect(() => {
        const mql = window.matchMedia(query);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [query]);
    return matches;
}

export default function SkillTreeV2({ userState, locale = 'vi' }: SkillTreeV2Props) {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const isWideDesktop = useMediaQuery('(min-width: 1400px)');
    const t = locale === 'en';

    // Compute skill tree
    const { branches, recommendations } = useMemo(
        () => computeSkillTree(userState),
        [userState]
    );

    // Selection state
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<BranchId>(branches[0]?.def.id || 'research');
    const [focusedBranchId, setFocusedBranchId] = useState<BranchId | null>(null);
    const [showLegend, setShowLegend] = useState(false);

    // Find selected node and branch for detail panel
    const selectedNode = useMemo<ComputedNode | null>(() => {
        if (!selectedNodeId) return null;
        for (const branch of branches) {
            const found = branch.nodes.find(n => n.def.id === selectedNodeId);
            if (found) return found;
        }
        return null;
    }, [selectedNodeId, branches]);

    const selectedBranch = useMemo<ComputedBranch | null>(() => {
        if (!selectedNodeId) return null;
        return branches.find(b => b.nodes.some(n => n.def.id === selectedNodeId)) || null;
    }, [selectedNodeId, branches]);

    // Level progress
    const { progress: levelProgress } = xpToNextLevel(userState.globalXP);

    // Handlers
    const handleSelectNode = useCallback((nodeId: string, branchId: BranchId) => {
        setSelectedNodeId(prev => (prev === nodeId ? null : nodeId));
        setFocusedBranchId(prev => (prev === branchId ? null : branchId));
    }, []);

    const handleSelectBranch = useCallback((branchId: BranchId) => {
        setSelectedBranchId(branchId);
        setSelectedNodeId(null);
        setFocusedBranchId(null);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setSelectedNodeId(null);
        setFocusedBranchId(null);
    }, []);

    // Stats
    const totalUnlocked = branches.reduce(
        (acc, b) => acc + b.nodes.filter(n => n.state !== 'locked' && n.state !== 'milestone-locked').length,
        0
    );
    const totalNodes = branches.reduce((acc, b) => acc + b.nodes.length, 0);
    const activeBranchCount = branches.filter(b => b.totalXP > 0).length;

    // Top recommendation
    const topRec = recommendations[0];
    const topRecAccent = topRec ? BRANCH_ACCENT_CLASSES[topRec.branchId] : null;
    const activeBranchId = isDesktop ? focusedBranchId : selectedBranchId;

    return (
        <div className="relative w-full">
            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard
                    icon={<Zap className="w-4 h-4" />}
                    label={t ? 'Total XP' : 'Tổng XP'}
                    value={userState.globalXP.toLocaleString()}
                    tone="indigo"
                />
                <StatCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label={t ? 'Level' : 'Cấp độ'}
                    value={String(userState.globalLevel)}
                    sublabel={`${Math.round(levelProgress * 100)}% → ${t ? 'next' : 'tiếp'}`}
                    tone="emerald"
                />
                <StatCard
                    icon={<Trophy className="w-4 h-4" />}
                    label={t ? 'Unlocked' : 'Đã mở khóa'}
                    value={`${totalUnlocked}`}
                    sublabel={`/ ${totalNodes} ${t ? 'skills' : 'kỹ năng'}`}
                    tone="amber"
                />
                <StatCard
                    icon={<Target className="w-4 h-4" />}
                    label={t ? 'Active Branches' : 'Nhánh đang mở'}
                    value={`${activeBranchCount}`}
                    sublabel={`/ ${branches.length}`}
                    tone="pink"
                />
            </div>

            {/* ── Top Recommendation Card ── */}
            {topRec && topRecAccent && (
                <motion.div
                    className={cn(
                        'mb-6 flex items-center gap-3 rounded-xl p-4',
                        topRecAccent.recommendationCard
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        topRecAccent.recommendationIcon
                    )}>
                        <Sparkles size={18} className={topRecAccent.accentText} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                            {t ? 'Recommended Next' : 'Đề xuất tiếp theo'}
                        </div>
                        <div className="text-sm text-slate-200 truncate">
                            {t ? topRec.reasonEn : topRec.reason}
                        </div>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-slate-500" />
                </motion.div>
            )}

            {/* ── Branch Progress Overview ── */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide lg:justify-center">
                {branches.map(branch => (
                    <button
                        key={branch.def.id}
                        onClick={() => {
                            if (isDesktop) {
                                setFocusedBranchId(prev => (prev === branch.def.id ? null : branch.def.id));
                            } else {
                                handleSelectBranch(branch.def.id);
                            }
                        }}
                        type="button"
                        className={cn(
                            'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2 transition-all duration-200 focus:outline-none',
                            activeBranchId === branch.def.id
                                ? BRANCH_ACCENT_CLASSES[branch.def.id].activeButton
                                : 'border border-slate-700/20 bg-slate-800/50'
                        )}
                    >
                        <ProgressRing
                            progress={branch.progressPercent / 100}
                            size={28}
                            strokeWidth={2.5}
                            color={branch.def.accentColor}
                        >
                            <div className={cn('h-4 w-4 rounded-full', BRANCH_ACCENT_CLASSES[branch.def.id].progressDot)} />
                        </ProgressRing>
                        <div className="text-left">
                            <div className="text-[11px] font-semibold text-slate-300 leading-none">
                                {t ? branch.def.nameEn : branch.def.name}
                            </div>
                            <div className="text-[10px] text-slate-500 leading-none mt-0.5">
                                T{branch.currentTier}/{branch.maxTier}
                            </div>
                        </div>
                    </button>
                ))}
                {/* Legend toggle */}
                <button
                    onClick={() => setShowLegend(prev => !prev)}
                    type="button"
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700/20 bg-slate-800/50 px-3 py-2 text-slate-500 transition-colors hover:text-slate-300"
                >
                    <Info size={14} />
                    <span className="text-[11px]">{t ? 'Legend' : 'Chú thích'}</span>
                </button>
            </div>

            {/* ── Legend ── */}
            <AnimatePresence>
                {showLegend && (
                    <motion.div
                        id="skill-tree-legend"
                        className="mb-5 rounded-xl border border-slate-700/15 bg-slate-800/50 p-4"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {t ? 'Node States' : 'Trạng thái node'}
                            </h4>
                            <button
                                type="button"
                                aria-label={t ? 'Close legend' : 'Đóng chú thích'}
                                onClick={() => setShowLegend(false)}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <LegendItem label={t ? 'Locked' : 'Chưa mở'} icon="🔒" dotClassName="bg-slate-600" />
                            <LegendItem label={t ? 'Available' : 'Sẵn sàng'} icon="⚡" dotClassName="bg-indigo-400 animate-pulse" />
                            <LegendItem label={t ? 'In Progress' : 'Đang tiến hành'} icon="🔥" dotClassName="bg-amber-400" />
                            <LegendItem label={t ? 'Completed' : 'Hoàn thành'} icon="✅" dotClassName="bg-emerald-400" />
                            <LegendItem
                                label={t ? 'Milestone' : 'Cột mốc'}
                                icon="⭐"
                                dotClassName="bg-amber-400 ring-2 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Main Tree View ── */}
            <div
                className="overflow-hidden rounded-2xl border border-slate-400/5 bg-linear-to-b from-slate-900/60 to-slate-950/80 shadow-[0_4px_32px_rgba(0,0,0,0.2)]"
            >
                <div className="p-4 sm:p-6 lg:p-8">
                    {isDesktop ? (
                        <div className="flex justify-center">
                            <SkillTree
                                branches={branches}
                                globalXP={userState.globalXP}
                                globalLevel={userState.globalLevel}
                                nextLevelProgress={levelProgress}
                                userName={userState.userName}
                                userAvatar={userState.userAvatar}
                                locale={locale}
                                selectedNodeId={selectedNodeId}
                                focusedBranchId={focusedBranchId}
                                onSelectNode={handleSelectNode}
                                layoutMode={isWideDesktop ? 'wide' : 'compact'}
                            />
                        </div>
                    ) : (
                        <MobileBranchExplorer
                            branches={branches}
                            selectedBranchId={selectedBranchId}
                            selectedNodeId={selectedNodeId}
                            locale={locale}
                            recommendations={recommendations}
                            onSelectBranch={handleSelectBranch}
                            onSelectNode={handleSelectNode}
                        />
                    )}
                </div>
            </div>

            {/* ── Recent Activity Feed ── */}
            {userState.recentActivities.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        {t ? 'Recent Activity' : 'Hoạt động gần đây'}
                    </h3>
                    <div className="space-y-2">
                        {userState.recentActivities.slice(0, 5).map(act => (
                            <div
                                key={act.id}
                                className="flex items-center gap-3 rounded-lg border border-slate-700/15 bg-slate-800/40 px-3.5 py-2.5"
                            >
                                <div className={cn('h-2 w-2 shrink-0 rounded-full', BRANCH_ACCENT_CLASSES[act.branchId].activityDot)} />
                                <span className="text-sm text-slate-300 flex-1 truncate">{act.title}</span>
                                <span className={cn('shrink-0 text-xs font-semibold', BRANCH_ACCENT_CLASSES[act.branchId].activityText)}>
                                    +{act.xpAmount} XP
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Node Detail Panel ── */}
            <NodeDetailPanel
                node={selectedNode}
                branch={selectedBranch}
                recommendations={recommendations}
                locale={locale}
                onClose={handleCloseDetail}
            />
        </div>
    );
}

// ── Stat Card ────────────────────────────────────
function StatCard({
    icon,
    label,
    value,
    sublabel,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sublabel?: string;
    tone: StatTone;
}) {
    const toneClasses = STAT_TONE_CLASSES[tone];

    return (
        <div className={cn('rounded-xl p-3.5', toneClasses.card)}>
            <div className="flex items-center gap-2 mb-1.5">
                <span className={toneClasses.icon}>{icon}</span>
                <span className={cn('text-[11px] font-medium', toneClasses.label)}>
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-white">{value}</span>
                {sublabel && <span className="text-xs text-slate-500">{sublabel}</span>}
            </div>
        </div>
    );
}

// ── Legend Item ───────────────────────────────────
function LegendItem({
    label,
    icon,
    dotClassName,
}: {
    label: string;
    icon: string;
    dotClassName: string;
}) {
    return (
        <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className={cn('h-2.5 w-2.5 rounded-full', dotClassName)} />
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}
