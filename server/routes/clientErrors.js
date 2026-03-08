import { Router } from 'express';
import logger from '../lib/logger.js';

const router = Router();

const MAX_ERRORS_PER_BATCH = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 5000;

router.post('/', (req, res) => {
    const { errors } = req.body || {};

    if (!Array.isArray(errors) || errors.length === 0) {
        return res.status(400).json({ error: 'Missing errors array' });
    }

    const batch = errors.slice(0, MAX_ERRORS_PER_BATCH);

    for (const entry of batch) {
        logger.warn('Client error', {
            clientError: {
                message: String(entry.message || '').slice(0, MAX_MESSAGE_LENGTH),
                stack: String(entry.stack || '').slice(0, MAX_STACK_LENGTH),
                source: String(entry.source || 'unknown').slice(0, 100),
                url: String(entry.url || '').slice(0, 500),
                timestamp: entry.timestamp,
                userAgent: String(entry.userAgent || '').slice(0, 300),
                appVersion: String(entry.appVersion || '').slice(0, 50),
            },
        });
    }

    return res.status(204).end();
});

export default router;
