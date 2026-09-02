import React, { useEffect, useState, useCallback } from 'react';
import { Zap, Trophy, TrendingUp } from 'lucide-react';
import {
  gamificationService,
  GAMIFICATION_UPDATED_EVENT,
} from '../../services/gamificationService';
import { calculateLevelProgress, type LevelProgressInfo } from '../../lib/xpLedger';
import { LeaderboardModal } from './LeaderboardModal';

interface GamificationHeaderBadgeProps {
  userId?: string;
  className?: string;
}

export const GamificationHeaderBadge: React.FC<GamificationHeaderBadgeProps> = ({
  userId,
  className = '',
}) => {
  const [totalXp, setTotalXp] = useState<number>(0);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadUserXP = useCallback(async () => {
    if (!userId) {
      setTotalXp(0);
      return;
    }
    setIsLoading(true);
    try {
      const xp = await gamificationService.getUserXP(userId);
      setTotalXp(xp);
    } catch (error) {
      console.warn('Failed to load user XP in header badge:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserXP();

    const handleGamificationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string; newXP?: number }>;
      if (customEvent.detail?.userId === userId) {
        if (typeof customEvent.detail.newXP === 'number') {
          setTotalXp(customEvent.detail.newXP);
        } else {
          loadUserXP();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(GAMIFICATION_UPDATED_EVENT, handleGamificationUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(GAMIFICATION_UPDATED_EVENT, handleGamificationUpdate);
      }
    };
  }, [userId, loadUserXP]);

  const progress: LevelProgressInfo = calculateLevelProgress(totalXp);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsLeaderboardOpen(true)}
        aria-label={`Gamification: Level ${progress.level}, ${totalXp} XP. Click to view Leaderboard.`}
        className={`group relative inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1 text-left transition-all hover:border-accent/40 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)] ${className}`}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/20 text-accent font-bold text-xs group-hover:scale-105 transition-transform">
          <Zap size={14} className="fill-accent text-accent" aria-hidden="true" focusable="false" />
        </div>

        <div className="hidden min-w-[3.5rem] sm:block">
          <div className="flex items-center justify-between gap-1 text-[11px] leading-tight">
            <span className="font-bold text-[var(--text-primary)]">Lvl {progress.level}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">{totalXp} XP</span>
          </div>

          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-panel)]">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${progress.progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progress.progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <Trophy
          size={14}
          className="text-[var(--text-muted)] transition-colors group-hover:text-accent sm:ml-0.5"
          aria-hidden="true"
          focusable="false"
        />
      </button>

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserId={userId}
      />
    </>
  );
};
