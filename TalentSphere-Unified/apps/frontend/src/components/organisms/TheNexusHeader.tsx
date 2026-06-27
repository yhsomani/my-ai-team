import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { ArrowUpRight, Briefcase, CalendarDays, TrendingUp } from 'lucide-react';
import { AuraButton } from '../shared/AuraButton';
import { Badge } from '../shared/Badge';

export const TheNexusHeader: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const firstName = user?.email?.split('@')[0] || 'Professional';
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="surface-card flex flex-col gap-8 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
      <div className="flex max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-2">
            <Briefcase size={14} />
            TalentSphere workspace
          </Badge>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <CalendarDays size={14} />
            {currentDate}
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight text-[var(--text-primary)] lg:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            Review the latest profile, job, learning, and network signals before moving into the owning workflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AuraButton type="button">
            Explore jobs
            <ArrowUpRight size={16} />
          </AuraButton>
          <AuraButton type="button" variant="outline">
            Review dashboard
          </AuraButton>
        </div>
      </div>

      <div className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 lg:w-96">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Skill progress</span>
          <TrendingUp size={18} className="text-accent" />
        </div>
        <div className="space-y-4">
          {[
            { label: 'TypeScript', value: 88 },
            { label: 'System architecture', value: 64 },
          ].map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-end justify-between gap-3">
                <span className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{item.value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-default)]">
                <div className="h-full rounded-full bg-accent" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-[var(--border-default)] pt-4 text-xs text-[var(--text-muted)]">
          Active peers and opportunity summaries remain dashboard handoffs.
        </div>
      </div>
    </div>
  );
};
