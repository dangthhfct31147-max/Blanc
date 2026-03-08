import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';

// Component that throws on command
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error('Test explosion');
    return <div>Working fine</div>;
}

// Suppress console.error from React for expected throws
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = vi.fn();
    // Reset __ERROR_TRACKER__
    delete (window as any).__ERROR_TRACKER__;
});
afterEach(() => {
    console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary name="Test">
                <div>Hello</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('renders page-level fallback when a child throws', () => {
        render(
            <ErrorBoundary name="TestBoundary" variant="page">
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText(/Đã xảy ra lỗi/)).toBeInTheDocument();
    });

    it('renders section-level fallback', () => {
        render(
            <ErrorBoundary name="SectionTest" variant="section">
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText(/Đã xảy ra lỗi/)).toBeInTheDocument();
        expect(screen.getByText(/Thử lại/)).toBeInTheDocument();
    });

    it('renders inline-level fallback', () => {
        render(
            <ErrorBoundary variant="inline">
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText(/Đã xảy ra lỗi/)).toBeInTheDocument();
    });

    it('calls custom fallback when provided', () => {
        render(
            <ErrorBoundary
                name="Custom"
                fallback={({ error, reset }) => (
                    <div>
                        <span>Custom: {error.message}</span>
                        <button onClick={reset}>Reset</button>
                    </div>
                )}
            >
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText('Custom: Test explosion')).toBeInTheDocument();
    });

    it('resets state when retry button is clicked (section variant)', () => {
        let shouldThrow = true;
        function ConditionalThrow() {
            if (shouldThrow) throw new Error('Boom');
            return <div>Recovered</div>;
        }

        render(
            <ErrorBoundary variant="section">
                <ConditionalThrow />
            </ErrorBoundary>
        );

        expect(screen.getByText(/Đã xảy ra lỗi/)).toBeInTheDocument();

        // Fix the component before clicking retry
        shouldThrow = false;
        fireEvent.click(screen.getByText(/Thử lại/));

        expect(screen.getByText('Recovered')).toBeInTheDocument();
    });

    it('reports error to __ERROR_TRACKER__ if present', () => {
        const captureException = vi.fn();
        (window as any).__ERROR_TRACKER__ = { captureException };

        render(
            <ErrorBoundary name="TrackerTest">
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(captureException).toHaveBeenCalledTimes(1);
        expect(captureException).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Test explosion' }),
            expect.objectContaining({ extra: expect.objectContaining({ boundary: 'TrackerTest' }) })
        );
    });
});
