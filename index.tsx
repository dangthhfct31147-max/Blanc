import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';
import { I18nProvider } from './contexts/I18nContext';
import { AppAuthProvider } from './contexts/AppAuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const clerkPublishableKey = String(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();

const ClerkProviderWithRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInUrl="/login"
      signUpUrl="/register"
      afterSignOutUrl="/"
      __internal_bypassMissingPublishableKey={!clerkPublishableKey}
      {...({
        routerPush: (to: string) => navigate(to),
        routerReplace: (to: string) => navigate(to, { replace: true }),
      } as Record<string, unknown>)}
    >
      <AppAuthProvider>
        {children}
      </AppAuthProvider>
    </ClerkProvider>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProviderWithRouter>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ClerkProviderWithRouter>
    </BrowserRouter>
  </React.StrictMode>
);
