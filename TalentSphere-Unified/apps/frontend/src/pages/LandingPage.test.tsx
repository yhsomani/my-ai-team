import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  typedSupabase: supabaseMock,
}));

const createCountQuery = (count: number) => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ count, error: null })),
  })),
});

const renderLandingPage = () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <LandingPage />
    </MemoryRouter>,
  );
};

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));

  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('LandingPage', () => {
  beforeEach(() => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'profiles') return createCountQuery(1280);
      if (table === 'jobs') return createCountQuery(42);
      return createCountQuery(0);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps public entry semantics while preserving live stats lookup', async () => {
    renderLandingPage();

    expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'TalentSphere' })).toBeTruthy();

    const roleEntry = screen.getByRole('group', { name: 'Public role entry points' });
    expect(within(roleEntry).getByRole('link', { name: 'Join as Talent' }).getAttribute('href')).toBe('/register?role=talent');
    expect(within(roleEntry).getByRole('link', { name: 'Hire Talent' }).getAttribute('href')).toBe('/register?role=recruiter');

    expect(screen.getByRole('region', { name: 'Career command center' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Applications. 8 active. Owned by its domain route.' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: /Focused job matching.*Jobs workspace/i })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Jobs owns search, applications, saved searches, and posts.' })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Live public stats from TalentSphere data - Updated', { exact: false })).toBeTruthy();
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('profiles');
    expect(supabaseMock.from).toHaveBeenCalledWith('jobs');
  });

  it('keeps public landing icons decorative and focusless', async () => {
    renderLandingPage();

    await waitFor(() => {
      expect(screen.getByText('Live public stats from TalentSphere data - Updated', { exact: false })).toBeTruthy();
    });

    expectDecorativeSvgIcons(document.body);
  });
});
