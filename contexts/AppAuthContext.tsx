import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { api, setAccessTokenProvider, authToken, invalidateCache } from '../lib/api';
import { localDrafts } from '../lib/cache';
import { User } from '../types';

interface AppAuthContextValue {
  user: User | null;
  isSignedIn: boolean;
  isBootstrapping: boolean;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

function readStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStoredUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('user');
  authToken.clear();
  invalidateCache.all();
  localDrafts.clear();
  window.dispatchEvent(new Event('auth-change'));
}

export const AppAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const syncFromStorage = useCallback(() => {
    setUser(readStoredUser());
  }, []);

  const persistUser = useCallback((nextUser: User | null) => {
    if (typeof window === 'undefined') return;
    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
      window.dispatchEvent(new Event('auth-change'));
      return;
    }
    clearStoredUser();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const response = await api.get<{ user: User }>('/auth/me');
    const nextUser = response?.user ?? null;
    persistUser(nextUser);
    return nextUser;
  }, [persistUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore legacy logout failures; Clerk sign-out is the source of truth.
    }

    persistUser(null);

    try {
      await signOut();
    } catch {
      // Local state is already cleared.
    }
  }, [persistUser, signOut]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setAccessTokenProvider(null);
      return;
    }

    setAccessTokenProvider(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });

    return () => {
      setAccessTokenProvider(null);
    };
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = () => {
      syncFromStorage();
    };

    window.addEventListener('auth-change', handleStorage);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('auth-change', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    const bootstrap = async () => {
      if (!isSignedIn) {
        persistUser(null);
        if (!cancelled) {
          setIsBootstrapping(false);
        }
        return;
      }

      if (!cancelled) {
        setIsBootstrapping(true);
      }

      try {
        await refreshUser();
      } catch (error) {
        const status = typeof (error as { status?: unknown })?.status === 'number'
          ? Number((error as { status?: number }).status)
          : 0;

        if (status === 401 || status === 403 || status === 404) {
          persistUser(null);
        } else {
          syncFromStorage();
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, persistUser, refreshUser, syncFromStorage]);

  const value = useMemo<AppAuthContextValue>(() => ({
    user,
    isSignedIn: Boolean(isSignedIn),
    isBootstrapping,
    refreshUser,
    logout,
  }), [isBootstrapping, isSignedIn, logout, refreshUser, user]);

  return (
    <AppAuthContext.Provider value={value}>
      {children}
    </AppAuthContext.Provider>
  );
};

export function useAppAuth(): AppAuthContextValue {
  const context = useContext(AppAuthContext);
  if (!context) {
    throw new Error('useAppAuth must be used within an AppAuthProvider');
  }
  return context;
}
