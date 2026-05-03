import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { supabase } from './lib/supabaseClient';
import { setUser, setLoading } from './store/slices/authSlice';
import { ResponsiveLayout } from './components/shared/ResponsiveLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { Skeleton } from './components/shared/Skeleton';
import { Session } from '@supabase/supabase-js';
import { ToastProvider } from './components/shared/Toast';

declare global {
  interface Window {
    __E2E_TESTING__?: boolean;
  }
}

// Lazy load page components
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const NetworkingPage = lazy(() => import('./pages/networking/NetworkingPage'));
const LMSPage = lazy(() => import('./pages/lms/LMSPage'));
const ChallengesPage = lazy(() => import('./pages/challenges/ChallengesPage'));
const JobsPage = lazy(() => import('./pages/jobs/JobsPage'));
const AIAssistant = lazy(() => import('./pages/ai/AIAssistant'));
const MessagingPage = lazy(() => import('./pages/messaging/MessagingPage'));
const BillingPage = lazy(() => import('./pages/billing/BillingPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const ResumeBuilder = lazy(() => import('./pages/profile/ResumeBuilder'));
const AICareerPath = lazy(() => import('./pages/ai/AICareerPath'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CandidatesPage = lazy(() => import('./pages/candidates/CandidatesPage'));
const PostJobPage = lazy(() => import('./pages/jobs/PostJobPage'));
const NotFoundPage = lazy(() => import('./pages/error/NotFound'));

const PageLoader = () => (
  <div className="p-6 space-y-4 animate-fade-in">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-64" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
    <Skeleton className="h-64 w-full mt-4" />
  </div>
);

function App() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(setLoading(true));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        dispatch(setUser({ 
          user: {
            id: session.user.id,
            email: session.user.email!,
            roles: session.user.app_metadata?.roles || ['ROLE_USER']
          }, 
          session 
        }));
      } else {
        dispatch(setLoading(false));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        dispatch(setUser({ 
          user: {
            id: session.user.id,
            email: session.user.email!,
            roles: session.user.app_metadata?.roles || ['ROLE_USER']
          }, 
          session 
        }));
      } else {
        dispatch(setUser({ user: null, session: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <ToastProvider>
        <ResponsiveLayout>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route 
                  path="/login" 
                  element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
                />
                <Route 
                  path="/register" 
                  element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
                />

                {/* Protected Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/networking" element={<ProtectedRoute><NetworkingPage /></ProtectedRoute>} />
                <Route path="/lms" element={<ProtectedRoute><LMSPage /></ProtectedRoute>} />
                <Route path="/challenges" element={<ProtectedRoute><ChallengesPage /></ProtectedRoute>} />
                <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
                <Route path="/ai" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
                <Route path="/messaging" element={<ProtectedRoute><MessagingPage /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/resume" element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />
                <Route path="/career-path" element={<ProtectedRoute><AICareerPath /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['ROLE_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/candidates" element={<ProtectedRoute allowedRoles={['ROLE_RECRUITER']}><CandidatesPage /></ProtectedRoute>} />
                <Route path="/jobs/post" element={<ProtectedRoute allowedRoles={['ROLE_RECRUITER']}><PostJobPage /></ProtectedRoute>} />
                
                {/* 404 Not Found */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </ResponsiveLayout>
      </ToastProvider>
    </div>
  );
}

export default App;
