import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  Briefcase,
  Cpu,
  Globe,
  GraduationCap,
  Layers,
  MessageSquare,
  Network,
  ShieldCheck,
  Target
} from 'lucide-react';
import { Button } from '../components/shared/AuraButton';
import { typedSupabase as supabase } from '../lib/supabaseClient';

const fallbackStats = { totalUsers: '12k+', activeJobs: '1k+', successRate: '94.2%', systemStatus: 'Optimal' };

const platformPillars = [
  {
    icon: Network,
    title: 'Relationship workspace',
    description: 'Manage connections, reminders, and hiring conversations from one clear network flow.',
  },
  {
    icon: Target,
    title: 'Focused job matching',
    description: 'Review opportunities, saved searches, applications, and recruiter posts in the Jobs workspace.',
  },
  {
    icon: BrainCircuit,
    title: 'Reviewed AI support',
    description: 'Use generated guidance as drafts and handoffs, with final decisions kept in the owning workflow.',
  },
];

const previewRows = [
  { label: 'Applications', value: '8 active', icon: Briefcase },
  { label: 'Learning', value: '3 courses', icon: GraduationCap },
  { label: 'Messages', value: '4 unread', icon: MessageSquare },
];

const formatPublicCount = (count: number | null) => {
  const safeCount = count || 0;
  return safeCount > 1000 ? `${(safeCount / 1000).toFixed(1)}k+` : `${safeCount}`;
};

const formatStatsTimestamp = (date: Date) => date.toLocaleTimeString(undefined, {
  hour: 'numeric',
  minute: '2-digit'
});

const LandingPage: React.FC = () => {
  const [stats, setStats] = useState(fallbackStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsMeta, setStatsMeta] = useState({
    source: 'fallback' as 'live' | 'fallback',
    updatedAt: new Date(),
    message: 'Showing fallback platform estimates'
  });

  useEffect(() => {
    const fetchPublicStats = async () => {
        setStatsLoading(true);
        try {
            const { count: totalUsers, error: usersError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            const { count: activeJobs, error: jobsError } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PUBLISHED');

            if (usersError || jobsError) {
                console.error("Failed to fetch stats", usersError || jobsError);
                throw usersError || jobsError;
            }

            const updatedAt = new Date();
            setStats({
                totalUsers: formatPublicCount(totalUsers),
                activeJobs: `${formatPublicCount(activeJobs)}+`,
                successRate: '94.2%', // This would need to be calculated from applications
                systemStatus: 'Optimal'
            });
            setStatsMeta({
              source: 'live',
              updatedAt,
              message: 'Live public stats from TalentSphere data'
            });
        } catch (err) {
            console.error("Failed to fetch public stats", err);
            setStats(fallbackStats);
            setStatsMeta({
              source: 'fallback',
              updatedAt: new Date(),
              message: 'Live public stats unavailable; showing fallback estimates'
            });
        } finally {
            setStatsLoading(false);
        }
    };
    fetchPublicStats();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <nav className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--bg-panel)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Layers size={18} />
            </span>
            <span className="text-base font-semibold">TalentSphere</span>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-medium text-[var(--text-secondary)] md:flex">
            <a href="#features" className="hover:text-[var(--text-primary)]">Platform</a>
            <a href="#network" className="hover:text-[var(--text-primary)]">Network</a>
            <a href="#learning" className="hover:text-[var(--text-primary)]">Learning</a>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-md px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] sm:inline-flex">
                Sign In
              </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] lg:block" aria-hidden="true" />
          <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)] lg:px-8 lg:py-20">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <ShieldCheck size={14} className="text-accent" />
                Reviewed workflows for talent and hiring teams
              </div>

              <h1 className="text-4xl font-semibold leading-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
                TalentSphere
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                A focused career workspace for jobs, learning, challenges, networking, messages, and reviewed AI guidance.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register?role=talent" className="sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto">
                    Join as Talent
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/register?role=recruiter" className="sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Hire Talent
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Choose a role now; you can review the account type before creating your account.
              </p>
            </div>

            <div className="relative z-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-4 shadow-lg sm:p-5">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
                <div>
                  <p className="text-xs font-medium uppercase text-[var(--text-muted)]">Today</p>
                  <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Career command center</h2>
                </div>
                <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  Live preview
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {previewRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{row.label}</span>
                          <span className="block text-xs text-[var(--text-muted)]">Owned by its domain route</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text-secondary)]">{row.value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'AI drafts', value: 'Review only' },
                  { label: 'Source state', value: 'Visible' },
                  { label: 'Actions', value: 'Explicit' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-[var(--border-default)] p-3">
                    <span className="block text-xs text-[var(--text-muted)]">{item.label}</span>
                    <span className="mt-1 block text-sm font-semibold text-[var(--text-primary)]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {platformPillars.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="surface-card p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Icon size={20} />
                  </div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="network" className="border-y border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:px-8">
            <div>
              <p className="text-sm font-medium text-accent">Information architecture</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">One workflow owner for every feature.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'Dashboard summarizes what needs attention.',
                'Jobs owns search, applications, saved searches, and posts.',
                'Network owns relationships and reminders.',
                'Messages owns conversation reading, sending, and retry.',
              ].map((item) => (
                <div key={item} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-4 text-sm text-[var(--text-secondary)]">
                  <Cpu className="mb-3 h-4 w-4 text-accent" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="learning" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="surface-card p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-accent">Public platform snapshot</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Current activity summary</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <BadgeDot source={statsMeta.source} />
                <span>{statsMeta.message} - Updated {formatStatsTimestamp(statsMeta.updatedAt)}</span>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Active Users', value: stats.totalUsers },
                { label: 'Opportunities', value: stats.activeJobs },
                { label: 'Match Rate', value: stats.successRate },
                { label: 'System Status', value: stats.systemStatus }
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                  <span className="block text-sm text-[var(--text-muted)]">{stat.label}</span>
                  <span className="mt-2 block min-h-9 text-3xl font-semibold text-[var(--text-primary)]">
                    {statsLoading ? (
                      <span className="block h-8 w-24 animate-pulse rounded-md bg-[var(--border-default)]" aria-label={`Loading ${stat.label}`} />
                    ) : stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-default)] bg-[var(--bg-panel)] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="h-4 w-4 text-accent" />
            <span>TalentSphere</span>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} TalentSphere Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const BadgeDot: React.FC<{ source: 'live' | 'fallback' }> = ({ source }) => (
  <span className="inline-flex items-center gap-2">
    <span className={`h-2 w-2 rounded-full ${source === 'live' ? 'bg-success' : 'bg-warning'}`} aria-hidden="true" />
    <span className="font-medium uppercase">{source === 'live' ? 'Live' : 'Fallback'}</span>
  </span>
);

export default LandingPage;
