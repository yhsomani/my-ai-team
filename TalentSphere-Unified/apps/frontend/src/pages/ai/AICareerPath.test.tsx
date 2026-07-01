import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { aiService } from '../../services/aiService';
import authReducer from '../../store/slices/authSlice';
import AICareerPath from './AICareerPath';

vi.mock('../../services/aiService', () => ({
  aiService: {
    generateCareerPath: vi.fn(),
  },
}));

const generatedCareerPath = {
  recommendedPath: 'Frontend Platform Lead',
  estimatedTimeline: '6-9 months',
  requiredSkills: ['React systems', 'Accessibility reviews'],
  milestones: [
    { label: 'Audit current UI workflows', done: true },
    { label: 'Choose one advanced learning path', done: false },
  ],
};

const expectSvgIconsDecorative = (container: ParentNode) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);

  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

const renderCareerPathPage = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'career-user',
          email: 'career-user@example.com',
          full_name: 'Career User',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/career-path']}>
          <AICareerPath />
        </MemoryRouter>
      </ToastProvider>
    </Provider>,
  );
};

describe('AICareerPath', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(aiService.generateCareerPath).mockResolvedValue(generatedCareerPath);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('exposes generated career guidance with named sections and lists', async () => {
    renderCareerPathPage();

    expect(await screen.findByRole('region', { name: 'Career path workspace' })).toBeTruthy();
    const pathRegion = await screen.findByRole('region', { name: 'Generated career path: Frontend Platform Lead' });
    expect(within(pathRegion).getByRole('heading', { name: 'Frontend Platform Lead' })).toBeTruthy();

    const skillsList = within(pathRegion).getByRole('list', { name: 'Required skills for Frontend Platform Lead' });
    expect(within(skillsList).getByRole('listitem', { name: 'Required skill: React systems' })).toBeTruthy();
    expect(within(skillsList).getByRole('listitem', { name: 'Required skill: Accessibility reviews' })).toBeTruthy();

    const milestonesList = within(pathRegion).getByRole('list', { name: 'Milestones for Frontend Platform Lead' });
    expect(within(milestonesList).getByRole('listitem', {
      name: 'Completed milestone: Audit current UI workflows',
    })).toBeTruthy();
    expect(within(milestonesList).getByRole('listitem', {
      name: 'Pending milestone: Choose one advanced learning path',
    })).toBeTruthy();

    const reviewRegion = screen.getByRole('region', { name: 'Career path review boundaries' });
    const boundaryList = within(reviewRegion).getByRole('list', { name: 'Career path review boundaries' });
    expect(within(boundaryList).getByRole('listitem', {
      name: 'Review boundary: Use Learning to choose courses.',
    })).toBeTruthy();
    expect(within(boundaryList).getByRole('listitem', {
      name: 'Review boundary: Use Profile or Resume to edit durable records.',
    })).toBeTruthy();
    expect(within(boundaryList).getByRole('listitem', {
      name: 'Review boundary: Ask AI Assistant for a more detailed plan before applying changes.',
    })).toBeTruthy();
    expectSvgIconsDecorative(document.body);
  });

  it('shows safe provider-unavailable copy without exposing raw AI provider errors', async () => {
    vi.mocked(aiService.generateCareerPath).mockRejectedValue(
      new Error('OpenAI career path provider failed with service_role_token=secret'),
    );

    renderCareerPathPage();

    await waitFor(() => {
      expect(screen.getByText('Career path is not ready')).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Career Paths' })).toBeTruthy();
    expect(screen.getByText(/career-path provider did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry career path' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ask AI Assistant' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/OpenAI career path provider failed/i)).toBeNull();
    expectSvgIconsDecorative(document.body);
  });

  it('retries the existing career-path generation workflow from the safe failure state', async () => {
    vi.mocked(aiService.generateCareerPath)
      .mockRejectedValueOnce(new Error('OpenAI career path provider failed with service_role_token=secret'))
      .mockResolvedValue(generatedCareerPath);

    renderCareerPathPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry career path' })).toBeTruthy();
    });

    const requestCountBeforeRetry = vi.mocked(aiService.generateCareerPath).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry career path' }));

    await waitFor(() => {
      expect(aiService.generateCareerPath).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Frontend Platform Lead' })).toBeTruthy();
    });

    expect(screen.getByText('Generated Guidance')).toBeTruthy();
    expect(screen.queryByText('Career path is not ready')).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expectSvgIconsDecorative(document.body);
  });
});
