import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAppAuth } from '../contexts/AppAuthContext';

const clerkPublishableKey = String(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();

const Auth: React.FC<{ type: 'login' | 'register' }> = ({ type }) => {
  const [searchParams] = useSearchParams();
  const { user, isBootstrapping } = useAppAuth();

  const redirectTarget = searchParams.get('redirect') || '/';

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={redirectTarget} replace />;
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
            fallbackRedirectUrl="/"
          />
        ) : (
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            forceRedirectUrl={redirectTarget}
            fallbackRedirectUrl="/"
          />
        )}
      </div>
    </div>
  );
};

export default Auth;
