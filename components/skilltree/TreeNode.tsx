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
                opacity: isFocusDimmed ? 0.15 : 1,
                scale: isSelected ? 1.12 : 1,
                filter: isFocusDimmed ? 'blur(1px)' : 'blur(0px)',
            }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={!isLocked && !isFocusDimmed ? { scale: 1.1, y: -4 } : undefined}
            whileTap={!isLocked ? { scale: 0.94 } : undefined}
            aria-label={`${title} — ${state}`}
            tabIndex={0}
        >
            {/* Outer ambient glow for completed nodes */}
            {isCompleted && !isFocusDimmed && (
                <motion.div
                    className="absolute"
                    style={{
                        width: dimensions + 28,
                        height: dimensions + 28,
                        borderRadius: isMilestone ? 24 : '50%',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: `radial-gradient(circle, ${color}18 0%, ${color}08 40%, transparent 70%)`,
                    }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Pulsing ring for available nodes */}
            {isAvailable && !isFocusDimmed && (
                <>
                    <motion.div
                        className="absolute"
                        style={{
                            width: dimensions + 18,
                            height: dimensions + 18,
                            borderRadius: isMilestone ? 22 : '50%',
                            border: `1.5px solid ${color}`,
                            top: -9,
                            left: '50%',
                            transform: 'translateX(-50%)',
                        }}
                        animate={{ opacity: [0.15, 0.5, 0.15], scale: [1, 1.08, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute"
                        style={{
                            width: dimensions + 30,
                            height: dimensions + 30,
                            borderRadius: isMilestone ? 28 : '50%',
                            border: `1px solid ${color}`,
                            top: -15,
                            left: '50%',
                            transform: 'translateX(-50%)',
                        }}
                        animate={{ opacity: [0, 0.25, 0], scale: [0.95, 1.1, 0.95] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    />
                </>
            )}

            {/* Active glow with layered effects */}
            {isActive && !isFocusDimmed && (
                <>
                    <motion.div
                        className="absolute"
                        style={{
                            width: dimensions + 20,
                            height: dimensions + 20,
                            borderRadius: isMilestone ? 24 : '50%',
                            top: -10,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
                        }}
                        animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1.06, 0.98] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute"
                        style={{
                            width: dimensions + 14,
                            height: dimensions + 14,
                            borderRadius: isMilestone ? 20 : '50%',
                            border: `1.5px solid ${color}60`,
                            top: -7,
                            left: '50%',
                            transform: 'translateX(-50%)',
                        }}
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </>
            )}

            {/* Selection ring */}
            {isSelected && (
                <motion.div
                    className="absolute"
                    style={{
                        width: dimensions + 22,
                        height: dimensions + 22,
                        borderRadius: isMilestone ? 26 : '50%',
                        border: `2px solid ${color}`,
                        top: -11,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        boxShadow: `0 0 16px ${color}30, 0 0 32px ${color}10`,
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                />
            )}

            {/* Node circle */}
            <div
                className="relative flex items-center justify-center"
                style={{
                    width: dimensions,
                    height: dimensions,
                    borderRadius: isMilestone ? 16 : '50%',
                    background: isCompleted
                        ? `linear-gradient(135deg, ${color}28, ${color}12)`
                        : isActive
                            ? `linear-gradient(135deg, ${color}22, ${color}0a)`
                            : isAvailable
                                ? `linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))`
                                : 'rgba(15, 23, 42, 0.5)',
                    border: isCompleted
                        ? `2px solid ${color}`
                        : isActive
                            ? `2px solid ${color}90`
                            : isAvailable
                                ? `1.5px solid ${color}45`
                                : '1.5px solid rgba(51, 65, 85, 0.4)',
                    boxShadow: isSelected
                        ? `0 0 24px ${color}40, 0 0 48px ${color}15, inset 0 0 12px ${color}10`
                        : isCompleted
                            ? `0 0 16px ${color}25, inset 0 1px 0 rgba(255,255,255,0.06)`
                            : isActive
                                ? `0 0 20px ${color}18, inset 0 1px 0 rgba(255,255,255,0.04)`
                                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    transition: 'box-shadow 0.4s ease, border-color 0.4s ease, background 0.4s ease',
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
                            stroke={`${color}15`}
                            strokeWidth={2}
                        />
                        <circle
                            cx={dimensions / 2}
                            cy={dimensions / 2}
                            r={(dimensions - 6) / 2}
                            fill="none"
                            stroke={color}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeDasharray={Math.PI * (dimensions - 6)}
                            strokeDashoffset={Math.PI * (dimensions - 6) * (1 - xpProgress)}
                            style={{
                                transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)',
                                filter: `drop-shadow(0 0 3px ${color}40)`,
                            }}
                        />
                    </svg>
                )}

                {/* Completed checkmark overlay */}
                {isCompleted && (
                    <motion.div
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: color, boxShadow: `0 2px 10px ${color}60` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 12, delay: 0.3 }}
                    >
                        <CheckCircle2 size={12} className="text-white" />
                    </motion.div>
                )}

                {/* Icon */}
                {isLocked ? (
                    <Lock size={size === 'sm' ? 18 : 22} className="text-slate-600" style={{ opacity: 0.6 }} />
                ) : (
                    <motion.div
                        animate={isActive ? { rotate: [0, 3, -3, 0] } : undefined}
                        transition={isActive ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : undefined}
                    >
                        <IconComponent
                            size={size === 'sm' ? 20 : 24}
                            className="relative z-10"
                            style={{
                                color: isCompleted ? color : isActive ? color : colorLight,
                                filter: isCompleted || isActive ? `drop-shadow(0 0 6px ${color}30)` : 'none',
                            }}
                        />
                    </motion.div>
                )}

                {/* Tier badge */}
                {!isLocked && (
                    <div
                        className="absolute -bottom-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                            background: isCompleted ? color : 'rgba(15,23,42,0.95)',
                            color: isCompleted ? 'white' : colorLight,
                            border: `1px solid ${isCompleted ? color : `${color}50`}`,
                            fontSize: 9,
                            lineHeight: 1,
                            boxShadow: isCompleted ? `0 1px 6px ${color}40` : 'none',
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
                    textShadow: isActive || isCompleted
                        ? `0 0 10px ${color}20`
                        : 'none',
                    transition: 'color 0.3s ease',
                }}
            >
                {title}
            </span>

            {/* XP label */}
            {!isLocked && def.xpRequired > 0 && (
                <span style={{
                    fontSize: 9,
                    color: isCompleted ? color : colorLight,
                    opacity: isCompleted ? 0.9 : 0.6,
                    marginTop: 1,
                    fontWeight: isCompleted ? 600 : 400,
                }}>
                    {Math.round(xpProgress * 100)}%
                </span>
            )}
        </motion.button>
    );
}
