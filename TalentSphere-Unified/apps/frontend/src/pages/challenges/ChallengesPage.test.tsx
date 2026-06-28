import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import authReducer from '../../store/slices/authSlice';
import challengeReducer from '../../store/slices/challengeSlice';
import { challengeService } from '../../services/challengeService';
import ChallengesPage from './ChallengesPage';

vi.mock('../../services/challengeService', () => ({
  challengeService: {
    getChallenges: vi.fn(),
    getUserSubmissions: vi.fn(),
    submitChallengeSolution: vi.fn(),
  },
}));

const baseChallengeState = challengeReducer(undefined, { type: '@@INIT' });

const challengeFixture = {
  id: 'challenge-string-normalizer',
  title: 'String Normalizer',
  description: 'Normalize text input and return a canonical uppercase answer.',
  category: 'ALGORITHMS',
  difficulty: 'MEDIUM',
  xpReward: 80,
  xp_reward: 80,
  starterCode: 'function solve(input) { return input; }',
  starter_code: 'function solve(input) { return input; }',
  testCases: [],
  test_cases: [],
  timeLimit: '30 min',
  status: 'OPEN',
};

const priorSubmissionFixture = {
  id: 'challenge-submission-prior',
  challenge_id: challengeFixture.id,
  user_id: 'test-user',
  language: 'javascript',
  code: 'function solve(input) { return input; }',
  status: 'FAILED',
  score: 40,
  feedback: 'Visible sample case 1 did not match.',
  submitted_at: '2026-06-26T09:00:00.000Z',
};

const acceptedSubmissionFixture = {
  id: 'challenge-submission-accepted',
  challenge_id: challengeFixture.id,
  user_id: 'test-user',
  language: 'javascript',
  code: 'function solve(input) { return input.trim().toUpperCase(); }',
  status: 'ACCEPTED',
  score: 100,
  feedback: 'All visible samples matched.',
  submitted_at: '2026-06-28T09:00:00.000Z',
};

const renderChallengesPage = (challengeState: typeof baseChallengeState) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      challenges: challengeReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'test-user',
          email: 'test-user@example.com',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
      challenges: challengeState,
    },
  });

  render(
    <Provider store={store}>
      <ToastProvider>
        <ChallengesPage />
      </ToastProvider>
    </Provider>,
  );

  return store;
};

describe('ChallengesPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows safe catalog load failure copy without exposing raw error messages', () => {
    renderChallengesPage({
      ...baseChallengeState,
      status: 'failed',
      error: 'Internal challenge query failed with service_role_token=secret',
    });

    expect(screen.getByRole('heading', { name: 'Challenges' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Challenges could not load' })).toBeTruthy();
    expect(screen.getByText(/challenge catalog did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry challenges' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Internal challenge query failed/i)).toBeNull();
  });

  it('retries the existing challenge load workflow from the safe failure state', async () => {
    vi.mocked(challengeService.getChallenges).mockResolvedValue([
      {
        id: 'challenge-string-normalizer',
        title: 'String Normalizer',
        description: 'Normalize text input and return a canonical uppercase answer.',
        category: 'ALGORITHMS',
        difficulty: 'MEDIUM',
        xpReward: 80,
        xp_reward: 80,
        starterCode: 'function solve(input) { return input; }',
        starter_code: 'function solve(input) { return input; }',
        testCases: [],
        test_cases: [],
        timeLimit: '30 min',
        status: 'OPEN',
      },
    ]);

    renderChallengesPage({
      ...baseChallengeState,
      status: 'failed',
      error: 'Failed to fetch challenges: PostgREST internal details',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry challenges' }));

    await waitFor(() => {
      expect(challengeService.getChallenges).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'String Normalizer' })).toBeTruthy();
    });
  });

  it('shows safe submission failure copy and retries through the existing submit action', async () => {
    vi.mocked(challengeService.getUserSubmissions).mockResolvedValue([priorSubmissionFixture]);
    vi.mocked(challengeService.submitChallengeSolution)
      .mockRejectedValueOnce(new Error('Submission provider failed with service_role_token=secret'))
      .mockResolvedValueOnce(acceptedSubmissionFixture);

    renderChallengesPage({
      ...baseChallengeState,
      status: 'succeeded',
      error: null,
      ids: [challengeFixture.id],
      entities: {
        [challengeFixture.id]: challengeFixture,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Solve String Normalizer' }));

    await waitFor(() => {
      expect(screen.getByText('Attempt 1')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Solution code'), {
      target: { value: acceptedSubmissionFixture.code },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Solution' }));

    await waitFor(() => {
      expect(challengeService.submitChallengeSolution).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('heading', { name: 'Submission failed' })).toBeTruthy();
    expect(screen.getByText('Please review your solution and try again.')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'String Normalizer' })).toBeTruthy();
    expect(screen.getByText('Attempt 1')).toBeTruthy();
    expect(screen.queryByText('Attempt 2')).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Submission provider failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Solution' }));

    await waitFor(() => {
      expect(challengeService.submitChallengeSolution).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getAllByText('ACCEPTED').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Score: 100')).toBeTruthy();
    expect(screen.getByText('Attempt 2')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Submission provider failed/i)).toBeNull();
  });
});
