import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAppAuth } from '../contexts/AppAuthContext';
import { getClerkPublishableKey } from '../lib/clerkConfig';

const Auth: React.FC<{ type: 'login' | 'register' }> = ({ type }) => {
  const [searchParams] = useSearchParams();
  const { user } = useAppAuth();
  const clerkPublishableKey = getClerkPublishableKey();

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

  if (user) {
    return <Navigate to={redirectTarget} replace />;
  }

  if (shouldTransferToRegister) {
    return <Navigate to={`/register?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  if (!clerkPublishableKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Clerk is not configured</h1>
          <p className="mt-3 text-sm text-slate-600">
            Set `VITE_CLERK_PUBLISHABLE_KEY` in your frontend environment before using the new sign-in flow.
          </p>
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
