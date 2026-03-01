import { apiCache, sessionCache, localCache, CACHE_TTL } from './cache';
import { DEFAULT_LOCALE, TranslationKey, normalizeLocale, t as translate } from './i18n';
import { getApiBaseUrl } from './clerkConfig';

// API Configuration
const API_BASE_URL = getApiBaseUrl();

// Optional Bearer token support (fallback when cookies are blocked in cross-site deployments)
const ACCESS_TOKEN_KEY = 'access_token';
const LOCALE_STORAGE_KEY = 'blanc:locale';
type AccessTokenProvider = (() => Promise<string | null> | string | null) | null;
let accessTokenProvider: AccessTokenProvider = null;

const API_ERROR_CODE_TO_KEY: Record<string, TranslationKey> = {
  MISSING_PARAMS: 'errors.api.missingParams',
  MISSING_EMAIL: 'errors.api.missingEmail',
  INVALID_ACTION: 'errors.api.invalidAction',
  INVALID_EMAIL: 'errors.api.invalidEmail',
  INVALID_TOKEN: 'errors.api.invalidToken',
  COOLDOWN: 'errors.api.cooldown',
  RATE_LIMITED: 'errors.api.rateLimited',
  EMAIL_EXISTS: 'errors.api.emailExists',
  NO_PENDING_REGISTRATION: 'errors.api.noPendingRegistration',
  OTP_EXPIRED: 'errors.api.otpExpired',
  OTP_INVALID_STATUS: 'errors.api.otpInvalidStatus',
  WRONG_OTP: 'errors.api.wrongOtp',
  INVALID_OTP: 'errors.api.invalidOtp',
  MAX_ATTEMPTS_EXCEEDED: 'errors.api.maxAttemptsExceeded',
  IP_RATE_LIMIT: 'errors.api.ipRateLimit',
  ACCOUNT_LOCKED: 'errors.api.accountLocked',
  EMAIL_RATE_LIMIT: 'errors.api.emailRateLimit',
  LOGIN_SESSION_EXPIRED: 'errors.api.loginSessionExpired',
  TWO_FACTOR_NOT_ENABLED: 'errors.api.twoFactorNotEnabled',
  TOTP_NOT_CONFIGURED: 'errors.api.totpNotConfigured',
  TOTP_SETUP_REQUIRED: 'errors.api.totpSetupRequired',
  NO_PENDING_2FA_SETUP: 'errors.api.noPending2faSetup',
  TOTP_SETUP_EXPIRED: 'errors.api.totpSetupExpired',
  TOTP_SECRET_DECRYPT_FAILED: 'errors.api.totpSecretDecryptFailed',
  LEGACY_AUTH_DISABLED: 'errors.api.legacyAuthDisabled',
  CONSENT_REQUIRED: 'errors.api.consentRequired',
  PROFILE_REQUIRED: 'errors.api.profileRequired',
  REGISTRATION_EXPIRED: 'errors.api.registrationExpired',
  OTP_NOT_VERIFIED: 'errors.api.otpNotVerified',
  INVALID_VERIFICATION_TOKEN: 'errors.api.invalidVerificationToken',
  VERIFICATION_TOKEN_EXPIRED: 'errors.api.verificationTokenExpired',
  MEMBERSHIP_REQUIRED: 'errors.api.membershipRequired',
  CHAT_RATE_LIMIT: 'errors.api.chatRateLimit',
  MATCHING_DISABLED: 'errors.api.matchingDisabled',
  TARGET_NOT_AVAILABLE: 'errors.api.targetNotAvailable',
  EMAIL_DISABLED: 'errors.api.emailDisabled',
};

const API_ERROR_MESSAGE_TO_KEY: Record<string, TranslationKey> = {
  'Email và session token là bắt buộc.': 'errors.api.missingParams',
  'Action không hợp lệ.': 'errors.api.invalidAction',
  'Email không hợp lệ.': 'errors.api.invalidEmail',
  'Session token không hợp lệ.': 'errors.api.invalidToken',
  'Email là bắt buộc.': 'errors.api.missingEmail',
  'Email này đã được đăng ký. Vui lòng đăng nhập.': 'errors.api.emailExists',
  'Vui lòng bắt đầu đăng ký trước khi xác thực OTP.': 'errors.api.noPendingRegistration',
};

