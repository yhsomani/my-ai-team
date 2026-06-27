import React from 'react';
import { ChevronRight, Cpu } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { AuraButton } from '../../../components/shared/AuraButton';
import { Badge } from '../../../components/shared/Badge';

interface ChallengesWidgetProps {
  challenges: any[];
}

export const ChallengesWidget: React.FC<ChallengesWidgetProps> = ({ challenges }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active challenges</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Current challenge summaries and difficulty.</p>
        </div>
        <Badge variant="success">Live</Badge>
      </div>
      <div className="space-y-4">
        {challenges.length > 0 ? challenges.slice(0, 3).map((challenge, i) => (
          <GlassCard key={i} className="interactive-row flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Cpu size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-medium text-[var(--text-primary)]">{challenge.title}</h4>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{challenge.difficulty || 'Medium'}</Badge>
                <Badge variant="default">Available</Badge>
              </div>
            </div>
            <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)]" />
          </GlassCard>
        )) : (
          [1, 2, 3].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]" />
          ))
        )}
      </div>
      <AuraButton variant="ghost" className="w-full">
        View challenge archive
      </AuraButton>
    </div>
  );
};

export default React.memo(ChallengesWidget);
