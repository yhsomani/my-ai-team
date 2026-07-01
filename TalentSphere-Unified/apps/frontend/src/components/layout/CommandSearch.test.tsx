import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_ROLES } from '../../navigation/routeRegistry';
import { CommandSearch } from './CommandSearch';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderCommandSearch = ({
  roles = [USER_ROLES.user],
  onNavigate = vi.fn(),
}: {
  roles?: readonly string[];
  onNavigate?: () => void;
} = {}) => {
  const result = render(
    <MemoryRouter>
      <CommandSearch roles={roles} onNavigate={onNavigate} />
    </MemoryRouter>,
  );

  return {
    ...result,
    onNavigate,
  };
};

describe('CommandSearch', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('keeps the shell search surface named, described, and visually quiet', () => {
    const { container } = renderCommandSearch();

    const commandSearch = screen.getByRole('search', { name: 'Command search' });
    const input = within(commandSearch).getByRole('combobox', { name: 'Search platform' });

    expect(input.getAttribute('aria-describedby')).toBe('app-shell-search-hint app-shell-search-status');
    expect(input.getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K');

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox', { name: 'Search destinations' }).getAttribute('aria-describedby')).toBe(
      'app-shell-search-status',
    );
    expect(screen.getByText(/destinations available$/)).toBeTruthy();

    const resultIconContainers = container.querySelectorAll('span[aria-hidden="true"] svg');
    expect(resultIconContainers.length).toBeGreaterThan(0);
    container.querySelectorAll('svg').forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.getAttribute('focusable')).toBe('false');
    });
  });

  it('preserves label-ranked route navigation and shell close callbacks', () => {
    const { onNavigate } = renderCommandSearch();

    const input = screen.getByRole('combobox', { name: 'Search platform' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'resume' } });

    const resumeOption = screen.getByRole('option', {
      name: 'Resume. Build, import, export, and manage resume artifacts',
    });

    expect(resumeOption.getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe('app-shell-search-result-resume');

    fireEvent.click(resumeOption);

    expect(mockNavigate).toHaveBeenCalledWith('/resume');
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('listbox', { name: 'Search destinations' })).toBeNull();
  });

  it('preserves role-filtered no-result behavior without navigating', () => {
    renderCommandSearch({ roles: [USER_ROLES.user] });

    const input = screen.getByRole('combobox', { name: 'Search platform' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'post job' } });

    expect(screen.queryByRole('option', { name: /^Post Job/ })).toBeNull();
    expect(screen.getByRole('status', { name: 'Command search no results' }).textContent).toContain(
      'No matching destinations',
    );

    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
