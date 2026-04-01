import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clientStorage } from '../lib/cache';
import { AppLocale, DEFAULT_LOCALE, TranslationKey, normalizeLocale, t as translate } from '../lib/i18n';

// Locale should persist across deploys; avoid versioned keys.
const LOCALE_STORAGE_KEY = 'contesthub:locale';
const LEGACY_LOCALE_STORAGE_KEY = clientStorage.buildKey('ui', 'locale');

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const fromStorage = normalizeLocale(stored);
    if (fromStorage) return fromStorage;
  } catch {
    // ignore
  }

  try {
    const legacy = localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
    const fromLegacy = normalizeLocale(legacy);
    if (fromLegacy) return fromLegacy;
  } catch {
    // ignore
  }

  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const fromUser = normalizeLocale(user?.locale);
      if (fromUser) return fromUser;
    }
  } catch {
    // ignore
  }

  const navLocale = typeof navigator !== 'undefined' ? normalizeLocale(navigator.language) : null;
  if (navLocale) return navLocale;

  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => getInitialLocale());

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  useEffect(() => {
    const syncFromUser = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const fromUser = normalizeLocale(user?.locale);
        if (fromUser && fromUser !== locale) {
          setLocaleState(fromUser);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('auth-change', syncFromUser);
    return () => window.removeEventListener('auth-change', syncFromUser);
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

