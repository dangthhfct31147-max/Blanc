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
                        className="relative ml-auto w-full max-w-sm pointer-events-auto overflow-y-auto"
                        style={{
                            background: 'linear-gradient(160deg, rgba(10,15,30,0.98) 0%, rgba(15,23,42,0.98) 100%)',
                            borderLeft: '1px solid rgba(99,102,241,0.12)',
                            boxShadow: '-12px 0 48px rgba(0,0,0,0.5)',
                        }}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        {/* Colored top accent bar */}
                        <div
                            className="h-0.5 w-full"
                            style={{ background: `linear-gradient(90deg, ${branch.def.accentColor}, ${branch.def.accentLight}40, transparent)` }}
                        />

                        <div className="p-5 sm:p-6">
                            {/* Close */}
                            <button
                                onClick={onClose}
                                title="Close"
                                className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X size={15} />
                            </button>

                            {/* Branch badge */}
                            <div
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-5"
                                style={{
                                    background: `${branch.def.accentColor}12`,
                                    color: branch.def.accentLight,
                                    border: `1px solid ${branch.def.accentColor}25`,
                                }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: branch.def.accentColor }} />
                                {t ? branch.def.nameEn : branch.def.name}
                            </div>

                            {/* Node header */}
                            <div className="flex items-start gap-3.5 mb-5">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${branch.def.accentColor}18, ${branch.def.accentColor}06)`,
                                        border: `1px solid ${branch.def.accentColor}30`,
                                    }}
                                >
                                    <Zap size={20} style={{ color: branch.def.accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <h3 className="text-lg font-bold text-white leading-tight">
                                        {t ? node.def.titleEn : node.def.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {t ? node.def.subtitleEn : node.def.subtitle}
                                    </p>
                                </div>
                            </div>

                            {/* State + milestone badges */}
                            <div className="flex items-center gap-2 mb-5">
                                <StateBadge state={node.state} color={branch.def.accentColor} locale={locale} />
                                {node.def.isMilestone && (
                                    <span
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 px-2 py-1 rounded-full"
                                        style={{
                                            backgroundColor: 'rgba(251,191,36,0.08)',
                                            border: '1px solid rgba(251,191,36,0.18)',
                                        }}
                                    >
                                        <Star size={11} />
                                        Milestone
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-400 leading-relaxed mb-5">
                                {t ? node.def.descriptionEn : node.def.description}
                            </p>

                            {/* XP Progress */}
                            <div
                                className="rounded-xl p-3.5 mb-5"
                                style={{ background: 'rgba(10,15,30,0.6)', border: '1px solid rgba(99,102,241,0.08)' }}
                            >
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                        {t ? 'Branch XP' : 'XP nhánh'}
                                    </span>
                                    <span className="text-xs font-bold tabular-nums" style={{ color: branch.def.accentLight }}>
                                        {node.xpCurrent} / {node.xpNeeded || '—'} XP
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${branch.def.accentColor}12` }}>
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
                                <div className="mb-5">
                                    <SectionLabel label={t ? 'Unlock Requirements' : 'Điều kiện mở khóa'} />
                                    <div className="space-y-1.5">
                                        {node.conditionResults.map((cr, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                                                style={{
                                                    background: cr.met ? `${branch.def.accentColor}08` : 'rgba(10,15,30,0.5)',
                                                    border: `1px solid ${cr.met ? `${branch.def.accentColor}18` : 'rgba(51,65,85,0.2)'}`,
                                                }}
                                            >
                                                {cr.met ? (
                                                    <CheckCircle2 size={14} style={{ color: branch.def.accentColor }} className="shrink-0" />
                                                ) : (
                                                    <Lock size={13} className="text-slate-700 shrink-0" />
                                                )}
                                                <span className={`text-xs ${cr.met ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {t ? cr.condition.labelEn : cr.condition.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rewards */}
                            {(node.def.rewards.badge || node.def.rewards.portfolioTag) && (
                                <div className="mb-5">
                                    <SectionLabel label={t ? 'Rewards' : 'Phần thưởng'} />
                                    <div className="flex flex-wrap gap-1.5">
                                        {node.def.rewards.badge && (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full text-indigo-300"
                                                style={{
                                                    backgroundColor: 'rgba(99,102,241,0.08)',
                                                    border: '1px solid rgba(99,102,241,0.18)',
                                                }}
                                            >
                                                <Trophy size={11} />
                                                {t ? node.def.rewards.badgeEn : node.def.rewards.badge}
                                            </span>
                                        )}
                                        {node.def.rewards.profileBoost && (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full text-emerald-300"
                                                style={{
                                                    backgroundColor: 'rgba(16,185,129,0.08)',
                                                    border: '1px solid rgba(16,185,129,0.18)',
                                                }}
                                            >
                                                <Target size={11} />
                                                +{node.def.rewards.profileBoost}% profile
                                            </span>
                                        )}
                                        {node.def.rewards.portfolioTag && (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full text-amber-300"
                                                style={{
                                                    backgroundColor: 'rgba(245,158,11,0.08)',
                                                    border: '1px solid rgba(245,158,11,0.18)',
                                                }}
                                            >
                                                <BookOpen size={11} />
                                                {node.def.rewards.portfolioTag}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Suggested actions */}
                            {node.def.suggestedActions.length > 0 && (
                                <div className="mb-5">
                                    <SectionLabel label={t ? 'How to progress' : 'Cách tiến bộ'} />
                                    <div className="space-y-1.5">
                                        {node.def.suggestedActions.map((action, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl group/action cursor-pointer transition-colors"
                                                style={{ background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(51,65,85,0.15)' }}
                                            >
                                                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: `${branch.def.accentColor}12` }}>
                                                    {action.type === 'contest' && <Trophy size={12} style={{ color: branch.def.accentColor }} />}
                                                    {action.type === 'course' && <BookOpen size={12} style={{ color: branch.def.accentColor }} />}
                                                    {action.type === 'project' && <Code2 size={12} style={{ color: branch.def.accentColor }} />}
                                                    {action.type === 'team' && <Users size={12} style={{ color: branch.def.accentColor }} />}
                                                </div>
                                                <span className="text-xs text-slate-400 flex-1">
                                                    {t ? action.labelEn : action.label}
                                                </span>
                                                <ArrowRight size={12} className="text-slate-700 group-hover/action:text-slate-500 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations for this branch */}
                            {recommendations.filter(r => r.branchId === branch.def.id).length > 0 && (
                                <div>
                                    <SectionLabel label={t ? 'Recommended' : 'Đề xuất'} />
                                    {recommendations
                                        .filter(r => r.branchId === branch.def.id)
                                        .slice(0, 2)
                                        .map((rec, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl mb-1.5"
                                                style={{ background: `${branch.def.accentColor}06`, border: `1px solid ${branch.def.accentColor}12` }}
                                            >
                                                <Zap size={13} style={{ color: branch.def.accentColor }} className="mt-0.5 shrink-0" />
                                                <span className="text-xs text-slate-400 leading-relaxed">
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

function SectionLabel({ label }: { label: string }) {
    return (
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">{label}</div>
    );
}

function StateBadge({ state, color, locale }: { state: string; color: string; locale: Locale }) {
    const t = locale === 'en';
    const configs: Record<string, { label: string; bg: string; fg: string; icon: React.ReactNode }> = {
        locked: { label: t ? 'Locked' : 'Chưa mở khóa', bg: 'rgba(15,23,42,0.6)', fg: '#475569', icon: <Lock size={11} /> },
        'milestone-locked': { label: t ? 'Milestone — Locked' : 'Cột mốc — Khóa', bg: 'rgba(15,23,42,0.6)', fg: '#475569', icon: <Lock size={11} /> },
        available: { label: t ? 'Ready to unlock' : 'Sẵn sàng mở khóa', bg: `${color}12`, fg: color, icon: <Zap size={11} /> },
        active: { label: t ? 'In progress' : 'Đang tiến hành', bg: `${color}12`, fg: color, icon: <Zap size={11} /> },
        completed: { label: t ? 'Completed' : 'Hoàn thành', bg: `${color}12`, fg: color, icon: <CheckCircle2 size={11} /> },
        'milestone-completed': { label: t ? 'Milestone ✓' : 'Cột mốc ✓', bg: '#f59e0b12', fg: '#f59e0b', icon: <Star size={11} /> },
    };
    const cfg = configs[state] || configs.locked;
    return (
        <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.fg}20` }}
        >
            {cfg.icon}
            {cfg.label}
        </span>
    );
}
