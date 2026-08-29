import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponsiveLayout } from './ResponsiveLayout';
import { authService } from '../../services/authService';
import { logout } from '../../store/slices/authSlice';

const mockNavigate = vi.fn();
const mockDispatch = vi.fn();
const mockToggleTheme = vi.fn();
let mockPathname = '/dashboard';
let mockUser: { id: string; email: string; roles: string[] } | null = {
  id: 'user-1',
  email: 'user@example.com',
  roles: ['ROLE_USER'],
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useLocation: () => ({ pathname: mockPathname }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: { auth: { user: typeof mockUser } }) => unknown) => selector({ auth: { user: mockUser } }),
}));

vi.mock('../../hooks/useAuraTheme', () => ({
  useAuraTheme: () => ({ theme: 'light', toggleTheme: mockToggleTheme }),
}));

vi.mock('../../services/authService', () => ({
  authService: {
    logout: vi.fn(),
  },
}));

vi.mock('../layout/Sidebar', () => ({
  Sidebar: ({
    isOpen,
    theme,
    toggleTheme,
    handleLogout,
  }: {
    isOpen: boolean;
    theme: string;
    toggleTheme: () => void;
    handleLogout: () => void;
  }) => (
    <aside aria-label="Desktop navigation" data-open={isOpen} data-theme={theme}>
      <button type="button" onClick={toggleTheme}>Toggle theme</button>
      <button type="button" onClick={handleLogout}>Sign out</button>
    </aside>
  ),
}));

vi.mock('../layout/Header', () => ({
  Header: ({
    isSidebarOpen,
    setIsSidebarOpen,
    user,
  }: {
    isSidebarOpen?: boolean;
    setIsSidebarOpen?: (open: boolean) => void;
    user?: { email?: string };
  }) => (
    <header aria-label="App header">
      <span>{user?.email}</span>
      <button type="button" onClick={() => setIsSidebarOpen?.(!isSidebarOpen)}>
        Toggle sidebar
      </button>
    </header>
  ),
}));

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      roles: ['ROLE_USER'],
    };
    mockNavigate.mockClear();
    mockDispatch.mockClear();
    mockToggleTheme.mockClear();
    vi.mocked(authService.logout).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    mockPathname = '/dashboard';
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
  });

  it('renders an authenticated route-named application content landmark with shell slots', () => {
    render(
      <ResponsiveLayout>
        <section>Dashboard content</section>
      </ResponsiveLayout>,
    );

    const main = screen.getByRole('main', { name: 'Dashboard application content' });
    const shell = main.closest('[data-ui="responsive-layout"]');
    const skipLink = screen.getByRole('link', { name: 'Skip to application content' });

    expect(shell?.getAttribute('data-slot')).toBe('responsive-layout');
    expect(skipLink.getAttribute('href')).toBe('#application-content');
    expect(skipLink.getAttribute('data-ui')).toBe('responsive-layout-skip-link');
    expect(skipLink.getAttribute('data-slot')).toBe('responsive-layout-skip-link');
    expect(main.id).toBe('application-content');
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(main.getAttribute('data-ui')).toBe('responsive-layout-main');
    expect(main.getAttribute('data-slot')).toBe('responsive-layout-main');
    expect(main.className).toContain('lg:ml-64');
    expect(main.textContent).toContain('Dashboard content');
    expect(main.querySelector('[data-ui="responsive-layout-page"]')?.getAttribute('data-slot')).toBe('responsive-layout-page');
    expect(main.querySelector('[data-slot="responsive-layout-page"]')?.textContent).toContain('Dashboard content');
    expect(screen.getByRole('banner', { name: 'App header' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Desktop navigation' }).getAttribute('data-open')).toBe('true');
  });

  it('names command route landmarks from the route registry', () => {
    mockPathname = '/jobs/post';

    render(
      <ResponsiveLayout>
        <section>Post job content</section>
      </ResponsiveLayout>,
    );

    expect(screen.getByRole('main', { name: 'Post Job application content' })).toBeTruthy();
  });

  it('keeps a generic application content landmark for unregistered protected paths', () => {
    mockPathname = '/unknown-protected-path';

    render(
      <ResponsiveLayout>
        <section>Fallback content</section>
      </ResponsiveLayout>,
    );

    expect(screen.getByRole('main', { name: 'Application content' })).toBeTruthy();
  });

  it('updates shell offset when the viewport changes or header toggles the sidebar', () => {
    render(
      <ResponsiveLayout>
        <section>Dashboard content</section>
      </ResponsiveLayout>,
    );

    expect(screen.getByRole('main', { name: 'Dashboard application content' }).className).toContain('lg:ml-64');

    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByRole('main', { name: 'Dashboard application content' }).className).toContain('lg:ml-16');
    expect(screen.getByRole('complementary', { name: 'Desktop navigation' }).getAttribute('data-open')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));

    expect(screen.getByRole('main', { name: 'Dashboard application content' }).className).toContain('lg:ml-64');
  });

  it('keeps logout wired to the existing auth service and route', async () => {
    render(
      <ResponsiveLayout>
        <section>Dashboard content</section>
      </ResponsiveLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await vi.waitFor(() => {
      expect(authService.logout).toHaveBeenCalledTimes(1);
    });
    expect(mockDispatch).toHaveBeenCalledWith(logout());
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('does not add shell landmarks when no authenticated user exists', () => {
    mockUser = null;

    render(
      <ResponsiveLayout>
        <section>Public child</section>
      </ResponsiveLayout>,
    );

    expect(screen.getByText('Public child')).toBeTruthy();
    expect(screen.queryByRole('main', { name: 'Application content' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Skip to application content' })).toBeNull();
    expect(screen.queryByRole('banner', { name: 'App header' })).toBeNull();
  });
});
