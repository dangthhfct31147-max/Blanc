// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Request Logger Middleware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { logger } from '../lib/logger.js';

const SLOW_REQUEST_THRESHOLD_MS = Number(process.env.SLOW_REQUEST_THRESHOLD_MS) || 2000;

// Paths to skip logging (health checks, static assets)
const SKIP_PATHS = new Set(['/api/health', '/api/health/ready', '/favicon.ico']);

export function requestLogger(req, res, next) {
    if (SKIP_PATHS.has(req.path)) return next();

    const start = process.hrtime.bigint();
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    // Log on response finish
    res.on('finish', () => {
        const durationNs = Number(process.hrtime.bigint() - start);
        const durationMs = Math.round(durationNs / 1_000_000);
        const statusCode = res.statusCode;

        const meta = {
            requestId,
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode,
            durationMs,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            contentLength: res.get('content-length'),
        };

        // Add user ID if authenticated
        if (req.auth?.userId) {
            meta.userId = req.auth.userId;
        }

        if (statusCode >= 500) {
            logger.error(`${req.method} ${req.originalUrl} ${statusCode} ${durationMs}ms`, meta);
        } else if (statusCode >= 400) {
            logger.warn(`${req.method} ${req.originalUrl} ${statusCode} ${durationMs}ms`, meta);
        } else if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
            logger.warn(`SLOW ${req.method} ${req.originalUrl} ${statusCode} ${durationMs}ms`, meta);
        } else {
            logger.info(`${req.method} ${req.originalUrl} ${statusCode} ${durationMs}ms`, meta);
        }
    });

    next();
}
