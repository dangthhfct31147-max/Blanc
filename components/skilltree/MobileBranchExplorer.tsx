// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mobile Branch Explorer — Vertical timeline view
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Microscope, Code2, Rocket, Palette, Mic2,
    Lock, CheckCircle2, Zap, Star, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComputedBranch, BranchId, Locale, ComputedNode, Recommendation } from './types';
import ProgressRing from './ProgressRing';

const BRANCH_ICONS: Record<string, LucideIcon> = {
    Microscope, Code2, Rocket, Palette, Mic2,
};

interface MobileBranchExplorerProps {
    branches: ComputedBranch[];
    selectedBranchId: BranchId;
    selectedNodeId: string | null;
    locale: Locale;
    recommendations: Recommendation[];
    onSelectBranch: (branchId: BranchId) => void;
    onSelectNode: (nodeId: string, branchId: BranchId) => void;
}

export default function MobileBranchExplorer({
    branches,
    selectedBranchId,
    selectedNodeId,
    locale,
    recommendations,
    onSelectBranch,
    onSelectNode,
}: MobileBranchExplorerProps) {
    const t = locale === 'en';
    const activeBranch = branches.find(b => b.def.id === selectedBranchId) || branches[0];
    const tabRef = useRef<HTMLDivElement>(null);

    // Auto-scroll selected tab into view
    useEffect(() => {
        if (tabRef.current) {
            const active = tabRef.current.querySelector('[data-active="true"]');
            if (active) {
                active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [selectedBranchId]);

    return (
        <div className="w-full">
            {/* Branch Tab Bar */}
            <div
                ref={tabRef}
                className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}
            >
                {branches.map(branch => {
                    const isActive = branch.def.id === selectedBranchId;
                    const IconCmp = BRANCH_ICONS[branch.def.icon] || Microscope;
                    return (
                        <button
                            key={branch.def.id}
                            data-active={isActive}
                            onClick={() => onSelectBranch(branch.def.id)}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl flex-shrink-0 transition-all duration-200 focus:outline-none"
                            style={{
                                scrollSnapAlign: 'center',
                                background: isActive
                                    ? `linear-gradient(135deg, ${branch.def.accentColor}18, ${branch.def.accentColor}06)`
                                    : 'rgba(10,15,30,0.7)',
                                border: isActive
                                    ? `1.5px solid ${branch.def.accentColor}45`
                                    : '1.5px solid rgba(51,65,85,0.2)',
                                boxShadow: isActive ? `0 0 20px ${branch.def.accentColor}12` : 'none',
                            }}
                        >
                            <IconCmp size={15} style={{ color: isActive ? branch.def.accentColor : '#475569' }} />
                            <span
                                className="text-xs font-semibold whitespace-nowrap"
                                style={{ color: isActive ? branch.def.accentLight : '#64748b' }}
                            >
                                {t ? branch.def.nameEn : branch.def.name}
                            </span>
                            {branch.totalXP > 0 && (
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                                    style={{
                                        background: isActive ? `${branch.def.accentColor}18` : 'rgba(51,65,85,0.4)',
                                        color: isActive ? branch.def.accentLight : '#475569',
                                    }}
                                >
                                    {branch.totalXP}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Branch Summary Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeBranch.def.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Summary */}
                    <div
                        className="rounded-2xl p-4 mb-4"
                        style={{
                            background: `linear-gradient(135deg, ${activeBranch.def.accentColor}0a, rgba(10,15,30,0.7))`,
                            border: `1px solid ${activeBranch.def.accentColor}18`,
                        }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <ProgressRing
                                progress={activeBranch.progressPercent / 100}
                                size={50}
                                strokeWidth={3}
                                color={activeBranch.def.accentColor}
                            >
                                <span className="text-sm font-bold" style={{ color: activeBranch.def.accentLight }}>
                                    {Math.round(activeBranch.progressPercent)}%
                                </span>
                            </ProgressRing>
                            <div className="flex-1">
                                <h3 className="text-base font-bold text-white leading-tight">
                                    {t ? activeBranch.def.nameEn : activeBranch.def.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {t ? activeBranch.def.subtitleEn : activeBranch.def.subtitle}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold tabular-nums" style={{ color: activeBranch.def.accentLight }}>
                                    {activeBranch.totalXP}
                                </div>
                                <div className="text-[10px] text-slate-600 uppercase tracking-wider">XP</div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: `${activeBranch.def.accentColor}12` }}>
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${activeBranch.def.accentColor}, ${activeBranch.def.accentLight})` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${activeBranch.progressPercent}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-slate-600">
                                {t ? 'Tier' : 'Cấp'} {activeBranch.currentTier}/{activeBranch.maxTier}
                            </span>
                            <span className="text-[10px]" style={{ color: `${activeBranch.def.accentLight}80` }}>
                                {t ? 'Next milestone' : 'Mốc tiếp theo'}: T{Math.min(activeBranch.currentTier + 1, activeBranch.maxTier)}
                            </span>
                        </div>
                    </div>

                    {/* Recommendation chip */}
                    {recommendations.filter(r => r.branchId === activeBranch.def.id).length > 0 && (
                        <div
                            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl mb-4"
                            style={{
                                background: `${activeBranch.def.accentColor}06`,
                                border: `1px solid ${activeBranch.def.accentColor}12`,
                            }}
                        >
                            <Zap size={13} style={{ color: activeBranch.def.accentColor }} className="flex-shrink-0" />
                            <span className="text-xs text-slate-400 flex-1 leading-relaxed">
                                {t
                                    ? recommendations.find(r => r.branchId === activeBranch.def.id)?.reasonEn
                                    : recommendations.find(r => r.branchId === activeBranch.def.id)?.reason}
                            </span>
                            <ChevronRight size={13} className="text-slate-600 flex-shrink-0" />
                        </div>
                    )}

                    {/* Vertical Timeline Nodes */}
                    <div className="relative pl-7">
                        {/* Vertical line */}
                        <div
                            className="absolute left-[13px] top-5 bottom-5 w-px"
                            style={{ background: `linear-gradient(180deg, ${activeBranch.def.accentColor}35, ${activeBranch.def.accentColor}08)` }}
                        />

                        <div className="space-y-2">
                            {activeBranch.nodes.map((cnode, idx) => {
                                const isLocked = cnode.state === 'locked' || cnode.state === 'milestone-locked';
                                const isCompleted = cnode.state === 'completed' || cnode.state === 'milestone-completed';
                                const isActive = cnode.state === 'active';
                                const isAvailable = cnode.state === 'available';
                                const isSelected = selectedNodeId === cnode.def.id;

                                return (
                                    <motion.div
                                        key={cnode.def.id}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.25, delay: idx * 0.06 }}
                                    >
                                        <button
                                            onClick={() => onSelectNode(cnode.def.id, activeBranch.def.id)}
                                            className="relative w-full text-left group focus:outline-none"
                                            disabled={isLocked}
                                        >
                                            {/* Timeline dot */}
                                            <div
                                                className="absolute -left-7 top-[18px] w-[10px] h-[10px] rounded-full z-10"
                                                style={{
                                                    background: isCompleted
                                                        ? activeBranch.def.accentColor
                                                        : isActive || isAvailable
                                                            ? `${activeBranch.def.accentColor}50`
                                                            : '#1e293b',
                                                    border: `2px solid ${isCompleted ? activeBranch.def.accentColor : isActive ? activeBranch.def.accentColor : '#334155'}`,
                                                    boxShadow: isActive ? `0 0 8px ${activeBranch.def.accentColor}50` : 'none',
                                                }}
                                            />

                                            {/* Card */}
                                            <div
                                                className="rounded-xl p-3 transition-all duration-200"
                                                style={{
                                                    background: isSelected
                                                        ? `${activeBranch.def.accentColor}0c`
                                                        : isLocked
                                                            ? 'rgba(10,15,30,0.4)'
                                                            : 'rgba(15,23,42,0.6)',
                                                    border: isSelected
                                                        ? `1px solid ${activeBranch.def.accentColor}35`
                                                        : `1px solid ${isLocked ? 'rgba(30,41,59,0.3)' : 'rgba(51,65,85,0.18)'}`,
                                                    opacity: isLocked ? 0.45 : 1,
                                                }}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    {/* Icon */}
                                                    <div
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                                        style={{
                                                            background: isCompleted
                                                                ? `${activeBranch.def.accentColor}12`
                                                                : 'rgba(10,15,30,0.8)',
                                                            border: `1px solid ${isCompleted ? `${activeBranch.def.accentColor}25` : 'rgba(51,65,85,0.2)'}`,
                                                        }}
                                                    >
                                                        {isLocked ? (
                                                            <Lock size={14} className="text-slate-700" />
                                                        ) : isCompleted ? (
                                                            <CheckCircle2 size={14} style={{ color: activeBranch.def.accentColor }} />
                                                        ) : (
                                                            <Zap size={14} style={{ color: isActive ? activeBranch.def.accentColor : '#475569' }} />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-sm font-semibold truncate ${isLocked ? 'text-slate-700' : 'text-slate-200'}`}>
                                                                {t ? cnode.def.titleEn : cnode.def.title}
                                                            </span>
                                                            {cnode.def.isMilestone && (
                                                                <Star size={11} className="text-amber-500 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        <span className={`text-[11px] ${isLocked ? 'text-slate-800' : 'text-slate-600'}`}>
                                                            {t ? cnode.def.subtitleEn : cnode.def.subtitle}
                                                        </span>
                                                    </div>

                                                    {/* Status */}
                                                    <div className="flex-shrink-0 text-right">
                                                        {isCompleted && (
                                                            <span className="text-[11px] font-bold" style={{ color: activeBranch.def.accentColor }}>✓</span>
                                                        )}
                                                        {isActive && (
                                                            <span className="text-[11px] font-bold tabular-nums" style={{ color: activeBranch.def.accentColor }}>
                                                                {Math.round(cnode.xpProgress * 100)}%
                                                            </span>
                                                        )}
                                                        {isAvailable && (
                                                            <ChevronRight size={14} style={{ color: activeBranch.def.accentColor }} />
                                                        )}
                                                        {isLocked && cnode.xpNeeded > 0 && (
                                                            <span className="text-[10px] text-slate-700 tabular-nums">
                                                                {cnode.xpNeeded} XP
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Progress bar for active nodes */}
                                                {(isActive || isAvailable) && cnode.xpNeeded > 0 && (
                                                    <div
                                                        className="mt-2 h-0.5 rounded-full overflow-hidden"
                                                        style={{ backgroundColor: `${activeBranch.def.accentColor}15` }}
                                                    >
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            style={{ background: activeBranch.def.accentColor }}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, cnode.xpProgress * 100)}%` }}
                                                            transition={{ duration: 0.6, delay: 0.2 }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
