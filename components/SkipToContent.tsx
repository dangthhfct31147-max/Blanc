import React from 'react';

/**
 * Skip-to-content link for keyboard & screen reader users.
 * Visible only on focus (Tab key).
 */
const HOME_SKIP_TARGET_ID = 'home-live-stats';
const DEFAULT_SKIP_TARGET_ID = 'main-content';

const getSkipTarget = () =>
    document.getElementById(HOME_SKIP_TARGET_ID) ??
    document.getElementById(DEFAULT_SKIP_TARGET_ID);

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SkipToContent: React.FC = () => {
    const handleSkip = (event: React.MouseEvent<HTMLAnchorElement>) => {
        const target = getSkipTarget();
        if (!target) return;

        event.preventDefault();
        target.focus({ preventScroll: true });
        target.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start',
        });
    };

    return (
        <a
            href={`#${DEFAULT_SKIP_TARGET_ID}`}
            onClick={handleSkip}
            className="fixed left-4 top-4 z-[200] -translate-y-[calc(100%+1rem)] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform duration-200 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:bg-indigo-500"
        >
            Skip to content
        </a>
    );
};

export default SkipToContent;
