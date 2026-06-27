import React from 'react';
import { Briefcase, ChevronRight, Layers, MapPin, ArrowUpRight } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { AuraButton } from '../../../components/shared/AuraButton';
import { Badge } from '../../../components/shared/Badge';

interface JobsWidgetProps {
  jobs: any[];
}

export const JobsWidget: React.FC<JobsWidgetProps> = ({ jobs }) => {
  return (
    <GlassCard>
      <div className="flex flex-col gap-3 border-b border-[var(--border-default)] p-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Briefcase size={16} className="text-accent" /> Recommended jobs
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Recent job summaries from the jobs workflow.</p>
        </div>
        <AuraButton variant="ghost" size="sm">
          View all <ChevronRight size={14} className="ml-1" />
        </AuraButton>
      </div>
      
      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
        {jobs.length > 0 ? jobs.slice(0, 4).map((job, idx) => (
          <JobNodeCard key={job.id || idx} job={job} />
        )) : (
          <div className="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center md:col-span-2">
            <Layers className="mx-auto text-[var(--text-muted)]" size={32} />
            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">No recommended jobs yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">New matches will appear here when the jobs workflow has data.</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

const JobNodeCard = ({ job }: any) => (
  <div className="interactive-row rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] text-sm font-semibold text-[var(--text-secondary)] uppercase">
        {job.companyName?.substring(0, 1) || 'A'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{job.title}</h3>
          <ArrowUpRight size={16} className="shrink-0 text-[var(--text-muted)]" />
        </div>
        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{job.companyName || 'Company'}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <MapPin size={12} className="mr-1" /> {job.location || 'Remote'}
          </Badge>
          {(job.salaryRange || job.salary_range) && <Badge variant="default">{job.salaryRange || job.salary_range}</Badge>}
        </div>
      </div>
    </div>
  </div>
);

export default React.memo(JobsWidget);
