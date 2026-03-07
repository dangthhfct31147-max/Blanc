// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tree Node — Individual skill node component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React from 'react';
import { motion } from 'framer-motion';
import {
    Search, Eye, BarChart3, FlaskConical, Atom,
    Terminal, Hammer, Braces, Cpu, Blocks,
    Lightbulb, Sparkles, Wrench, Crown, Gem,
    Brush, PenTool, Film, BookOpen, Wand2,
    MessageCircle, Users, Presentation, Award, Megaphone,
    Lock, Star, CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComputedNode, Locale } from './types';

const ICON_MAP: Record<string, LucideIcon> = {
    Search, Eye, BarChart3, FlaskConical, Atom,
    Terminal, Hammer, Braces, Cpu, Blocks,
    Lightbulb, Sparkles, Wrench, Crown, Gem,
    Brush, PenTool, Film, BookOpen, Wand2,
    MessageCircle, Users, Presentation, Award, Megaphone,
    Lock, Star, CheckCircle2,
};

interface TreeNodeProps {
    node: ComputedNode;
    color: string;
    colorLight: string;
    isSelected: boolean;
    isFocusDimmed: boolean;
    locale: Locale;
    onClick: () => void;
    size?: 'sm' | 'md';
}

export default function TreeNode({
    node,
    color,
    colorLight,
    isSelected,
    isFocusDimmed,
    locale,
    onClick,
    size = 'md',
}: TreeNodeProps) {
    const { def, state, xpProgress } = node;
    const isLocked = state === 'locked' || state === 'milestone-locked';
    const isCompleted = state === 'completed' || state === 'milestone-completed';
    const isActive = state === 'active';
    const isAvailable = state === 'available';
    const isMilestone = def.isMilestone;
    const IconComponent = ICON_MAP[def.icon] || Star;
    const dimensions = size === 'sm' ? 52 : 62;

    const title = locale === 'en' ? def.titleEn : def.title;

    return (
        <motion.button
            onClick={onClick}
            className="group relative flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-2xl"
            style={{ width: dimensions + 32, cursor: isLocked ? 'default' : 'pointer' }}
            initial={false}
            animate={{
                opacity: isFocusDimmed ? 0.2 : 1,
                scale: isSelected ? 1.08 : 1,
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            whileHover={!isLocked && !isFocusDimmed ? { scale: 1.06, y: -2 } : undefined}
            whileTap={!isLocked ? { scale: 0.96 } : undefined}
            aria-label={`${title} — ${state}`}
            tabIndex={0}
        >
            {/* Glow ring for available nodes */}
            {isAvailable && !isFocusDimmed && (
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: dimensions + 16,
                        height: dimensions + 16,
                        border: `2px solid ${color}`,
                        top: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                    animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Active glow */}
            {isActive && !isFocusDimmed && (
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: dimensions + 12,
                        height: dimensions + 12,
                        top: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Node circle */}
            <div
                className="relative flex items-center justify-center transition-all duration-300"
                style={{
                    width: dimensions,
                    height: dimensions,
                    borderRadius: isMilestone ? 16 : '50%',
                    background: isCompleted
                        ? `linear-gradient(135deg, ${color}25, ${color}10)`
                        : isActive
                            ? `linear-gradient(135deg, ${color}20, ${color}08)`
                            : isAvailable
                                ? 'rgba(15, 23, 42, 0.9)'
                                : 'rgba(15, 23, 42, 0.6)',
                    border: isCompleted
                        ? `2px solid ${color}`
                        : isActive
                            ? `2px solid ${color}90`
                            : isAvailable
                                ? `2px solid ${color}50`
                                : '2px solid rgba(51, 65, 85, 0.5)',
                    boxShadow: isSelected
                        ? `0 0 20px ${color}40, 0 0 40px ${color}15`
                        : isCompleted
                            ? `0 0 12px ${color}20`
                            : isActive
                                ? `0 0 16px ${color}15`
                                : 'none',
                }}
            >
                {/* XP progress ring on the node */}
                {!isLocked && !isCompleted && (
                    <svg
                        className="absolute inset-0"
                        width={dimensions}
                        height={dimensions}
                        style={{ transform: 'rotate(-90deg)' }}
                    >
                        <circle
                            cx={dimensions / 2}
                            cy={dimensions / 2}
                            r={(dimensions - 6) / 2}
                            fill="none"
                            stroke={`${color}20`}
                            strokeWidth={2}
                        />
                        <circle
                            cx={dimensions / 2}
                            cy={dimensions / 2}
                            r={(dimensions - 6) / 2}
                            fill="none"
                            stroke={color}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeDasharray={Math.PI * (dimensions - 6)}
                            strokeDashoffset={Math.PI * (dimensions - 6) * (1 - xpProgress)}
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                    </svg>
                )}

                {/* Completed checkmark overlay */}
                {isCompleted && (
                    <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: color, boxShadow: `0 2px 8px ${color}60` }}
                    >
                        <CheckCircle2 size={12} className="text-white" />
                    </div>
                )}

                {/* Icon */}
                {isLocked ? (
                    <Lock size={size === 'sm' ? 18 : 22} className="text-slate-600" />
                ) : (
                    <IconComponent
                        size={size === 'sm' ? 20 : 24}
                        className="relative z-10"
                        style={{ color: isCompleted ? color : isActive ? color : colorLight }}
                    />
                )}

                {/* Tier badge */}
                {!isLocked && (
                    <div
                        className="absolute -bottom-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                            background: isCompleted ? color : 'rgba(15,23,42,0.95)',
                            color: isCompleted ? 'white' : colorLight,
                            border: `1px solid ${isCompleted ? color : `${color}60`}`,
                            fontSize: 9,
                            lineHeight: 1,
                        }}
                    >
                        T{def.tier}
                    </div>
                )}
            </div>

            {/* Label */}
            <span
                className="mt-2 text-center leading-tight font-medium max-w-full"
                style={{
                    fontSize: size === 'sm' ? 10 : 11,
                    color: isLocked ? '#475569' : isCompleted ? '#e2e8f0' : isActive ? '#f1f5f9' : '#94a3b8',
                    textShadow: isActive ? '0 0 8px rgba(0,0,0,0.4)' : 'none',
                }}
            >
                {title}
            </span>

            {/* XP label */}
            {!isLocked && def.xpRequired > 0 && (
                <span style={{ fontSize: 9, color: colorLight, opacity: 0.7, marginTop: 1 }}>
                    {Math.round(xpProgress * 100)}%
                </span>
            )}
        </motion.button>
    );
}
