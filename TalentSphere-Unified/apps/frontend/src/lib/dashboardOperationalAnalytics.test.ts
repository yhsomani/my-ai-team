import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordDashboardOperationalAnalytics } from './dashboardOperationalAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('dashboardOperationalAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records dashboard checklist handoffs as explicit task starts', () => {
    recordDashboardOperationalAnalytics({
      userId: 'user-1',
      action: 'dashboard_checklist_action_opened',
      role: 'talent',
      taskId: 'profile',
      route: '/profile',
      entryPoint: 'checklist_item',
      taskCompleted: false,
      completedTaskCount: 2,
      totalTaskCount: 5,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'dashboard',
      eventName: 'task_started',
      source: 'dashboard_page',
      objectType: 'dashboard_checklist',
      objectId: 'profile',
      metadata: {
        action: 'dashboard_checklist_action_opened',
        role: 'talent',
        sourceStatus: undefined,
        issueCount: undefined,
        route: '/profile',
        entryPoint: 'checklist_item',
        taskId: 'profile',
        taskCompleted: false,
        completedTaskCount: 2,
        totalTaskCount: 5,
        statKey: undefined,
        serviceId: undefined,
        serviceStatus: undefined,
        linkType: undefined,
        linkExternal: undefined,
        serviceCount: undefined,
        degradedServiceCount: undefined,
        securityAlertCount: undefined,
        latencyBand: undefined,
        visibleItemCount: undefined,
        auditLoadedCount: undefined,
        auditTotalKnown: undefined,
        auditHasNext: undefined,
        schedulerConfiguredCount: undefined,
        schedulerNeedsVerificationCount: undefined,
        schedulerDegradedCount: undefined,
        schedulerRunHistoryReportedCount: undefined,
        schedulerRunHistoryMissingCount: undefined,
        schedulerLastRunFailedCount: undefined,
        schedulerLastRunMissedCount: undefined,
        errorCategory: undefined,
        userControl: 'explicit',
        mutationScope: 'read_only_operational_workflow',
      },
    });
  });

  it('records degraded dashboard state without raw issue text', () => {
    recordDashboardOperationalAnalytics({
      action: 'dashboard_degraded_state_shown',
      role: 'recruiter',
      sourceStatus: 'partial',
      issueCount: 2,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'dashboard',
      eventName: 'degraded_state_shown',
      objectType: 'dashboard',
      metadata: expect.objectContaining({
        action: 'dashboard_degraded_state_shown',
        sourceStatus: 'partial',
        issueCount: 2,
        userControl: 'observed',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        issue: expect.anything(),
        issues: expect.anything(),
        rawError: expect.anything(),
      }),
    }));
  });

  it('records admin investigation handoffs without URLs or log queries', () => {
    recordDashboardOperationalAnalytics({
      action: 'admin_service_investigation_opened',
      role: 'admin',
      serviceId: 'api-gateway',
      serviceStatus: 'Degraded',
      linkType: 'logs',
      linkExternal: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'admin',
      eventName: 'task_started',
      source: 'admin_console',
      objectType: 'service_investigation',
      objectId: 'api-gateway',
      metadata: expect.objectContaining({
        action: 'admin_service_investigation_opened',
        serviceId: 'api-gateway',
        serviceStatus: 'Degraded',
        linkType: 'logs',
        linkExternal: true,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        href: expect.anything(),
        url: expect.anything(),
        logQuery: expect.anything(),
      }),
    }));
  });

  it('records admin audit pagination and completion as read-only events', () => {
    recordDashboardOperationalAnalytics({
      action: 'admin_audit_load_more_clicked',
      role: 'admin',
      auditLoadedCount: 5,
      auditTotalKnown: true,
      auditHasNext: true,
    });
    recordDashboardOperationalAnalytics({
      action: 'admin_audit_load_completed',
      role: 'admin',
      auditLoadedCount: 10,
      auditTotalKnown: true,
      auditHasNext: false,
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_started',
      objectType: 'audit_log',
      metadata: expect.objectContaining({
        action: 'admin_audit_load_more_clicked',
        auditLoadedCount: 5,
        auditTotalKnown: true,
        auditHasNext: true,
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'audit_log',
      metadata: expect.objectContaining({
        action: 'admin_audit_load_completed',
        auditLoadedCount: 10,
        auditHasNext: false,
        userControl: 'observed',
      }),
    }));
  });

  it('records admin failures with error category only', () => {
    recordDashboardOperationalAnalytics({
      action: 'admin_audit_load_failed',
      role: 'admin',
      errorCategory: 'network_error',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'admin',
      eventName: 'task_failed',
      objectType: 'audit_log',
      metadata: expect.objectContaining({
        action: 'admin_audit_load_failed',
        errorCategory: 'network_error',
      }),
    }));
  });

  it('records admin scheduler status with bounded counts only', () => {
    recordDashboardOperationalAnalytics({
      action: 'admin_scheduler_status_loaded',
      role: 'admin',
      sourceStatus: 'partial',
      visibleItemCount: 3,
      schedulerConfiguredCount: 0,
      schedulerNeedsVerificationCount: 3,
      schedulerDegradedCount: 0,
      schedulerRunHistoryReportedCount: 1,
      schedulerRunHistoryMissingCount: 2,
      schedulerLastRunFailedCount: 0,
      schedulerLastRunMissedCount: 0,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'admin',
      eventName: 'task_completed',
      source: 'admin_console',
      objectType: 'scheduled_automation_status',
      metadata: expect.objectContaining({
        action: 'admin_scheduler_status_loaded',
        visibleItemCount: 3,
        schedulerConfiguredCount: 0,
        schedulerNeedsVerificationCount: 3,
        schedulerDegradedCount: 0,
        schedulerRunHistoryReportedCount: 1,
        schedulerRunHistoryMissingCount: 2,
        schedulerLastRunFailedCount: 0,
        schedulerLastRunMissedCount: 0,
        userControl: 'observed',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        statusUrl: expect.anything(),
        runbookUrl: expect.anything(),
        secret: expect.anything(),
      }),
    }));
  });
});
