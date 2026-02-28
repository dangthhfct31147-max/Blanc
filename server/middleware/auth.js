import jwt from 'jsonwebtoken';
import { getAuth } from '@clerk/express';
import { getClientIp } from '../lib/security.js';
import { getPlatformSettings } from '../lib/platformSettings.js';
import {
  buildRequestUser,
  isClerkConfigured,
  resolveLocalUserFromClerkUserId,
} from '../lib/clerkAuth.js';

const jwtSecret = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrf_token';

const TOKENS_INVALID_BEFORE_CACHE_TTL_MS = 30_000;
let tokensInvalidBeforeCache = {
  valueMs: 0,
  fetchedAtMs: 0,
};
let tokensInvalidBeforeInFlight = null;

async function getTokensInvalidBeforeMs() {
  const now = Date.now();
  if (now - tokensInvalidBeforeCache.fetchedAtMs < TOKENS_INVALID_BEFORE_CACHE_TTL_MS) {
    return tokensInvalidBeforeCache.valueMs;
  }

  if (tokensInvalidBeforeInFlight) {
    return tokensInvalidBeforeInFlight;
  }

  tokensInvalidBeforeInFlight = (async () => {
    try {
      const settings = await getPlatformSettings();
      const raw = settings?.security?.tokensInvalidBefore;
      const parsed = raw ? new Date(raw).getTime() : 0;
      const valueMs = Number.isFinite(parsed) ? parsed : 0;
      tokensInvalidBeforeCache = { valueMs, fetchedAtMs: now };
      return valueMs;
    } catch {
      tokensInvalidBeforeCache.fetchedAtMs = now;
      return tokensInvalidBeforeCache.valueMs;
    } finally {
      tokensInvalidBeforeInFlight = null;
    }
  })();

  return tokensInvalidBeforeInFlight;
}

function parseCookies(cookieHeader = '') {
  const header = String(cookieHeader || '');
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    if (!key) return acc;
    const value = rest.join('=').trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function isSafeMethod(method) {
  const m = String(method || '').toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
}

function verifyLegacyJwt(token) {
  try {
    return { payload: jwt.verify(token, jwtSecret) };
  } catch (error) {
    return { error };
  }
}

function respondWithLegacyAuthError(res, req, error) {
  const ip = getClientIp(req);

  if (error?.name === 'TokenExpiredError') {
    console.warn(`[Auth] Expired token from ${ip}: ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Token expired' });
  }

  if (error?.name === 'JsonWebTokenError') {
    console.warn(`[Auth] Invalid token from ${ip}: ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (error?.status && error?.message) {
    console.warn(`[Auth] ${error.message} from ${ip}: ${req.method} ${req.path}`);
    return res.status(error.status).json({ error: error.message });
  }

  console.error('[Auth] JWT verification error:', error?.message || error);
  return res.status(401).json({ error: 'Invalid or expired token' });
}

function getClerkUserId(req) {
  if (!isClerkConfigured() || typeof req.auth !== 'function') {
    return '';
  }

  try {
    const auth = getAuth(req);
    return auth?.userId ? String(auth.userId).trim() : '';
  } catch {
    return '';
  }
}

/**
 * Middleware to guard protected routes with JWT authentication.
 * Supports both legacy JWT auth and Clerk-authenticated public sessions.
 */
export async function authGuard(req, res, next) {
  if (!jwtSecret) {
    console.error('[Auth] JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Authentication service is not configured' });
  }

  const header = req.headers.authorization || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  let cookieToken = '';
  let cookies = null;

  if (!headerToken) {
    cookies = parseCookies(req.headers.cookie);
    cookieToken = String(cookies[AUTH_COOKIE_NAME] || '').trim();
  }

  if (cookieToken && !isSafeMethod(req.method)) {
    const csrfCookie = cookies?.[CSRF_COOKIE_NAME];
    const csrfHeaderRaw = req.headers['x-csrf-token'];
    const csrfHeader = Array.isArray(csrfHeaderRaw) ? csrfHeaderRaw[0] : csrfHeaderRaw;

    if (!csrfCookie || !csrfHeader || String(csrfCookie) !== String(csrfHeader)) {
      const ip = getClientIp(req);
      console.warn(`[Auth] CSRF token mismatch from ${ip}: ${req.method} ${req.path}`);
      return res.status(403).json({ error: 'CSRF token mismatch' });
    }
  }

  const legacyToken = headerToken || cookieToken;
  let legacyError = null;

  if (legacyToken) {
    const verified = verifyLegacyJwt(legacyToken);

    if (verified.payload) {
      const payload = verified.payload;
      const invalidBeforeMs = await getTokensInvalidBeforeMs();

      if (invalidBeforeMs > 0) {
        const issuedAtMs =
          payload && typeof payload === 'object' && typeof payload.iat === 'number'
            ? payload.iat * 1000
            : 0;

        if (!issuedAtMs || issuedAtMs < invalidBeforeMs) {
          legacyError = { status: 401, message: 'Session expired' };
        } else {
          req.user = payload;
          req.clientIp = getClientIp(req);
          req.authSource = 'legacy';
          return next();
        }
      } else {
        req.user = payload;
        req.clientIp = getClientIp(req);
        req.authSource = 'legacy';
        return next();
      }
    } else {
      legacyError = verified.error;
    }
  }

  const clerkUserId = getClerkUserId(req);
  if (clerkUserId) {
    try {
      const localUser = await resolveLocalUserFromClerkUserId(clerkUserId);
      req.user = buildRequestUser(localUser, clerkUserId);
      req.localUser = localUser;
      req.clientIp = getClientIp(req);
      req.authSource = 'clerk';
      return next();
    } catch (error) {
      const status = typeof error?.status === 'number' ? error.status : 401;
      const message = error?.message || 'Unauthorized';
      const ip = getClientIp(req);
      console.warn(`[Auth] Clerk auth failed from ${ip}: ${req.method} ${req.path} (${message})`);
      return res.status(status).json({ error: message });
    }
  }

  if (legacyError) {
    return respondWithLegacyAuthError(res, req, legacyError);
  }

  const ip = getClientIp(req);
  console.warn(`[Auth] Unauthorized attempt from ${ip}: ${req.method} ${req.path}`);
  return res.status(401).json({ error: 'Unauthorized' });
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user.role;
    const allowed = userRole === role || (role === 'admin' && userRole === 'super_admin');

    if (!allowed) {
      const ip = getClientIp(req);
      console.warn(`[Auth] Access denied for role ${userRole} to ${role} endpoint from ${ip}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
}

export function requireAdmin() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    if (!isAdmin) {
      const ip = getClientIp(req);
      console.warn(`[Auth] Admin access denied for user ${req.user.id} from ${ip}`);
      return res.status(403).json({ error: 'Admin access required' });
    }

    return next();
  };
}

export function issueToken(user) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const payload = {
    id: user._id?.toString() || user.id,
    role: user.role || 'student',
    email: user.email,
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: '1d' });
}
