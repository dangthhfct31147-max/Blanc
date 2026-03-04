const RUNTIME_CLERK_KEY_STORAGE = 'clerk:publishable_key';
let hasWarnedAboutInvalidClerkKey = false;

function normalizeKey(value: unknown): string {
    return String(value || '').trim();
}

function isDevelopmentPublishableKey(value: string): boolean {
    return value.startsWith('pk_test_');
}

function getClerkIssueForKey(value: string): 'development_key_in_production' | null {
    if (!value) return null;
    if (import.meta.env.PROD && isDevelopmentPublishableKey(value)) {
        return 'development_key_in_production';
    }
    return null;
}

function warnAboutClerkKeyIssue(issue: 'development_key_in_production' | null): void {
    if (!issue || hasWarnedAboutInvalidClerkKey || typeof console === 'undefined') {
        return;
    }

    hasWarnedAboutInvalidClerkKey = true;
    console.warn('[clerk] Ignoring development publishable key in a production build. Replace it with a pk_live_ key.');
}

function getRuntimeConfigValue(key: 'VITE_CLERK_PUBLISHABLE_KEY' | 'VITE_API_URL'): string {
    if (typeof window === 'undefined') return '';
    return normalizeKey(window.__APP_RUNTIME_CONFIG__?.[key]);
}

function getRawClerkPublishableKey(): string {
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

export function getClerkPublishableKeyIssue(): 'development_key_in_production' | null {
    return getClerkIssueForKey(getRawClerkPublishableKey());
}

export function getClerkPublishableKey(): string {
    const rawKey = getRawClerkPublishableKey();
    const issue = getClerkIssueForKey(rawKey);
    warnAboutClerkKeyIssue(issue);
    return issue ? '' : rawKey;
}

export function setRuntimeClerkPublishableKey(nextKey: string): string {
    const normalizedKey = normalizeKey(nextKey);
    if (typeof window === 'undefined') {
        return '';
    }

    window.__CLERK_PUBLISHABLE_KEY__ = normalizedKey;

    try {
        if (normalizedKey) {
            sessionStorage.setItem(RUNTIME_CLERK_KEY_STORAGE, normalizedKey);
        } else {
            sessionStorage.removeItem(RUNTIME_CLERK_KEY_STORAGE);
        }
    } catch {
        // Ignore storage failures.
    }

    const issue = getClerkIssueForKey(normalizedKey);
    warnAboutClerkKeyIssue(issue);
    return issue ? '' : normalizedKey;
}

export function getApiBaseUrl(): string {
    const runtimeApiUrl = getRuntimeConfigValue('VITE_API_URL');
    if (runtimeApiUrl) return runtimeApiUrl.replace(/\/+$/, '');

    const envApiUrl = normalizeKey(import.meta.env.VITE_API_URL);
    if (envApiUrl) return envApiUrl.replace(/\/+$/, '');

    return import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
}