function getLocaleForApiErrors() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return normalizeLocale(stored) || DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function localizeApiErrorMessage(message: string, errorData?: unknown) {
  const locale = getLocaleForApiErrors();
  if (locale === 'vi') return message;

  const code =
    errorData && typeof errorData === 'object' && 'code' in (errorData as Record<string, unknown>)
      ? String((errorData as { code?: unknown }).code || '')
      : '';
  const keyFromCode = code ? API_ERROR_CODE_TO_KEY[code] : undefined;
  if (keyFromCode) {
    const params = {
      seconds: (errorData as any)?.remainingCooldown,
      minutes: (errorData as any)?.retryAfterMinutes,
    };
    return translate(locale, keyFromCode, params);
  }

  const keyFromMessage = API_ERROR_MESSAGE_TO_KEY[message];
  if (keyFromMessage) return translate(locale, keyFromMessage);

  return message;
}

export const authToken = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (sessionToken) return sessionToken;

      // Backward compatibility: migrate any previously persisted token to sessionStorage.
      const localToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (localToken) {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, localToken);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        return localToken;
      }

      return null;
    } catch {
      return null;
    }
  },

  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    const value = String(token || '').trim();
    if (!value) return;

    try {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, value);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // ignore storage failures
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

export function setAccessTokenProvider(provider: AccessTokenProvider): void {
  accessTokenProvider = provider;
  if (provider) {
    authToken.clear();
  }
}

// Request deduplication - prevent multiple identical requests
const pendingRequests = new Map<string, Promise<unknown>>();

let cachedCsrfToken: string | null = null;
let csrfTokenInFlight: Promise<string | null> | null = null;

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (csrfTokenInFlight) return csrfTokenInFlight;

  csrfTokenInFlight = (async () => {
    try {
      const url = `${API_BASE_URL}/auth/csrf`;
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json().catch(() => null)) as null | { csrfToken?: string };
      const token = data?.csrfToken ? String(data.csrfToken) : null;
      cachedCsrfToken = token;
      return token;
    } finally {
      csrfTokenInFlight = null;
    }
  })();

  return csrfTokenInFlight;
}

function mergeHeaders(into: Record<string, string>, extra?: HeadersInit): void {
  if (!extra) return;
  if (typeof Headers !== 'undefined' && extra instanceof Headers) {
    extra.forEach((value, key) => {
      into[key] = value;
    });
    return;
  }

  if (Array.isArray(extra)) {
    for (const [key, value] of extra) {
      into[key] = value;
    }
    return;
  }

  Object.assign(into, extra);
}

