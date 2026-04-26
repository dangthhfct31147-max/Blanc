import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ObjectId } from '../lib/objectId.js';
import { connectToDatabase, getCollection } from '../lib/db.js';
import { authGuard, issueToken } from '../middleware/auth.js';
import { logAuditEvent } from './admin.js';
import { getMembershipSummary } from '../lib/membership.js';
import { getPlatformSettings } from '../lib/platformSettings.js';
import { getClerkPublishableKey } from '../lib/clerkAuth.js';
import { getClientIp } from '../lib/security.js';
import {
  buildOtpAuthUrl,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecretBase32,
  verifyTotpToken,
} from '../lib/totp.js';

const router = Router();

function isClerkManagedAccount(req) {
  return Boolean(req.user?.clerkUserId);
}

function getRuntimeAppEnvironment() {
  return String(
    process.env.APP_ENV
    || process.env.RAILWAY_ENVIRONMENT_NAME
    || process.env.NODE_ENV
    || ''
  ).trim().toLowerCase();
}

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrf_token';
const AUTH_COOKIE_MAX_AGE_MS =
  Number.parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS || '', 10) || 24 * 60 * 60 * 1000;

function getCookieBaseOptions() {
  const sameSiteRaw = String(process.env.AUTH_COOKIE_SAMESITE || 'lax').toLowerCase();
  const sameSite = sameSiteRaw === 'none' ? 'none' : sameSiteRaw === 'strict' ? 'strict' : 'lax';

  const secureEnv = process.env.AUTH_COOKIE_SECURE;
  const secure =
    secureEnv !== undefined
      ? String(secureEnv).toLowerCase() === 'true'
      : process.env.NODE_ENV === 'production';

  // SameSite=None requires Secure in modern browsers
  const secureFinal = sameSite === 'none' ? true : secure;

  // ⚠️ AUTH_COOKIE_DOMAIN should be EMPTY for Railway auto-domain handling
  // Only set if using custom parent domain (e.g., .yourdomain.com)
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

  // Warn if domain is set incorrectly
  if (domain && process.env.RAILWAY_ENVIRONMENT && domain.includes('railway.app')) {
    console.warn('⚠️  AUTH_COOKIE_DOMAIN should be empty for Railway auto-generated domains');
  }

  return {
    path: '/',
    sameSite,
    secure: secureFinal,
    ...(domain ? { domain } : {}),
  };
}

function setAuthCookies(res, token) {
  const base = getCookieBaseOptions();
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...base,
    httpOnly: true,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...base,
    httpOnly: false,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

function clearAuthCookies(res) {
  const base = getCookieBaseOptions();
  res.clearCookie(AUTH_COOKIE_NAME, { ...base, httpOnly: true });
  res.clearCookie(CSRF_COOKIE_NAME, { ...base, httpOnly: false });
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

// GET /auth/csrf - Return CSRF token for cookie-based auth
// Useful when the CSRF cookie is not readable by JS (e.g., API on a sibling subdomain).
// Intentionally does NOT require auth: the token is not a secret and is only meaningful
// alongside the user's authenticated cookie session.
router.get('/csrf', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  let csrfToken = cookies[CSRF_COOKIE_NAME];

  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    const base = getCookieBaseOptions();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...base,
      httpOnly: false,
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });
  }

  return res.json({ csrfToken });
});

// GET /auth/clerk-config - Public runtime config for frontend bootstrap
router.get('/clerk-config', (_req, res) => {
  const publishableKey = getClerkPublishableKey();
  return res.json({
    publishableKey,
    configured: Boolean(publishableKey),
    appEnv: getRuntimeAppEnvironment(),
  });
});

// ============ CONSTANTS ============
const PENDING_REGISTRATION_TTL_MINUTES = 10; // Pending registrations expire in 10 minutes
const LOGIN_2FA_TTL_MINUTES = 2; // 2FA/OTP session expires in 2 minutes (auto-extends on OTP resend)
const TOTP_SETUP_TTL_MINUTES = 15; // Pending TOTP setup expires in 15 minutes
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_VERIFY_WINDOW = 1; // allow +/- 1 time-step for clock skew
const TOTP_ISSUER = String(process.env.TOTP_ISSUER || process.env.SITE_NAME || 'ContestHub').trim() || 'ContestHub';

function isTotpEncryptionConfigured() {
  return Boolean(String(process.env.TOTP_ENCRYPTION_KEY || '').trim());
}

function hasEncryptedSecret(value) {
  return Boolean(value && typeof value === 'object' && value.ct && value.iv && value.tag);
}

function isTwoFactorEnabled(user) {
  return user?.security?.twoFactorEnabled === true && hasEncryptedSecret(user?.security?.twoFactorSecret);
}

function isPrivilegedRole(role) {
  return role === 'admin' || role === 'super_admin' || role === 'mentor';
}

// ============ TEST ACCOUNTS (bypass OTP) ============
const OTP_BYPASS_EMAILS = (() => {
  // SECURITY: never allow OTP bypass in production.
  if (process.env.NODE_ENV === 'production') return [];

  const raw = String(process.env.OTP_BYPASS_EMAILS || '').trim();
  const list = raw
    ? raw.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)
    : ['admin@contesthub.dev', 'admin@contesthub.dev'];

  return Array.from(new Set(list));
})();

