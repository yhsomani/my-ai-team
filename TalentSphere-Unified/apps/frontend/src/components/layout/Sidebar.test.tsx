import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

let mockUser: { roles: string[] } | null = {
  roles: ['ROLE_USER'],
};

vi.mock('../../store/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { user: typeof mockUser } }) => unknown) => selector({ auth: { user: mockUser } }),
}));

const renderSidebar = ({
  isOpen = false,
  initialPath = '/dashboard',
  setIsOpen = vi.fn(),
  toggleTheme = vi.fn(),
  handleLogout = vi.fn(),
} = {}) => {
  const result = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        theme="light"
        toggleTheme={toggleTheme}
        handleLogout={handleLogout}
      />
    </MemoryRouter>,
  );

  return {
    ...result,
    setIsOpen,
    toggleTheme,
    handleLogout,
  };
};

describe('Sidebar', () => {
  beforeEach(() => {
    mockUser = {
      roles: ['ROLE_USER'],
    };
  });

  it('keeps collapsed desktop route and footer controls explicitly named', () => {
    const { setIsOpen, toggleTheme, handleLogout } = renderSidebar({ isOpen: false });

    const primaryNavigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    const dashboardLink = within(primaryNavigation).getByRole('link', { name: 'Dashboard' });

    expect(screen.getByRole('link', { name: 'TalentSphere home' }).getAttribute('href')).toBe('/');
    expect(dashboardLink.getAttribute('href')).toBe('/dashboard');
    expect(dashboardLink.getAttribute('aria-current')).toBe('page');

    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));

    expect(toggleTheme).toHaveBeenCalledTimes(1);
    expect(handleLogout).toHaveBeenCalledTimes(1);
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it('keeps the mobile slide-over named and closes through existing callbacks', () => {
    const { setIsOpen, toggleTheme, handleLogout } = renderSidebar({ isOpen: true, initialPath: '/jobs' });

    const mobileSidebar = screen.getByRole('complementary', { name: 'Mobile sidebar' });
    const expandedNavigation = within(mobileSidebar).getByRole('navigation', { name: 'Expanded mobile navigation' });
    const jobsLink = within(expandedNavigation).getByRole('link', { name: 'Jobs' });

    expect(within(mobileSidebar).getByRole('link', { name: 'TalentSphere home' }).getAttribute('href')).toBe('/');
    expect(jobsLink.getAttribute('href')).toBe('/jobs');
    expect(jobsLink.getAttribute('aria-current')).toBe('page');

    fireEvent.click(within(mobileSidebar).getByRole('button', { name: 'Dark mode' }));
    fireEvent.click(within(mobileSidebar).getByRole('button', { name: 'Sign out' }));
    fireEvent.click(within(mobileSidebar).getByRole('button', { name: 'Close sidebar' }));
    fireEvent.click(jobsLink);

    expect(toggleTheme).toHaveBeenCalledTimes(1);
    expect(handleLogout).toHaveBeenCalledTimes(1);
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it('hides shell icons and separators from assistive technologies', () => {
    const { container } = renderSidebar({ isOpen: true });

    expect(container.querySelector('[aria-hidden="true"].fixed.inset-0')).toBeTruthy();
    expect(container.querySelectorAll('div[aria-hidden="true"].border-t').length).toBeGreaterThanOrEqual(2);

    container.querySelectorAll('svg').forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.getAttribute('focusable')).toBe('false');
    });
  });
});
