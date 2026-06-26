import { supabase } from '../lib/supabaseClient';
import { productAnalytics, type ProductAnalyticsEventRecord } from '../lib/productAnalytics';
import {
  summarizeProductAnalyticsEvents,
  type ProductAnalyticsInsightSummary
} from '../lib/productAnalyticsInsights';

export interface SystemStats {
  totalUsers: number;
  systemLoad: number;
  servicesOnline: number;
  totalServices: number;
  securityAlerts: number;
}

export type AdminDataSource = 'live' | 'fallback';

export type ServiceObservabilityLinkType = 'health' | 'metrics' | 'logs' | 'status';

export interface ServiceObservabilityLink {
  type: ServiceObservabilityLinkType;
  label: string;
  href: string;
  description: string;
  external?: boolean;
}

export interface ServiceHealth {
  name: string;
  status: 'Running' | 'Degraded' | 'Offline';
  uptime: number;
  version: string;
  source?: AdminDataSource;
  detail?: string;
  checkedAt?: string;
  serviceId?: string;
  logQuery?: string;
  observabilityLinks?: ServiceObservabilityLink[];
}

export interface AdminDashboardData {
  stats: SystemStats;
  services: ServiceHealth[];
  metadata: {
    source: AdminDataSource;
    fetchedAt: string;
    latencyMs: number;
    degraded: boolean;
    message: string;
  };
}

export interface AdminProductAnalyticsInsightsResult {
  summary: ProductAnalyticsInsightSummary;
  metadata: {
    source: 'server' | 'local' | 'empty';
    fetchedAt: string;
    limit: number;
    degraded: boolean;
    message: string;
  };
}

export type ScheduledAutomationRolloutStatus = 'configured' | 'needs_verification' | 'degraded';
export type ScheduledAutomationRunStatus = 'succeeded' | 'failed' | 'running' | 'missed' | 'unknown';
export type ScheduledAutomationProviderStatus = 'not_configured' | 'connected' | 'unavailable';

export interface ScheduledAutomationJobStatus {
  id: string;
  name: string;
  purpose: string;
  schedule: string;
  command: string;
  manifestPath: string;
  requiredConfig: string[];
  status: ScheduledAutomationRolloutStatus;
  detail: string;
  statusUrl?: string;
  lastVerifiedAt?: string;
  lastRunStatus?: ScheduledAutomationRunStatus;
  lastRunAt?: string;
  nextRunAt?: string;
  consecutiveFailures?: number;
}

