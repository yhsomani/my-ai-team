import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  });
});
