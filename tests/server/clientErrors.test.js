// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/lib/logger.js', () => {
    const warn = vi.fn();
    return { default: { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() } };
});

import clientErrorsRouter from '../../server/routes/clientErrors.js';
import logger from '../../server/lib/logger.js';

describe('clientErrors route', () => {
    let handler;

    beforeEach(() => {
        vi.clearAllMocks();
        handler = clientErrorsRouter.stack.find((layer) => layer.route?.methods?.post)?.route?.stack?.[0]?.handle;
    });

    function makeRes() {
        let statusCode = null;
        let ended = false;
        const res = {
            status(code) { statusCode = code; return res; },
            json(payload) { return res; },
            end() { ended = true; return res; },
            get statusCode() { return statusCode; },
            get ended() { return ended; },
        };
        return res;
    }

    it('returns 400 when errors array is missing', () => {
        const req = { body: {} };
        const res = makeRes();
        handler(req, res);
        expect(res.statusCode).toBe(400);
    });

    it('returns 400 when errors is empty', () => {
        const req = { body: { errors: [] } };
        const res = makeRes();
        handler(req, res);
        expect(res.statusCode).toBe(400);
    });

    it('logs client errors and returns 204', () => {
        const req = {
            body: {
                errors: [
                    {
                        message: 'ReferenceError: foo',
                        stack: 'at bar',
                        source: 'window.onerror',
                        url: 'http://localhost:3000',
                        timestamp: '2025-01-01T00:00:00.000Z',
                        userAgent: 'TestAgent',
                        appVersion: '1.0.0',
                    },
                ],
            },
        };
        const res = makeRes();
        handler(req, res);

        expect(res.statusCode).toBe(204);
        expect(res.ended).toBe(true);
        expect(logger.warn).toHaveBeenCalledWith(
            'Client error',
            expect.objectContaining({
                clientError: expect.objectContaining({ message: 'ReferenceError: foo' }),
            })
        );
    });

    it('truncates to MAX_ERRORS_PER_BATCH (20)', () => {
        const errors = Array.from({ length: 30 }, (_, i) => ({
            message: `Error ${i}`,
            source: 'test',
        }));
        const req = { body: { errors } };
        const res = makeRes();
        handler(req, res);

        expect(res.statusCode).toBe(204);
        expect(logger.warn).toHaveBeenCalledTimes(20);
    });
});