// Generic fetch wrapper with error handling and caching
async function fetchAPI<T>(
  endpoint: string,
  options?: Omit<RequestInit, 'cache'> & {
    useCache?: boolean;
    cacheTTL?: number;
    cacheKey?: string;
    persist?: 'session' | 'local';
  }
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { useCache = false, cacheTTL, cacheKey, persist = 'session', ...fetchOptions } = options || {};

  // Generate cache key
  const key = cacheKey || `api:${endpoint}`;
  const persistentCache = persist === 'local' ? localCache : sessionCache;

  // Check memory cache first (for GET requests only)
  if (useCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    const cached = apiCache.get<T>(key);
    if (cached) {
      return cached;
    }

    // Also check persistent storage (sessionStorage or localStorage)
    const persistentCached = persistentCache.get<T>(key);
    if (persistentCached) {
      apiCache.set(key, persistentCached, cacheTTL);
      return persistentCached;
    }
  }

  // Request deduplication for GET requests
  const isGet = !fetchOptions.method || fetchOptions.method === 'GET';
  if (isGet && pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  mergeHeaders(headers, fetchOptions?.headers);

  let accessToken: string | null = null;
  if (accessTokenProvider) {
    try {
      const provided = await accessTokenProvider();
      accessToken = provided ? String(provided).trim() : null;
    } catch {
      accessToken = null;
    }
  }

  if (!accessToken) {
    accessToken = authToken.get();
  }

  if (accessToken && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    credentials: 'include',
    ...fetchOptions,
    headers,
  };

  // CSRF token for cookie-based auth (required for state-changing requests)
  const method = String(config.method || 'GET').toUpperCase();
  const isSafeMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const hasAuthHeader = Boolean(headers.Authorization || headers.authorization);
  if (!isSafeMethod && !hasAuthHeader) {
    const csrfFromCookie = getCookieValue('csrf_token');
    const csrf = csrfFromCookie || (await fetchCsrfToken());
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(url, config);
      const headerGetter =
        response &&
          typeof response === 'object' &&
          'headers' in response &&
          (response as { headers?: { get?: (name: string) => string | null } }).headers &&
          typeof (response as { headers?: { get?: (name: string) => string | null } }).headers?.get === 'function'
          ? (response as { headers: { get: (name: string) => string | null } }).headers.get.bind(
            (response as { headers: { get: (name: string) => string | null } }).headers,
          )
          : null;

      const contentType = String(headerGetter?.('content-type') || '').toLowerCase();
      const hasContentTypeHeader = Boolean(contentType);
      const isJsonResponse =
        !hasContentTypeHeader
        || contentType.includes('application/json')
        || contentType.includes('+json');

      const parseErrorPayload = async () => {
        if (isJsonResponse) {
          return response.json().catch(() => ({}));
        }

        const rawText = await response.text().catch(() => '');
        const normalizedText = String(rawText || '').trim();

        if (normalizedText.startsWith('<!doctype') || normalizedText.startsWith('<html')) {
          return {
            error: `API responded with HTML instead of JSON at ${url}. Check VITE_API_URL/runtime-config.js and API routing.`,
          };
        }

        return normalizedText ? { error: normalizedText } : {};
      };

      if (!response.ok) {
        const errorData = await parseErrorPayload();
        const rawMessage =
          errorData &&
            typeof errorData === 'object' &&
            'error' in errorData &&
            typeof (errorData as { error?: unknown }).error === 'string'
            ? String((errorData as { error?: unknown }).error)
            : `HTTP error! status: ${response.status}`;
        const message = localizeApiErrorMessage(rawMessage, errorData);

        const err: any = new Error(message);
        err.status = response.status;
        err.data = errorData;
        if (errorData && typeof errorData === 'object' && 'code' in errorData && typeof (errorData as any).code === 'string') {
          err.code = String((errorData as any).code);
        }
        throw err;
      }

      if (!isJsonResponse) {
        const text = await response.text().catch(() => '');
        const normalized = String(text || '').trim();

        const message =
          normalized.startsWith('<!doctype') || normalized.startsWith('<html')
            ? `API responded with HTML instead of JSON at ${url}. Check VITE_API_URL/runtime-config.js and API routing.`
            : `API responded with non-JSON content at ${url}.`;

        const err: any = new Error(message);
        err.status = response.status;
        err.data = { contentType, preview: normalized.slice(0, 200) };
        throw err;
      }

      const data = await response.json();

      // Cache successful GET responses
      if (useCache && isGet && cacheTTL) {
        apiCache.set(key, data, cacheTTL);
        persistentCache.set(key, data, cacheTTL);
      }

      return data as T;
    } finally {
      // Clean up pending request
      if (isGet) {
        pendingRequests.delete(key);
      }
    }
  })();

  // Store pending request for deduplication
  if (isGet) {
    pendingRequests.set(key, requestPromise);
  }

  return requestPromise;
}

// API exports with cache support
export const api = {
  get: <T>(
    endpoint: string,
    options?: { useCache?: boolean; cacheTTL?: number; cacheKey?: string; persist?: 'session' | 'local' }
  ) =>
    fetchAPI<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, data?: unknown) =>
    fetchAPI<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data: unknown) =>
    fetchAPI<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data: unknown) =>
    fetchAPI<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) =>
    fetchAPI<T>(endpoint, { method: 'DELETE' }),
};

// Cached API helpers for common endpoints
export const cachedApi = {
  getStats: () => api.get('/stats', { useCache: true, cacheTTL: CACHE_TTL.STATS, persist: 'local' }),

  getContests: (limit = 10) =>
    api.get(`/contests?limit=${limit}`, { useCache: true, cacheTTL: CACHE_TTL.CONTESTS, persist: 'local' }),

  getCourses: (limit = 10, level?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (level) params.append('level', level);
    return api.get(`/courses?${params}`, { useCache: true, cacheTTL: CACHE_TTL.COURSES, persist: 'local' });
  },

  getCourseDetail: (id: string) =>
    api.get(`/courses/${id}`, { useCache: true, cacheTTL: CACHE_TTL.COURSE_DETAIL, cacheKey: `course:${id}` }),

  getContestDetail: (id: string) =>
    api.get(`/contests/${id}`, { useCache: true, cacheTTL: CACHE_TTL.COURSE_DETAIL, cacheKey: `contest:${id}` }),

  getMembershipPlans: () =>
    api.get('/membership/plans', { useCache: true, cacheTTL: CACHE_TTL.MEMBERSHIP_PLANS, cacheKey: 'membership:plans', persist: 'local' }),
};

// Cache invalidation helpers
export const invalidateCache = {
  all: () => {
    apiCache.clear();
    sessionCache.clear();
    localCache.clear();
  },
  stats: () => apiCache.invalidate('api:/stats'),
  contests: () => apiCache.invalidatePattern('contest'),
  courses: () => apiCache.invalidatePattern('course'),
  course: (id: string) => apiCache.invalidate(`course:${id}`),
};

export { API_BASE_URL, CACHE_TTL };
