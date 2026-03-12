import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';
import { I18nProvider } from './contexts/I18nContext';
import { AppAuthProvider } from './contexts/AppAuthContext';
import {
  getApiBaseUrl,
  getClerkPublishableKey,
  setRuntimeAppEnvironment,
  setRuntimeClerkPublishableKey,
} from './lib/clerkConfig';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const clerkLocalization = {
  signIn: {
    start: {
      title: 'Sign in to Blanc',
      titleCombined: 'Sign in to Blanc',
    },
  },
};

const ClerkProviderWithRouter: React.FC<{ children: React.ReactNode; publishableKey: string }> = ({
  children,
  publishableKey,
}) => {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/login"
      signUpUrl="/register"
      afterSignOutUrl="/"
      localization={clerkLocalization}
      __internal_bypassMissingPublishableKey={!publishableKey}
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

const AppBootstrap: React.FC = () => {
  const [clerkPublishableKey, setClerkPublishableKey] = React.useState<string>(() => getClerkPublishableKey());
  const [isConfigResolved, setIsConfigResolved] = React.useState<boolean>(() => Boolean(getClerkPublishableKey()));

  React.useEffect(() => {
    if (clerkPublishableKey) {
      setIsConfigResolved(true);
      return;
    }

    let disposed = false;

    const resolveClerkConfig = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/auth/clerk-config`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json().catch(() => null)) as null | {
          publishableKey?: string;
          appEnv?: string;
        };
        setRuntimeAppEnvironment(String(data?.appEnv || ''));
        const runtimeKey = setRuntimeClerkPublishableKey(String(data?.publishableKey || ''));

        if (!disposed && runtimeKey) {
          setClerkPublishableKey(runtimeKey);
        }
      } finally {
        if (!disposed) {
          setIsConfigResolved(true);
        }
      }
    };

    void resolveClerkConfig();

    return () => {
      disposed = true;
    };
  }, [clerkPublishableKey]);

  if (!isConfigResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="inline-block h-10 w-10 rounded-full border-[3px] border-primary-600 border-r-transparent animate-spin" />
      </div>
    );
  }

  return (
    <ClerkProviderWithRouter publishableKey={clerkPublishableKey}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ClerkProviderWithRouter>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppBootstrap />
    </BrowserRouter>
  </React.StrictMode>
);
