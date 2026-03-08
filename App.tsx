import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import AuthSyncNotice from './components/AuthSyncNotice';
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/LoadingSpinner';
import ChatBubble from './components/ChatBubble';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingWizard, { isOnboardingComplete } from './components/OnboardingWizard';
import KeyboardShortcuts from './components/KeyboardShortcuts';

import Home from './pages/Home';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import AccountSecurity from './pages/AccountSecurity';

import { api } from './lib/api';
import { clientStorage } from './lib/cache';
import { useAppAuth } from './contexts/AppAuthContext';
import { authToken } from './lib/api';
import { SocketProvider } from './lib/socket';

interface AuthModalDetail {
  mode: 'login' | 'register';
}

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((error) => {
      if (import.meta.env.PROD && typeof window !== 'undefined') {
        try {
          const key = clientStorage.buildKey('ui', 'lazy_reload_attempted');
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            const url = new URL(window.location.href);
            url.searchParams.set('__reload', String(Date.now()));
            window.location.replace(url.toString());
            return new Promise<{ default: T }>(() => { /* noop */ });
          }
        } catch {
          // Ignore storage/location failures.
        }
      }
      throw error;
    })
  );
}

const ContestList = lazyWithRetry(() => import('./pages/Contests').then((m) => ({ default: m.ContestList })));
const ContestDetail = lazyWithRetry(() => import('./pages/Contests').then((m) => ({ default: m.ContestDetail })));
const Marketplace = lazyWithRetry(() => import('./pages/Marketplace').then((m) => ({ default: m.Marketplace })));
const CourseDetail = lazyWithRetry(() => import('./pages/Marketplace').then((m) => ({ default: m.CourseDetail })));
const Documents = lazyWithRetry(() => import('./pages/Documents'));
const HallOfFame = lazyWithRetry(() => import('./pages/HallOfFame'));
const Community = lazyWithRetry(() => import('./pages/Community'));
const PeerReview = lazyWithRetry(() => import('./pages/PeerReview'));
const News = lazyWithRetry(() => import('./pages/News'));
const MentorList = lazyWithRetry(() => import('./pages/Mentors').then((m) => ({ default: m.MentorList })));
const MentorDetail = lazyWithRetry(() => import('./pages/Mentors').then((m) => ({ default: m.MentorDetail })));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const UserProfile = lazyWithRetry(() => import('./pages/UserProfile'));
const MyTeamPosts = lazyWithRetry(() => import('./pages/MyTeamPosts'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const ReportTemplates = lazyWithRetry(() => import('./pages/ReportTemplates'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const SkillTreePage = lazyWithRetry(() => import('./pages/SkillTreePage'));

const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
const IDLE_ACTIVITY_KEY = clientStorage.buildKey('session', 'last_activity');
const IDLE_USER_KEY = clientStorage.buildKey('session', 'last_activity_user');
const IDLE_ACTIVITY_THROTTLE_MS = 5000;

const RequireAppAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authStatus, logout, refreshUser, syncError, user } = useAppAuth();
  const location = useLocation();

  if (authStatus === 'loading' || authStatus === 'syncing') {
    return <LoadingSpinner fullScreen />;
  }

  if (authStatus === 'sync_error') {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <AuthSyncNotice
            status="error"
            syncError={syncError}
            onRetry={() => { void refreshUser(); }}
            onSignOut={() => { void logout(); }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  return <>{children}</>;
};

/** ErrorBoundary + Suspense wrapper for lazy routes */
const SafeSuspense: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <ErrorBoundary name={name} variant="section">
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authStatus, logout, refreshUser, syncError, user } = useAppAuth();
  const isChatEnabled = import.meta.env.VITE_CHAT_ENABLED === 'true';
  const [sessionTimeoutMs, setSessionTimeoutMs] = useState(DEFAULT_SESSION_TIMEOUT_MINUTES * 60 * 1000);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastPersistedActivityRef = useRef<number>(0);
  const displayUser = authStatus === 'authenticated' ? user : null;
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding wizard once after first registration
  useEffect(() => {
    if (displayUser && !isOnboardingComplete()) {
      setShowOnboarding(true);
    }
  }, [displayUser]);

  useEffect(() => {
    let isMounted = true;

    const loadSessionTimeout = async () => {
      try {
        const status = await api.get<{ sessionTimeout?: number }>('/admin/status');
        const timeoutMinutes = Number(status?.sessionTimeout);
        if (isMounted && Number.isFinite(timeoutMinutes) && timeoutMinutes > 0) {
          setSessionTimeoutMs(timeoutMinutes * 60 * 1000);
        }
      } catch {
        // Ignore failures and keep the default timeout.
      }
    };

    void loadSessionTimeout();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  useEffect(() => {
    const handleShowAuth = (event: Event) => {
      const detail = (event as CustomEvent<AuthModalDetail | undefined>).detail;
      const mode = detail?.mode === 'register' ? 'register' : 'login';
      const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
      const redirectTarget = isAuthPage
        ? '/'
        : `${location.pathname}${location.search}${location.hash}`;

      navigate(`/${mode}?redirect=${encodeURIComponent(redirectTarget)}`);
    };

    window.addEventListener('show-auth-modal', handleShowAuth as EventListener);

    return () => {
      window.removeEventListener('show-auth-modal', handleShowAuth as EventListener);
    };
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!displayUser) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      localStorage.removeItem(IDLE_ACTIVITY_KEY);
      localStorage.removeItem(IDLE_USER_KEY);
      return;
    }

    const timeoutMs = Number(sessionTimeoutMs);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return;
    }

    const now = Date.now();
    const storedUserId = localStorage.getItem(IDLE_USER_KEY);
    const storedActivity = Number(localStorage.getItem(IDLE_ACTIVITY_KEY));

    if (storedUserId !== displayUser.id || !Number.isFinite(storedActivity) || storedActivity <= 0) {
      lastActivityRef.current = now;
      lastPersistedActivityRef.current = now;
      localStorage.setItem(IDLE_USER_KEY, displayUser.id);
      localStorage.setItem(IDLE_ACTIVITY_KEY, String(now));
    } else {
      lastActivityRef.current = storedActivity;
    }

    const scheduleLogoutCheck = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        handleLogout();
        return;
      }

      idleTimerRef.current = setTimeout(() => {
        const elapsedNow = Date.now() - lastActivityRef.current;
        if (elapsedNow >= timeoutMs) {
          handleLogout();
          return;
        }
        scheduleLogoutCheck();
      }, remaining);
    };

    const recordActivity = () => {
      const timestamp = Date.now();
      lastActivityRef.current = timestamp;

      if (timestamp - lastPersistedActivityRef.current < IDLE_ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastPersistedActivityRef.current = timestamp;
      localStorage.setItem(IDLE_ACTIVITY_KEY, String(timestamp));
      scheduleLogoutCheck();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== IDLE_ACTIVITY_KEY || !event.newValue) return;
      const next = Number(event.newValue);
      if (!Number.isFinite(next) || next <= lastActivityRef.current) return;
      lastActivityRef.current = next;
      scheduleLogoutCheck();
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        recordActivity();
      }
    };

    const eventOptions: AddEventListenerOptions = { passive: true };
    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, eventOptions);
    });
    window.addEventListener('focus', recordActivity);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);

    scheduleLogoutCheck();

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity, eventOptions);
      });
      window.removeEventListener('focus', recordActivity);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [displayUser, handleLogout, sessionTimeoutMs]);

  const socketToken = displayUser ? authToken.get() : null;

  return (
    <SocketProvider token={socketToken}>
      <ScrollToTop />

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard
            userName={displayUser?.name}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1e293b',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {isChatEnabled && <ChatBubble />}

      <KeyboardShortcuts />

      <ErrorBoundary name="App" variant="page">
        <Routes>
          <Route path="/login" element={<Auth type="login" />} />
          <Route path="/register" element={<Auth type="register" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            element={(
              <Layout
                user={displayUser}
                authStatus={authStatus}
                authSyncError={syncError}
                onLogout={handleLogout}
                onRetryAuthSync={() => { void refreshUser(); }}
              />
            )}
          >
            <Route path="/" element={<Home />} />
            <Route
              path="/contests"
              element={(
                <SafeSuspense name="Contests">
                  <ContestList />
                </SafeSuspense>
              )}
            />
            <Route
              path="/contests/:id"
              element={(
                <SafeSuspense name="ContestDetail">
                  <ContestDetail />
                </SafeSuspense>
              )}
            />
            <Route
              path="/marketplace"
              element={(
                <SafeSuspense name="Marketplace">
                  <Marketplace />
                </SafeSuspense>
              )}
            />
            <Route
              path="/courses/:id"
              element={(
                <SafeSuspense name="CourseDetail">
                  <CourseDetail />
                </SafeSuspense>
              )}
            />
            <Route
              path="/documents"
              element={(
                <SafeSuspense name="Documents">
                  <Documents />
                </SafeSuspense>
              )}
            />
            <Route
              path="/hall-of-fame"
              element={(
                <SafeSuspense name="HallOfFame">
                  <HallOfFame />
                </SafeSuspense>
              )}
            />
            <Route
              path="/community"
              element={(
                <SafeSuspense name="Community">
                  <Community />
                </SafeSuspense>
              )}
            />
            <Route
              path="/peer-review"
              element={(
                <SafeSuspense name="PeerReview">
                  <PeerReview />
                </SafeSuspense>
              )}
            />
            <Route
              path="/news"
              element={(
                <SafeSuspense name="News">
                  <News />
                </SafeSuspense>
              )}
            />
            <Route
              path="/mentors"
              element={(
                <SafeSuspense name="Mentors">
                  <MentorList />
                </SafeSuspense>
              )}
            />
            <Route
              path="/mentors/:id"
              element={(
                <SafeSuspense name="MentorDetail">
                  <MentorDetail />
                </SafeSuspense>
              )}
            />
            <Route
              path="/reports"
              element={(
                <RequireAppAuth>
                  <SafeSuspense name="Reports">
                    <Reports />
                  </SafeSuspense>
                </RequireAppAuth>
              )}
            />
            <Route
              path="/reports/new"
              element={(
                <RequireAppAuth>
                  <SafeSuspense name="ReportTemplates">
                    <ReportTemplates />
                  </SafeSuspense>
                </RequireAppAuth>
              )}
            />
            <Route
              path="/profile"
              element={(
                <RequireAppAuth>
                  <SafeSuspense name="Profile">
                    <Profile />
                  </SafeSuspense>
                </RequireAppAuth>
              )}
            />
            <Route
              path="/contact"
              element={(
                <RequireAppAuth>
                  <SafeSuspense name="Contact">
                    <Contact />
                  </SafeSuspense>
                </RequireAppAuth>
              )}
            />
            <Route
              path="/account/security/*"
              element={(
                <RequireAppAuth>
                  <AccountSecurity />
                </RequireAppAuth>
              )}
            />
            <Route
              path="/user/:id"
              element={(
                <SafeSuspense name="UserProfile">
                  <UserProfile />
                </SafeSuspense>
              )}
            />
            <Route
              path="/my-team-posts"
              element={(
                <RequireAppAuth>
                  <SafeSuspense name="MyTeamPosts">
                    <MyTeamPosts />
                  </SafeSuspense>
                </RequireAppAuth>
              )}
            />
            <Route
              path="/skill-tree"
              element={(
                <RequireAppAuth>
                  <SafeSuspense name="SkillTree">
                    <SkillTreePage />
                  </SafeSuspense>
                </RequireAppAuth>
              )}
            />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </SocketProvider>
  );
};

export default App;
