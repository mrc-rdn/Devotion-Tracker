import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Member Pages
import MemberDashboard from './pages/MemberDashboard';
import JoinGroup from './pages/JoinGroup';
import MyDevotion from './pages/MyDevotion';

// Leader Pages
import LeaderDashboard from './pages/LeaderDashboard';
import ManageGroup from './pages/ManageGroup';
import GroupDetail from './pages/GroupDetail';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';

// Shared Pages
import Messages from './pages/Messages';
import Bible from './pages/Bible';

// =============================================
// Shared Components
// =============================================

function LoadingScreen({ error, onRetry }) {
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onRetry} className="btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <a href="/login" className="btn-secondary inline-flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading Devotion Tracker...</p>
      </div>
    </div>
  );
}

// =============================================
// Route Guards
// =============================================

/**
 * Redirects authenticated users to their role dashboard.
 */
function RedirectIfAuthenticated({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (user && profile?.role) {
    return <Navigate to={getRoleRoute(profile.role)} replace />;
  }

  return children;
}

/** Protects routes — redirects to login if not authenticated */
function RequireAuth({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getRoleRoute(profile.role)} replace />;
  }

  return children;
}

// =============================================
// Helper
// =============================================

function getRoleRoute(role) {
  return { member: '/member', leader: '/leader', admin: '/admin' }[role] || '/login';
}

// =============================================
// Main App Router
// =============================================

export default function App() {
  const { loading, authError, retryConnection } = useAuth();

  if (loading) {
    return <LoadingScreen error={authError} onRetry={retryConnection} />;
  }

  return (
    <Routes>
      {/* Root — redirect based on auth state */}
      <Route index element={<Navigate to="/login" replace />} />

      {/* Public Auth Routes (login/signup) */}
      <Route element={<AuthLayout />}>
        <Route
          path="login"
          element={
            <RedirectIfAuthenticated>
              <Login supabaseError={authError} onRetry={retryConnection} />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="signup"
          element={
            <RedirectIfAuthenticated>
              <Signup supabaseError={authError} onRetry={retryConnection} />
            </RedirectIfAuthenticated>
          }
        />
      </Route>

      {/* Protected Member Routes */}
      <Route
        path="member"
        element={
          <RequireAuth allowedRoles={['member']}>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<MemberDashboard />} />
        <Route path="devotion" element={<MyDevotion />} />
        <Route path="group" element={<JoinGroup />} />
        <Route path="messages" element={<Messages />} />
        <Route path="bible" element={<Bible />} />
      </Route>

      {/* Protected Leader Routes */}
      <Route
        path="leader"
        element={
          <RequireAuth allowedRoles={['leader']}>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<LeaderDashboard />} />
        <Route path="devotion" element={<MyDevotion />} />
        <Route path="group" element={<ManageGroup />} />
        <Route path="messages" element={<Messages />} />
        <Route path="bible" element={<Bible />} />
        <Route path="group/:groupId" element={<GroupDetail />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route
        path="admin"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="devotion" element={<MyDevotion />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="messages" element={<Messages />} />
        <Route path="bible" element={<Bible />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
