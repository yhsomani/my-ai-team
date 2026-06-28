import React, { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { dashboardService, DashboardOnboardingSignals, DashboardStats } from '../../services/dashboardService';
import { recruiterService, RecruiterOnboardingSignals, RecruiterStats } from '../../services/recruiterService';
import {
  Briefcase, MessageSquare, TrendingUp, Award,
  AlertTriangle, ArrowUpRight, Users, CheckCircle, Clock, Plus, RefreshCw, Circle
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/AuraButton';
import { Job } from "../../types/job";
import { Skeleton } from '../../components/shared/Skeleton';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/shared/Toast';
import {
  recordDashboardOperationalAnalytics,
  type DashboardOperationalAnalyticsAction,
  type DashboardOperationalRole,
} from '../../lib/dashboardOperationalAnalytics';

type DashboardLoadStatus = {
  source: 'live' | 'partial' | 'error';
  updatedAt: string | null;
  message: string;
  issues: string[];
};

const defaultDashboardStatus: DashboardLoadStatus = {
  source: 'live',
  updatedAt: null,
  message: 'Dashboard data is loading.',
  issues: []
};

const defaultTalentOnboarding: DashboardOnboardingSignals = {
  hasProfileDetails: false,
  skillCount: 0,
  applicationCount: 0,
  savedSearchCount: 0,
  enrollmentCount: 0,
  challengeSubmissionCount: 0
};

const defaultRecruiterOnboarding: RecruiterOnboardingSignals = {
  companyCount: 0,
  activeJobs: 0,
  totalApplications: 0,
  hasRecentApplications: false
};

type OnboardingTask = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  route: string;
  action: string;
};

type DashboardMetric = {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  route: string;
  action: string;
};

type DashboardQuickAction = {
  label: string;
  route: string;
  entryPoint: string;
};

const formatDashboardUpdatedAt = (date: string | null) => {
  if (!date) return 'Not refreshed yet';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const getDashboardMetricKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

interface DashboardSectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const DashboardSectionHeader: React.FC<DashboardSectionHeaderProps> = ({ title, description, action }) => (
  <div className="flex flex-col gap-3 border-b border-[var(--border-default)] p-5 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

interface DashboardMetricCardProps {
  metric: DashboardMetric;
  entryPoint: string;
  onOpen: (metric: DashboardMetric, entryPoint: string) => void;
}

const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({ metric, entryPoint, onOpen }) => (
  <button
    type="button"
    className="interactive-row flex h-full min-h-32 w-full flex-col justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-5 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
    onClick={() => onOpen(metric, entryPoint)}
    aria-label={`${metric.label}: ${metric.value}. ${metric.action}`}
  >
    <span className="flex items-start justify-between gap-3">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{metric.label}</span>
      <span className={`shrink-0 ${metric.color}`} aria-hidden="true">{metric.icon}</span>
    </span>
    <span>
      <span className="block text-2xl font-semibold text-[var(--text-primary)]">{metric.value}</span>
      <span className="mt-2 block text-xs leading-5 text-[var(--text-muted)]">{metric.action}</span>
    </span>
  </button>
);

interface QuickActionPanelProps {
  title: string;
  description: string;
  actions: DashboardQuickAction[];
  onOpen: (action: DashboardQuickAction) => void;
}

const QuickActionPanel: React.FC<QuickActionPanelProps> = ({ title, description, actions, onOpen }) => (
  <Card className="p-5">
    <div className="mb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{description}</p>
    </div>
    <div className="space-y-2">
      {actions.map((action) => (
        <Button
          key={action.entryPoint}
          variant="outline"
          size="sm"
          className="w-full justify-start text-left"
          onClick={() => onOpen(action)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  </Card>
);

interface OnboardingChecklistProps {
  title: string;
  description: string;
  tasks: OnboardingTask[];
  onNavigate: (task: OnboardingTask, entryPoint: 'checklist_primary' | 'checklist_item') => void;
}

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ title, description, tasks, onNavigate }) => {
  const completedCount = tasks.filter(task => task.complete).length;
  const nextTask = tasks.find(task => !task.complete);
  const progress = tasks.length === 0 ? 100 : Math.round((completedCount / tasks.length) * 100);

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
            <Badge variant={progress === 100 ? 'success' : 'outline'}>{completedCount}/{tasks.length}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{description}</p>
        </div>
        {nextTask && (
          <Button size="sm" onClick={() => onNavigate(nextTask, 'checklist_primary')}>
            {nextTask.action}
            <ArrowUpRight size={13} className="ml-1" />
          </Button>
        )}
      </div>
      <div
        className="mb-4 h-2 overflow-hidden rounded-md bg-[var(--bg-secondary)]"
        role="progressbar"
        aria-label={`${title} progress`}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-md bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {tasks.map(task => (
          <button
            key={task.id}
            type="button"
            onClick={() => onNavigate(task, 'checklist_item')}
            className="interactive-row flex min-h-20 items-start gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-left focus:outline-none focus:ring-2 focus:ring-accent/20"
            aria-label={`${task.label}. ${task.complete ? 'Completed' : 'Not completed'}. ${task.action}`}
          >
            {task.complete ? (
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-success" />
            ) : (
              <Circle size={16} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
            )}
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--text-primary)]">{task.label}</span>
              <span className="mt-1 block text-xs text-[var(--text-muted)]">{task.description}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
};

const getDashboardStatusLabel = (source: DashboardLoadStatus['source']) => {
  if (source === 'error') return 'Needs attention';
  if (source === 'partial') return 'Partially refreshed';
  return 'Live';
};

const getDashboardStatusVariant = (source: DashboardLoadStatus['source']) => {
  if (source === 'error') return 'destructive';
  if (source === 'partial') return 'warning';
  return 'success';
};

const getDashboardErrorCategory = (error: unknown) => {
  if (!error) return 'unknown_error';
  if (error instanceof TypeError) return 'network_error';
  if (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
    return 'timeout_or_abort';
  }
  return 'request_error';
};

const dashboardIssueSections = [
  'XP and level',
  'Application count',
  'Recent opportunities',
  'Active challenges',
  'Unread messages',
  'Recruiter stats',
  'Recent applications',
] as const;

const getDashboardIssuePresentation = (issue: string, index = 0) => {
  const normalizedIssue = issue.trim().replace(/\s+/g, ' ');
  const section = dashboardIssueSections.find((label) => (
    normalizedIssue.toLowerCase().startsWith(label.toLowerCase())
  ));

  if (section) {
    return {
      id: `${section}-${index}`,
      section,
      message: `${section} did not refresh.`,
      retryLabel: `Retry ${section}`,
    };
  }

  if (normalizedIssue.toLowerCase().includes('dashboard request failed')) {
    return {
      id: `dashboard-data-${index}`,
      section: 'Dashboard data',
      message: 'Dashboard data did not refresh.',
      retryLabel: 'Retry dashboard data',
    };
  }

  return {
    id: `dashboard-section-${index}`,
    section: `Dashboard section ${index + 1}`,
    message: 'A dashboard section did not refresh.',
    retryLabel: `Retry dashboard section ${index + 1}`,
  };
};

const countCompletedTasks = (tasks: OnboardingTask[]) => tasks.filter(task => task.complete).length;

interface DashboardStatusStripProps {
  status: DashboardLoadStatus;
  isRefreshing?: boolean;
  onRetry?: (issue?: string) => void;
}

const DashboardStatusStrip: React.FC<DashboardStatusStripProps> = ({ status, isRefreshing = false, onRetry }) => {
  const isHealthy = status.source === 'live';
  const visibleIssues = status.issues.slice(0, 3).map((issue, index) => getDashboardIssuePresentation(issue, index));

  return (
    <div
      role={status.source === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className="surface-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex min-w-0 gap-3">
        <span className={`mt-0.5 ${isHealthy ? 'text-success' : status.source === 'partial' ? 'text-warning' : 'text-destructive'}`}>
          {isHealthy ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">{status.message}</p>
          <p className="text-xs text-[var(--text-muted)]">
            Updated {formatDashboardUpdatedAt(status.updatedAt)}
          </p>
          {visibleIssues.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
              {visibleIssues.map((issue) => (
                <li key={issue.id} className="flex flex-col gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0">
                    <span className="block font-medium text-[var(--text-primary)]">{issue.section}</span>
                    <span className="mt-0.5 block">{issue.message}</span>
                  </span>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={() => onRetry(issue.message)}
                      disabled={isRefreshing}
                      className="inline-flex w-fit items-center gap-1 rounded-md border border-[var(--border-default)] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)] disabled:pointer-events-none disabled:opacity-50"
                      aria-label={issue.retryLabel}
                    >
                      <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
                      Retry
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRetry()}
            isLoading={isRefreshing}
          >
            {!isRefreshing && <RefreshCw size={13} className="mr-1" />}
            {status.issues.length > 0 ? 'Retry affected' : 'Refresh'}
          </Button>
        )}
        <Badge variant={getDashboardStatusVariant(status.source)}>
          {getDashboardStatusLabel(status.source)}
        </Badge>
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const [dashboardStatus, setDashboardStatus] = useState<DashboardLoadStatus>(defaultDashboardStatus);

  // User Data
  const [stats, setStats] = useState<DashboardStats>({ xp: 0, level: 1, applications: 0, messages: 0 });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [challenges, setChallenges] = useState<Record<string, any>[]>([]);
  const [talentOnboarding, setTalentOnboarding] = useState<DashboardOnboardingSignals>(defaultTalentOnboarding);

  // Recruiter Data
  const [recruiterStats, setRecruiterStats] = useState<RecruiterStats>({ activeJobs: 0, totalApplications: 0, newApplications: 0, hiredCount: 0 });
  const [recentApplications, setRecentApplications] = useState<Record<string, any>[]>([]);
  const [recruiterOnboarding, setRecruiterOnboarding] = useState<RecruiterOnboardingSignals>(defaultRecruiterOnboarding);

  const isRecruiter = user?.roles?.includes('ROLE_RECRUITER');
  const dashboardRole: DashboardOperationalRole = isRecruiter ? 'recruiter' : 'talent';

  const recordDashboardAction = useCallback((
    action: DashboardOperationalAnalyticsAction,
    extra: Omit<Parameters<typeof recordDashboardOperationalAnalytics>[0], 'action' | 'userId' | 'role'> = {}
  ) => {
    recordDashboardOperationalAnalytics({
      userId: user?.id,
      role: dashboardRole,
      action,
      ...extra,
    });
  }, [dashboardRole, user?.id]);

  const handleDashboardRouteOpen = useCallback((
    action: DashboardOperationalAnalyticsAction,
    route: string,
    extra: Omit<Parameters<typeof recordDashboardOperationalAnalytics>[0], 'action' | 'userId' | 'role' | 'route'> = {}
  ) => {
    recordDashboardAction(action, { route, ...extra });
    navigate(route);
  }, [navigate, recordDashboardAction]);

  const handleDashboardMetricOpen = useCallback((metric: DashboardMetric, entryPoint: string) => {
    handleDashboardRouteOpen('dashboard_stat_card_opened', metric.route, {
      statKey: getDashboardMetricKey(metric.label),
      entryPoint,
    });
  }, [handleDashboardRouteOpen]);

  const handleDashboardQuickActionOpen = useCallback((action: DashboardQuickAction) => {
    handleDashboardRouteOpen('dashboard_quick_action_opened', action.route, {
      entryPoint: action.entryPoint,
    });
  }, [handleDashboardRouteOpen]);

  const handleOnboardingNavigate = useCallback((
    task: OnboardingTask,
    entryPoint: 'checklist_primary' | 'checklist_item',
    tasks: OnboardingTask[]
  ) => {
    handleDashboardRouteOpen('dashboard_checklist_action_opened', task.route, {
      taskId: task.id,
      taskCompleted: task.complete,
      entryPoint,
      completedTaskCount: countCompletedTasks(tasks),
      totalTaskCount: tasks.length,
    });
  }, [handleDashboardRouteOpen]);

  const fetchData = useCallback(async (options?: { showSkeleton?: boolean; retryIssue?: string }) => {
    if (!user?.id) return;
    const showSkeleton = options?.showSkeleton ?? false;

    if (showSkeleton) {
      setLoading(true);
    } else {
      setIsRefreshingDashboard(true);
    }

    try {
      if (options?.retryIssue) {
        const retryIssue = getDashboardIssuePresentation(options.retryIssue).message;
        addToast({
          type: 'info',
          title: 'Retrying dashboard section',
          message: retryIssue
        });
      }

      if (isRecruiter) {
        const [statsResult, applicationsResult, onboardingResult] = await Promise.allSettled([
          recruiterService.getStats(user.id),
          recruiterService.getRecentApplications(user.id),
          recruiterService.getOnboardingSignals(user.id)
        ]);
        const issues: string[] = [];

        if (statsResult.status === 'fulfilled') {
          setRecruiterStats(statsResult.value);
        } else {
          issues.push('Recruiter stats did not refresh.');
          setRecruiterStats({ activeJobs: 0, totalApplications: 0, newApplications: 0, hiredCount: 0 });
        }

        if (applicationsResult.status === 'fulfilled') {
          setRecentApplications(applicationsResult.value);
        } else {
          issues.push('Recent applications did not refresh.');
          setRecentApplications([]);
        }

        if (onboardingResult.status === 'fulfilled') {
          setRecruiterOnboarding(onboardingResult.value);
        } else {
          setRecruiterOnboarding(defaultRecruiterOnboarding);
        }

        const source = issues.length === 0 ? 'live' : issues.length === 2 ? 'error' : 'partial';
        const sourceStatus = source === 'error' ? 'error' : source;
        const recentApplicationCount = applicationsResult.status === 'fulfilled' && Array.isArray(applicationsResult.value)
          ? applicationsResult.value.length
          : 0;
        setDashboardStatus({
          source,
          updatedAt: new Date().toISOString(),
          message: source === 'live'
            ? 'Recruiter dashboard data refreshed.'
            : source === 'partial'
              ? 'Some recruiter dashboard sections could not refresh.'
              : 'Recruiter dashboard data could not refresh.',
          issues
        });
        recordDashboardAction('dashboard_data_loaded', {
          sourceStatus,
          issueCount: issues.length,
          visibleItemCount: recentApplicationCount,
        });

        if (issues.length > 0) {
          recordDashboardAction('dashboard_degraded_state_shown', {
            sourceStatus,
            issueCount: issues.length,
          });
          addToast({
            type: source === 'error' ? 'error' : 'warning',
            title: source === 'error' ? 'Dashboard unavailable' : 'Dashboard partially refreshed',
            message: 'Check the dashboard status for the affected section.'
          });
        }
      } else {
        const data = await dashboardService.fetchDashboardData(user.id);
        setStats(data.stats);
        setJobs(data.jobs);
        setChallenges(data.challenges);
        setTalentOnboarding(data.onboarding);
        setDashboardStatus({
          source: data.meta.source,
          updatedAt: data.meta.fetchedAt,
          message: data.meta.source === 'live'
            ? 'Dashboard data refreshed.'
            : 'Some dashboard sections could not refresh.',
          issues: data.meta.issues
        });
        recordDashboardAction('dashboard_data_loaded', {
          sourceStatus: data.meta.source,
          issueCount: data.meta.issues.length,
          visibleItemCount: data.jobs.length + data.challenges.length,
        });

        if (data.meta.issues.length > 0) {
          recordDashboardAction('dashboard_degraded_state_shown', {
            sourceStatus: data.meta.source,
            issueCount: data.meta.issues.length,
          });
          addToast({
            type: 'warning',
            title: 'Dashboard partially refreshed',
            message: 'Some dashboard sections are using empty fallback values.'
          });
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      recordDashboardAction('dashboard_data_load_failed', {
        sourceStatus: 'error',
        issueCount: 1,
        errorCategory: getDashboardErrorCategory(err),
      });
      setDashboardStatus({
        source: 'error',
        updatedAt: new Date().toISOString(),
        message: 'Dashboard data could not refresh.',
        issues: ['The dashboard request failed before any section could update.']
      });
      addToast({ type: 'error', title: 'Dashboard Error', message: 'Failed to load dashboard data. Please try again.' });
    } finally {
      if (showSkeleton) {
        setLoading(false);
      }
      setIsRefreshingDashboard(false);
    }
  }, [addToast, isRecruiter, recordDashboardAction, user?.id]);

  useEffect(() => {
    void fetchData({ showSkeleton: true });
  }, [fetchData]);

  const handleDashboardRetry = (issue?: string) => {
    const hasIssue = Boolean(issue) || dashboardStatus.issues.length > 0;
    recordDashboardAction(hasIssue ? 'dashboard_retry_clicked' : 'dashboard_refresh_clicked', {
      sourceStatus: dashboardStatus.source,
      issueCount: dashboardStatus.issues.length,
      entryPoint: issue ? 'issue_retry' : 'status_retry',
    });
    void fetchData({ retryIssue: issue });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const userName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const talentOnboardingTasks: OnboardingTask[] = [
    {
      id: 'profile',
      label: 'Build your profile',
      description: talentOnboarding.hasProfileDetails && talentOnboarding.skillCount >= 3
        ? 'Profile basics and skills are ready.'
        : 'Add your headline, role, location, and at least three skills.',
      complete: talentOnboarding.hasProfileDetails && talentOnboarding.skillCount >= 3,
      route: '/profile',
      action: 'Update profile'
    },
    {
      id: 'saved-search',
      label: 'Save a job search',
      description: talentOnboarding.savedSearchCount > 0
        ? 'Saved searches are ready for repeat discovery.'
        : 'Save filters once so you can return to relevant jobs faster.',
      complete: talentOnboarding.savedSearchCount > 0,
      route: '/jobs',
      action: 'Find jobs'
    },
    {
      id: 'apply',
      label: 'Submit your first application',
      description: talentOnboarding.applicationCount > 0
        ? 'Your application pipeline has started.'
        : 'Review a job-specific draft and submit only when ready.',
      complete: talentOnboarding.applicationCount > 0,
      route: '/jobs',
      action: 'Apply to jobs'
    },
    {
      id: 'learning',
      label: 'Start a course',
      description: talentOnboarding.enrollmentCount > 0
        ? 'Learning progress is underway.'
        : 'Enroll in a course tied to your next role target.',
      complete: talentOnboarding.enrollmentCount > 0,
      route: '/lms',
      action: 'Browse learning'
    },
    {
      id: 'challenge',
      label: 'Attempt a challenge',
      description: talentOnboarding.challengeSubmissionCount > 0
        ? 'Challenge practice is part of your profile story.'
        : 'Run a challenge to build proof of skill.',
      complete: talentOnboarding.challengeSubmissionCount > 0,
      route: '/challenges',
      action: 'Try challenge'
    }
  ];
  const recruiterOnboardingTasks: OnboardingTask[] = [
    {
      id: 'company',
      label: 'Add company context',
      description: recruiterOnboarding.companyCount > 0
        ? 'Company context is available for candidates.'
        : 'Set up company details so job posts and candidates have context.',
      complete: recruiterOnboarding.companyCount > 0,
      route: '/jobs/post?companySetup=1',
      action: recruiterOnboarding.companyCount > 0 ? 'Review company' : 'Add company'
    },
    {
      id: 'job',
      label: 'Post the first role',
      description: recruiterOnboarding.activeJobs > 0
        ? 'At least one role is active or drafted.'
        : 'Create a role so candidates can enter your pipeline.',
      complete: recruiterOnboarding.activeJobs > 0,
      route: '/jobs/post',
      action: 'Post job'
    },
    {
      id: 'candidates',
      label: 'Review candidates',
      description: recruiterOnboarding.totalApplications > 0
        ? 'Your candidate pipeline has started.'
        : 'Once applications arrive, review status, notes, and next steps here.',
      complete: recruiterOnboarding.totalApplications > 0,
      route: '/candidates',
      action: 'Open candidates'
    },
    {
      id: 'messages',
      label: 'Prepare outreach',
      description: recruiterOnboarding.hasRecentApplications
        ? 'Use messaging to follow up with active candidates.'
        : 'Keep candidate outreach ready before the first applications arrive.',
      complete: recruiterOnboarding.hasRecentApplications,
      route: '/messaging',
      action: 'Open messages'
    }
  ];

  if (isRecruiter) {
    const statCards: DashboardMetric[] = [
      { label: 'Active Jobs', value: recruiterStats.activeJobs, icon: <Briefcase size={16} />, color: 'text-accent', route: '/jobs', action: 'Open recruiter jobs' },
      { label: 'Total Applicants', value: recruiterStats.totalApplications, icon: <Users size={16} />, color: 'text-blue-500', route: '/candidates', action: 'Review all applicants' },
      { label: 'New Today', value: recruiterStats.newApplications, icon: <Clock size={16} />, color: 'text-amber-500', route: '/candidates', action: 'Review new applications' },
      { label: 'Offers', value: recruiterStats.hiredCount, icon: <CheckCircle size={16} />, color: 'text-success', route: '/candidates', action: 'Review offer-stage candidates' },
    ];
    const quickActions: DashboardQuickAction[] = [
      { label: 'Create new job listing', route: '/jobs/post', entryPoint: 'quick_action_create_job' },
      { label: 'Review pending applications', route: '/candidates', entryPoint: 'quick_action_review_applications' },
      { label: 'Message candidates', route: '/messaging', entryPoint: 'quick_action_message_candidates' },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Recruiter Console`}
          description={`Welcome back, ${userName}. Managing your talent pipeline.`}
          actions={
            <Button
              size="sm"
              onClick={() => handleDashboardRouteOpen('dashboard_primary_action_opened', '/jobs/post', {
                entryPoint: 'header_post_job',
              })}
            >
              Post a Job <Plus size={14} className="ml-1" />
            </Button>
          }
        />

        <DashboardStatusStrip status={dashboardStatus} isRefreshing={isRefreshingDashboard} onRetry={handleDashboardRetry} />

        <OnboardingChecklist
          title="Recruiter setup"
          description="Recommended steps for a usable hiring workflow."
          tasks={recruiterOnboardingTasks}
          onNavigate={(task, entryPoint) => handleOnboardingNavigate(task, entryPoint, recruiterOnboardingTasks)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <DashboardMetricCard
              key={stat.label}
              metric={stat}
              entryPoint="recruiter_stat_card"
              onOpen={handleDashboardMetricOpen}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <DashboardSectionHeader
              title="Recent Applications"
              description="Latest candidates in your pipeline."
              action={(
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDashboardRouteOpen('dashboard_panel_handoff_opened', '/candidates', {
                    entryPoint: 'recent_applications_header',
                    visibleItemCount: recentApplications.length,
                  })}
                >
                  View all
                </Button>
              )}
            />
            <div className="divide-y divide-[var(--border-default)]">
              {recentApplications.length > 0 ? recentApplications.slice(0, 5).map((app: Record<string, any>, i: number) => (
                <div key={i} className="interactive-row flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Users size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{app.user?.fullName || 'Anonymous'}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">Applied for {app.job?.title}</p>
                    </div>
                  </div>
                  <Badge className="shrink-0" variant={app.status === 'OFFER' ? 'success' : 'warning'}>{app.status}</Badge>
                </div>
              )) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No recent applications</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => handleDashboardRouteOpen('dashboard_panel_handoff_opened', '/jobs/post', {
                      entryPoint: 'empty_recent_applications',
                    })}
                  >
                    Post a Job
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <QuickActionPanel
            title="Quick Actions"
            description="Shortcuts into the recruiter-owned workflows."
            actions={quickActions}
            onOpen={handleDashboardQuickActionOpen}
          />
        </div>
      </div>
    );
  }

  // Standard User Dashboard
  const userStatCards: DashboardMetric[] = [
    { label: 'Applications', value: stats.applications, icon: <Briefcase size={16} />, color: 'text-accent', route: '/jobs?tab=applied', action: 'View applications' },
    { label: 'Messages', value: stats.messages, icon: <MessageSquare size={16} />, color: 'text-blue-500', route: '/messaging', action: 'Open messages' },
    { label: 'XP Earned', value: stats.xp.toLocaleString(), icon: <TrendingUp size={16} />, color: 'text-success', route: '/challenges', action: 'Earn more XP' },
    { label: 'Level', value: stats.level, icon: <Award size={16} />, color: 'text-amber-500', route: '/profile', action: 'View profile progress' },
  ];
  const quickActions: DashboardQuickAction[] = [
    { label: 'Complete your profile', route: '/profile', entryPoint: 'quick_action_complete_profile' },
    { label: 'Continue learning', route: '/lms', entryPoint: 'quick_action_continue_learning' },
    { label: 'Join a challenge', route: '/challenges', entryPoint: 'quick_action_join_challenge' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Here's an overview of your activity and opportunities."
        actions={
          <Button
            size="sm"
            onClick={() => handleDashboardRouteOpen('dashboard_primary_action_opened', '/jobs', {
              entryPoint: 'header_browse_jobs',
            })}
          >
            Browse Jobs <ArrowUpRight size={14} className="ml-1" />
          </Button>
        }
      />

      <DashboardStatusStrip status={dashboardStatus} isRefreshing={isRefreshingDashboard} onRetry={handleDashboardRetry} />

      <OnboardingChecklist
        title="Activation checklist"
        description="Recommended steps to make job matching, applications, and learning work better."
        tasks={talentOnboardingTasks}
        onNavigate={(task, entryPoint) => handleOnboardingNavigate(task, entryPoint, talentOnboardingTasks)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {userStatCards.map((stat) => (
          <DashboardMetricCard
            key={stat.label}
            metric={stat}
            entryPoint="talent_stat_card"
            onOpen={handleDashboardMetricOpen}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <DashboardSectionHeader
            title="Recent Opportunities"
            description="Latest matching positions from the jobs workflow."
            action={(
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDashboardRouteOpen('dashboard_panel_handoff_opened', '/jobs', {
                  entryPoint: 'recent_opportunities_header',
                  visibleItemCount: jobs.length,
                })}
              >
                View all
              </Button>
            )}
          />
          <div className="divide-y divide-[var(--border-default)]">
            {jobs.length > 0 ? jobs.slice(0, 5).map((job: Job, i: number) => (
              <div key={i} className="interactive-row flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Briefcase size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.title}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{job.companyName || 'Company'} · {job.location}</p>
                  </div>
                </div>
                <Badge className="shrink-0" variant="success">{job.matchScore || 85}% match</Badge>
              </div>
            )) : (
              <div className="p-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">No recent jobs found</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleDashboardRouteOpen('dashboard_panel_handoff_opened', '/jobs', {
                    entryPoint: 'empty_recent_opportunities',
                  })}
                >
                  Browse Jobs
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <QuickActionPanel
            title="Quick Actions"
            description="Shortcuts into the primary talent workflows."
            actions={quickActions}
            onOpen={handleDashboardQuickActionOpen}
          />

          <Card>
            <DashboardSectionHeader
              title="Active Challenges"
              description="Current challenge summaries from the challenges workflow."
            />
            <div className="divide-y divide-[var(--border-default)]">
              {challenges.length > 0 ? challenges.slice(0, 3).map((c: Record<string, any>, i: number) => (
                <div key={i} className="interactive-row flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{c.participantCount || 0} participants</p>
                  </div>
                  <Badge className="shrink-0" variant="outline">{c.difficulty || 'Medium'}</Badge>
                </div>
              )) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No active challenges</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => handleDashboardRouteOpen('dashboard_panel_handoff_opened', '/challenges', {
                      entryPoint: 'empty_active_challenges',
                    })}
                  >
                    Explore Challenges
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
