import React from 'react';
import { motion } from 'framer-motion';
import type { ComputedBranch, ComputedNode, Locale } from './types';
import type { DesktopLayoutMode, PositionedNodeSlot } from './layout';
import TreeNode from './TreeNode';

interface SkillNodeProps {
    branch: ComputedBranch;
    node: ComputedNode;
    slot: PositionedNodeSlot;
    locale: Locale;
    layoutMode: DesktopLayoutMode;
    isSelected: boolean;
    isFocusDimmed: boolean;
    delay: number;
    onSelect: () => void;
}

function statusLabel(state: ComputedNode['state'], locale: Locale) {
    const vi = {
        locked: 'Khoa',
        available: 'San sang',
        active: 'Dang hoc',
        completed: 'Hoan tat',
        'milestone-locked': 'Cot moc',
        'milestone-completed': 'Cot moc',
    };
    const en = {
        locked: 'Locked',
        available: 'Ready',
        active: 'Active',
        completed: 'Done',
        'milestone-locked': 'Milestone',
        'milestone-completed': 'Milestone',
    };

    return (locale === 'en' ? en : vi)[state];
}

function statusColor(branch: ComputedBranch, node: ComputedNode) {
    if (node.state === 'locked' || node.state === 'milestone-locked') {
        return {
            background: 'rgba(51,65,85,0.6)',
            color: '#94a3b8',
            borderColor: 'rgba(100,116,139,0.35)',
        };
    }

    if (node.state === 'completed' || node.state === 'milestone-completed') {
        return {
            background: `${branch.def.accentColor}22`,
            color: branch.def.accentLight,
            borderColor: `${branch.def.accentColor}45`,
        };
    }

    if (node.state === 'active') {
        return {
            background: `${branch.def.accentColor}20`,
            color: '#f8fafc',
            borderColor: `${branch.def.accentColor}55`,
        };
    }

    return {
        background: `${branch.def.accentColor}16`,
        color: branch.def.accentLight,
        borderColor: `${branch.def.accentColor}38`,
    };
}

export default function SkillNode({
    branch,
    node,
    slot,
    locale,
    layoutMode,
    isSelected,
    isFocusDimmed,
    delay,
    onSelect,
}: SkillNodeProps) {
    const badge = statusColor(branch, node);
    const title = locale === 'en' ? node.def.titleEn : node.def.title;
    const subtitle = locale === 'en' ? node.def.subtitleEn : node.def.subtitle;

    return (
        <>
            <motion.div
                className="absolute z-20"
                style={{
                    left: `${slot.nodeSlot.xPercent}%`,
                    top: `${slot.nodeSlot.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0.86, y: 16 }}
                animate={{ opacity: isFocusDimmed ? 0.22 : 1, scale: 1, y: 0 }}
                transition={{ duration: 0.55, delay, type: 'spring', damping: 18, stiffness: 155 }}
            >
                <TreeNode
                    node={node}
                    color={branch.def.accentColor}
                    colorLight={branch.def.accentLight}
                    isSelected={isSelected}
                    isFocusDimmed={isFocusDimmed}
                    locale={locale}
                    onClick={onSelect}
                    size={layoutMode === 'compact' ? 'sm' : 'md'}
                    showLabel={false}
                    showProgressLabel={false}
                />
            </motion.div>

            <motion.div
                className="absolute z-30 pointer-events-none"
                style={{
                    left: `${slot.labelSlot.xPercent}%`,
                    top: `${slot.labelSlot.yPercent}%`,
                    width: `${slot.labelSlot.widthPercent}%`,
                    transform: slot.labelSlot.transform,
                    textAlign: slot.labelSlot.align,
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isFocusDimmed ? 0.16 : 1, y: 0 }}
                transition={{ duration: 0.45, delay: delay + 0.04 }}
            >
                <div
                    className="rounded-2xl border px-3 py-2 backdrop-blur-md"
                    style={{
                        background: isSelected
                            ? `linear-gradient(135deg, ${branch.def.accentColor}16, rgba(15,23,42,0.94))`
                            : 'linear-gradient(135deg, rgba(15,23,42,0.78), rgba(15,23,42,0.92))',
                        borderColor: isSelected ? `${branch.def.accentColor}4a` : 'rgba(148,163,184,0.16)',
                        boxShadow: isSelected
                            ? `0 10px 28px ${branch.def.accentColor}1c`
                            : '0 10px 24px rgba(2,6,23,0.22)',
                    }}
                >
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <div
                                className={layoutMode === 'compact'
                                    ? 'text-[10px] font-semibold leading-[1.15] text-slate-100'
                                    : 'text-[11px] font-semibold leading-[1.2] text-slate-50'}
                            >
                                {title}
                            </div>
                            {subtitle && (
                                <div
                                    className={layoutMode === 'compact'
                                        ? 'mt-1 text-[9px] leading-[1.2] text-slate-400'
                                        : 'mt-1 text-[10px] leading-[1.25] text-slate-400'}
                                >
                                    {subtitle}
                                </div>
                            )}
                        </div>
                        <span
                            className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                            style={badge}
                        >
                            {statusLabel(node.state, locale)}
                        </span>
                    </div>
                </div>
            </motion.div>
        </>
    );
}