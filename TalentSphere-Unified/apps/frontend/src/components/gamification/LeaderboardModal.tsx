import React, { useEffect, useState, useCallback } from 'react';
import {
  Trophy,
  Award,
  Zap,
  TrendingUp,
  History,
  AlertCircle,
  RefreshCw,
  Crown,
  Medal,
  ShieldCheck,
} from 'lucide-react';
import { AuraModal } from '../shared/AuraModal';
import { AuraButton } from '../shared/AuraButton';
import {
  gamificationService,
  type LeaderboardEntry,
  type XPTransaction,
} from '../../services/gamificationService';
import { DAILY_XP_MAX_CAP, calculateLevelProgress } from '../../lib/xpLedger';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'activity'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [userTotalXp, setUserTotalXp] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGamificationData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lbData, userXp, txData] = await Promise.all([
        gamificationService.getLeaderboard(25),
        currentUserId ? gamificationService.getUserXP(currentUserId) : Promise.resolve(0),
        currentUserId ? gamificationService.getXPTransactions(currentUserId, 20) : Promise.resolve([]),
      ]);

      setLeaderboard(lbData);
      setUserTotalXp(userXp);
      setTransactions(txData);
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
      setError('Unable to load leaderboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (isOpen) {
      loadGamificationData();
    }
  }, [isOpen, loadGamificationData]);

  const levelProgress = calculateLevelProgress(userTotalXp);

  const todayTransactions = transactions.filter((tx) => {
    if (!tx.created_at) return false;
    const txDate = new Date(tx.created_at);
    const now = new Date();
    return (
      txDate.getUTCFullYear() === now.getUTCFullYear() &&
      txDate.getUTCMonth() === now.getUTCMonth() &&
      txDate.getUTCDate() === now.getUTCDate()
    );
  });

  const todayXpEarned = todayTransactions.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
  const remainingDailyCap = Math.max(0, DAILY_XP_MAX_CAP - todayXpEarned);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 font-bold">
            <Crown size={18} className="text-amber-400" aria-hidden="true" focusable="false" />
          </div>
        );
      case 2:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300/20 text-slate-300 font-bold">
            <Medal size={18} className="text-slate-300" aria-hidden="true" focusable="false" />
          </div>
        );
      case 3:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/20 text-amber-600 font-bold">
            <Medal size={18} className="text-amber-600" aria-hidden="true" focusable="false" />
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-secondary)]">
            #{rank}
          </div>
        );
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Recent';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AuraModal
      isOpen={isOpen}
      onClose={onClose}
      title="TalentSphere Leaderboard & XP Progress"
      size="lg"
    >
      <div className="space-y-5">
        {/* User Summary Banner */}
        {currentUserId && (
          <div className="rounded-xl border border-[var(--border-default)] bg-gradient-to-r from-accent/10 via-[var(--bg-secondary)] to-accent/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent font-bold text-lg shadow-sm">
                  Lvl {levelProgress.level}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--text-primary)]">Your Gamification Rank</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                      <Zap size={12} aria-hidden="true" focusable="false" /> {userTotalXp} Total XP
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {levelProgress.xpToNextLevel} XP to Level {levelProgress.level + 1}
                  </p>
                </div>
              </div>

              {/* Daily Cap Progress */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-xs font-medium text-[var(--text-secondary)]">
                  <ShieldCheck size={14} className="text-emerald-500" aria-hidden="true" focusable="false" />
                  <span>Daily Cap: {todayXpEarned} / {DAILY_XP_MAX_CAP} XP</span>
                </div>
                <div className="mt-1 h-2 w-36 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((todayXpEarned / DAILY_XP_MAX_CAP) * 100))}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                  {remainingDailyCap > 0 ? `${remainingDailyCap} XP available today` : 'Daily max reached'}
                </p>
              </div>
            </div>

            {/* Level Bar */}
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${levelProgress.progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-default)]">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'border-accent text-accent'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Trophy size={16} aria-hidden="true" focusable="false" /> Global Leaderboard
          </button>
          {currentUserId && (
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <History size={16} aria-hidden="true" focusable="false" /> XP Ledger & History
            </button>
          )}
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
            <RefreshCw size={24} className="animate-spin text-accent" aria-hidden="true" focusable="false" />
            <p className="mt-2 text-sm">Loading rankings and ledger...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <AlertCircle size={28} className="mx-auto text-destructive" aria-hidden="true" focusable="false" />
            <p className="mt-2 text-sm font-medium text-destructive">{error}</p>
            <AuraButton
              variant="outline"
              size="sm"
              onClick={loadGamificationData}
              className="mt-3 inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} aria-hidden="true" focusable="false" /> Retry
            </AuraButton>
          </div>
        ) : activeTab === 'leaderboard' ? (
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] p-8 text-center text-[var(--text-muted)]">
                <Trophy size={32} className="mx-auto mb-2 opacity-50" aria-hidden="true" focusable="false" />
                <p className="text-sm font-medium">No leaderboard entries yet.</p>
                <p className="mt-1 text-xs">Complete coding challenges and lessons to climb the ranks!</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                {leaderboard.map((entry, idx) => {
                  const isCurrentUser = currentUserId === entry.user_id;
                  const rank = entry.rank || idx + 1;

                  return (
                    <div
                      key={entry.user_id || idx}
                      className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                        isCurrentUser
                          ? 'border-accent/40 bg-accent/10'
                          : 'border-[var(--border-default)] bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getRankBadge(rank)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {entry.full_name || 'Anonymous User'}
                            </span>
                            {isCurrentUser && (
                              <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            Level {entry.level || 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]">
                          <Zap size={13} className="text-amber-500" aria-hidden="true" focusable="false" />
                          {entry.total_xp} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] p-8 text-center text-[var(--text-muted)]">
                <History size={32} className="mx-auto mb-2 opacity-50" aria-hidden="true" focusable="false" />
                <p className="text-sm font-medium">No XP transactions recorded yet.</p>
                <p className="mt-1 text-xs">Start solving coding challenges or completing course lessons to earn XP.</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                {transactions.map((tx, idx) => (
                  <div
                    key={tx.id || idx}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {tx.reason || 'Activity Reward'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>{formatDate(tx.created_at)}</span>
                        {tx.reference_type && (
                          <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.2 text-[10px] uppercase font-semibold">
                            {tx.reference_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-emerald-500">
                      <span>+{tx.amount} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AuraModal>
  );
};
