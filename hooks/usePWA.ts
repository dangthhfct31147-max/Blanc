import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Register the service worker and expose a PWA install prompt.
 */
export function usePWA() {
    const [canInstall, setCanInstall] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Register service worker
        if ('serviceWorker' in navigator && import.meta.env.PROD) {
            navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ });
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setCanInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = useCallback(async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setCanInstall(false);
            setDeferredPrompt(null);
        }
    }, [deferredPrompt]);

    return { canInstall, install };
}
