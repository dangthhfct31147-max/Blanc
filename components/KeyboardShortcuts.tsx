import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
    keys: string[];
    description: string;
}

const SHORTCUTS: Shortcut[] = [
    { keys: ['Ctrl', 'K'], description: 'Open search / Command Palette' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modal / panel' },
    { keys: ['↑', '↓'], description: 'Navigate lists' },
    { keys: ['Enter'], description: 'Select / confirm' },
    { keys: ['Tab'], description: 'Focus next element' },
    { keys: ['Shift', 'Tab'], description: 'Focus previous element' },
];

/**
 * Global keyboard shortcut handler + help modal triggered by `?`.
 *
 * Handles:
 * - `?` → open shortcut help (when not typing in an input)
 * - `Esc` → close topmost modal or panel
 */
export default function KeyboardShortcuts() {
    const [showHelp, setShowHelp] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    const isTyping = useCallback(() => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if ((document.activeElement as HTMLElement)?.isContentEditable) return true;
        return false;
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // `?` to show help (only when not typing)
            if (e.key === '?' && !isTyping() && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                setShowHelp((v) => !v);
                return;
            }

            // Esc to close help
            if (e.key === 'Escape' && showHelp) {
                e.preventDefault();
                setShowHelp(false);
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isTyping, showHelp]);

    // Tab trapping inside the help dialog
    useEffect(() => {
        if (!showHelp) return;
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = dialog.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        first?.focus();

        const trap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (focusable.length === 0) { e.preventDefault(); return; }
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
        };

        dialog.addEventListener('keydown', trap);
        return () => dialog.removeEventListener('keydown', trap);
    }, [showHelp]);

    return (
        <AnimatePresence>
            {showHelp && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-100 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowHelp(false)}
                    />

                    {/* Dialog */}
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Keyboard shortcuts"
                        className="fixed inset-x-4 top-[15vh] z-101 mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto dark:border-slate-700 dark:bg-slate-800"
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
                            <div className="flex items-center gap-2.5">
                                <Keyboard className="h-5 w-5 text-indigo-500" />
                                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHelp(false)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Shortcut list */}
                        <div className="max-h-80 overflow-y-auto px-6 py-4">
                            <ul className="space-y-3">
                                {SHORTCUTS.map((s, i) => (
                                    <li key={i} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 dark:text-slate-300">{s.description}</span>
                                        <div className="flex items-center gap-1">
                                            {s.keys.map((key) => (
                                                <kbd
                                                    key={key}
                                                    className="inline-flex min-w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Footer hint */}
                        <div className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400 dark:border-slate-700">
                            Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-700">?</kbd> to toggle this dialog
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * Utility: trap focus within a container element.
 * Call on mount inside modals/dialogs.
 */
export function trapFocus(container: HTMLElement) {
    const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handler = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (focusable.length === 0) { e.preventDefault(); return; }
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
    };

    first?.focus();
    container.addEventListener('keydown', handler);
    return () => container.removeEventListener('keydown', handler);
}
