/**
 * API Service Configuration
 * Provides secure axios instance with:
 * - Cookie-based session auth
 * - CSRF protection
 * - Error handling
 */

const apiBaseUrlRaw =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
const API_BASE_URL = apiBaseUrlRaw.replace(/\/+$/, '');

const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token';

let csrfTokenCache: string | null = null;
let csrfTokenInFlight: Promise<string | null> | null = null;

// Types
interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

interface RequestConfig extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
    skipAuth?: boolean;
}

function getCookieValue(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

async function fetchCsrfTokenFromApi(): Promise<string | null> {
    if (csrfTokenCache) return csrfTokenCache;
    if (csrfTokenInFlight) return csrfTokenInFlight;

    csrfTokenInFlight = (async () => {
        try {
            const fallbackOrigin =
                typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
                    ? window.location.origin
                    : 'http://localhost';

            const url = new URL(`${API_BASE_URL}/auth/csrf`, fallbackOrigin).toString();
            const res = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!res.ok) return null;
            const data = await res.json().catch(() => ({}));
            const token =
                data && typeof data === 'object' && 'csrfToken' in data && typeof (data as any).csrfToken === 'string'
                    ? (data as any).csrfToken
                    : null;

            csrfTokenCache = token;
            return token;
        } catch {
            return null;
        } finally {
            csrfTokenInFlight = null;
        }
    })();

    return csrfTokenInFlight;
}

// Build URL with query params
const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean | undefined>): string => {
    const fallbackOrigin =
        typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
            ? window.location.origin
            : 'http://localhost';

    // If API_BASE_URL is relative (e.g. "/api" on Netlify), URL() needs a base.
    // If it's absolute (e.g. https://example.com/api), the base is ignored.
    const url = new URL(`${API_BASE_URL}${endpoint}`, fallbackOrigin);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                url.searchParams.append(key, String(value));
            }
        });
    }

    return url.toString();
};

// Main API request function
async function apiRequest<T>(
    endpoint: string,
    config: RequestConfig = {}
): Promise<ApiResponse<T>> {
    const { params, skipAuth: _skipAuth, ...fetchConfig } = config;

    const url = buildUrl(endpoint, params);

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...fetchConfig.headers,
    };

    // Add CSRF token for cookie-authenticated state-changing requests.
    const method = String(fetchConfig.method || 'GET').toUpperCase();
    const isSafeMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
    if (!isSafeMethod) {
        const csrf = getCookieValue(CSRF_COOKIE_NAME) || csrfTokenCache || (await fetchCsrfTokenFromApi());
        if (csrf) {
            (headers as Record<string, string>)['X-CSRF-Token'] = csrf;
        }
    }

    try {
        const response = await fetch(url, {
            ...fetchConfig,
            headers,
            credentials: 'include',
        });

        if (response.status === 401) {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }

        // Parse response
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string' && (data as any).message) ||
                (data && typeof data === 'object' && 'error' in data && typeof (data as any).error === 'string' && (data as any).error) ||
                `Request failed with status ${response.status}`;

            throw new ApiError(
                message,
                response.status,
                data
            );
        }

        return {
            data: data.data ?? data,
            message: data.message,
            success: true,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        // Network error or other
        throw new ApiError(
            error instanceof Error ? error.message : 'Network error occurred',
            0
        );
    }
}

// Custom API Error class
export class ApiError extends Error {
    public status: number;
    public data?: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// HTTP method helpers
export const api = {
    get: <T>(endpoint: string, config?: RequestConfig) =>
        apiRequest<T>(endpoint, { ...config, method: 'GET' }),

    post: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
        apiRequest<T>(endpoint, {
            ...config,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),

    put: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
        apiRequest<T>(endpoint, {
            ...config,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        }),

    patch: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
        apiRequest<T>(endpoint, {
            ...config,
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(endpoint: string, config?: RequestConfig) =>
        apiRequest<T>(endpoint, { ...config, method: 'DELETE' }),
};

export default api;
