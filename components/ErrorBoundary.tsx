import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { I18nContext } from '../contexts/I18nContext';
import { DEFAULT_LOCALE, type TranslationKey, t as translate } from '../lib/i18n';

// ── Lightweight logger – wired to window.__ERROR_TRACKER__ when present ──
function reportError(error: Error, errorInfo: ErrorInfo, boundary: string) {
    const payload = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        boundary,
        url: window.location.href,
        timestamp: new Date().toISOString(),
    };

    // Forward to APM if wired (see lib/logger.ts)
    const tracker = (window as any).__ERROR_TRACKER__;
    if (typeof tracker?.captureException === 'function') {
        tracker.captureException(error, { extra: payload });
    }

    // Always log in development
    if (import.meta.env.DEV) {
        console.group(`🔴 ErrorBoundary [${boundary}]`);
        console.error(error);
        console.log('Component stack:', errorInfo.componentStack);
        console.groupEnd();
    }
}

// ── Types ────────────────────────────────────────
interface ErrorBoundaryProps {
    children: ReactNode;
    /** Shown as a tag in the fallback so users know which section broke */
    name?: string;
    /** Compact variant for sidebar/card-level boundaries */
    variant?: 'page' | 'section' | 'inline';
    /** Custom fallback — receives error + reset fn */
    fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
    showDetails: boolean;
    copied: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    static contextType = I18nContext;
    declare context: React.ContextType<typeof I18nContext>;

    state: ErrorBoundaryState = { error: null, showDetails: false, copied: false };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        reportError(error, errorInfo, this.props.name || 'Unknown');
    }

    private reset = () => {
        this.setState({ error: null, showDetails: false, copied: false });
    };

    private copyError = async () => {
        if (!this.state.error) return;
        const text = `${this.state.error.message}\n\n${this.state.error.stack ?? ''}`;
        try {
            await navigator.clipboard.writeText(text);
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
        } catch {
            // clipboard not available
        }
    };

    private text = (key: TranslationKey, params?: Record<string, string | number>) => {
        const ctx = this.context;
        return ctx?.t ? ctx.t(key, params) : translate(DEFAULT_LOCALE, key, params);
    };

    render() {
        const { error, showDetails, copied } = this.state;
        if (!error) return this.props.children;

        // Custom fallback
        if (this.props.fallback) {
            return this.props.fallback({ error, reset: this.reset });
        }

        const variant = this.props.variant ?? 'page';

        // ── Inline (card-level) ──
        if (variant === 'inline') {
            return (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span className="truncate">{this.text('common.errorOccurred')}</span>
                    <button
                        onClick={this.reset}
                        className="ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
                    >
                        {this.text('common.retry')}
                    </button>
                </div>
            );
        }

        // ── Section-level ──
        if (variant === 'section') {
            return (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/15 bg-red-500/5 px-6 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                        <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-red-300">{this.text('common.errorOccurred')}</h3>
                        <p className="mt-1 text-xs text-slate-400">
                            {this.props.name && <span className="text-slate-500">[{this.props.name}] </span>}
                            {this.text('errorBoundary.sectionDescription')}
                        </p>
                    </div>
                    <button
                        onClick={this.reset}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
                    >
                        <RefreshCw size={13} />
                        {this.text('common.retry')}
                    </button>
                </div>
            );
        }

        // ── Page-level (full) ──
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-4">
                <div className="w-full max-w-lg text-center">
                    {/* Icon */}
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 shadow-lg shadow-red-500/5">
                        <AlertTriangle size={36} className="text-red-400" />
                    </div>

                    {/* Heading */}
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{this.text('common.errorOccurred')}</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {this.text('errorBoundary.pageDescriptionLine1')}
                        <br />
                        {this.text('errorBoundary.pageDescriptionLine2')}
                    </p>

                    {/* Actions */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={this.reset}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-100 dark:bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300 transition-all hover:bg-red-200 dark:hover:bg-red-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                        >
                            <RefreshCw size={15} />
                            {this.text('common.retry')}
                        </button>
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/30 bg-slate-100 dark:bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
                        >
                            <Home size={15} />
                            {this.text('common.home')}
                        </a>
                    </div>

                    {/* Expandable error details (dev-friendly) */}
                    <div className="mt-6">
                        <button
                            onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-400"
                        >
                            {this.text('errorBoundary.details')}
                            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {showDetails && (
                            <div className="relative mt-3 rounded-lg border border-slate-200 dark:border-slate-700/30 bg-slate-100 dark:bg-slate-900/80 p-4 text-left">
                                <button
                                    onClick={this.copyError}
                                    className="absolute right-2 top-2 rounded p-1 text-slate-500 transition-colors hover:text-slate-300"
                                    title={this.text('errorBoundary.copyError')}
                                >
                                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                </button>
                                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">{error.message}</p>
                                {error.stack && (
                                    <pre className="mt-2 max-h-40 overflow-auto text-[10px] leading-relaxed text-slate-600 dark:text-slate-500 font-mono whitespace-pre-wrap">
                                        {error.stack}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
