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
            transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.1 }}
        >
            {/* Ambient glow */}
            <div
                className="absolute w-32 h-32 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
            />

            {/* Progress ring */}
            <ProgressRing
                progress={nextLevelProgress}
                size={104}
                strokeWidth={3}
                color="#6366f1"
                trackColor="rgba(99,102,241,0.12)"
            >
                <div
                    className="w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
                        border: '2px solid rgba(99,102,241,0.4)',
                        boxShadow: '0 0 24px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}
                >
                    {userAvatar ? (
                        <img src={userAvatar} alt="" className="w-10 h-10 rounded-full object-cover mb-0.5" />
                    ) : (
                        <User size={20} className="text-indigo-300 mb-0.5" />
                    )}
                    <span className="text-[10px] text-indigo-300 font-medium tracking-wider uppercase">
                        {locale === 'en' ? 'Level' : 'Cấp'}
                    </span>
                    <span className="text-xl font-bold text-white leading-none -mt-0.5">{level}</span>
                </div>
            </ProgressRing>

            {/* Name label */}
            <span className="mt-2 text-xs font-medium text-slate-400 truncate max-w-[100px]">
                {userName}
            </span>
        </motion.div>
    );
}
