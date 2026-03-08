// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Frontend Error Tracker / APM bridge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Lightweight client-side error capturing.
// Catches: unhandled errors, promise rejections, ErrorBoundary reports.
// Ships error payloads to /api/client-errors (backend stores / forwards to APM).
//
// To wire Sentry or another APM:
//   import * as Sentry from '@sentry/react';
//   Sentry.init({ dsn: '...' });
//   window.__ERROR_TRACKER__ = Sentry;
//

import { getApiBaseUrl } from './clerkConfig';

const API_BASE = getApiBaseUrl();
const MAX_BUFFER = 10;
const FLUSH_INTERVAL_MS = 10_000;

interface ClientError {
    message: string;
    stack?: string;
    source?: string;
    url: string;
    timestamp: string;
    userAgent: string;
    appVersion: string;
}

let buffer: ClientError[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function buildPayload(error: Error | string, source = 'unknown'): ClientError {
    const err = typeof error === 'string' ? new Error(error) : error;
    return {
        message: err.message,
        stack: err.stack,
        source,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        appVersion: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev') as string,
    };
}

function flush() {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, MAX_BUFFER);

    // Fire-and-forget
    try {
        const body = JSON.stringify({ errors: batch });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(`${API_BASE}/api/client-errors`, new Blob([body], { type: 'application/json' }));
        } else {
            fetch(`${API_BASE}/api/client-errors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true,
            }).catch(() => { });
        }
    } catch {
        // ignore
    }
}

export function captureException(error: Error | string, source?: string) {
    const payload = buildPayload(error, source);
    buffer.push(payload);

    if (buffer.length >= MAX_BUFFER) {
        flush();
    }
}

export function initErrorTracking() {
    // Global unhandled error
    window.addEventListener('error', (event) => {
        captureException(event.error || event.message, 'window.onerror');
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        captureException(reason, 'unhandledrejection');
    });

    // Expose tracker for ErrorBoundary
    (window as any).__ERROR_TRACKER__ = {
        captureException: (error: Error, context?: { extra?: Record<string, unknown> }) => {
            captureException(error, context?.extra?.boundary as string || 'ErrorBoundary');
        },
    };

    // Periodic flush
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

    // Flush on page unload
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
    });
}

export function destroyErrorTracking() {
    if (flushTimer) clearInterval(flushTimer);
    flush();
}
