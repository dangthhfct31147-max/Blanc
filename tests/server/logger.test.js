// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    it('exports a logger with log-level methods', async () => {
        const logger = (await import('../../server/lib/logger.js')).default;
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });

    it('supports child loggers with additional context', async () => {
        const logger = (await import('../../server/lib/logger.js')).default;
        const child = logger.child({ module: 'auth' });
        expect(typeof child.info).toBe('function');
        expect(typeof child.error).toBe('function');
    });

    it('respects LOG_LEVEL environment variable', async () => {
        process.env.LOG_LEVEL = 'error';
        const logger = (await import('../../server/lib/logger.js')).default;
        // debug/info/warn should be suppressed — only error and above pass through
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        logger.debug('should not appear');
        logger.info('should not appear');

        // These should not produce output as they're below the error level
        expect(consoleSpy).not.toHaveBeenCalled();
        expect(consoleErrSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
        consoleErrSpy.mockRestore();
    });
});
