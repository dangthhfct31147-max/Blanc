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
            {/* Deep ambient glow (outermost) */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: 200,
                    height: 200,
                    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 50%, transparent 75%)',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />

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
                    border: '1px solid rgba(99,102,241,0.15)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
                {/* Orbiting dot */}
                <div
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                        background: '#818cf8',
                        boxShadow: '0 0 10px #6366f1, 0 0 20px rgba(99,102,241,0.4), 0 0 40px rgba(99,102,241,0.15)',
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
                    border: '1px dashed rgba(99,102,241,0.08)',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            >
                <div
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                        background: '#a5b4fc',
                        boxShadow: '0 0 8px rgba(165,180,252,0.6), 0 0 16px rgba(165,180,252,0.2)',
                        top: -3,
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                />
            </motion.div>

            {/* Third micro ring */}
            <motion.div
                className="absolute"
                style={{
                    width: 156,
                    height: 156,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '0.5px solid rgba(99,102,241,0.06)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            >
                <div
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                        background: '#c7d2fe',
                        boxShadow: '0 0 4px rgba(199,210,254,0.4)',
                        bottom: -2,
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
                    background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.05) 40%, transparent 70%)',
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
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))',
                        border: '2px solid rgba(99,102,241,0.45)',
                        boxShadow: '0 0 32px rgba(99,102,241,0.12), 0 0 64px rgba(99,102,241,0.05), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)',
                    }}
                    whileHover={{ boxShadow: '0 0 40px rgba(99,102,241,0.22), 0 0 80px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)' }}
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
                className="mt-2 text-xs font-medium text-slate-400 truncate max-w-[100px] drop-shadow-[0_0_8px_rgba(99,102,241,0.15)]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
            >
                {userName}
            </motion.span>
        </motion.div>
    );
}
