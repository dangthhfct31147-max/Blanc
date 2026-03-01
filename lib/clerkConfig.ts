const RUNTIME_CLERK_KEY_STORAGE = 'clerk:publishable_key';

function normalizeKey(value: unknown): string {
    return String(value || '').trim();
}

function getRuntimeConfigValue(key: 'VITE_CLERK_PUBLISHABLE_KEY' | 'VITE_API_URL'): string {
    if (typeof window === 'undefined') return '';
    return normalizeKey(window.__APP_RUNTIME_CONFIG__?.[key]);
}

export function getClerkPublishableKey(): string {
    const runtimeEnvKey = getRuntimeConfigValue('VITE_CLERK_PUBLISHABLE_KEY');
    if (runtimeEnvKey) return runtimeEnvKey;

    const envKey = normalizeKey(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
    if (envKey) return envKey;

    if (typeof window === 'undefined') {
        return '';
    }

    const runtimeKey = normalizeKey(window.__CLERK_PUBLISHABLE_KEY__);
    if (runtimeKey) return runtimeKey;

    try {
        return normalizeKey(sessionStorage.getItem(RUNTIME_CLERK_KEY_STORAGE));
    } catch {
        return '';
    }
}

export function setRuntimeClerkPublishableKey(nextKey: string): string {
    const normalizedKey = normalizeKey(nextKey);
    if (!normalizedKey || typeof window === 'undefined') {
        return '';
    }

    window.__CLERK_PUBLISHABLE_KEY__ = normalizedKey;

    try {
        sessionStorage.setItem(RUNTIME_CLERK_KEY_STORAGE, normalizedKey);
    } catch {
        // Ignore storage failures.
    }

    return normalizedKey;
}

export function getApiBaseUrl(): string {
    const runtimeApiUrl = getRuntimeConfigValue('VITE_API_URL');
    if (runtimeApiUrl) return runtimeApiUrl.replace(/\/+$/, '');

    const envApiUrl = normalizeKey(import.meta.env.VITE_API_URL);
    if (envApiUrl) return envApiUrl.replace(/\/+$/, '');

    return import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
}
