// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Central Hub — User profile/level center node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import ProgressRing from './ProgressRing';
import type { Locale } from './types';

interface CentralHubProps {
    level: number;
    globalXP: number;
    nextLevelProgress: number;
    userName: string;
    userAvatar: string | null;
    locale: Locale;
}

export default function CentralHub({
    level,
    nextLevelProgress,
    userName,
    userAvatar,
    locale,
}: CentralHubProps) {
    return (
        <motion.div
            className="relative flex flex-col items-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 0.05 }}
        >
            {/* Outer orbiting ring */}
            <motion.div
                className="absolute"
                style={{
                    width: 140,
                    height: 140,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '1px solid rgba(99,102,241,0.12)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
                {/* Orbiting dot */}
                <div
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                        background: '#6366f1',
                        boxShadow: '0 0 8px #6366f1, 0 0 16px rgba(99,102,241,0.3)',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                />
            </motion.div>

            {/* Second orbiting ring (counter-rotation) */}
            <motion.div
                className="absolute"
                style={{
                    width: 128,
                    height: 128,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '1px dashed rgba(99,102,241,0.06)',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            >
                <div
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                        background: '#818cf8',
                        boxShadow: '0 0 6px rgba(129,140,248,0.5)',
                        top: -3,
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                />
            </motion.div>

            {/* Ambient glow layers */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: 150,
                    height: 150,
                    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 40%, transparent 70%)',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Progress ring */}
            <ProgressRing
                progress={nextLevelProgress}
                size={104}
                strokeWidth={3}
                color="#6366f1"
                trackColor="rgba(99,102,241,0.12)"
            >
                <motion.div
                    className="w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
                        border: '2px solid rgba(99,102,241,0.4)',
                        boxShadow: '0 0 28px rgba(99,102,241,0.1), 0 0 56px rgba(99,102,241,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                    whileHover={{ boxShadow: '0 0 32px rgba(99,102,241,0.2), 0 0 64px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.08)' }}
                    transition={{ duration: 0.3 }}
                >
                    {userAvatar ? (
                        <img src={userAvatar} alt="" className="w-10 h-10 rounded-full object-cover mb-0.5" />
                    ) : (
                        <User size={20} className="text-indigo-300 mb-0.5" />
                    )}
                    <span className="text-[10px] text-indigo-300 font-medium tracking-wider uppercase">
                        {locale === 'en' ? 'Level' : 'Cấp'}
                    </span>
                    <motion.span
                        className="text-xl font-bold text-white leading-none -mt-0.5"
                        key={level}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                    >
                        {level}
                    </motion.span>
                </motion.div>
            </ProgressRing>

            {/* Name label */}
            <motion.span
                className="mt-2 text-xs font-medium text-slate-400 truncate max-w-[100px]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
            >
                {userName}
            </motion.span>
        </motion.div>
    );
}
