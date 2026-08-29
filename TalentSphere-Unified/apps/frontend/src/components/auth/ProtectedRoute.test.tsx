import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

const authFixture = vi.hoisted(() => ({
  state: {
    auth: {
      user: null as null | { id: string; email: string; roles: string[] },
      loading: false,
    },
  },
}));

vi.mock('../../store/hooks', () => ({
  useAppSelector: (selector: (state: typeof authFixture.state) => unknown) => selector(authFixture.state),
}));

const LoginProbe = () => {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? 'none';

  return <div>Login from {from}</div>;
};

const renderProtectedRoute = (allowedRoles?: string[], initialEntry = '/jobs') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/login" element={<LoginProbe />} />
      <Route path="/dashboard" element={<div>Dashboard recovery</div>} />
      <Route
        path="/jobs"
        element={(
          <ProtectedRoute allowedRoles={allowedRoles}>
            <div>Protected jobs workspace</div>
          </ProtectedRoute>
        )}
      />
    </Routes>
  </MemoryRouter>,
);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authFixture.state.auth.loading = false;
    authFixture.state.auth.user = null;
  });

  it('renders an accessible loading status without exposing decorative spinner semantics', () => {
    authFixture.state.auth.loading = true;

    renderProtectedRoute(['ROLE_USER']);

    const status = screen.getByRole('status');
    const spinner = status.querySelector('[data-ui="protected-route-loading-spinner"]');

    expect(status.getAttribute('data-ui')).toBe('protected-route-loading');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain('Initializing TalentSphere...');
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
    expect(spinner?.getAttribute('focusable')).toBe('false');
  });

  it('redirects unauthenticated users to login with the originating location', () => {
    renderProtectedRoute(['ROLE_USER']);

    expect(screen.getByText('Login from /jobs')).not.toBeNull();
    expect(screen.queryByText('Protected jobs workspace')).toBeNull();
  });

  it('redirects authenticated users without an allowed role to the dashboard', () => {
    authFixture.state.auth.user = {
      id: 'user-1',
      email: 'talent@example.com',
      roles: ['ROLE_USER'],
    };

    renderProtectedRoute(['ROLE_ADMIN']);

    expect(screen.getByText('Dashboard recovery')).not.toBeNull();
    expect(screen.queryByText('Protected jobs workspace')).toBeNull();
  });

  it('renders protected content when the authenticated user has an allowed role', () => {
    authFixture.state.auth.user = {
      id: 'user-1',
      email: 'talent@example.com',
      roles: ['ROLE_USER'],
    };

    renderProtectedRoute(['ROLE_USER']);

    expect(screen.getByText('Protected jobs workspace')).not.toBeNull();
  });
});
