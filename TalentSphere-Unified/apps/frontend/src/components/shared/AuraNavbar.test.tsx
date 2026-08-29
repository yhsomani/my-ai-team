import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuraNavbar } from './AuraNavbar';
import { authService } from '../../services/authService';
import { logout } from '../../store/slices/authSlice';

const mockNavigate = vi.fn();
const mockDispatch = vi.fn();
let mockUser: { id: string; email: string; roles: string[] } | null = {
  id: 'user-1',
  email: 'legacy-user@example.com',
  roles: ['ROLE_USER'],
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: { auth: { user: typeof mockUser } }) => unknown) => selector({ auth: { user: mockUser } }),
}));

vi.mock('../../services/authService', () => ({
  authService: {
    logout: vi.fn(),
  },
}));

const renderNavbar = (initialPath = '/jobs') => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuraNavbar />
    </MemoryRouter>,
  );
};

describe('AuraNavbar', () => {
  beforeEach(() => {
    mockUser = {
      id: 'user-1',
      email: 'legacy-user@example.com',
      roles: ['ROLE_USER'],
    };
    mockNavigate.mockClear();
    mockDispatch.mockClear();
    vi.mocked(authService.logout).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
  });

  it('renders public auth links inside a named legacy navigation landmark', () => {
    mockUser = null;
    renderNavbar('/');

    const nav = screen.getByRole('navigation', { name: 'Legacy application navigation' });

    expect(nav.getAttribute('data-slot')).toBe('aura-navbar');
    expect(screen.getByRole('link', { name: 'TalentSphere home' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'Login' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: 'Get Started' }).getAttribute('href')).toBe('/register');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('marks active authenticated destinations and keeps nav icons decorative', () => {
    renderNavbar('/jobs');

    const jobsLink = screen.getByRole('link', { name: 'Jobs' });
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const searchButton = screen.getByRole('button', { name: 'Search' });

    expect(jobsLink.getAttribute('aria-current')).toBe('page');
    expect(dashboardLink.getAttribute('aria-current')).toBeNull();
    expect(jobsLink.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(searchButton.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(screen.getByRole('link', { name: 'Profile' }).getAttribute('href')).toBe('/profile');
    expect(screen.getByText('legacy-user')).toBeTruthy();
  });

  it('opens a named mobile navigation region with controlled expanded state', async () => {
    renderNavbar('/jobs');

    const menuButton = screen.getByRole('button', { name: 'Open menu' });

    expect(menuButton.getAttribute('aria-controls')).toBe('aura-navbar-mobile-menu');
    fireEvent.click(menuButton);

    const mobileNav = screen.getByRole('navigation', { name: 'Legacy mobile navigation' });
    const mobileJobsLink = within(mobileNav).getByRole('link', { name: 'Jobs' });

    expect(screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')).toBe('true');
    expect(mobileNav.getAttribute('data-slot')).toBe('aura-navbar-mobile-menu');
    expect(mobileJobsLink.getAttribute('aria-current')).toBe('page');
    expect(mobileJobsLink.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(mobileJobsLink);

    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'Legacy mobile navigation' })).toBeNull();
    });
  });

  it('keeps logout wired through the existing auth service and login route', async () => {
    renderNavbar('/dashboard');

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalledTimes(1);
    });
    expect(mockDispatch).toHaveBeenCalledWith(logout());
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