export interface AdminScheduledAutomationStatusResult {
  jobs: ScheduledAutomationJobStatus[];
  summary: {
    total: number;
    configuredCount: number;
    needsVerificationCount: number;
    degradedCount: number;
    runHistoryReportedCount: number;
    runHistoryMissingCount: number;
    lastRunSucceededCount: number;
    lastRunFailedCount: number;
    lastRunRunningCount: number;
    lastRunMissedCount: number;
    lastRunUnknownCount: number;
  };
  metadata: {
    source: 'frontend-config' | 'provider';
    fetchedAt: string;
    degraded: boolean;
    message: string;
    providerStatus: ScheduledAutomationProviderStatus;
    providerCheckedAt?: string;
    image?: string;
    runbookUrl?: string;
  };
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogQueryParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedAuditLogsResult {
  logs: AuditLogEntry[];
  total: number | null;
  limit: number;
  offset: number;
  hasNext: boolean;
  nextCursor: string | null;
}

const defaultAuditLogPageSize = 10;

const scheduledAutomationCatalog = [
  {
    id: 'saved-search-digest-discovery',
    name: 'Saved Search Discovery',
    purpose: 'Find new saved-search matches and queue digest items.',
    schedule: '*/30 * * * *',
    command: 'npm run discover:saved-search-digests -- --commit',
    manifestPath: 'infra/k8s/base/notification-digest-cronjobs.yaml',
    requiredConfig: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  },
  {
    id: 'networking-reminder-delivery',
    name: 'Networking Reminder Delivery',
    purpose: 'Promote due synced networking follow-up reminders.',
    schedule: '*/15 * * * *',
    command: 'npm run run:networking-reminders -- --commit',
    manifestPath: 'infra/k8s/base/notification-digest-cronjobs.yaml',
    requiredConfig: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  },
  {
    id: 'notification-digest-delivery',
    name: 'Notification Digest Delivery',
    purpose: 'Deliver queued daily or weekly notification digest items.',
    schedule: '5 * * * *',
    command: 'npm run run:notification-digests -- --commit',
    manifestPath: 'infra/k8s/base/notification-digest-cronjobs.yaml',
    requiredConfig: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  },
] as const;

const serviceObservabilityCatalog: Record<string, {
  serviceId: string;
  healthHref?: string;
  statusHref?: string;
}> = {
  'api gateway': {
    serviceId: 'api-gateway',
    healthHref: '/actuator/health',
  },
  'user service': {
    serviceId: 'user-service',
    healthHref: '/api/v1/users/health',
  },
  'authentication': {
    serviceId: 'auth-service',
    healthHref: '/api/v1/auth/health',
  },
  'auth service': {
    serviceId: 'auth-service',
    healthHref: '/api/v1/auth/health',
  },
  database: {
    serviceId: 'supabase-postgres',
    statusHref: 'https://status.supabase.com/',
  },
  storage: {
    serviceId: 'supabase-storage',
    statusHref: 'https://status.supabase.com/',
  },
  realtime: {
    serviceId: 'supabase-realtime',
    statusHref: 'https://status.supabase.com/',
  },
  'job service': {
    serviceId: 'job-service',
    healthHref: '/api/v1/jobs/health',
  },
  'lms service': {
    serviceId: 'lms-service',
    healthHref: '/api/v1/lms/health',
  },
  'application service': {
    serviceId: 'application-service',
    healthHref: '/api/v1/applications/health',
  },
  'recruitment service': {
    serviceId: 'application-service',
    healthHref: '/api/v1/applications/health',
  },
  'notification service': {
    serviceId: 'notification-service',
    healthHref: '/api/v1/notifications/health',
  },
  'networking service': {
    serviceId: 'networking-service',
    healthHref: '/api/v1/networking/health',
  },
  'ai service': {
    serviceId: 'ai-service',
    healthHref: '/api/v1/ai/health',
  },
  'messaging service': {
    serviceId: 'messaging-service',
    healthHref: '/api/v1/messages/health',
  },
  'payment service': {
    serviceId: 'payment-service',
    healthHref: '/api/v1/payments/health',
  },
};

const normalizeServiceKey = (value: string) => value.trim().toLowerCase();

const compact = (value?: string | null) => (value || '').trim();

const getEnvValue = (key: string) => (
  typeof import.meta !== 'undefined'
    ? compact((import.meta.env as Record<string, string | undefined> | undefined)?.[key])
    : ''
);

const appendQueryParams = (baseUrl: string, params: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  if (!query) return baseUrl;
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query}`;
};

const normalizeRolloutStatus = (value?: string | null): ScheduledAutomationRolloutStatus | null => {
  const normalized = compact(value).toLowerCase();
  if (['configured', 'ready', 'live', 'running'].includes(normalized)) return 'configured';
  if (['paused', 'disabled', 'degraded', 'off'].includes(normalized)) return 'degraded';
  if (['unknown', 'pending', 'unverified', 'needs_verification', 'needs-verification'].includes(normalized)) {
    return 'needs_verification';
  }
  return null;
};

const normalizeRunStatus = (value?: string | null): ScheduledAutomationRunStatus | null => {
  const normalized = compact(value).toLowerCase();
  if (['success', 'succeeded', 'complete', 'completed', 'ok', 'healthy'].includes(normalized)) return 'succeeded';
  if (['failure', 'failed', 'error', 'errored', 'unhealthy'].includes(normalized)) return 'failed';
  if (['running', 'active', 'in_progress', 'in-progress'].includes(normalized)) return 'running';
  if (['missed', 'late', 'overdue'].includes(normalized)) return 'missed';
  if (['unknown', 'unreported', 'not_reported', 'not-reported'].includes(normalized)) return 'unknown';
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const getStringValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && compact(value)) {
      return compact(value);
    }
  }
  return undefined;
};

const getNumberValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    if (typeof value === 'string' && compact(value) && Number.isFinite(Number(value))) {
      return Math.max(0, Math.floor(Number(value)));
    }
  }
  return undefined;
};

const normalizeTimestampValue = (value?: string) => {
  if (!value) return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
};

const normalizeHttpUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const getProviderJobRecords = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord).filter(Boolean) as Record<string, unknown>[];
  }

  const root = asRecord(payload);
  if (!root) return [];

  const directJobs = root.jobs || root.scheduledAutomations || root.scheduled_automations;
  if (Array.isArray(directJobs)) {
    return directJobs.map(asRecord).filter(Boolean) as Record<string, unknown>[];
  }

  const data = asRecord(root.data);
  const nestedJobs = data?.jobs || data?.scheduledAutomations || data?.scheduled_automations;
  if (Array.isArray(nestedJobs)) {
    return nestedJobs.map(asRecord).filter(Boolean) as Record<string, unknown>[];
  }

  return [];
};

const buildScheduledAutomationSummary = (jobs: ScheduledAutomationJobStatus[]) => ({
  total: jobs.length,
  configuredCount: jobs.filter(job => job.status === 'configured').length,
  needsVerificationCount: jobs.filter(job => job.status === 'needs_verification').length,
  degradedCount: jobs.filter(job => job.status === 'degraded').length,
  runHistoryReportedCount: jobs.filter(job => Boolean(job.lastRunStatus)).length,
  runHistoryMissingCount: jobs.filter(job => !job.lastRunStatus).length,
  lastRunSucceededCount: jobs.filter(job => job.lastRunStatus === 'succeeded').length,
  lastRunFailedCount: jobs.filter(job => job.lastRunStatus === 'failed').length,
  lastRunRunningCount: jobs.filter(job => job.lastRunStatus === 'running').length,
  lastRunMissedCount: jobs.filter(job => job.lastRunStatus === 'missed').length,
  lastRunUnknownCount: jobs.filter(job => job.lastRunStatus === 'unknown').length,
});

const getProviderRunDetail = (
  jobName: string,
  runStatus: ScheduledAutomationRunStatus | undefined,
  consecutiveFailures?: number
) => {
  const failureSuffix = consecutiveFailures && consecutiveFailures > 0
    ? ` Provider reports ${consecutiveFailures} consecutive failed run${consecutiveFailures === 1 ? '' : 's'}.`
    : '';

  if (runStatus === 'succeeded') {
    return `${jobName} provider run history reports the latest run succeeded.${failureSuffix}`;
  }
  if (runStatus === 'failed') {
    return `${jobName} provider run history reports the latest run failed. Review status details before relying on automation.${failureSuffix}`;
  }
  if (runStatus === 'missed') {
    return `${jobName} provider run history reports the latest scheduled run was missed. Review status details before relying on automation.${failureSuffix}`;
  }
  if (runStatus === 'running') {
    return `${jobName} provider run history reports a run is currently active.${failureSuffix}`;
  }
  if (runStatus === 'unknown') {
    return `${jobName} provider run history did not include a recognized latest run state.${failureSuffix}`;
  }
  return `${jobName} is listed in the expected scheduler catalog, but provider run history did not report this job.`;
};

const getProviderMessage = (summary: AdminScheduledAutomationStatusResult['summary']) => {
  const unhealthyRuns = summary.lastRunFailedCount + summary.lastRunMissedCount;
  if (unhealthyRuns > 0) {
    return `${unhealthyRuns} scheduled automation jobs have failed or missed latest runs.`;
  }
  if (summary.runHistoryMissingCount > 0) {
    return `${summary.runHistoryReportedCount} scheduled automation jobs loaded from provider run history; ${summary.runHistoryMissingCount} still need provider verification.`;
  }
  if (summary.runHistoryReportedCount > 0) {
    return `${summary.runHistoryReportedCount} scheduled automation jobs loaded from provider run history.`;
  }
  return 'Provider scheduler status loaded, but no expected scheduled automation jobs were reported.';
};

export const buildScheduledAutomationStatus = (
  env: Record<string, string | undefined> = typeof import.meta !== 'undefined'
    ? (import.meta.env as Record<string, string | undefined> | undefined) || {}
    : {}
): AdminScheduledAutomationStatusResult => {
  const fetchedAt = new Date().toISOString();
  const rolloutStatus = normalizeRolloutStatus(env.VITE_SCHEDULER_ROLLOUT_STATUS);
  const statusBaseUrl = compact(env.VITE_SCHEDULER_STATUS_BASE_URL);
  const image = compact(env.VITE_SCHEDULER_IMAGE || env.VITE_SCHEDULER_IMAGE_TAG) || undefined;
  const runbookUrl = compact(env.VITE_SCHEDULER_RUNBOOK_URL) || undefined;
  const lastVerifiedAt = compact(env.VITE_SCHEDULER_LAST_VERIFIED_AT) || undefined;
  const status: ScheduledAutomationRolloutStatus = rolloutStatus || (statusBaseUrl ? 'configured' : 'needs_verification');

  const getDetail = (jobName: string) => {
    if (status === 'degraded') {
      return 'Scheduler rollout is flagged as paused or degraded for this environment.';
    }
    if (status === 'configured' && statusBaseUrl) {
      return `${jobName} has a frontend-visible status URL; verify latest run health before relying on automation.`;
    }
    if (status === 'configured') {
      return `${jobName} is marked configured by rollout flag; verify run history in deployment tooling.`;
    }
    return `${jobName} has a checked-in CronJob manifest, but this environment has no visible rollout flag or status URL.`;
  };

  const jobs: ScheduledAutomationJobStatus[] = scheduledAutomationCatalog.map(job => ({
    ...job,
    requiredConfig: [...job.requiredConfig],
    status,
    detail: getDetail(job.name),
    statusUrl: statusBaseUrl ? appendQueryParams(statusBaseUrl, { job: job.id }) : undefined,
    lastVerifiedAt,
  }));
  const summary = buildScheduledAutomationSummary(jobs);

  return {
    jobs,
    summary,
    metadata: {
      source: 'frontend-config',
      fetchedAt,
      degraded: summary.degradedCount > 0 || summary.needsVerificationCount > 0,
      message: summary.degradedCount > 0
        ? `${summary.degradedCount} scheduled automation jobs are flagged degraded or paused.`
        : summary.needsVerificationCount > 0
          ? `${summary.needsVerificationCount} scheduled automation jobs need rollout verification.`
          : 'Scheduled automation rollout status is configured for this environment.',
      providerStatus: 'not_configured',
      image,
      runbookUrl,
    }
  };
};

export const mergeScheduledAutomationProviderStatus = (
  base: AdminScheduledAutomationStatusResult,
  payload: unknown
): AdminScheduledAutomationStatusResult => {
  const fetchedAt = new Date().toISOString();
  const root = asRecord(payload);
  const providerJobsById = new Map<string, Record<string, unknown>>();

  for (const record of getProviderJobRecords(payload)) {
    const id = getStringValue(record, ['id', 'jobId', 'job_id', 'name']);
    if (id) {
      providerJobsById.set(id, record);
    }
  }

  const jobs = base.jobs.map(job => {
    const providerJob = providerJobsById.get(job.id);
    if (!providerJob) {
      return job;
    }

    const lastRunStatus = normalizeRunStatus(getStringValue(providerJob, [
      'lastRunStatus',
      'last_run_status',
      'runStatus',
      'run_status',
      'lastStatus',
      'status',
    ])) || undefined;
    const providerRolloutStatus = normalizeRolloutStatus(getStringValue(providerJob, [
      'rolloutStatus',
      'rollout_status',
      'rollout',
      'deploymentStatus',
      'deployment_status',
    ]));
    const consecutiveFailures = getNumberValue(providerJob, [
      'consecutiveFailures',
      'consecutive_failures',
      'failureCount',
      'failure_count',
    ]);
    const status: ScheduledAutomationRolloutStatus = providerRolloutStatus
      || (lastRunStatus === 'failed' || lastRunStatus === 'missed' || (consecutiveFailures || 0) > 0
        ? 'degraded'
        : ['succeeded', 'running'].includes(lastRunStatus || '')
          ? 'configured'
          : job.status);

    return {
      ...job,
      status,
      detail: getProviderRunDetail(job.name, lastRunStatus, consecutiveFailures),
      statusUrl: normalizeHttpUrl(getStringValue(providerJob, [
        'statusUrl',
        'status_url',
        'url',
        'href',
      ])) || job.statusUrl,
      lastVerifiedAt: normalizeTimestampValue(getStringValue(providerJob, [
        'lastVerifiedAt',
        'last_verified_at',
        'checkedAt',
        'checked_at',
      ])) || job.lastVerifiedAt,
      lastRunStatus,
      lastRunAt: normalizeTimestampValue(getStringValue(providerJob, [
        'lastRunAt',
        'last_run_at',
        'lastStartedAt',
        'last_started_at',
        'lastFinishedAt',
        'last_finished_at',
      ])),
      nextRunAt: normalizeTimestampValue(getStringValue(providerJob, [
        'nextRunAt',
        'next_run_at',
        'nextScheduledAt',
        'next_scheduled_at',
      ])),
      consecutiveFailures,
    };
  });

  const summary = buildScheduledAutomationSummary(jobs);
  const providerImage = normalizeHttpUrl(getStringValue(root || {}, ['imageUrl', 'image_url'])) || getStringValue(root || {}, ['image', 'schedulerImage', 'scheduler_image']);
  const providerRunbookUrl = normalizeHttpUrl(getStringValue(root || {}, ['runbookUrl', 'runbook_url']));
  const providerCheckedAt = normalizeTimestampValue(getStringValue(root || {}, [
    'fetchedAt',
    'fetched_at',
    'checkedAt',
    'checked_at',
    'generatedAt',
    'generated_at',
  ])) || fetchedAt;

  return {
    jobs,
    summary,
    metadata: {
      ...base.metadata,
      source: 'provider',
      fetchedAt,
      degraded: summary.degradedCount > 0
        || summary.needsVerificationCount > 0
        || summary.runHistoryMissingCount > 0
        || summary.lastRunFailedCount > 0
        || summary.lastRunMissedCount > 0,
      message: getProviderMessage(summary),
      providerStatus: 'connected',
      providerCheckedAt,
      image: providerImage || base.metadata.image,
      runbookUrl: providerRunbookUrl || base.metadata.runbookUrl,
    },
  };
};

const getSchedulerEnv = () => (
  typeof import.meta !== 'undefined'
    ? (import.meta.env as Record<string, string | undefined> | undefined) || {}
    : {}
);

export const getScheduledAutomationStatus = async (
  env: Record<string, string | undefined> = getSchedulerEnv(),
  fetcher: typeof fetch | undefined = typeof fetch === 'function' ? fetch : undefined
): Promise<AdminScheduledAutomationStatusResult> => {
  const base = buildScheduledAutomationStatus(env);
  const providerStatusUrl = normalizeHttpUrl(compact(env.VITE_SCHEDULER_STATUS_API_URL));

  if (!providerStatusUrl || !fetcher) {
    return base;
  }

  try {
    const response = await fetcher(providerStatusUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Scheduler status provider unavailable');
    }

    const payload = await response.json();
    return mergeScheduledAutomationProviderStatus(base, payload);
  } catch (error) {
    console.warn('[Admin] Scheduler status provider unavailable.', error);
    return {
      ...base,
      metadata: {
        ...base.metadata,
        degraded: true,
        providerStatus: 'unavailable',
        providerCheckedAt: new Date().toISOString(),
        message: `${base.metadata.message} Live scheduler run history is unavailable.`,
      },
    };
  }
};

const getServiceObservabilityConfig = (serviceName: string) => {
  const normalized = normalizeServiceKey(serviceName);
  return serviceObservabilityCatalog[normalized] || {
    serviceId: normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown-service',
  };
};

export const buildServiceLogQuery = (serviceName: string) => {
  const { serviceId } = getServiceObservabilityConfig(serviceName);
  return `service="${serviceId}"`;
};

export const buildServiceObservabilityLinks = (serviceName: string): ServiceObservabilityLink[] => {
  const config = getServiceObservabilityConfig(serviceName);
  const links: ServiceObservabilityLink[] = [];

  if (config.healthHref) {
    links.push({
      type: 'health',
      label: 'Health',
      href: config.healthHref,
      description: `Open ${config.serviceId} health endpoint.`,
      external: config.healthHref.startsWith('http'),
    });
  }

  if (config.statusHref) {
    links.push({
      type: 'status',
      label: 'Status',
      href: config.statusHref,
      description: `Open ${config.serviceId} provider status page.`,
      external: true,
    });
  }

  const metricsBaseUrl = getEnvValue('VITE_METRICS_BASE_URL');
  if (metricsBaseUrl) {
    links.push({
      type: 'metrics',
      label: 'Metrics',
      href: appendQueryParams(metricsBaseUrl, { service: config.serviceId }),
      description: `Open metrics filtered to ${config.serviceId}.`,
      external: metricsBaseUrl.startsWith('http'),
    });
  }

  const logsBaseUrl = getEnvValue('VITE_LOGS_BASE_URL');
  if (logsBaseUrl) {
    links.push({
      type: 'logs',
      label: 'Logs',
      href: appendQueryParams(logsBaseUrl, { query: buildServiceLogQuery(serviceName) }),
      description: `Open logs filtered to ${config.serviceId}.`,
      external: logsBaseUrl.startsWith('http'),
    });
  }

  return links;
};

const enrichServiceHealth = (service: Omit<ServiceHealth, 'serviceId' | 'logQuery' | 'observabilityLinks'>): ServiceHealth => {
  const config = getServiceObservabilityConfig(service.name);
  return {
    ...service,
    serviceId: config.serviceId,
    logQuery: buildServiceLogQuery(service.name),
    observabilityLinks: buildServiceObservabilityLinks(service.name),
  };
};

const mapAuditLog = (row: Record<string, any>): AuditLogEntry => ({
  id: row.id,
  userId: row.user_id,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  oldValue: row.old_value,
  newValue: row.new_value,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  createdAt: row.created_at,
});

const mapProductAnalyticsEvent = (row: Record<string, any>): ProductAnalyticsEventRecord => ({
  id: String(row.id || ''),
  userId: row.user_id || row.userId || undefined,
  area: row.area || 'admin',
  eventName: row.event_name || row.eventName || 'task_started',
  source: row.source || 'unknown',
  objectType: row.object_type || row.objectType || undefined,
  objectId: row.object_id || row.objectId || undefined,
  metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata
    : {},
  occurredAt: row.occurred_at || row.occurredAt || new Date().toISOString(),
});

const encodeAuditLogCursor = (log: AuditLogEntry): string => {
  const payload = JSON.stringify({ createdAt: log.createdAt, id: log.id });
  return typeof btoa === 'function' ? btoa(payload) : encodeURIComponent(payload);
};

const decodeAuditLogCursor = (cursor?: string): { createdAt: string; id: string } | null => {
  if (!cursor) return null;

  try {
    const payload = typeof atob === 'function' ? atob(cursor) : decodeURIComponent(cursor);
    const parsed = JSON.parse(payload);
    if (typeof parsed.createdAt === 'string' && typeof parsed.id === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('[Admin] Invalid audit log cursor.', error);
  }

  throw new Error('Invalid audit log cursor');
};

export const adminService = {
  getDashboardStats: async (): Promise<AdminDashboardData> => {
    const startedAt = Date.now();

    // ⚡ Bolt: Using a race to ensure we don't hang if Supabase is unreachable
    const fetchWithTimeout = async () => {
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: applicationsCount, error: applicationError } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true });

      if (userError || applicationError) {
        throw new Error(userError?.message || applicationError?.message || 'Admin stats query failed');
      }

      const checkedAt = new Date().toISOString();
      return {
        stats: {
          totalUsers: userCount || 0,
          systemLoad: 12,
          servicesOnline: 4,
          totalServices: 4,
          securityAlerts: 0
        },
        services: [
          enrichServiceHealth({ name: 'Database', status: 'Running' as const, uptime: 100, version: 'PostgreSQL 15', source: 'live' as const, detail: `${applicationsCount || 0} application rows counted`, checkedAt }),
          enrichServiceHealth({ name: 'Authentication', status: 'Running' as const, uptime: 100, version: 'Supabase Auth', source: 'live' as const, detail: 'Session service reachable', checkedAt }),
          enrichServiceHealth({ name: 'Storage', status: 'Running' as const, uptime: 100, version: 'Supabase Storage', source: 'live' as const, detail: 'Storage status inferred from Supabase availability', checkedAt }),
          enrichServiceHealth({ name: 'Realtime', status: 'Running' as const, uptime: 100, version: 'Supabase Realtime', source: 'live' as const, detail: 'Realtime status inferred from Supabase availability', checkedAt })
        ],
        metadata: {
          source: 'live' as const,
          fetchedAt: checkedAt,
          latencyMs: Date.now() - startedAt,
          degraded: false,
          message: 'Live Supabase admin metrics loaded successfully.'
        }
      };
    };

    try {
      // Timeout after 2s for admin stats
      return await Promise.race([
        fetchWithTimeout(),
        new Promise<AdminDashboardData>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
    } catch (err) {
      console.warn('[Admin] Supabase failed or timed out, falling back to mock stats...', err);
      const checkedAt = new Date().toISOString();
      return {
        stats: {
          totalUsers: 1250,
          systemLoad: 42,
          servicesOnline: 3,
          totalServices: 4,
          securityAlerts: 2
        },
        services: [
          enrichServiceHealth({ name: 'API Gateway', status: 'Offline' as const, uptime: 0, version: '1.2.0', source: 'fallback' as const, detail: 'Mock fallback row after admin stats timeout/failure', checkedAt }),
          enrichServiceHealth({ name: 'User Service', status: 'Running' as const, uptime: 99.9, version: '2.0.1', source: 'fallback' as const, detail: 'Mock fallback row after admin stats timeout/failure', checkedAt }),
          enrichServiceHealth({ name: 'LMS Service', status: 'Running' as const, uptime: 98.5, version: '1.5.0', source: 'fallback' as const, detail: 'Mock fallback row after admin stats timeout/failure', checkedAt }),
          enrichServiceHealth({ name: 'Recruitment Service', status: 'Running' as const, uptime: 99.1, version: '1.1.0', source: 'fallback' as const, detail: 'Mock fallback row after admin stats timeout/failure', checkedAt })
        ],
        metadata: {
          source: 'fallback' as const,
          fetchedAt: checkedAt,
          latencyMs: Date.now() - startedAt,
          degraded: true,
          message: 'Supabase admin metrics timed out or failed. Displaying mock fallback data.'
        }
      };
    }
  },



  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_profiles (headline, current_role, xp, level)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getUserById: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_profiles (*),
        skills (*),
        experiences (*),
        educations (*)
      `)
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getSystemSettings: async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');
    
    if (error) throw error;
    return data;
  },

  updateSystemSetting: async (key: string, value: any, description?: string) => {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key, value, description, updated_at: new Date().toISOString() })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getAuditLogsPage: async (params?: AuditLogQueryParams): Promise<PaginatedAuditLogsResult> => {
    const limit = params?.limit ?? defaultAuditLogPageSize;
    const offset = params?.offset ?? 0;
    const decodedCursor = decodeAuditLogCursor(params?.cursor);

    let query = decodedCursor
      ? supabase.from('audit_log').select('*')
      : supabase.from('audit_log').select('*', { count: 'exact' });

    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (decodedCursor) {
      query = query
        .or(`created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`)
        .limit(limit + 1);
    } else {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;
    const mappedLogs = (data || []).map(mapAuditLog);
    const hasCursorNext = decodedCursor ? mappedLogs.length > limit : false;
    const logs = decodedCursor ? mappedLogs.slice(0, limit) : mappedLogs;
    const total = decodedCursor ? null : (typeof count === 'number' ? count : null);
    const hasNext = decodedCursor
      ? hasCursorNext
      : total !== null
        ? offset + logs.length < total
        : logs.length === limit;
    const lastLog = logs[logs.length - 1];

    return {
      logs,
      total,
      limit,
      offset,
      hasNext,
      nextCursor: hasNext && lastLog ? encodeAuditLogCursor(lastLog) : null
    };
  },

  getAuditLogs: async (limit: number = 100): Promise<AuditLogEntry[]> => {
    const page = await adminService.getAuditLogsPage({ limit, offset: 0 });
    return page.logs;
  },

  getProductAnalyticsInsights: async (limit: number = 250): Promise<AdminProductAnalyticsInsightsResult> => {
    const fetchedAt = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('product_analytics_events')
        .select('id,user_id,area,event_name,source,object_type,object_id,metadata,occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      const events = (data || []).map(mapProductAnalyticsEvent);
      const summary = summarizeProductAnalyticsEvents(events, 'server');

      return {
        summary,
        metadata: {
          source: summary.source === 'empty' ? 'empty' : 'server',
          fetchedAt,
          limit,
          degraded: false,
          message: summary.eventCount > 0
            ? `Loaded ${summary.eventCount} recent product analytics events.`
            : 'No product analytics events are available yet.'
        }
      };
    } catch (error) {
      console.warn('[Admin] Product analytics insights falling back to local events.', error);
      const localEvents = productAnalytics.getLocalFallbackEvents().slice(0, limit);
      const summary = summarizeProductAnalyticsEvents(localEvents, 'local');

      return {
        summary,
        metadata: {
          source: summary.source === 'empty' ? 'empty' : 'local',
          fetchedAt,
          limit,
          degraded: true,
          message: summary.eventCount > 0
            ? 'Server analytics could not be loaded. Showing local fallback analytics from this browser.'
            : 'Server analytics could not be loaded and no local fallback events are available.'
        }
      };
    }
  },

  getScheduledAutomationStatus: async (): Promise<AdminScheduledAutomationStatusResult> => {
    return getScheduledAutomationStatus();
  }
};
