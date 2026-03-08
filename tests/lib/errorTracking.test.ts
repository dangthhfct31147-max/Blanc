import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let capturedListeners: Record<string, Function[]> = {};

// Mock window listeners and navigator
beforeEach(() => {
    capturedListeners = {};
    vi.restoreAllMocks();

    vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: any) => {
        if (!capturedListeners[event]) capturedListeners[event] = [];
        capturedListeners[event].push(handler);
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation(() => { });
    // jsdom doesn't define sendBeacon – stub it globally
    if (!navigator.sendBeacon) {
        Object.defineProperty(navigator, 'sendBeacon', { value: vi.fn(() => true), writable: true, configurable: true });
    } else {
        vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);
    }
    delete (window as any).__ERROR_TRACKER__;
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
});

describe('errorTracking', () => {
    it('initErrorTracking sets up global listeners', async () => {
        const { initErrorTracking } = await import('../../lib/errorTracking');
        initErrorTracking();

        expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
        expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        expect(window.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('exposes __ERROR_TRACKER__ on window', async () => {
        const { initErrorTracking } = await import('../../lib/errorTracking');
        initErrorTracking();

        expect((window as any).__ERROR_TRACKER__).toBeDefined();
        expect(typeof (window as any).__ERROR_TRACKER__.captureException).toBe('function');
    });

    it('captureException buffers errors', async () => {
        const { captureException } = await import('../../lib/errorTracking');

        captureException(new Error('test error'), 'unit-test');

        // Should not immediately flush (buffer < MAX_BUFFER)
        expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });

    it('flushes when buffer reaches MAX_BUFFER', async () => {
        const { captureException } = await import('../../lib/errorTracking');

        for (let i = 0; i < 10; i++) {
            captureException(new Error(`error ${i}`), 'bulk-test');
        }

        expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
        const [url, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(url).toContain('/api/client-errors');
        expect(blob).toBeInstanceOf(Blob);
    });

    it('destroyErrorTracking flushes remaining buffer', async () => {
        const { captureException, destroyErrorTracking } = await import('../../lib/errorTracking');

        captureException(new Error('leftover'), 'cleanup-test');
        destroyErrorTracking();

        expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    });
});
