const RUNTIME_CLERK_KEY_STORAGE = 'clerk:publishable_key';

function normalizeKey(value: unknown): string {
  return String(value || '').trim();
}

export function getClerkPublishableKey(): string {
  const envKey = normalizeKey(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  if (envKey) return envKey;

  if (typeof window === 'undefined') {
    return '';
  }

  const runtimeKey = normalizeKey(window.__CLERK_PUBLISHABLE_KEY__);
  if (runtimeKey) return runtimeKey;

  try {
    return normalizeKey(sessionStorage.getItem(RUNTIME_CLERK_KEY_STORAGE));
  } catch {
    return '';
  }
}

export function setRuntimeClerkPublishableKey(nextKey: string): string {
  const normalizedKey = normalizeKey(nextKey);
  if (!normalizedKey || typeof window === 'undefined') {
    return '';
  }

  window.__CLERK_PUBLISHABLE_KEY__ = normalizedKey;

  try {
    sessionStorage.setItem(RUNTIME_CLERK_KEY_STORAGE, normalizedKey);
  } catch {
    // Ignore storage failures.
  }

  return normalizedKey;
}
