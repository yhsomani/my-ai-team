import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { typedSupabase as supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { setUser, setLoading } from './store/slices/authSlice';
import { ResponsiveLayout } from './components/shared/ResponsiveLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { Skeleton } from './components/shared/Skeleton';
import { Session } from '@supabase/supabase-js';
import { ToastProvider } from './components/shared/Toast';
import { protectedAppRoutes } from './navigation/routeRegistry';

declare global {
  interface Window {
    __E2E_TESTING__?: boolean;
  }
}

const E2E_AUTH_OVERRIDE_KEY = 'talentsphere.e2e.auth';

type AppAuthUser = {
  id: string;
  email: string;
  full_name?: string;
  roles: string[];
};

type AppAuthPayload = {
  user: AppAuthUser | null;
  session: Session | null;
};

type E2EAuthOverride = {
  authenticated?: boolean;
  id?: string;
  email?: string;
  full_name?: string;
  roles?: unknown;
};

const defaultDevUser: AppAuthUser = {
  id: 'mock-user-dev-001',
  email: 'dev@talentsphere.test',
  full_name: 'Dev User',
  roles: ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_RECRUITER'],
};

const getE2EAuthOverride = (): AppAuthPayload | null => {
  if (typeof window === 'undefined' || !window.__E2E_TESTING__) return null;

  const raw = window.localStorage.getItem(E2E_AUTH_OVERRIDE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as E2EAuthOverride;
    if (parsed.authenticated === false) {
      return { user: null, session: null };
    }

    const roles = Array.isArray(parsed.roles)
      ? parsed.roles.filter((role): role is string => typeof role === 'string' && role.startsWith('ROLE_'))
      : [];

    return {
      user: {
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : 'e2e-user-001',
        email: typeof parsed.email === 'string' && parsed.email ? parsed.email : 'e2e@talentsphere.test',
        full_name: typeof parsed.full_name === 'string' && parsed.full_name ? parsed.full_name : 'E2E User',
        roles: roles.length > 0 ? roles : ['ROLE_USER'],
      },
      session: null,
    };
  } catch (error) {
    console.warn('[Auth] Ignoring invalid E2E auth override:', error);
    return null;
  }
};

const getDevAuthPayload = (): AppAuthPayload => getE2EAuthOverride() || {
  user: defaultDevUser,
  session: null,
};

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

const protectedRouteComponents = {
  dashboard: DashboardPage,
  networking: NetworkingPage,
  learning: LMSPage,
  challenges: ChallengesPage,
  jobs: JobsPage,
  ai: AIAssistant,
  messaging: MessagingPage,
  billing: BillingPage,
  settings: SettingsPage,
  profile: ProfilePage,
  'profile-detail': ProfilePage,
  resume: ResumeBuilder,
  'career-path': AICareerPath,
  admin: AdminDashboard,
  candidates: CandidatesPage,
  'job-post': PostJobPage,
};

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

    const activateDevAuth = (reason: string) => {
      const authPayload = getDevAuthPayload();
      dispatch(setUser(authPayload));
      if (authPayload.user) {
        console.info(`[Auth] Dev mock user activated ${reason}.`);
      } else {
        console.info(`[Auth] E2E unauthenticated state activated ${reason}.`);
      }
    };

    // Timeout: if auth doesn't resolve in 3 seconds, fall back
    const authTimeout = setTimeout(() => {
      console.warn('[Auth] Supabase auth timed out. Using fallback mode.');

      // In dev mode, auto-login with a mock user for testing
      const isDev = import.meta.env.DEV;
      if (isDev) {
        activateDevAuth('after Supabase auth timeout');
      } else {
        dispatch(setLoading(false));
      }
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(authTimeout);
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
        // No session found.
        const isDev = import.meta.env.DEV;
        if (isDev) {
          // Auto-activate mock user for local development
          activateDevAuth('with no Supabase session');
        } else {
          dispatch(setLoading(false));
        }
      }
    }).catch((err) => {
      clearTimeout(authTimeout);
      console.warn('[Auth] Supabase session fetch failed:', err?.message || err);

      // Dev mode fallback on error
      const isDev = import.meta.env.DEV;
      if (isDev) {
        activateDevAuth('after Supabase error');
      } else {
        dispatch(setLoading(false));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(authTimeout);
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
        // If we are in dev mode, we might want to keep the mock user
        const isDev = import.meta.env.DEV;
        if (isDev && event === 'INITIAL_SESSION') {
          // Keep mock user if it was already set or about to be set
          console.info('[Auth] onAuthStateChange: ignoring null initial session in dev mode to preserve mock user.');
        } else if (event === 'SIGNED_OUT') {
          dispatch(setUser({ user: null, session: null }));
        } else if (!isDev) {
          dispatch(setUser({ user: null, session: null }));
        }
      }
    });

    return () => {
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
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

                {protectedAppRoutes.map((route) => {
                  const PageComponent = protectedRouteComponents[route.id as keyof typeof protectedRouteComponents];

                  return (
                    <Route
                      key={route.id}
                      path={route.path}
                      element={(
                        <ProtectedRoute allowedRoles={route.allowedRoles ? [...route.allowedRoles] : undefined}>
                          <PageComponent />
                        </ProtectedRoute>
                      )}
                    />
                  );
                })}

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