// ============ LOGIN RATE LIMIT CONFIG ============
const LOGIN_RATE_LIMIT = {
  // IP-based rate limit
  IP_MAX_ATTEMPTS: 5,           // Max attempts per IP
  IP_WINDOW_MS: 60 * 1000,      // 1 minute window

  // Email-based rate limit  
  EMAIL_MAX_ATTEMPTS: 10,       // Max attempts per email
  EMAIL_WINDOW_MS: 60 * 60 * 1000, // 1 hour window

  // Account lockout
  LOCKOUT_THRESHOLD: 10,        // Lock after 10 failed attempts
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes lockout
};

// In-memory store for IP rate limiting (consider Redis for production)
const loginAttempts = new Map();

/**
 * Clean up expired entries from loginAttempts map
 */
function cleanupLoginAttempts() {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > Math.max(LOGIN_RATE_LIMIT.IP_WINDOW_MS, LOGIN_RATE_LIMIT.EMAIL_WINDOW_MS)) {
      loginAttempts.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupLoginAttempts, 5 * 60 * 1000);

/**
 * Check IP-based rate limit
 */
function checkIpRateLimit(ip) {
  const key = `ip:${ip}`;
  const now = Date.now();
  const data = loginAttempts.get(key);

  if (!data || now - data.firstAttempt > LOGIN_RATE_LIMIT.IP_WINDOW_MS) {
    return { allowed: true };
  }

  if (data.count >= LOGIN_RATE_LIMIT.IP_MAX_ATTEMPTS) {
    const remainingMs = LOGIN_RATE_LIMIT.IP_WINDOW_MS - (now - data.firstAttempt);
    return {
      allowed: false,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      reason: 'IP_RATE_LIMIT'
    };
  }

  return { allowed: true };
}

/**
 * Record failed login attempt for IP
 */
function recordIpAttempt(ip) {
  const key = `ip:${ip}`;
  const now = Date.now();
  const data = loginAttempts.get(key);

  if (!data || now - data.firstAttempt > LOGIN_RATE_LIMIT.IP_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    data.count++;
  }
}

/**
 * Clear IP attempts on successful login
 */
function clearIpAttempts(ip) {
  loginAttempts.delete(`ip:${ip}`);
}

/**
 * Check and record email-based rate limit (stored in DB)
 */
async function checkEmailRateLimit(email) {
  const loginAttemptsCol = getCollection('login_attempts');
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOGIN_RATE_LIMIT.EMAIL_WINDOW_MS);

  // Count failed attempts in the last hour
  const recentAttempts = await loginAttemptsCol.countDocuments({
    email,
    success: false,
    createdAt: { $gte: windowStart }
  });

  if (recentAttempts >= LOGIN_RATE_LIMIT.EMAIL_MAX_ATTEMPTS) {
    return {
      allowed: false,
      reason: 'EMAIL_RATE_LIMIT',
      message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 1 giờ.'
    };
  }

  return { allowed: true };
}

/**
 * Check if account is locked
 */
async function checkAccountLockout(email) {
  const users = getCollection('users');
  const user = await users.findOne({ email });

  if (!user) return { locked: false };

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      locked: true,
      remainingMinutes,
      message: `Tài khoản tạm khóa. Vui lòng thử lại sau ${remainingMinutes} phút.`
    };
  }

  return { locked: false };
}

/**
 * Record login attempt in database
 */
async function recordLoginAttempt(email, ip, userAgent, success) {
  const loginAttemptsCol = getCollection('login_attempts');

  await loginAttemptsCol.insertOne({
    email,
    ip,
    userAgent,
    success,
    createdAt: new Date()
  });

  // If failed, check if we need to lock the account
  if (!success) {
    const windowStart = new Date(Date.now() - LOGIN_RATE_LIMIT.EMAIL_WINDOW_MS);
    const failedCount = await loginAttemptsCol.countDocuments({
      email,
      success: false,
      createdAt: { $gte: windowStart }
    });

    if (failedCount >= LOGIN_RATE_LIMIT.LOCKOUT_THRESHOLD) {
      const users = getCollection('users');
      await users.updateOne(
        { email },
        {
          $set: {
            lockedUntil: new Date(Date.now() + LOGIN_RATE_LIMIT.LOCKOUT_DURATION_MS),
            updatedAt: new Date()
          }
        }
      );
      return { accountLocked: true };
    }
  } else {
    // Clear lockout on successful login
    const users = getCollection('users');
    await users.updateOne(
      { email, lockedUntil: { $exists: true } },
      { $unset: { lockedUntil: '' }, $set: { updatedAt: new Date() } }
    );
  }

  return { accountLocked: false };
}

// ============ NOTIFICATION HELPER ============

/**
 * Generate HMAC signature for notification requests
 * @param {string} action - The notification action type
 * @param {string} secretKey - The secret key for HMAC
 * @param {string} [email] - Optional email to include in signature
 */
function generateSignature(action, secretKey, email = null) {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();

  // Build canonical string - MUST match App Script's verification order:
  // action, nonce, timestamp, [email]
  let canonicalString = `action=${action}&nonce=${nonce}&timestamp=${timestamp}`;
  if (email) {
    canonicalString += `&email=${email}`;
  }

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(canonicalString)
    .digest('base64');
  return { timestamp, nonce, signature };
}

