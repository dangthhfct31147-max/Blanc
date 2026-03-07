import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAppAuth } from '../contexts/AppAuthContext';
import { getClerkPublishableKey, getClerkPublishableKeyIssue } from '../lib/clerkConfig';
import AuthSyncNotice from '../components/AuthSyncNotice';

const Auth: React.FC<{ type: 'login' | 'register' }> = ({ type }) => {
  const [searchParams] = useSearchParams();
  const { authStatus, isSignedIn, logout, refreshUser, syncError, user } = useAppAuth();
  const clerkPublishableKey = getClerkPublishableKey();
  const clerkConfigIssue = getClerkPublishableKeyIssue();

  const defaultRedirectTarget = type === 'register' ? '/profile' : '/';
  const redirectTarget = searchParams.get('redirect') || defaultRedirectTarget;

  const clerkErrorPayload = [
    searchParams.get('error'),
    searchParams.get('error_code'),
    searchParams.get('clerk_error'),
    searchParams.get('clerk_error_code'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const shouldTransferToRegister =
    type === 'login'
    && clerkErrorPayload.includes('external_account')
    && clerkErrorPayload.includes('not_found');

  if (authStatus === 'authenticated' && user) {
    return <Navigate to={redirectTarget} replace />;
  }

  if (shouldTransferToRegister) {
    return <Navigate to={`/register?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  if (!clerkPublishableKey) {
    const title =
      clerkConfigIssue === 'development_key_in_production'
        ? 'Clerk production key is required'
        : 'Clerk is not configured';
    const message =
      clerkConfigIssue === 'development_key_in_production'
        ? 'This deployment is using a Clerk development publishable key. Replace `VITE_CLERK_PUBLISHABLE_KEY` with your Clerk live key (`pk_live_...`) before using the sign-in flow in production.'
        : 'Set `VITE_CLERK_PUBLISHABLE_KEY` in your frontend environment before using the new sign-in flow.';

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-3 text-sm text-slate-600">
            {message}
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === 'syncing') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
          <AuthSyncNotice status="syncing" className="w-full" />
        </div>
      </div>
    );
  }

  if (isSignedIn && authStatus === 'sync_error') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
          <AuthSyncNotice
            status="error"
            syncError={syncError}
            onRetry={() => { void refreshUser(); }}
            onSignOut={() => { void logout(); }}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        {type === 'login' ? (
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/register"
            forceRedirectUrl={redirectTarget}
            fallbackRedirectUrl={defaultRedirectTarget}
          />
        ) : (
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            forceRedirectUrl={redirectTarget}
            fallbackRedirectUrl={defaultRedirectTarget}
          />
        )}
      </div>
    </div>
  );
};

export default Auth;
