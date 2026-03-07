import React from 'react';
import { UserProfile } from '@clerk/clerk-react';

const AccountSecurity: React.FC = () => {
  return (
    <div className="min-h-[70vh] bg-slate-50 py-10">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Manage account security</h1>
          <p className="mt-2 text-sm text-slate-500">
            Password, sign-in methods, and multi-factor settings are now managed by Clerk.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <UserProfile path="/account/security" routing="path" />
        </div>
      </div>
    </div>
  );
};

export default AccountSecurity;
