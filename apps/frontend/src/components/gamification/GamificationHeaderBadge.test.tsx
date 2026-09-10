import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GamificationHeaderBadge } from './GamificationHeaderBadge';
import {
  gamificationService,
  GAMIFICATION_UPDATED_EVENT,
} from '../../services/gamificationService';

vi.mock('../../services/gamificationService', async () => {
  const actual = await vi.importActual<typeof import('../../services/gamificationService')>(
    '../../services/gamificationService',
  );

  return {
    ...actual,
    gamificationService: {
      ...actual.gamificationService,
      getUserXP: vi.fn(),
      getLeaderboard: vi.fn().mockResolvedValue([]),
      getUserBadges: vi.fn().mockResolvedValue([]),
      getXPTransactions: vi.fn().mockResolvedValue([]),
    },
  };
});

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('GamificationHeaderBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders zero XP and base level 1 when userId is not provided', () => {
    const { container } = render(<GamificationHeaderBadge />);

    expect(gamificationService.getUserXP).not.toHaveBeenCalled();
    const button = screen.getByRole('button', {
      name: /Gamification: Level 1, 0 XP. Click to view Leaderboard./i,
    });
    expect(button).toBeTruthy();
    expect(screen.getByText('Lvl 1')).toBeTruthy();
    expect(screen.getByText('0 XP')).toBeTruthy();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
    expectDecorativeSvgIcons(container);
  });

  it('loads and displays user XP and level when userId is provided', async () => {
    vi.mocked(gamificationService.getUserXP).mockResolvedValue(240); // Level 3, 40% progress

    const { container } = render(<GamificationHeaderBadge userId="user-123" />);

    await waitFor(() => {
      expect(gamificationService.getUserXP).toHaveBeenCalledWith('user-123');
    });

    const button = await screen.findByRole('button', {
      name: /Gamification: Level 3, 240 XP. Click to view Leaderboard./i,
    });
    expect(button).toBeTruthy();
    expect(screen.getByText('Lvl 3')).toBeTruthy();
    expect(screen.getByText('240 XP')).toBeTruthy();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('40');
    expectDecorativeSvgIcons(container);
  });

  it('updates XP dynamically when custom GAMIFICATION_UPDATED_EVENT is dispatched with newXP', async () => {
    vi.mocked(gamificationService.getUserXP).mockResolvedValue(80); // Level 1, 80%

    render(<GamificationHeaderBadge userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('Lvl 1')).toBeTruthy();
      expect(screen.getByText('80 XP')).toBeTruthy();
    });

    // Dispatch update event for user-123 with newXP: 150
    act(() => {
      window.dispatchEvent(
        new CustomEvent(GAMIFICATION_UPDATED_EVENT, {
          detail: { userId: 'user-123', newXP: 150 },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Lvl 2')).toBeTruthy();
      expect(screen.getByText('150 XP')).toBeTruthy();
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
  });

  it('re-fetches XP when custom GAMIFICATION_UPDATED_EVENT is dispatched without newXP', async () => {
    vi.mocked(gamificationService.getUserXP)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(310);

    render(<GamificationHeaderBadge userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('50 XP')).toBeTruthy();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(GAMIFICATION_UPDATED_EVENT, {
          detail: { userId: 'user-123' },
        }),
      );
    });

    await waitFor(() => {
      expect(gamificationService.getUserXP).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Lvl 4')).toBeTruthy();
      expect(screen.getByText('310 XP')).toBeTruthy();
    });
  });

  it('ignores GAMIFICATION_UPDATED_EVENT dispatched for a different userId', async () => {
    vi.mocked(gamificationService.getUserXP).mockResolvedValue(100);

    render(<GamificationHeaderBadge userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('100 XP')).toBeTruthy();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(GAMIFICATION_UPDATED_EVENT, {
          detail: { userId: 'different-user', newXP: 999 },
        }),
      );
    });

    expect(screen.getByText('100 XP')).toBeTruthy();
    expect(screen.queryByText('999 XP')).toBeNull();
    expect(gamificationService.getUserXP).toHaveBeenCalledTimes(1);
  });

  it('opens LeaderboardModal when clicked and allows closing it', async () => {
    vi.mocked(gamificationService.getUserXP).mockResolvedValue(120);

    render(<GamificationHeaderBadge userId="user-123" />);

    const badgeButton = await screen.findByRole('button', {
      name: /Gamification: Level 2, 120 XP. Click to view Leaderboard./i,
    });
    fireEvent.click(badgeButton);

    expect(
      await screen.findByRole('dialog', { name: 'TalentSphere Leaderboard & XP Progress' }),
    ).toBeTruthy();

    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'TalentSphere Leaderboard & XP Progress' }),
      ).toBeNull();
    });
  });
});
