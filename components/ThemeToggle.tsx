import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';

const OPTIONS: { value: ThemeMode; icon: React.FC<{ className?: string }>; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
];

export default function ThemeToggle() {
    const { mode, setMode, resolved } = useTheme();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const menuId = useId();

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    const ActiveIcon = resolved === 'dark' ? Moon : Sun;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Change theme"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls={menuId}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            >
                <ActiveIcon className="h-4 w-4" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        id={menuId}
                        role="menu"
                        aria-label="Theme options"
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/40"
                    >
                        {OPTIONS.map(({ value, icon: Icon, label }) => (
                            <button
                                key={value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={mode === value}
                                onClick={() => { setMode(value); setOpen(false); }}
                                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${mode === value
                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
