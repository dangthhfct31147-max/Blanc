import { lazy, Suspense, type FC, type ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';

const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const DashboardHome = lazy(() => import('./components/DashboardHome'));
const ContestManager = lazy(() => import('./components/ContestManager'));
const UserManager = lazy(() => import('./components/UserManager'));
const DocumentManager = lazy(() => import('./components/DocumentManager'));
const CommunityManager = lazy(() => import('./components/CommunityManager'));
const NewsManager = lazy(() => import('./components/NewsManager'));
const RecruitmentManager = lazy(() => import('./components/RecruitmentManager'));
const MentorBlogManager = lazy(() => import('./components/MentorBlogManager'));
const MentorDirectory = lazy(() => import('./components/MentorDirectory'));
const Settings = lazy(() => import('./components/Settings'));
const AuditLog = lazy(() => import('./components/AuditLog'));
const SecurityDashboard = lazy(() => import('./components/SecurityDashboard'));
const ReportReviewManager = lazy(() => import('./components/ReportReviewManager'));

/**
 * Protected Route Wrapper
 * Redirects to login if not authenticated
 */
const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RouteLoader: FC = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-5 py-3 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-sm">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600/30 border-t-teal-600" />
      Loading workspace
    </div>
  </div>
);

const LazyPage: FC<{ children: ReactNode }> = ({ children }) => (
  <Suspense fallback={<RouteLoader />}>{children}</Suspense>
);

/**
 * Main App Routes
 */
const AppRoutes: FC = () => {
  const { isAuthenticated, user } = useAuth();
  const isMentor = user?.role === 'mentor';

  return (
    <Routes>
      {/* Public Routes - Login & Forgot Password */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LazyPage><ForgotPassword /></LazyPage>}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <ReportReviewManager /> : <DashboardHome />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                <ReportReviewManager />
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <ContestManager />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <UserManager />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <DocumentManager />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <CommunityManager />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruitments"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <RecruitmentManager />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/news"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <NewsManager />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentors"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <MentorDirectory />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor-blogs"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <MentorBlogManager />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <AuditLog />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <SecurityDashboard />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <LazyPage>
                {isMentor ? <Navigate to="/reports" replace /> : <Settings />}
              </LazyPage>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback - Redirect to home or login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

/**
 * Main App Component with Auth Provider
 */
const App: FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
