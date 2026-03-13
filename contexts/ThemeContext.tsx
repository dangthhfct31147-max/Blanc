import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    mode: ThemeMode;
    resolved: ResolvedTheme;
    setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'blanc:theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredMode(): ThemeMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch { /* ignore */ }
    return 'system';
}

function applyTheme(resolved: ResolvedTheme) {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', resolved === 'dark' ? '#020617' : '#ffffff');
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

    // Listen for system theme changes
    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    const resolved: ResolvedTheme = mode === 'system' ? systemTheme : mode;

    // Apply class to <html> and persist
    useEffect(() => {
        applyTheme(resolved);
    }, [resolved]);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    }, []);

    const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
