import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { api, setAccessTokenProvider, authToken, invalidateCache } from '../lib/api';
import { localDrafts } from '../lib/cache';
import { User } from '../types';

export type AppAuthStatus = 'loading' | 'signed_out' | 'syncing' | 'authenticated' | 'sync_error';

export interface AppAuthSyncError {
  title: string;
  message: string;
  detail?: string;
  status?: number;
  code?: string;
  canRetry: boolean;
}

interface AppAuthContextValue {
  user: User | null;
  isSignedIn: boolean;
  isBootstrapping: boolean;
  authStatus: AppAuthStatus;
  syncError: AppAuthSyncError | null;
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

function buildAuthSyncError(error: unknown): AppAuthSyncError {
  const status =
    typeof (error as { status?: unknown })?.status === 'number'
      ? Number((error as { status?: number }).status)
      : undefined;
  const code =
    typeof (error as { code?: unknown })?.code === 'string'
      ? String((error as { code?: string }).code)
      : undefined;
  const detail =
    error instanceof Error && String(error.message || '').trim()
      ? String(error.message || '').trim()
      : undefined;
  const normalizedDetail = detail?.toLowerCase() || '';

  if (status === 503) {
    return {
      title: 'Clerk chưa được cấu hình trên máy chủ',
      message: 'Bạn đã đăng nhập bằng Clerk nhưng backend chưa sẵn sàng để đồng bộ tài khoản. Hãy cấu hình `CLERK_SECRET_KEY` và `CLERK_PUBLISHABLE_KEY`, rồi thử lại.',
      detail,
      status,
      code,
      canRetry: true,
    };
  }

  if (status === 404) {
    return {
      title: 'Không tìm thấy hồ sơ nội bộ',
      message: 'Phiên Clerk của bạn hợp lệ nhưng hồ sơ người dùng trong hệ thống chưa được tạo hoặc không còn tồn tại. Hãy thử đồng bộ lại.',
      detail,
      status,
      code,
      canRetry: true,
    };
  }

  if (status === 401 || status === 403) {
    return {
      title: 'Phiên Clerk chưa được backend chấp nhận',
      message:
        normalizedDetail.includes('invalid token') || normalizedDetail.includes('unauthorized')
          ? 'Bạn đã đăng nhập bằng Clerk nhưng backend không chấp nhận phiên này. Kiểm tra cấu hình Clerk trên server và domain/redirect của Clerk rồi thử lại.'
          : 'Bạn đã đăng nhập bằng Clerk nhưng ứng dụng chưa thể xác minh phiên này với backend. Hãy thử đồng bộ lại hoặc đăng xuất rồi đăng nhập lại.',
      detail,
      status,
      code,
      canRetry: true,
    };
  }

  return {
    title: 'Không thể đồng bộ tài khoản',
    message: detail
      ? `Ứng dụng chưa tải được hồ sơ nội bộ từ phiên Clerk hiện tại: ${detail}`
      : 'Ứng dụng chưa tải được hồ sơ nội bộ từ phiên Clerk hiện tại. Hãy thử đồng bộ lại.',
    detail,
    status,
    code,
    canRetry: true,
  };
}

export const AppAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [syncError, setSyncError] = useState<AppAuthSyncError | null>(null);

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

  const loadUserFromApi = useCallback(async (): Promise<User> => {
    const response = await api.get<{ user: User }>('/auth/me');
    const nextUser = response?.user ?? null;
    if (!nextUser) {
      const error = new Error('`/auth/me` returned no user payload.');
      (error as Error & { status?: number }).status = 502;
      throw error;
    }
    return nextUser;
  }, []);

  const syncResolvedUser = useCallback((nextUser: User): User => {
    setSyncError(null);
    persistUser(nextUser);
    return nextUser;
  }, [persistUser]);

  const handleSyncFailure = useCallback((error: unknown) => {
    persistUser(null);
    const nextError = buildAuthSyncError(error);
    setSyncError(nextError);
    return nextError;
  }, [persistUser]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!isSignedIn) {
      setSyncError(null);
      persistUser(null);
      return null;
    }

    setIsBootstrapping(true);
    setSyncError(null);

    try {
      const nextUser = await loadUserFromApi();
      return syncResolvedUser(nextUser);
    } catch (error) {
      handleSyncFailure(error);
      throw error;
    } finally {
      setIsBootstrapping(false);
    }
  }, [handleSyncFailure, isSignedIn, loadUserFromApi, persistUser, syncResolvedUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore legacy logout failures; Clerk sign-out is the source of truth.
    }

    setSyncError(null);
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
        setSyncError(null);
        persistUser(null);
        if (!cancelled) {
          setIsBootstrapping(false);
        }
        return;
      }

      if (!cancelled) {
        setIsBootstrapping(true);
        setSyncError(null);
      }

      try {
        const nextUser = await loadUserFromApi();
        if (!cancelled) {
          syncResolvedUser(nextUser);
        }
      } catch (error) {
        if (!cancelled) {
          handleSyncFailure(error);
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
  }, [handleSyncFailure, isLoaded, isSignedIn, loadUserFromApi, persistUser, syncResolvedUser]);

  const authStatus = useMemo<AppAuthStatus>(() => {
    if (!isLoaded) return 'loading';
    if (!isSignedIn) return 'signed_out';
    if (isBootstrapping) return 'syncing';
    if (user) return 'authenticated';
    if (syncError) return 'sync_error';
    return 'syncing';
  }, [isBootstrapping, isLoaded, isSignedIn, syncError, user]);

  const value = useMemo<AppAuthContextValue>(() => ({
    user,
    isSignedIn: Boolean(isSignedIn),
    isBootstrapping,
    authStatus,
    syncError,
    refreshUser,
    logout,
  }), [authStatus, isBootstrapping, isSignedIn, logout, refreshUser, syncError, user]);

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
