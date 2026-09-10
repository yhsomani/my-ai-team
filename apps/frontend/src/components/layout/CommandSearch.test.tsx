import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_ROLES } from '../../navigation/routeRegistry';
import { CommandSearch } from './CommandSearch';
import type { UnifiedSearchResponse } from '../../lib/unifiedSearch';

const mockNavigate = vi.fn();
const runUnifiedSearchMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/unifiedSearch', async () => {
  const actual = await vi.importActual<typeof import('../../lib/unifiedSearch')>('../../lib/unifiedSearch');

  return {
    ...actual,
    runUnifiedSearch: runUnifiedSearchMock,
  };
});

const emptySearchResponse: UnifiedSearchResponse = {
  jobs: [],
  courses: [],
  challenges: [],
  errors: [],
};

const buildSearchResponse = (overrides: Partial<UnifiedSearchResponse> = {}): UnifiedSearchResponse => ({
  ...emptySearchResponse,
  ...overrides,
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
    runUnifiedSearchMock.mockReset();
    runUnifiedSearchMock.mockResolvedValue(emptySearchResponse);
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

  it('preserves role-filtered no-result behavior without navigating', async () => {
    renderCommandSearch({ roles: [USER_ROLES.user] });

    const input = screen.getByRole('combobox', { name: 'Search platform' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'post job' } });

    expect(screen.queryByRole('option', { name: /^Post Job/ })).toBeNull();

    await screen.findByRole('status', { name: 'Command search no results' });

    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('surfaces live jobs alongside pages and navigates with a prefilled query', async () => {
    runUnifiedSearchMock.mockResolvedValue(buildSearchResponse({
      jobs: [{
        id: 'job-77',
        title: 'React Engineer',
        companyName: 'Northwind',
        location: 'Remote',
        description: '',
        companyId: 'company-1',
        jobType: 'FULL_TIME',
        requirements: [],
        postedAt: new Date().toISOString(),
        status: 'PUBLISHED',
      }],
    }));

    renderCommandSearch({ roles: [USER_ROLES.user] });

    const input = screen.getByRole('combobox', { name: 'Search platform' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'applications' } });

    await screen.findByRole('option', { name: 'React Engineer. Northwind · Remote' });

    expect(runUnifiedSearchMock).toHaveBeenCalledWith('applications');
    expect(screen.getByText('Pages', { selector: '[aria-hidden="true"]' })).toBeTruthy();
    expect(screen.getByText('Jobs', { selector: '[aria-hidden="true"]' })).toBeTruthy();

    fireEvent.click(screen.getByRole('option', { name: 'React Engineer. Northwind · Remote' }));

    expect(mockNavigate).toHaveBeenCalledWith('/jobs?q=React%20Engineer');
  });

  it('shows a searching state before results arrive', async () => {
    let resolveSearch!: (response: UnifiedSearchResponse) => void;
    runUnifiedSearchMock.mockImplementation(
      () => new Promise<UnifiedSearchResponse>((resolve) => {
        resolveSearch = resolve;
      }),
    );

    renderCommandSearch({ roles: [USER_ROLES.user] });

    const input = screen.getByRole('combobox', { name: 'Search platform' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'node' } });

    await screen.findByRole('status', { name: 'Command search loading' });

    resolveSearch(emptySearchResponse);

    await screen.findByRole('status', { name: 'Command search no results' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
