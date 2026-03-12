import type { FC, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import DashboardHome from './components/DashboardHome';
import ContestManager from './components/ContestManager';
import UserManager from './components/UserManager';
import DocumentManager from './components/DocumentManager';
import CommunityManager from './components/CommunityManager';
import NewsManager from './components/NewsManager';
import RecruitmentManager from './components/RecruitmentManager';
import MentorBlogManager from './components/MentorBlogManager';
import MentorDirectory from './components/MentorDirectory';
import Settings from './components/Settings';
import AuditLog from './components/AuditLog';
import SecurityDashboard from './components/SecurityDashboard';
import ReportReviewManager from './components/ReportReviewManager';

/**
 * Protected Route Wrapper
 * Redirects to login if not authenticated
 */
const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
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

/**
 * Main App Routes
 */
const AppRoutes: FC = () => {
  const { isAuthenticated, user } = useAuth();
  const isMentor = user?.role === 'mentor';

  return (
    <Routes>
      {/* Public Routes - Login & Forgot Password */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <ReportReviewManager /> : <DashboardHome />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <ReportReviewManager />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <ContestManager />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <UserManager />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <DocumentManager />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <CommunityManager />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruitments"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <RecruitmentManager />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/news"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <NewsManager />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentors"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <MentorDirectory />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor-blogs"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <MentorBlogManager />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <AuditLog />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <SecurityDashboard />}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>{isMentor ? <Navigate to="/reports" replace /> : <Settings />}</Layout>
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
