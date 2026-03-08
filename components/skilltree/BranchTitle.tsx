import React from 'react';
import { motion } from 'framer-motion';
import type { ComputedBranch } from './types';
import type { DesktopLayoutMode, PositionedBranchTitle } from './layout';

interface BranchTitleProps {
    branch: ComputedBranch;
    title: PositionedBranchTitle;
    layoutMode: DesktopLayoutMode;
    isFocusDimmed: boolean;
    delay: number;
}

export default function BranchTitle({
    branch,
    title,
    layoutMode,
    isFocusDimmed,
    delay,
}: BranchTitleProps) {
    return (
        <motion.div
            className="absolute z-40 pointer-events-none"
            style={{
                left: `${title.slot.xPercent}%`,
                top: `${title.slot.yPercent}%`,
                width: `${title.slot.widthPercent}%`,
                transform: title.slot.transform,
                textAlign: title.slot.align,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isFocusDimmed ? 0.14 : 1, y: 0 }}
            transition={{ duration: 0.55, delay }}
        >
            <div
                className="inline-flex max-w-full flex-col rounded-2xl border px-4 py-3 backdrop-blur-md"
                style={{
                    borderColor: `${branch.def.accentColor}30`,
                    background: `linear-gradient(135deg, ${branch.def.accentColor}14, rgba(15,23,42,0.9))`,
                    boxShadow: `0 12px 40px ${branch.def.accentColor}14`,
                }}
            >
                <span
                    className={layoutMode === 'compact'
                        ? 'text-[10px] font-bold uppercase tracking-[0.26em]'
                        : 'text-[11px] font-bold uppercase tracking-[0.3em]'}
                    style={{ color: branch.def.accentLight }}
                >
                    {title.title}
                </span>
                <span className="mt-1 text-[11px] font-medium text-slate-200/90">
                    {title.meta}
                </span>
            </div>
        </motion.div>
    );
}