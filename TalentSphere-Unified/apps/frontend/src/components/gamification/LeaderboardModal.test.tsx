import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaderboardModal } from './LeaderboardModal';
import {
  gamificationService,
  type LeaderboardEntry,
  type XPTransaction,
} from '../../services/gamificationService';

vi.mock('../../services/gamificationService', async () => {
  const actual = await vi.importActual<typeof import('../../services/gamificationService')>(
    '../../services/gamificationService',
  );

  return {
    ...actual,
    gamificationService: {
      ...actual.gamificationService,
      getLeaderboard: vi.fn(),
      getUserXP: vi.fn(),
      getUserBadges: vi.fn(),
      getXPTransactions: vi.fn(),
    },
  };
});

const leaderboardFixture: LeaderboardEntry[] = [
  {
    user_id: 'user-gold',
    full_name: 'Grace Hopper',
    total_xp: 500,
    rank: 1,
    level: 6,
  },
  {
    user_id: 'user-silver',
    full_name: 'Alan Turing',
    total_xp: 350,
    rank: 2,
    level: 4,
  },
  {
    user_id: 'user-bronze',
    full_name: 'Katherine Johnson',
    total_xp: 220,
    rank: 3,
    level: 3,
  },
  {
    user_id: 'current-user',
    full_name: 'Current Learner',
    total_xp: 180,
    rank: 4,
    level: 2,
  },
];

const transactionsFixture: XPTransaction[] = [
  {
    id: 'tx-1',
    user_id: 'current-user',
    amount: 50,
    reason: 'Completed challenge: Quick Sort',
    reference_type: 'challenge',
    reference_id: 'ch-quick-sort',
    created_at: new Date().toISOString(), // Today's date for daily cap calculation
  },
  {
    id: 'tx-2',
    user_id: 'current-user',
    amount: 10,
    reason: 'Completed lesson: Binary Trees',
    reference_type: 'lesson',
    reference_id: 'ls-binary-trees',
    created_at: new Date().toISOString(), // Today's date
  },
];

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('LeaderboardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render content when isOpen is false', () => {
    render(<LeaderboardModal isOpen={false} onClose={vi.fn()} />);

    expect(
      screen.queryByRole('dialog', { name: 'TalentSphere Leaderboard & XP Progress' }),
    ).toBeNull();
  });

  it('loads and renders the user summary banner, daily cap progress, and leaderboard rankings', async () => {
    vi.mocked(gamificationService.getLeaderboard).mockResolvedValue(leaderboardFixture);
    vi.mocked(gamificationService.getUserXP).mockResolvedValue(180);
    vi.mocked(gamificationService.getXPTransactions).mockResolvedValue(transactionsFixture);

    const onClose = vi.fn();
    const { container } = render(
      <LeaderboardModal isOpen={true} onClose={onClose} currentUserId="current-user" />,
    );

    expect(
      await screen.findByRole('dialog', { name: 'TalentSphere Leaderboard & XP Progress' }),
    ).toBeTruthy();

    await waitFor(() => {
      expect(gamificationService.getLeaderboard).toHaveBeenCalledWith(25);
      expect(gamificationService.getUserXP).toHaveBeenCalledWith('current-user');
      expect(gamificationService.getXPTransactions).toHaveBeenCalledWith('current-user', 20);
    });

    // Verify User Summary Banner
    expect(screen.getByText('Lvl 2')).toBeTruthy();
    expect(screen.getByText('180 Total XP')).toBeTruthy();
    expect(screen.getByText('20 XP to Level 3')).toBeTruthy();
    // Daily cap calculation (50 + 10 = 60 XP today)
    expect(screen.getByText('Daily Cap: 60 / 1000 XP')).toBeTruthy();
    expect(screen.getByText('940 XP available today')).toBeTruthy();

    // Verify Leaderboard rows
    expect(screen.getByText('Grace Hopper')).toBeTruthy();
    expect(screen.getByText('500 XP')).toBeTruthy();
    expect(screen.getByText('Alan Turing')).toBeTruthy();
    expect(screen.getByText('Katherine Johnson')).toBeTruthy();
    expect(screen.getByText('Current Learner')).toBeTruthy();
    expect(screen.getByText('YOU')).toBeTruthy();
    expect(screen.getByText('#4')).toBeTruthy();

    expectDecorativeSvgIcons(container);
  });

  it('switches to XP Ledger & History tab and displays transaction history', async () => {
    vi.mocked(gamificationService.getLeaderboard).mockResolvedValue(leaderboardFixture);
    vi.mocked(gamificationService.getUserXP).mockResolvedValue(180);
    vi.mocked(gamificationService.getXPTransactions).mockResolvedValue(transactionsFixture);

    render(
      <LeaderboardModal isOpen={true} onClose={vi.fn()} currentUserId="current-user" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Grace Hopper')).toBeTruthy();
    });

    const activityTab = screen.getByRole('button', { name: /XP Ledger & History/i });
    fireEvent.click(activityTab);

    // Verify Transaction entries
    expect(screen.getByText('Completed challenge: Quick Sort')).toBeTruthy();
    expect(screen.getByText('+50 XP')).toBeTruthy();
    expect(screen.getByText('challenge')).toBeTruthy();

    expect(screen.getByText('Completed lesson: Binary Trees')).toBeTruthy();
    expect(screen.getByText('+10 XP')).toBeTruthy();
    expect(screen.getByText('lesson')).toBeTruthy();
  });

  it('shows empty states when leaderboard and transactions have no entries', async () => {
    vi.mocked(gamificationService.getLeaderboard).mockResolvedValue([]);
    vi.mocked(gamificationService.getUserXP).mockResolvedValue(0);
    vi.mocked(gamificationService.getXPTransactions).mockResolvedValue([]);

    render(
      <LeaderboardModal isOpen={true} onClose={vi.fn()} currentUserId="current-user" />,
    );

    await waitFor(() => {
      expect(screen.getByText('No leaderboard entries yet.')).toBeTruthy();
    });

    const activityTab = screen.getByRole('button', { name: /XP Ledger & History/i });
    fireEvent.click(activityTab);

    expect(screen.getByText('No XP transactions recorded yet.')).toBeTruthy();
  });

  it('handles loading failures gracefully and allows retrying the request', async () => {
    vi.mocked(gamificationService.getLeaderboard)
      .mockRejectedValueOnce(new Error('PostgREST connection lost'))
      .mockResolvedValueOnce(leaderboardFixture);
    vi.mocked(gamificationService.getUserXP).mockResolvedValue(180);
    vi.mocked(gamificationService.getXPTransactions).mockResolvedValue(transactionsFixture);

    render(
      <LeaderboardModal isOpen={true} onClose={vi.fn()} currentUserId="current-user" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load leaderboard data. Please try again.')).toBeTruthy();
    });

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(gamificationService.getLeaderboard).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Grace Hopper')).toBeTruthy();
    });
    expect(screen.queryByText('Unable to load leaderboard data. Please try again.')).toBeNull();
  });
});
