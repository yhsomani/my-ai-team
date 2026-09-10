import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { USER_ROLES } from '../../navigation/routeRegistry';
import authReducer from '../../store/slices/authSlice';
import NotFound from './NotFound';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderNotFound = (roles: string[] | null = null) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: roles
          ? {
              id: 'not-found-user',
              email: 'recovery@example.com',
              full_name: 'Recovery User',
              roles,
            }
          : null,
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/missing-route']}>
        <NotFound />
      </MemoryRouter>
    </Provider>,
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

describe('NotFound', () => {
  afterEach(() => {
    cleanup();
    mockNavigate.mockClear();
  });

  it('routes public users to auth recovery actions without app destinations', () => {
    renderNotFound();

    expect(screen.getByRole('main', { name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();

    const destinations = screen.getByRole('complementary', { name: 'Recovery destinations' });
    expect(within(destinations).getByText('Continue to TalentSphere')).toBeTruthy();
    expect(within(destinations).getByRole('button', { name: /^Sign in$/ })).toBeTruthy();
    expect(within(destinations).getByRole('button', { name: /^Create talent account$/ })).toBeTruthy();
    expect(within(destinations).getByRole('button', { name: /^Create recruiter account$/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Dashboard$/ })).toBeNull();

    fireEvent.click(within(destinations).getByRole('button', { name: /^Create recruiter account$/ }));

    expect(mockNavigate).toHaveBeenCalledWith('/register?role=recruiter');
    expectDecorativeSvgIcons(document.body);
  });

  it('keeps authenticated recovery destinations role-filtered and visually quiet', () => {
    renderNotFound([USER_ROLES.recruiter]);

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Dashboard$/ })).toBeTruthy();

    const destinations = screen.getByRole('complementary', { name: 'Recovery destinations' });
    expect(within(destinations).getByText('Available destinations')).toBeTruthy();
    expect(within(destinations).getByRole('button', { name: /^Jobs/ })).toBeTruthy();
    expect(within(destinations).getByRole('button', { name: /^Candidates/ })).toBeTruthy();
    expect(within(destinations).queryByRole('button', { name: /^Learning/ })).toBeNull();
    expect(within(destinations).queryByRole('button', { name: /^Challenges/ })).toBeNull();

    fireEvent.click(within(destinations).getByRole('button', { name: /^Candidates/ }));

    expect(mockNavigate).toHaveBeenCalledWith('/candidates');
    expectDecorativeSvgIcons(document.body);
  });
});
