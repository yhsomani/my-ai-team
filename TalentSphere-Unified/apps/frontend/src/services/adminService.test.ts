import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  adminService,
  buildScheduledAutomationStatus,
  buildServiceLogQuery,
  buildServiceObservabilityLinks,
  getScheduledAutomationStatus,
  mergeScheduledAutomationProviderStatus
} from './adminService';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('adminService', () => {
  let queryBuilder: any;
  let localStorageData: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageData = {};
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageData[key];
        }),
      },
    });

    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      range: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'audit-1',
            user_id: 'user-1',
            action: 'APPLICATION_STATUS_UPDATED',
            entity_type: 'job_application',
            entity_id: 'app-1',
            old_value: { status: 'PENDING' },
            new_value: { status: 'OFFER' },
            ip_address: '127.0.0.1',
            user_agent: 'Vitest',
            created_at: '2026-06-01T10:00:00.000Z',
          },
        ],
        error: null,
        count: 12,
      }),
    };

    (supabase.from as any).mockReturnValue(queryBuilder);
  });

  it('builds real health links for known backend services', () => {
    const links = buildServiceObservabilityLinks('Job Service');

    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'health',
        label: 'Health',
        href: '/api/v1/jobs/health',
      }),
    ]));
    expect(buildServiceLogQuery('Job Service')).toBe('service="job-service"');
  });

  it('builds provider status links for Supabase-backed services', () => {
    const links = buildServiceObservabilityLinks('Database');

    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'status',
        href: 'https://status.supabase.com/',
        external: true,
      }),
    ]));
    expect(buildServiceLogQuery('Database')).toBe('service="supabase-postgres"');
  });

  it('returns paginated audit log metadata from Supabase', async () => {
    const result = await adminService.getAuditLogsPage({
      limit: 5,
      offset: 5,
    });

    expect(supabase.from).toHaveBeenCalledWith('audit_log');
    expect(queryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(queryBuilder.order).toHaveBeenCalledWith('id', { ascending: false });
    expect(queryBuilder.range).toHaveBeenCalledWith(5, 9);
    expect(result.total).toBe(12);
    expect(result.limit).toBe(5);
    expect(result.offset).toBe(5);
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(result.logs[0]).toEqual({
      id: 'audit-1',
      userId: 'user-1',
      action: 'APPLICATION_STATUS_UPDATED',
      entityType: 'job_application',
      entityId: 'app-1',
      oldValue: { status: 'PENDING' },
      newValue: { status: 'OFFER' },
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      createdAt: '2026-06-01T10:00:00.000Z',
    });
  });

  it('preserves array return shape for getAuditLogs', async () => {
    const result = await adminService.getAuditLogs(3);

    expect(Array.isArray(result)).toBe(true);
    expect(queryBuilder.range).toHaveBeenCalledWith(0, 2);
    expect(result[0].id).toBe('audit-1');
  });

  it('uses cursor lookahead for stable audit log pagination', async () => {
    const firstPage = await adminService.getAuditLogsPage({
      limit: 1,
      offset: 0,
    });

    queryBuilder.limit.mockResolvedValueOnce({
      data: [
        {
          id: 'audit-0',
          user_id: 'user-2',
          action: 'USER_ROLE_UPDATED',
          entity_type: 'profile',
          entity_id: 'user-2',
          created_at: '2026-05-31T10:00:00.000Z',
        },
        {
          id: 'audit-overflow',
          user_id: 'user-3',
          action: 'SYSTEM_SETTING_UPDATED',
          entity_type: 'system_setting',
          entity_id: 'feature-x',
          created_at: '2026-05-30T10:00:00.000Z',
        },
      ],
      error: null,
    });

    const result = await adminService.getAuditLogsPage({
      limit: 1,
      cursor: firstPage.nextCursor || undefined,
    });

    expect(queryBuilder.select).toHaveBeenLastCalledWith('*');
    expect(queryBuilder.or).toHaveBeenCalledWith('created_at.lt.2026-06-01T10:00:00.000Z,and(created_at.eq.2026-06-01T10:00:00.000Z,id.lt.audit-1)');
    expect(queryBuilder.limit).toHaveBeenCalledWith(2);
    expect(queryBuilder.range).toHaveBeenCalledTimes(1);
    expect(result.total).toBeNull();
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].id).toBe('audit-0');
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('returns privacy-bounded product analytics insights from Supabase', async () => {
    queryBuilder.limit.mockResolvedValueOnce({
      data: [
        {
          id: 'analytics-1',
          user_id: 'user-1',
          area: 'resume',
          event_name: 'workflow_prefill_used',
          source: 'resume_builder',
          object_type: 'resume',
          object_id: 'private-resume-id',
          metadata: { rawText: 'private resume text' },
          occurred_at: '2026-06-26T10:00:00.000Z',
        },
        {
          id: 'analytics-2',
          user_id: 'user-2',
          area: 'billing',
          event_name: 'task_failed',
          source: 'billing_page',
          object_type: 'checkout',
          object_id: 'private-checkout-id',
          metadata: { rawError: 'private provider error' },
          occurred_at: '2026-06-26T10:01:00.000Z',
        },
      ],
      error: null,
    });

    const result = await adminService.getProductAnalyticsInsights(10);

    expect(supabase.from).toHaveBeenCalledWith('product_analytics_events');
    expect(queryBuilder.select).toHaveBeenCalledWith('id,user_id,area,event_name,source,object_type,object_id,metadata,occurred_at');
    expect(queryBuilder.order).toHaveBeenCalledWith('occurred_at', { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    expect(result.metadata.source).toBe('server');
    expect(result.summary).toMatchObject({
      eventCount: 2,
      uniqueAreaCount: 2,
      uniqueUserCount: 2,
      prefillUsedCount: 1,
      failureCount: 1,
    });

    const renderedSummary = JSON.stringify({
      topAreas: result.summary.topAreas,
      topEvents: result.summary.topEvents,
      frictionSignals: result.summary.frictionSignals,
    });
    expect(renderedSummary).not.toContain('private-resume-id');
    expect(renderedSummary).not.toContain('private provider error');
  });

  it('falls back to local product analytics events when Supabase insights fail', async () => {
    queryBuilder.limit.mockResolvedValueOnce({
      data: null,
      error: new Error('RLS denied'),
    });
    window.localStorage.setItem('talentsphere.productAnalytics.events', JSON.stringify([
      {
        id: 'local-analytics-1',
        area: 'ai',
        eventName: 'automation_suggestion_generated',
        source: 'ai_assistant',
        metadata: {},
        occurredAt: '2026-06-26T10:00:00.000Z',
      },
    ]));

    const result = await adminService.getProductAnalyticsInsights(10);

    expect(result.metadata.source).toBe('local');
    expect(result.metadata.degraded).toBe(true);
    expect(result.summary).toMatchObject({
      eventCount: 1,
      source: 'local',
      automationGeneratedCount: 1,
    });
  });

  it('marks scheduled automations as needing verification without rollout config', () => {
    const result = buildScheduledAutomationStatus({});

    expect(result.summary).toMatchObject({
      total: 3,
      configuredCount: 0,
      needsVerificationCount: 3,
      degradedCount: 0,
    });
    expect(result.metadata.degraded).toBe(true);
    expect(result.jobs[0]).toMatchObject({
      id: 'saved-search-digest-discovery',
      status: 'needs_verification',
      manifestPath: 'infra/k8s/base/notification-digest-cronjobs.yaml',
    });
    expect(JSON.stringify(result)).not.toContain('service-role');
    expect(JSON.stringify(result)).not.toContain('secret-key');
  });

  it('marks scheduled automations configured when a status URL is exposed', () => {
    const result = buildScheduledAutomationStatus({
      VITE_SCHEDULER_STATUS_BASE_URL: 'https://ops.example.com/scheduler',
      VITE_SCHEDULER_IMAGE: 'talentsphere/notification-digest-scheduler:2026-06-26',
      VITE_SCHEDULER_RUNBOOK_URL: 'https://ops.example.com/runbooks/scheduler',
      VITE_SCHEDULER_LAST_VERIFIED_AT: '2026-06-26T10:00:00.000Z',
    });

    expect(result.summary.configuredCount).toBe(3);
    expect(result.metadata.degraded).toBe(false);
    expect(result.metadata.image).toBe('talentsphere/notification-digest-scheduler:2026-06-26');
    expect(result.metadata.runbookUrl).toBe('https://ops.example.com/runbooks/scheduler');
    expect(result.jobs[0].statusUrl).toBe('https://ops.example.com/scheduler?job=saved-search-digest-discovery');
    expect(result.jobs[0].lastVerifiedAt).toBe('2026-06-26T10:00:00.000Z');
  });

  it('marks scheduled automations degraded when rollout is paused', () => {
    const result = buildScheduledAutomationStatus({
      VITE_SCHEDULER_ROLLOUT_STATUS: 'paused',
    });

    expect(result.summary).toMatchObject({
      configuredCount: 0,
      needsVerificationCount: 0,
      degradedCount: 3,
    });
    expect(result.metadata.message).toContain('degraded or paused');
  });

  it('merges provider scheduler run history into the expected job catalog', () => {
    const result = mergeScheduledAutomationProviderStatus(
      buildScheduledAutomationStatus({
        VITE_SCHEDULER_STATUS_BASE_URL: 'https://ops.example.com/scheduler',
      }),
      {
        checkedAt: '2026-06-26T10:10:00.000Z',
        runbookUrl: 'https://ops.example.com/runbooks/scheduler',
        jobs: [
          {
            id: 'saved-search-digest-discovery',
            status: 'succeeded',
            lastRunAt: '2026-06-26T10:00:00.000Z',
            nextRunAt: '2026-06-26T10:30:00.000Z',
            statusUrl: 'https://ops.example.com/scheduler/saved-search',
          },
          {
            id: 'networking-reminder-delivery',
            lastRunStatus: 'failed',
            consecutiveFailures: 2,
            lastRunAt: '2026-06-26T10:05:00.000Z',
          },
        ],
      }
    );

    expect(result.metadata.source).toBe('provider');
    expect(result.metadata.providerStatus).toBe('connected');
    expect(result.metadata.runbookUrl).toBe('https://ops.example.com/runbooks/scheduler');
    expect(result.summary).toMatchObject({
      total: 3,
      configuredCount: 2,
      degradedCount: 1,
      runHistoryReportedCount: 2,
      runHistoryMissingCount: 1,
      lastRunSucceededCount: 1,
      lastRunFailedCount: 1,
    });
    expect(result.jobs.find(job => job.id === 'saved-search-digest-discovery')).toMatchObject({
      status: 'configured',
      lastRunStatus: 'succeeded',
      lastRunAt: '2026-06-26T10:00:00.000Z',
      nextRunAt: '2026-06-26T10:30:00.000Z',
      statusUrl: 'https://ops.example.com/scheduler/saved-search',
    });
    expect(result.jobs.find(job => job.id === 'networking-reminder-delivery')).toMatchObject({
      status: 'degraded',
      lastRunStatus: 'failed',
      consecutiveFailures: 2,
    });
    expect(JSON.stringify(result)).not.toContain('SUPABASE_SERVICE_ROLE_KEY=');
  });

  it('fetches provider scheduler run history when a safe API URL is configured', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        jobs: [
          {
            id: 'notification-digest-delivery',
            runStatus: 'running',
            checkedAt: '2026-06-26T10:15:00.000Z',
          },
        ],
      }),
    });

    const result = await getScheduledAutomationStatus({
      VITE_SCHEDULER_STATUS_API_URL: 'https://ops.example.com/api/scheduler-status',
    }, fetcher as any);

    expect(fetcher).toHaveBeenCalledWith('https://ops.example.com/api/scheduler-status', {
      headers: {
        Accept: 'application/json',
      },
    });
    expect(result.metadata.source).toBe('provider');
    expect(result.metadata.providerStatus).toBe('connected');
    expect(result.jobs.find(job => job.id === 'notification-digest-delivery')).toMatchObject({
      status: 'configured',
      lastRunStatus: 'running',
    });
  });

  it('falls back to the rollout catalog when provider scheduler run history fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('private provider token leaked'));

    const result = await getScheduledAutomationStatus({
      VITE_SCHEDULER_STATUS_API_URL: 'https://ops.example.com/api/scheduler-status',
      VITE_SCHEDULER_ROLLOUT_STATUS: 'configured',
    }, fetcher as any);

    expect(result.metadata.source).toBe('frontend-config');
    expect(result.metadata.providerStatus).toBe('unavailable');
    expect(result.metadata.degraded).toBe(true);
    expect(result.metadata.message).toContain('Live scheduler run history is unavailable');
    expect(JSON.stringify(result)).not.toContain('private provider token leaked');
  });
});
