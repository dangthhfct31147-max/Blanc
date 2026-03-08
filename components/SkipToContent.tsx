import React from 'react';

/**
 * Skip-to-content link for keyboard & screen reader users.
 * Visible only on focus (Tab key).
 */
const SkipToContent: React.FC = () => (
    <a
        href="#main-content"
        className="fixed left-2 top-2 z-200 -translate-y-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:bg-indigo-500"
    >
        Skip to content
    </a>
);

export default SkipToContent;