/**
 * Send welcome email to new user (async, non-blocking)
 */
async function sendWelcomeEmail(email, userName) {
  const notificationUrl = process.env.NOTIFICATION_EMAIL_URL;
  const secretKey = process.env.OTP_SECRET_KEY;

  if (!notificationUrl || !secretKey) {
    console.log('[auth] Notification not configured, skipping welcome email');
    return;
  }

  // Run asynchronously to not block registration response
  setImmediate(async () => {
    try {
      // Include email in signature for email-bound verification
      const sigData = generateSignature('welcome', secretKey, email);

      const response = await fetch(notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'welcome',
          email,
          userName: userName || 'bạn',
          ...sigData
        })
      });

      const result = await response.json();
      if (result.ok) {
        console.log(`[auth] Welcome email sent to ${email}`);
      } else {
        console.error(`[auth] Failed to send welcome email: ${result.error}`);
      }
    } catch (err) {
      console.error('[auth] Error sending welcome email:', err.message);
    }
  });
}

// ============ REGISTRATION WITH OTP VERIFICATION ============

/**
 * POST /auth/register/initiate
 * Step 1: Initiate registration - validate data and send OTP
 * Stores pending registration data temporarily until OTP is verified
 */
router.post('/register/initiate', async (req, res, next) => {
  try {
    await connectToDatabase();
    const { name, email, password, sessionToken } = req.body || {};

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!isTotpEncryptionConfigured()) {
      return res.status(503).json({
        error: 'Two-factor authentication is not configured.',
        code: 'TOTP_NOT_CONFIGURED',
      });
    }

    if (!sessionToken || sessionToken.length < 32) {
      return res.status(400).json({ error: 'Valid session token is required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Validate password strength
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Password must be 128 characters or less.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = getCollection('users');

    // Check if user already exists
    const existing = await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } });
    if (existing) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Store pending registration
    const pendingRegistrations = getCollection('pending_registrations');

    // Remove any existing pending registration for this email
    await pendingRegistrations.deleteMany({ email: normalizedEmail });

    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const expiresAt = new Date(Date.now() + PENDING_REGISTRATION_TTL_MINUTES * 60 * 1000);

    await pendingRegistrations.insertOne({
      email: normalizedEmail,
      name: String(name).trim(),
      passwordHash: hashedPassword,
      sessionTokenHash,
      expiresAt,
      createdAt: new Date(),
      status: 'PENDING',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    // OTP will be sent via /otp/request endpoint called by frontend
    res.json({
      ok: true,
      message: 'Registration initiated. Please verify your email with OTP.',
      email: normalizedEmail,
      ttlMinutes: PENDING_REGISTRATION_TTL_MINUTES,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/register/verify
 * Step 2: Confirm email OTP verification (does NOT create account)
 * The account is created in /auth/register/complete after profile + terms acceptance.
 */
router.post('/register/verify', async (req, res, next) => {
  try {
    await connectToDatabase();
    const { email, verificationToken } = req.body || {};

    if (!email || !verificationToken) {
      return res.status(400).json({ error: 'Email and verification token are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

    // Find pending registration
    const pendingRegistrations = getCollection('pending_registrations');
    const pending = await pendingRegistrations.findOne({
      email: normalizedEmail,
      status: { $in: ['PENDING', 'OTP_VERIFIED'] },
      expiresAt: { $gt: new Date() },
    });

    if (!pending) {
      return res.status(400).json({
        error: 'Registration session expired or not found. Please register again.',
        code: 'REGISTRATION_EXPIRED'
      });
    }

    // Verify token bound to pending registration (set by /api/otp/verify for register_verify)
    if (!pending.verificationTokenHash || !pending.verificationExpiry) {
      return res.status(400).json({
        error: 'OTP verification required. Please verify your email first.',
        code: 'OTP_NOT_VERIFIED'
      });
    }

    if (pending.verificationTokenHash !== verificationTokenHash) {
      return res.status(401).json({
        error: 'Invalid verification token. Please verify OTP again.',
        code: 'INVALID_VERIFICATION_TOKEN'
      });
    }

    if (new Date() > new Date(pending.verificationExpiry)) {
      return res.status(400).json({
        error: 'Verification token expired. Please request a new OTP.',
        code: 'VERIFICATION_TOKEN_EXPIRED'
      });
    }

    // Verify the OTP was verified (check otp_sessions)
    const otpSessions = getCollection('otp_sessions');
    const verifiedSession = await otpSessions.findOne({
      email: normalizedEmail,
      status: 'USED',
      action: 'register_verify',
      usedAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) }, // Within last 10 minutes
    });

    if (!verifiedSession) {
      return res.status(400).json({
        error: 'OTP verification required. Please verify your email first.',
        code: 'OTP_NOT_VERIFIED'
      });
    }

    // Mark pending registration as OTP_VERIFIED (idempotent)
    await pendingRegistrations.updateOne(
      { _id: pending._id },
      {
        $set: {
          status: 'OTP_VERIFIED',
          otpVerifiedAt: pending.otpVerifiedAt || new Date(),
          updatedAt: new Date(),
        }
      }
    );

    res.json({
      ok: true,
      message: 'Email đã được xác thực. Vui lòng hoàn thiện hồ sơ và chấp nhận điều khoản để tạo tài khoản.',
      stage: 'OTP_VERIFIED',
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/register/complete
 * Step 3: Finalize registration after OTP verification + profile + terms acceptance
 */
router.post('/register/complete', async (req, res, next) => {
  try {
    await connectToDatabase();
    const {
      email,
      verificationToken,
      profile = {},
      termsAccepted,
      privacyAccepted,
    } = req.body || {};

    if (!email || !verificationToken) {
      return res.status(400).json({ error: 'Email and verification token are required.' });
    }

    if (termsAccepted !== true || privacyAccepted !== true) {
      return res.status(400).json({
        error: 'You must accept Terms and Privacy Policy to continue.',
        code: 'CONSENT_REQUIRED'
      });
    }

    const primaryRole = String(profile?.primaryRole || '').trim();
    const experienceLevel = String(profile?.experienceLevel || '').trim();

    if (!primaryRole || !experienceLevel) {
      return res.status(400).json({
        error: 'Profile information is required before completing registration.',
        code: 'PROFILE_REQUIRED'
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const verificationTokenHash = crypto.createHash('sha256').update(String(verificationToken)).digest('hex');

    const pendingRegistrations = getCollection('pending_registrations');
    const pending = await pendingRegistrations.findOne({
      email: normalizedEmail,
      status: { $in: ['OTP_VERIFIED', 'PENDING'] },
      expiresAt: { $gt: new Date() },
    });

    if (!pending) {
      return res.status(400).json({
        error: 'Registration session expired or not found. Please register again.',
        code: 'REGISTRATION_EXPIRED'
      });
    }

    if (!pending.verificationTokenHash || !pending.verificationExpiry) {
      return res.status(400).json({
        error: 'OTP verification required. Please verify your email first.',
        code: 'OTP_NOT_VERIFIED'
      });
    }

    if (pending.verificationTokenHash !== verificationTokenHash) {
      return res.status(401).json({
        error: 'Invalid verification token. Please verify OTP again.',
        code: 'INVALID_VERIFICATION_TOKEN'
      });
    }

    if (new Date() > new Date(pending.verificationExpiry)) {
      return res.status(400).json({
        error: 'Verification token expired. Please request a new OTP.',
        code: 'VERIFICATION_TOKEN_EXPIRED'
      });
    }

    // Ensure OTP was verified recently as defense-in-depth
    const otpSessions = getCollection('otp_sessions');
    const verifiedSession = await otpSessions.findOne({
      email: normalizedEmail,
      status: 'USED',
      action: 'register_verify',
      usedAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) },
    });

    if (!verifiedSession) {
      return res.status(400).json({
        error: 'OTP verification required. Please verify your email first.',
        code: 'OTP_NOT_VERIFIED'
      });
    }

    // Check if user was created in the meantime
    const users = getCollection('users');
    const existingUser = await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } });
    if (existingUser) {
      await pendingRegistrations.deleteOne({ _id: pending._id });
      return res.status(409).json({ error: 'User already exists.' });
    }

    const skillsRaw = profile?.skills;
    const skills = Array.isArray(skillsRaw)
      ? skillsRaw
      : typeof skillsRaw === 'string'
        ? skillsRaw.split(',')
        : [];

    const user = {
      name: pending.name,
      email: normalizedEmail,
      password: pending.passwordHash,
      role: 'student',
      avatar: '',
      locale: 'vi',
      emailVerified: true,
      emailVerifiedAt: pending.otpVerifiedAt || new Date(),
      matchingProfile: {
        primaryRole,
        experienceLevel,
        location: String(profile?.location || '').trim(),
        skills: skills.map(s => String(s).trim()).filter(Boolean).slice(0, 30),
      },
      contestPreferences: {
        learningGoals: String(profile?.learningGoals || '').trim(),
      },
      legal: {
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
      },
      authProvider: 'legacy',
      clerkUserId: null,
      clerkEmailVerified: false,
      lastClerkSyncAt: null,
      membership: {
        tier: 'free',
        status: 'active',
        startedAt: new Date(),
        expiresAt: null,
        updatedAt: new Date(),
        source: 'system',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(user);

    await pendingRegistrations.updateOne(
      { _id: pending._id },
      { $set: { status: 'COMPLETED', completedAt: new Date() } }
    );

    const token = issueToken({ _id: result.insertedId, role: user.role, email: user.email });
    setAuthCookies(res, token);

    sendWelcomeEmail(user.email, user.name);

    res.status(201).json({
      ok: true,
      token,
      user: sanitizeUser({ ...user, _id: result.insertedId }),
      message: 'Registration successful!',
    });
  } catch (error) {
    next(error);
  }
});

// ============ LOGIN WITH OPTIONAL 2FA ============

/**
 * POST /auth/login/initiate
 * Step 1: Validate credentials and initiate 2FA if enabled
 * 
 * Rate Limiting:
 * - 5 attempts per IP per minute
 * - 10 attempts per email per hour
 * - Account locked for 15 minutes after 10 failed attempts
 */
router.post('/login/initiate', async (req, res, next) => {
  try {
    await connectToDatabase();
    const { email, password, sessionToken } = req.body || {};
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // sessionToken is required only when 2FA is enabled (used to bind the pending login session).

    const normalizedEmail = email.toLowerCase().trim();

    // ===== RATE LIMIT CHECKS =====

    // 1. Check IP rate limit (in-memory, fast)
    const ipCheck = checkIpRateLimit(ip);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        error: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${ipCheck.remainingSeconds} giây.`,
        code: 'IP_RATE_LIMIT',
        retryAfter: ipCheck.remainingSeconds
      });
    }

    // 2. Check if account is locked
    const lockoutCheck = await checkAccountLockout(normalizedEmail);
    if (lockoutCheck.locked) {
      return res.status(423).json({
        error: lockoutCheck.message,
        code: 'ACCOUNT_LOCKED',
        retryAfter: lockoutCheck.remainingMinutes * 60
      });
    }

    // 3. Check email rate limit (from DB)
    const emailCheck = await checkEmailRateLimit(normalizedEmail);
    if (!emailCheck.allowed) {
      return res.status(429).json({
        error: emailCheck.message,
        code: 'EMAIL_RATE_LIMIT'
      });
    }

    // ===== CREDENTIAL VALIDATION =====
    const users = getCollection('users');
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      // Record failed attempt
      recordIpAttempt(ip);
      await recordLoginAttempt(normalizedEmail, ip, userAgent, false);
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Record failed attempt and check for lockout
      recordIpAttempt(ip);
      const result = await recordLoginAttempt(normalizedEmail, ip, userAgent, false);

      if (result.accountLocked) {
        return res.status(423).json({
          error: `Tài khoản đã bị khóa do quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ${LOGIN_RATE_LIMIT.LOCKOUT_DURATION_MS / 60000} phút.`,
          code: 'ACCOUNT_LOCKED',
          retryAfter: LOGIN_RATE_LIMIT.LOCKOUT_DURATION_MS / 1000
        });
      }

      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    // Clear IP attempts on successful password verification
    clearIpAttempts(ip);

    // ===== BYPASS OTP FOR TEST ACCOUNTS =====
    if (OTP_BYPASS_EMAILS.includes(normalizedEmail)) {
      // Record successful login
      await recordLoginAttempt(normalizedEmail, ip, userAgent, true);

      // Update last login
      await users.updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
      );

      const token = issueToken(user);
      setAuthCookies(res, token);

      return res.json({
        ok: true,
        requiresOTP: false,
        token,
        user: sanitizeUser(user),
        message: 'Đăng nhập thành công!',
      });
    }

    const has2FA = isTwoFactorEnabled(user);
    let requires2FA = has2FA;

    // Enforce 2FA for privileged accounts when enabled in platform settings.
    if (!requires2FA && isPrivilegedRole(user?.role)) {
      const settings = await getPlatformSettings().catch(() => null);
      if (settings?.security?.twoFactorRequired === true) {
        requires2FA = true;

        if (!isTotpEncryptionConfigured()) {
          return res.status(503).json({
            error: 'Two-factor authentication is not configured.',
            code: 'TOTP_NOT_CONFIGURED',
          });
        }

        if (!has2FA) {
          return res.status(403).json({
            error: 'Two-factor authentication is required for this account. Please set up an authenticator app first.',
            code: 'TOTP_SETUP_REQUIRED',
            requires2FA: true,
            twoFactorMethod: 'totp',
          });
        }
      }
    }

    // If 2FA is not enabled, complete login with password only.
    if (!requires2FA) {
      // Record successful login (clears lockout if any)
      await recordLoginAttempt(normalizedEmail, ip, userAgent, true);

      // Update last login
      await users.updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
      );

      const token = issueToken(user);
      setAuthCookies(res, token);

      return res.json({
        ok: true,
        requiresOTP: false,
        token,
        user: sanitizeUser(user),
        message: 'Dang nh?p th…nh c“ng!',
      });
    }

    if (!sessionToken || sessionToken.length < 32) {
      return res.status(400).json({ error: 'Valid session token is required.' });
    }

    // Create pending login session for 2FA verification
    const pendingLogins = getCollection('pending_logins');

    // Remove existing pending logins for this user
    await pendingLogins.deleteMany({ email: normalizedEmail });

    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const expiresAt = new Date(Date.now() + LOGIN_2FA_TTL_MINUTES * 60 * 1000);

    await pendingLogins.insertOne({
      userId: user._id,
      email: normalizedEmail,
      sessionTokenHash,
      expiresAt,
      createdAt: new Date(),
      status: 'PENDING_OTP',
      ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      ok: true,
      requiresOTP: true,
      requires2FA: true,
      sessionToken, // Return the same sessionToken for frontend to use
      message: 'Credentials verified. Please enter the 6-digit code from your authenticator app.',
      email: normalizedEmail,
      ttlMinutes: LOGIN_2FA_TTL_MINUTES,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login/verify-2fa
 * Step 2: Complete login after OTP verification
 */
router.post('/login/verify-2fa', async (req, res, next) => {
  try {
    if (!isTotpEncryptionConfigured()) {
      return res.status(503).json({
        error: 'Two-factor authentication is not configured.',
        code: 'TOTP_NOT_CONFIGURED',
      });
    }

    await connectToDatabase();
    const { email, sessionToken, otp } = req.body || {};

    if (!email || !sessionToken || !otp) {
      return res.status(400).json({ error: 'Email, session token and authenticator code are required.' });
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Authenticator code must be 6 digits.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    // Find pending login
    const pendingLogins = getCollection('pending_logins');
    const pending = await pendingLogins.findOne({
      email: normalizedEmail,
      sessionTokenHash,
      status: 'PENDING_OTP',
      expiresAt: { $gt: new Date() },
    });

    if (!pending) {
      return res.status(400).json({
        error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        code: 'LOGIN_SESSION_EXPIRED'
      });
    }

    // Verify TOTP from authenticator app
    const users = getCollection('users');
    const user = await users.findOne({ _id: pending.userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!isTwoFactorEnabled(user)) {
      return res.status(400).json({
        error: '2FA is not enabled for this account. Please login again.',
        code: 'TWO_FACTOR_NOT_ENABLED'
      });
    }

    let secret;
    try {
      secret = decryptTotpSecret(user.security.twoFactorSecret);
    } catch {
      return res.status(500).json({ error: 'Failed to decrypt 2FA secret.' });
    }

    const ok = verifyTotpToken(secret, otp, {
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD_SECONDS,
      window: TOTP_VERIFY_WINDOW,
    });

    if (!ok) {
      // Track failed attempts
      const attempts = (pending.failedAttempts || 0) + 1;
      const maxAttempts = 5;

      if (attempts >= maxAttempts) {
        await pendingLogins.updateOne(
          { _id: pending._id },
          { $set: { status: 'FAILED', failedAt: new Date() } }
        );
        return res.status(400).json({
          error: 'Đã vượt quá số lần thử. Vui lòng đăng nhập lại.',
          code: 'MAX_ATTEMPTS_EXCEEDED'
        });
      }

      await pendingLogins.updateOne(
        { _id: pending._id },
        { $set: { failedAttempts: attempts } }
      );

      return res.status(400).json({
        error: `Mã OTP không đúng. Còn ${maxAttempts - attempts} lần thử.`,
        code: 'INVALID_OTP',
        remainingAttempts: maxAttempts - attempts
      });
    }

    // Complete login
    await pendingLogins.updateOne(
      { _id: pending._id },
      { $set: { status: 'COMPLETED', completedAt: new Date() } }
    );

    // Update last login
    await users.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
    );

    // Record successful login (clears lockout if any)
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    await recordLoginAttempt(normalizedEmail, ip, userAgent, true);

    const token = issueToken(user);
    setAuthCookies(res, token);

    res.json({
      ok: true,
      token,
      user: sanitizeUser(user),
      message: 'Đăng nhập thành công!',
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /auth/settings/2fa
 * Enable or disable 2FA for user account
 */
router.patch('/settings/2fa', authGuard, async (req, res, next) => {
  try {
    if (isClerkManagedAccount(req)) {
      return res.status(410).json({ error: 'Two-factor settings are managed by Clerk for this account.' });
    }

    await connectToDatabase();
    const userId = req.user.id;
    const { enabled, password } = req.body || {};

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    // Require password confirmation to change 2FA settings
    if (!password) {
      return res.status(400).json({ error: 'Password confirmation required.' });
    }

    const users = getCollection('users');
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    if (enabled === true) {
      return res.status(400).json({
        error: 'Use /auth/settings/2fa/setup to enable 2FA.',
        code: 'TOTP_SETUP_REQUIRED',
      });
    }

    // Update 2FA setting
    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          'security.twoFactorEnabled': enabled,
          'security.twoFactorUpdatedAt': new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          'security.twoFactorSecret': '',
          'security.twoFactorVerifiedAt': '',
          'security.twoFactorTempSecret': '',
          'security.twoFactorTempCreatedAt': '',
          'security.twoFactorTempFailedAttempts': '',
        },
      }
    );

    res.json({
      ok: true,
      message: enabled ? '2FA đã được bật thành công.' : '2FA đã được tắt.',
      twoFactorEnabled: enabled,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/settings/2fa
 * Get current 2FA status
 */
router.get('/settings/2fa', authGuard, async (req, res, next) => {
  try {
    if (isClerkManagedAccount(req)) {
      return res.status(410).json({ error: 'Two-factor settings are managed by Clerk for this account.' });
    }

    await connectToDatabase();
    const userId = req.user.id;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const users = getCollection('users');
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { 'security.twoFactorEnabled': 1, 'security.twoFactorSecret': 1, 'security.twoFactorTempSecret': 1 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      twoFactorEnabled: isTwoFactorEnabled(user),
      twoFactorPendingSetup: hasEncryptedSecret(user.security?.twoFactorTempSecret),
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/settings/2fa/setup
 * Start TOTP enrollment (generates a per-user secret and returns an otpauth:// URL)
 */
router.post('/settings/2fa/setup', authGuard, async (req, res, next) => {
  try {
    if (isClerkManagedAccount(req)) {
      return res.status(410).json({ error: 'Two-factor settings are managed by Clerk for this account.' });
    }

    if (!isTotpEncryptionConfigured()) {
      return res.status(503).json({
        error: 'Two-factor authentication is not configured.',
        code: 'TOTP_NOT_CONFIGURED',
      });
    }

    await connectToDatabase();
    const userId = req.user.id;
    const { password } = req.body || {};

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password confirmation required.' });
    }

    const users = getCollection('users');
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    if (isTwoFactorEnabled(user)) {
      return res.status(409).json({ error: '2FA is already enabled. Disable it first.' });
    }

    const secret = generateTotpSecretBase32(20);
    const encrypted = encryptTotpSecret(secret);

    const otpauthUrl = buildOtpAuthUrl({
      issuer: TOTP_ISSUER,
      accountName: user.email,
      secret,
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD_SECONDS,
    });

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          'security.twoFactorEnabled': false,
          'security.twoFactorTempSecret': encrypted,
          'security.twoFactorTempCreatedAt': new Date(),
          'security.twoFactorTempFailedAttempts': 0,
          updatedAt: new Date(),
        },
        $unset: {
          'security.twoFactorSecret': '',
          'security.twoFactorVerifiedAt': '',
        },
      }
    );

    return res.json({
      ok: true,
      issuer: TOTP_ISSUER,
      otpauthUrl,
      secret,
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD_SECONDS,
      setupTtlMinutes: TOTP_SETUP_TTL_MINUTES,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/settings/2fa/verify
 * Verify TOTP code and enable 2FA
 */
router.post('/settings/2fa/verify', authGuard, async (req, res, next) => {
  try {
    if (isClerkManagedAccount(req)) {
      return res.status(410).json({ error: 'Two-factor settings are managed by Clerk for this account.' });
    }

    if (!isTotpEncryptionConfigured()) {
      return res.status(503).json({
        error: 'Two-factor authentication is not configured.',
        code: 'TOTP_NOT_CONFIGURED',
      });
    }

    await connectToDatabase();
    const userId = req.user.id;
    const { code } = req.body || {};

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Accept pasted codes that may contain separators/zero-width characters.
    const token = String(code || '').replace(/[^0-9]/g, '');
    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({ error: 'Code must be 6 digits.' });
    }

    const users = getCollection('users');
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          email: 1,
          'security.twoFactorEnabled': 1,
          'security.twoFactorSecret': 1,
          'security.twoFactorTempSecret': 1,
          'security.twoFactorTempCreatedAt': 1,
          'security.twoFactorTempFailedAttempts': 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (isTwoFactorEnabled(user)) {
      return res.status(409).json({ error: '2FA is already enabled.' });
    }

    if (!hasEncryptedSecret(user.security?.twoFactorTempSecret)) {
      return res.status(400).json({
        error: 'No pending 2FA setup. Start setup first.',
        code: 'NO_PENDING_2FA_SETUP',
      });
    }

    const createdAt = user.security?.twoFactorTempCreatedAt ? new Date(user.security.twoFactorTempCreatedAt) : null;
    if (createdAt && (Date.now() - createdAt.getTime()) > TOTP_SETUP_TTL_MINUTES * 60 * 1000) {
      await users.updateOne(
        { _id: new ObjectId(userId) },
        {
          $unset: {
            'security.twoFactorTempSecret': '',
            'security.twoFactorTempCreatedAt': '',
            'security.twoFactorTempFailedAttempts': '',
          },
          $set: { updatedAt: new Date() },
        }
      );

      return res.status(400).json({
        error: '2FA setup expired. Please start again.',
        code: 'TOTP_SETUP_EXPIRED',
      });
    }

    let secret;
    try {
      secret = decryptTotpSecret(user.security.twoFactorTempSecret);
    } catch {
      return res.status(500).json({
        error: 'Failed to decrypt 2FA secret.',
        code: 'TOTP_SECRET_DECRYPT_FAILED',
      });
    }

    const ok = verifyTotpToken(secret, token, {
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD_SECONDS,
      window: TOTP_VERIFY_WINDOW,
    });

    if (!ok) {
      const attempts = Number(user.security?.twoFactorTempFailedAttempts || 0) + 1;
      const maxAttempts = 5;

      if (attempts >= maxAttempts) {
        await users.updateOne(
          { _id: new ObjectId(userId) },
          {
            $unset: {
              'security.twoFactorTempSecret': '',
              'security.twoFactorTempCreatedAt': '',
              'security.twoFactorTempFailedAttempts': '',
            },
            $set: { updatedAt: new Date() },
          }
        );

        return res.status(400).json({
          error: 'Too many failed attempts. Please start setup again.',
          code: 'MAX_ATTEMPTS_EXCEEDED',
        });
      }

      await users.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            'security.twoFactorTempFailedAttempts': attempts,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(400).json({
        error: `Invalid code. Remaining attempts: ${maxAttempts - attempts}`,
        code: 'INVALID_TOTP',
        remainingAttempts: maxAttempts - attempts,
      });
    }

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          'security.twoFactorEnabled': true,
          'security.twoFactorSecret': user.security.twoFactorTempSecret,
          'security.twoFactorVerifiedAt': new Date(),
          'security.twoFactorUpdatedAt': new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          'security.twoFactorTempSecret': '',
          'security.twoFactorTempCreatedAt': '',
          'security.twoFactorTempFailedAttempts': '',
        },
      }
    );

    return res.json({
      ok: true,
      message: '2FA enabled successfully.',
      twoFactorEnabled: true,
    });
  } catch (error) {
    next(error);
  }
});

// ============ ORIGINAL ROUTES (kept for backward compatibility) ============
function isLegacyAuthAllowed() {
  const enabled = String(process.env.ALLOW_LEGACY_AUTH_ROUTES || '').trim().toLowerCase() === 'true';
  return process.env.NODE_ENV !== 'production' || enabled;
}

// ============ ORIGINAL ROUTES (kept for backward compatibility) ============

router.post('/register', async (req, res, next) => {
  try {
    if (!isLegacyAuthAllowed()) {
      return res.status(410).json({
        error: 'This endpoint is disabled in production. Use /auth/register/initiate instead.',
        code: 'LEGACY_AUTH_DISABLED',
      });
    }

    await connectToDatabase();
    const { name, email, password } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = getCollection('users');

    const existing = await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } });
    if (existing) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = {
      name: String(name),
      email: normalizedEmail,
      password: hashed,
      role: 'student',
      avatar: req.body.avatar || '',
      locale: 'vi',
      authProvider: 'legacy',
      clerkUserId: null,
      clerkEmailVerified: false,
      lastClerkSyncAt: null,
      membership: {
        tier: 'free',
        status: 'active',
        startedAt: new Date(),
        expiresAt: null,
        updatedAt: new Date(),
        source: 'system',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(user);
    const token = issueToken({ _id: result.insertedId, role: user.role, email: user.email });
    setAuthCookies(res, token);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name);

    res.status(201).json({ token, user: sanitizeUser({ ...user, _id: result.insertedId }) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    if (!isLegacyAuthAllowed()) {
      return res.status(410).json({
        error: 'This endpoint is disabled in production. Use /auth/login/initiate instead.',
        code: 'LEGACY_AUTH_DISABLED',
      });
    }

    await connectToDatabase();
    const { email, password } = req.body || {};
    const clientIp = getClientIp(req);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = getCollection('users');
    const normalizedEmail = email.toLowerCase().trim();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      // Log failed login attempt - user not found
      logAuditEvent({
        action: 'LOGIN_ATTEMPT',
        userEmail: normalizedEmail,
        target: 'System',
        status: 'Failed',
        details: 'Email không tồn tại trong hệ thống',
        ip: clientIp
      });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Log failed login - wrong password
      logAuditEvent({
        action: 'LOGIN_ATTEMPT',
        userId: user._id.toString(),
        userEmail: user.email,
        userName: user.name,
        target: 'System',
        status: 'Failed',
        details: 'Sai mật khẩu',
        ip: clientIp
      });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Log successful login
    logAuditEvent({
      action: 'LOGIN_SUCCESS',
      userId: user._id.toString(),
      userEmail: user.email,
      userName: user.name,
      target: 'System',
      status: 'Success',
      details: `Đăng nhập thành công (${user.role})`,
      ip: clientIp
    });

    const token = issueToken(user);
    setAuthCookies(res, token);
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authGuard, async (req, res, next) => {
  try {
    if (req.localUser) {
      return res.json({ user: sanitizeUser(req.localUser) });
    }

    await connectToDatabase();
    const userId = req.user.id;
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const users = getCollection('users');
    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

// POST /auth/logout - Clear auth cookies (idempotent)
router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

// POST /auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    // Legacy endpoint: production should use OTP flow (/otp/request + /otp/verify + /auth/reset-password).
    if (!isLegacyAuthAllowed()) {
      return res.status(410).json({
        error: 'This endpoint is disabled in production. Use /otp/request (action=reset_password) instead.',
        code: 'LEGACY_AUTH_DISABLED',
      });
    }

    await connectToDatabase();
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = getCollection('users');
    const user = await users.findOne({ email: normalizedEmail });

    const responsePayload = {
      message: 'If the email exists, password reset instructions have been sent.',
    };

    // Do not reveal whether the email exists (prevents user enumeration).
    if (!user) {
      return res.json(responsePayload);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to database
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpiry: resetTokenExpiry,
          updatedAt: new Date(),
        },
      }
    );

    // SECURITY: avoid logging reset tokens by default.
    // For local debugging only, opt-in via EXPOSE_DEV_RESET_TOKEN=true
    const exposeDevToken =
      process.env.NODE_ENV !== 'production' &&
      String(process.env.EXPOSE_DEV_RESET_TOKEN || '').trim().toLowerCase() === 'true';

    if (exposeDevToken) {
      return res.json({ ...responsePayload, devToken: resetToken });
    }

    return res.json(responsePayload);
  } catch (error) {
    next(error);
  }
});

// POST /auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    await connectToDatabase();
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Password must be 128 characters or less.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const users = getCollection('users');

    const user = await users.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(password, 12);
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
        $unset: {
          resetPasswordToken: '',
          resetPasswordExpiry: '',
        },
      }
    );

    res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    next(error);
  }
});

function isMentorBlogCompleted(user) {
  if (!user || user.role !== 'mentor') return false;
  const banner = String(user.mentorBlog?.bannerUrl || '').trim();
  const body = String(user.mentorBlog?.body || '').trim();
  return Boolean(banner) && Boolean(body);
}

function normalizeLocale(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('vi')) return 'vi';
  return 'vi';
}

function sanitizeUser(user) {
  const membership = getMembershipSummary(user?.membership);
  return {
    id: user._id?.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    locale: normalizeLocale(user?.locale),
    status: user.status || 'active',
    balance: typeof user.balance === 'number' ? user.balance : 0,
    membership,
    mentorBlogCompleted: isMentorBlogCompleted(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export default router;
