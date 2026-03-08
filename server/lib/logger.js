// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Structured Logger — Enterprise-grade logging
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Replaces raw console.log with structured JSON logging.
// In production, outputs JSON for log aggregators (Datadog, CloudWatch, Railway logs).
// In development, outputs pretty-printed human-readable logs.
//

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? (
    process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug
);

const isProduction = process.env.NODE_ENV === 'production';
const serviceName = process.env.SERVICE_NAME || 'contesthub-api';
const serviceVersion = process.env.npm_package_version || '0.0.0';

function formatEntry(level, message, meta) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        service: serviceName,
        version: serviceVersion,
        message,
        ...meta,
    };

    // Add request context if available
    if (meta?.req) {
        entry.request = {
            method: meta.req.method,
            url: meta.req.originalUrl || meta.req.url,
            ip: meta.req.ip,
            userAgent: meta.req.get?.('user-agent'),
        };
        delete entry.req;
    }

    // Serialize errors properly
    if (meta?.error instanceof Error) {
        entry.error = {
            name: meta.error.name,
            message: meta.error.message,
            stack: meta.error.stack,
            ...(meta.error.code && { code: meta.error.code }),
            ...(meta.error.status && { status: meta.error.status }),
        };
    }

    return entry;
}

function emit(level, message, meta = {}) {
    if (LOG_LEVELS[level] < currentLevel) return;

    const entry = formatEntry(level, message, meta);

    if (isProduction) {
        // JSON output for log aggregators
        const line = JSON.stringify(entry);
        if (level === 'error' || level === 'fatal') {
            process.stderr.write(line + '\n');
        } else {
            process.stdout.write(line + '\n');
        }
    } else {
        // Pretty output for development
        const icons = { debug: '🔍', info: 'ℹ️ ', warn: '⚠️ ', error: '🔴', fatal: '💀' };
        const icon = icons[level] || '  ';
        const time = new Date().toLocaleTimeString();
        const prefix = `${icon} [${time}] [${level.toUpperCase()}]`;

        const { timestamp, service, version, ...rest } = entry;
        const extra = Object.keys(rest).length > 2 // level + message always exist
            ? ` ${JSON.stringify(rest, null, 2)}`
            : '';

        if (level === 'error' || level === 'fatal') {
            console.error(`${prefix} ${message}${extra}`);
        } else if (level === 'warn') {
            console.warn(`${prefix} ${message}${extra}`);
        } else {
            console.log(`${prefix} ${message}${extra}`);
        }
    }
}

// ── Public API ───────────────────────────────────

export const logger = {
    debug: (message, meta) => emit('debug', message, meta),
    info: (message, meta) => emit('info', message, meta),
    warn: (message, meta) => emit('warn', message, meta),
    error: (message, meta) => emit('error', message, meta),
    fatal: (message, meta) => emit('fatal', message, meta),

    /** Create a child logger with preset context fields */
    child(context) {
        return {
            debug: (msg, meta) => emit('debug', msg, { ...context, ...meta }),
            info: (msg, meta) => emit('info', msg, { ...context, ...meta }),
            warn: (msg, meta) => emit('warn', msg, { ...context, ...meta }),
            error: (msg, meta) => emit('error', msg, { ...context, ...meta }),
            fatal: (msg, meta) => emit('fatal', msg, { ...context, ...meta }),
        };
    },
};

export default logger;
