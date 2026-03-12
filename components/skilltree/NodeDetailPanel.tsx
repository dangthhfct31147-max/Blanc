// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Node Detail Panel — Slide-in panel when node selected
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Lock, CheckCircle2, Zap, Trophy, BookOpen,
    ArrowRight, Star, Target, Users, Code2,
} from 'lucide-react';
import type { ComputedNode, ComputedBranch, Locale, Recommendation } from './types';
import ProgressRing from './ProgressRing';

interface NodeDetailPanelProps {
    node: ComputedNode | null;
    branch: ComputedBranch | null;
    recommendations: Recommendation[];
    locale: Locale;
    onClose: () => void;
}

export default function NodeDetailPanel({
    node,
    branch,
    recommendations,
    locale,
    onClose,
}: NodeDetailPanelProps) {
    const isOpen = !!node && !!branch;
    const t = locale === 'en';

    return (
        <AnimatePresence>
            {isOpen && node && branch && (
                <motion.div
                    className="fixed inset-y-0 right-0 z-50 flex items-stretch pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 pointer-events-auto lg:hidden"
                        style={{ backgroundColor: 'rgba(2, 6, 23, 0.76)' }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        className="relative ml-auto w-full max-w-md pointer-events-auto overflow-y-auto"
                        style={{
                            background: 'linear-gradient(160deg, rgba(15,23,42,0.97), rgba(30,41,59,0.97))',
                            borderLeft: '1px solid rgba(148,163,184,0.1)',
                            boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
                        }}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        <div className="p-6 sm:p-8">
                            {/* Close */}
                            <button
                                onClick={onClose}
                                title="Close"
                                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>

                            {/* Branch badge */}
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                                style={{
                                    background: `${branch.def.accentColor}15`,
                                    color: branch.def.accentLight,
                                    border: `1px solid ${branch.def.accentColor}30`,
                                }}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ background: branch.def.accentColor }} />
                                {t ? branch.def.nameEn : branch.def.name}
                            </div>

                            {/* Node header */}
                            <div className="flex items-start gap-4 mb-6">
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${branch.def.accentColor}20, ${branch.def.accentColor}08)`,
                                        border: `1px solid ${branch.def.accentColor}40`,
                                    }}
                                >
                                    <Zap size={24} style={{ color: branch.def.accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold text-white leading-tight">
                                        {t ? node.def.titleEn : node.def.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-0.5">
                                        {t ? node.def.subtitleEn : node.def.subtitle}
                                    </p>
                                </div>
                            </div>

                            {/* State badge */}
                            <div className="flex items-center gap-3 mb-6">
                                <StateBadge state={node.state} color={branch.def.accentColor} locale={locale} />
                                {node.def.isMilestone && (
                                    <span
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 px-2.5 py-1 rounded-full"
                                        style={{
                                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                            border: '1px solid rgba(251, 191, 36, 0.2)',
                                        }}
                                    >
                                        <Star size={12} />
                                        Milestone
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-300 leading-relaxed mb-6">
                                {t ? node.def.descriptionEn : node.def.description}
                            </p>

                            {/* XP Progress */}
                            <div
                                className="rounded-xl p-4 mb-6"
                                style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.08)' }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        {t ? 'Branch XP' : 'XP nhánh'}
                                    </span>
                                    <span className="text-sm font-bold" style={{ color: branch.def.accentLight }}>
                                        {node.xpCurrent} / {node.xpNeeded || '—'} XP
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: `linear-gradient(90deg, ${branch.def.accentColor}, ${branch.def.accentLight})` }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, node.xpProgress * 100)}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>

                            {/* Unlock conditions */}
                            {node.conditionResults.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                        {t ? 'Unlock Requirements' : 'Điều kiện mở khóa'}
                                    </h4>
                                    <div className="space-y-2">
                                        {node.conditionResults.map((cr, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                                                style={{
                                                    background: cr.met ? `${branch.def.accentColor}08` : 'rgba(30,41,59,0.5)',
                                                    border: `1px solid ${cr.met ? `${branch.def.accentColor}20` : 'rgba(51,65,85,0.3)'}`,
                                                }}
                                            >
                                                {cr.met ? (
                                                    <CheckCircle2 size={16} style={{ color: branch.def.accentColor }} className="shrink-0" />
                                                ) : (
                                                    <Lock size={14} className="text-slate-500 shrink-0" />
                                                )}
                                                <span className={`text-sm ${cr.met ? 'text-slate-200' : 'text-slate-500'}`}>
                                                    {t ? cr.condition.labelEn : cr.condition.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rewards */}
                            {(node.def.rewards.badge || node.def.rewards.portfolioTag) && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                        {t ? 'Rewards' : 'Phần thưởng'}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {node.def.rewards.badge && (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-indigo-300"
                                                style={{
                                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                                }}
                                            >
                                                <Trophy size={12} />
                                                {t ? node.def.rewards.badgeEn : node.def.rewards.badge}
                                            </span>
                                        )}
                                        {node.def.rewards.profileBoost && (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-emerald-300"
                                                style={{
                                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                }}
                                            >
                                                <Target size={12} />
                                                +{node.def.rewards.profileBoost}% profile
                                            </span>
                                        )}
                                        {node.def.rewards.portfolioTag && (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-amber-300"
                                                style={{
                                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                                }}
                                            >
                                                <BookOpen size={12} />
                                                {node.def.rewards.portfolioTag}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Suggested actions */}
                            {node.def.suggestedActions.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                        {t ? 'How to progress' : 'Cách tiến bộ'}
                                    </h4>
                                    <div className="space-y-2">
                                        {node.def.suggestedActions.map((action, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg group/action cursor-pointer hover:bg-slate-700 transition-colors"
                                                style={{ background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(51,65,85,0.2)' }}
                                            >
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: `${branch.def.accentColor}15` }}>
                                                    {action.type === 'contest' && <Trophy size={14} style={{ color: branch.def.accentColor }} />}
                                                    {action.type === 'course' && <BookOpen size={14} style={{ color: branch.def.accentColor }} />}
                                                    {action.type === 'project' && <Code2 size={14} style={{ color: branch.def.accentColor }} />}
                                                    {action.type === 'team' && <Users size={14} style={{ color: branch.def.accentColor }} />}
                                                </div>
                                                <span className="text-sm text-slate-300 flex-1">
                                                    {t ? action.labelEn : action.label}
                                                </span>
                                                <ArrowRight size={14} className="text-slate-600 group-hover/action:text-slate-400 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations for this branch */}
                            {recommendations.filter(r => r.branchId === branch.def.id).length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                        {t ? 'Recommended' : 'Đề xuất'}
                                    </h4>
                                    {recommendations
                                        .filter(r => r.branchId === branch.def.id)
                                        .slice(0, 2)
                                        .map((rec, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2"
                                                style={{ background: `${branch.def.accentColor}08`, border: `1px solid ${branch.def.accentColor}15` }}
                                            >
                                                <Zap size={14} style={{ color: branch.def.accentColor }} />
                                                <span className="text-sm text-slate-300">
                                                    {t ? rec.reasonEn : rec.reason}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function StateBadge({ state, color, locale }: { state: string; color: string; locale: Locale }) {
    const t = locale === 'en';
    const configs: Record<string, { label: string; bg: string; fg: string; icon: React.ReactNode }> = {
        locked: { label: t ? 'Locked' : 'Chưa mở khóa', bg: 'rgba(51,65,85,0.4)', fg: '#64748b', icon: <Lock size={12} /> },
        'milestone-locked': { label: t ? 'Milestone — Locked' : 'Cột mốc — Khóa', bg: 'rgba(51,65,85,0.4)', fg: '#64748b', icon: <Lock size={12} /> },
        available: { label: t ? 'Ready to unlock' : 'Sẵn sàng mở khóa', bg: `${color}15`, fg: color, icon: <Zap size={12} /> },
        active: { label: t ? 'In progress' : 'Đang tiến hành', bg: `${color}15`, fg: color, icon: <Zap size={12} /> },
        completed: { label: t ? 'Completed' : 'Hoàn thành', bg: `${color}15`, fg: color, icon: <CheckCircle2 size={12} /> },
        'milestone-completed': { label: t ? 'Milestone ✓' : 'Cột mốc ✓', bg: '#f59e0b15', fg: '#f59e0b', icon: <Star size={12} /> },
    };
    const cfg = configs[state] || configs.locked;
    return (
        <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.fg}25` }}
        >
            {cfg.icon}
            {cfg.label}
        </span>
    );
}
