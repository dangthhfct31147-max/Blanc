// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Skill Tree — Main responsive orchestrator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, TrendingUp, Trophy, Target, Sparkles,
    ChevronRight, Info, X,
    Microscope, Code2, Rocket, Palette, Mic2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BranchId, ComputedBranch, ComputedNode, Locale, Recommendation, UserSkillTreeState } from './types';
import { BRANCH_MAP, xpToNextLevel } from './data';
import { computeSkillTree } from './engine';
import DesktopConstellation from './DesktopConstellation';
import MobileBranchExplorer from './MobileBranchExplorer';
import NodeDetailPanel from './NodeDetailPanel';
import ProgressRing from './ProgressRing';

const BRANCH_ICONS: Record<string, LucideIcon> = {
    Microscope, Code2, Rocket, Palette, Mic2,
};

interface SkillTreeV2Props {
    userState: UserSkillTreeState;
    locale?: Locale;
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
    const { next, progress: levelProgress } = xpToNextLevel(userState.globalXP);

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

    return (
        <div className="relative w-full">
            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard
                    icon={<Zap className="w-4 h-4" />}
                    label={t ? 'Total XP' : 'Tổng XP'}
                    value={userState.globalXP.toLocaleString()}
                    color="#6366f1"
                    trend={`${Math.round(levelProgress * 100)}% ${t ? 'to next' : 'đến cấp tiếp'}`}
                />
                <StatCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label={t ? 'Level' : 'Cấp độ'}
                    value={String(userState.globalLevel)}
                    sublabel={`→ ${t ? 'next' : 'tiếp'} ${next.toLocaleString()} XP`}
                    color="#10b981"
                    progress={levelProgress}
                />
                <StatCard
                    icon={<Trophy className="w-4 h-4" />}
                    label={t ? 'Unlocked' : 'Đã mở khóa'}
                    value={`${totalUnlocked}`}
                    sublabel={`/ ${totalNodes} ${t ? 'skills' : 'kỹ năng'}`}
                    color="#f59e0b"
                    progress={totalNodes > 0 ? totalUnlocked / totalNodes : 0}
                />
                <StatCard
                    icon={<Target className="w-4 h-4" />}
                    label={t ? 'Active Branches' : 'Nhánh đang mở'}
                    value={`${activeBranchCount}`}
                    sublabel={`/ ${branches.length} ${t ? 'branches' : 'nhánh'}`}
                    color="#ec4899"
                    progress={branches.length > 0 ? activeBranchCount / branches.length : 0}
                />
            </div>

            {/* ── Top Recommendation Card ── */}
            {topRec && (
                <motion.div
                    className="mb-5 rounded-2xl p-4 flex items-center gap-4"
                    style={{
                        background: `linear-gradient(135deg, ${BRANCH_MAP[topRec.branchId]?.accentColor || '#6366f1'}0d 0%, rgba(15,23,42,0.6) 100%)`,
                        border: `1px solid ${BRANCH_MAP[topRec.branchId]?.accentColor || '#6366f1'}25`,
                        boxShadow: `0 4px 24px ${BRANCH_MAP[topRec.branchId]?.accentColor || '#6366f1'}08`,
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: `linear-gradient(135deg, ${BRANCH_MAP[topRec.branchId]?.accentColor || '#6366f1'}20, ${BRANCH_MAP[topRec.branchId]?.accentColor || '#6366f1'}08)`,
                            border: `1px solid ${BRANCH_MAP[topRec.branchId]?.accentColor || '#6366f1'}30`,
                        }}
                    >
                        <Sparkles size={16} style={{ color: BRANCH_MAP[topRec.branchId]?.accentColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                            {t ? 'Recommended Next' : 'Đề xuất tiếp theo'}
                        </div>
                        <div className="text-sm text-slate-200 leading-snug">
                            {t ? topRec.reasonEn : topRec.reason}
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                </motion.div>
            )}

            {/* ── Branch Progress Overview ── */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                {branches.map(branch => {
                    const isActive = (isDesktop ? focusedBranchId : selectedBranchId) === branch.def.id;
                    const BranchIcon = BRANCH_ICONS[branch.def.icon] || Microscope;
                    return (
                        <button
                            key={branch.def.id}
                            onClick={() => {
                                if (isDesktop) {
                                    setFocusedBranchId(prev => (prev === branch.def.id ? null : branch.def.id));
                                } else {
                                    handleSelectBranch(branch.def.id);
                                }
                            }}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl flex-shrink-0 transition-all duration-200 focus:outline-none"
                            style={{
                                background: isActive
                                    ? `linear-gradient(135deg, ${branch.def.accentColor}14, ${branch.def.accentColor}06)`
                                    : 'rgba(15,23,42,0.6)',
                                border: `1px solid ${isActive ? `${branch.def.accentColor}40` : 'rgba(51,65,85,0.25)'}`,
                                boxShadow: isActive ? `0 0 16px ${branch.def.accentColor}10` : 'none',
                            }}
                        >
                            <div className="relative">
                                <ProgressRing
                                    progress={branch.progressPercent / 100}
                                    size={30}
                                    strokeWidth={2.5}
                                    color={branch.def.accentColor}
                                >
                                    <BranchIcon
                                        size={13}
                                        style={{ color: isActive ? branch.def.accentColor : '#64748b' }}
                                    />
                                </ProgressRing>
                            </div>
                            <div className="text-left">
                                <div
                                    className="text-[11px] font-semibold leading-none"
                                    style={{ color: isActive ? branch.def.accentLight : '#94a3b8' }}
                                >
                                    {t ? branch.def.nameEn : branch.def.name}
                                </div>
                                <div className="text-[10px] text-slate-600 leading-none mt-0.5">
                                    {Math.round(branch.progressPercent)}% · T{branch.currentTier}/{branch.maxTier}
                                </div>
                            </div>
                        </button>
                    );
                })}
                {/* Legend toggle */}
                <button
                    onClick={() => setShowLegend(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl flex-shrink-0 transition-colors"
                    style={{
                        background: showLegend ? 'rgba(99,102,241,0.08)' : 'rgba(15,23,42,0.6)',
                        border: `1px solid ${showLegend ? 'rgba(99,102,241,0.25)' : 'rgba(51,65,85,0.25)'}`,
                        color: showLegend ? '#a5b4fc' : '#64748b',
                    }}
                >
                    <Info size={13} />
                    <span className="text-[11px] font-medium">{t ? 'Legend' : 'Chú thích'}</span>
                </button>
            </div>

            {/* ── Legend ── */}
            <AnimatePresence>
                {showLegend && (
                    <motion.div
                        className="mb-5 rounded-2xl p-4"
                        style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(99,102,241,0.12)' }}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {t ? 'Node States' : 'Trạng thái node'}
                            </h4>
                            <button onClick={() => setShowLegend(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
                                <X size={13} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <LegendItem color="#334155" label={t ? 'Locked' : 'Chưa mở'} icon="🔒" dotClassName="bg-slate-700" />
                            <LegendItem color="#6366f1" label={t ? 'Available' : 'Sẵn sàng'} icon="⚡" dotClassName="bg-indigo-400 animate-pulse" />
                            <LegendItem color="#f59e0b" label={t ? 'In Progress' : 'Đang tiến hành'} icon="🔥" dotClassName="bg-amber-400" />
                            <LegendItem color="#10b981" label={t ? 'Completed' : 'Hoàn thành'} icon="✅" dotClassName="bg-emerald-400" />
                            <LegendItem
                                color="#f59e0b"
                                label={t ? 'Milestone' : 'Cột mốc'}
                                icon="⭐"
                                dotClassName="bg-amber-400 ring-2"
                                dotStyle={{ boxShadow: '0 0 0 4px rgba(251, 191, 36, 0.18)' }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Main Tree View ── */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg, rgba(10,15,30,0.8) 0%, rgba(2,6,23,0.95) 100%)',
                    border: '1px solid rgba(99,102,241,0.08)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
            >
                <div className="p-4 sm:p-6 lg:p-8">
                    {isDesktop ? (
                        <div className="flex justify-center">
                            <DesktopConstellation
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
                    <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">
                        {t ? 'Recent Activity' : 'Hoạt động gần đây'}
                    </h3>
                    <div className="space-y-1.5">
                        {userState.recentActivities.slice(0, 5).map(act => (
                            <div
                                key={act.id}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                                style={{
                                    background: 'rgba(15,23,42,0.5)',
                                    border: '1px solid rgba(51,65,85,0.12)',
                                }}
                            >
                                <div
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ background: BRANCH_MAP[act.branchId]?.accentColor || '#6366f1' }}
                                />
                                <span className="text-sm text-slate-400 flex-1 truncate">{act.title}</span>
                                <span
                                    className="text-xs font-bold flex-shrink-0 tabular-nums"
                                    style={{ color: BRANCH_MAP[act.branchId]?.accentLight || '#93c5fd' }}
                                >
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
    color,
    progress,
    trend,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sublabel?: string;
    color: string;
    progress?: number;
    trend?: string;
}) {
    return (
        <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
                background: `linear-gradient(135deg, ${color}0c 0%, rgba(10,15,30,0.7) 100%)`,
                border: `1px solid ${color}1a`,
            }}
        >
            {/* Subtle corner glow */}
            <div
                className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${color}18, transparent 70%)` }}
            />
            <div className="flex items-center gap-2 mb-2.5">
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}25` }}
                >
                    <span style={{ color }}>{icon}</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${color}99` }}>
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
                {sublabel && <span className="text-xs text-slate-600">{sublabel}</span>}
            </div>
            {progress !== undefined && (
                <div className="h-1 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, progress * 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                    />
                </div>
            )}
            {trend && !progress && (
                <div className="text-[10px]" style={{ color: `${color}80` }}>{trend}</div>
            )}
        </div>
    );
}

// ── Legend Item ───────────────────────────────────
function LegendItem({
    label,
    icon,
    dotClassName,
    dotStyle,
}: {
    color: string;
    label: string;
    icon: string;
    dotClassName: string;
    dotStyle?: React.CSSProperties;
}) {
    return (
        <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClassName}`} style={dotStyle} />
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}
