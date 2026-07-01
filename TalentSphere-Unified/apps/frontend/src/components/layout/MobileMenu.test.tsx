import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MobileMenu } from './MobileMenu';

const navItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: <svg data-testid="dashboard-icon" />,
    description: 'Review progress',
  },
  {
    name: 'Jobs',
    path: '/jobs',
    icon: <svg data-testid="jobs-icon" />,
    description: 'Find roles',
  },
  {
    name: 'Learning',
    path: '/lms',
    icon: <svg data-testid="learning-icon" />,
    description: 'Continue courses',
  },
  {
    name: 'Messages',
    path: '/messaging',
    icon: <svg data-testid="messages-icon" />,
    description: 'Open conversations',
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: <svg data-testid="settings-icon" />,
    description: 'Manage preferences',
  },
];

const renderMobileMenu = ({
  isMobileMenuOpen = false,
  activePath = '/dashboard',
  setIsMobileMenuOpen = vi.fn(),
  toggleTheme = vi.fn(),
  handleLogout = vi.fn(),
} = {}) => {
  render(
    <MemoryRouter>
      <MobileMenu
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        navItems={navItems}
        isActive={(path) => path === activePath}
        theme="light"
        toggleTheme={toggleTheme}
        handleLogout={handleLogout}
      />
    </MemoryRouter>,
  );

  return {
    setIsMobileMenuOpen,
    toggleTheme,
    handleLogout,
  };
};

describe('MobileMenu', () => {
  it('keeps the shortcut navigation controlled and route-only', () => {
    const { setIsMobileMenuOpen } = renderMobileMenu();

    const shortcutNav = screen.getByRole('navigation', { name: 'Mobile shortcut navigation' });
    const dashboardLink = within(shortcutNav).getByRole('link', { name: 'Dashboard' });
    const menuButton = within(shortcutNav).getByRole('button', { name: 'Toggle mobile menu' });

    expect(dashboardLink.getAttribute('aria-current')).toBe('page');
    expect(within(shortcutNav).queryByRole('link', { name: 'Settings' })).toBeNull();
    expect(screen.getAllByTestId('dashboard-icon')[0].closest('[aria-hidden="true"]')).toBeTruthy();
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(menuButton.getAttribute('aria-controls')).toBe('legacy-mobile-navigation-menu');

    fireEvent.click(menuButton);

    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation menu' })).toBeNull();
  });

  it('exposes a named expanded navigation menu without changing callbacks', () => {
    const { setIsMobileMenuOpen, toggleTheme, handleLogout } = renderMobileMenu({
      isMobileMenuOpen: true,
      activePath: '/settings',
    });

    const expandedNav = screen.getByRole('navigation', { name: 'Mobile navigation menu' });
    const descriptionId = expandedNav.getAttribute('aria-describedby');
    const settingsLink = within(expandedNav).getByRole('link', { name: 'Settings. Manage preferences' });

    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId || '')?.textContent).toBe('Open a workspace or account action.');
    expect(settingsLink.getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('settings-icon').closest('[aria-hidden="true"]')).toBeTruthy();

    fireEvent.click(within(expandedNav).getByRole('button', { name: 'Dark mode' }));
    fireEvent.click(within(expandedNav).getByRole('button', { name: 'Sign out' }));
    fireEvent.click(settingsLink);
    fireEvent.click(within(expandedNav).getByRole('button', { name: 'Close menu' }));

    expect(toggleTheme).toHaveBeenCalledTimes(1);
    expect(handleLogout).toHaveBeenCalledTimes(1);
    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);
  });
});
