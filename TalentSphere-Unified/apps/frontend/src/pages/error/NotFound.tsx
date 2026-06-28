import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Home, LogIn, Search, UserPlus } from 'lucide-react';
import { Button } from '../../components/shared/AuraButton';
import { useAppSelector } from '../../store/hooks';
import { getSearchDestinations } from '../../navigation/routeRegistry';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const roles = user?.roles || [];
  const appDestinations = getSearchDestinations(roles)
    .filter((destination) => destination.path !== '/dashboard' && !destination.path.includes(':'))
    .slice(0, 5);

  const recoveryPanel = (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-stretch">
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <Compass className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            404 recovery
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-accent">The requested route is not available.</p>
            <h1 id="not-found-title" className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              Page not found
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              This link may be outdated, mistyped, or unavailable for your current role. Use a known destination
              below to recover without losing access to the rest of TalentSphere.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full whitespace-normal sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Go back
            </Button>
            <Button
              type="button"
              onClick={() => navigate(user ? '/dashboard' : '/')}
              className="w-full whitespace-normal sm:w-auto"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              {user ? 'Dashboard' : 'Home'}
            </Button>
          </div>
        </div>

        <aside
          aria-label="Recovery destinations"
          className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-sm)]"
        >
          {user ? (
            <div className="space-y-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <Search className="h-4 w-4 text-accent" aria-hidden="true" />
                  Available destinations
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  These links follow the same role rules as the sidebar and command search.
                </p>
              </div>

              <div className="space-y-2">
                {appDestinations.map((destination) => {
                  const Icon = destination.icon;

                  return (
                    <button
                      key={destination.path}
                      type="button"
                      onClick={() => navigate(destination.path)}
                      className="flex w-full items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-3 text-left transition-colors hover:border-accent hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[var(--text-primary)]">{destination.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                          {destination.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <LogIn className="h-4 w-4 text-accent" aria-hidden="true" />
                  Continue to TalentSphere
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  Sign in or choose the account type that matches your next step.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  className="w-full justify-start whitespace-normal"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/register?role=talent')}
                  className="w-full justify-start whitespace-normal"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Create talent account
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/register?role=recruiter')}
                  className="w-full justify-start whitespace-normal"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Create recruiter account
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  if (user) {
    return (
      <section aria-labelledby="not-found-title">
        {recoveryPanel}
      </section>
    );
  }

  return (
    <main aria-labelledby="not-found-title" className="min-h-screen bg-[var(--bg-primary)]">
      {recoveryPanel}
    </main>
  );
};

export default NotFound;
