import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../../store/slices/authSlice';
import {
  adminService,
  type AdminDashboardData,
  type AdminProductAnalyticsInsightsResult,
  type AdminScheduledAutomationStatusResult,
  type PaginatedAuditLogsResult,
} from '../../services/adminService';
import AdminDashboard from './AdminDashboard';

vi.mock('../../services/adminService', () => ({
  adminService: {
    getDashboardStats: vi.fn(),
    getAuditLogsPage: vi.fn(),
    getProductAnalyticsInsights: vi.fn(),
    getScheduledAutomationStatus: vi.fn(),
  },
}));

vi.mock('../../lib/dashboardOperationalAnalytics', () => ({
  recordDashboardOperationalAnalytics: vi.fn(),
}));

const adminDashboardData: AdminDashboardData = {
  stats: {
    totalUsers: 12,
    systemLoad: 18,
    servicesOnline: 1,
    totalServices: 1,
    securityAlerts: 0,
  },
  services: [
    {
      name: 'API Gateway',
      status: 'Running',
      uptime: 100,
      version: '1.0.0',
      source: 'live',
      detail: 'Health endpoint reachable',
      checkedAt: '2026-06-28T00:00:00.000Z',
      serviceId: 'api-gateway',
      observabilityLinks: [],
    },
  ],
  metadata: {
    source: 'live',
    fetchedAt: '2026-06-28T00:00:00.000Z',
    latencyMs: 42,
    degraded: false,
    message: 'Live Supabase admin metrics loaded successfully.',
  },
};

const auditLogResult: PaginatedAuditLogsResult = {
  logs: [
    {
      id: 'audit-admin-settings',
      userId: 'admin-user',
      action: 'admin.settings.reviewed',
      entityType: 'system_settings',
      entityId: 'settings-001',
      ipAddress: '203.0.113.10',
      createdAt: '2026-06-28T00:05:00.000Z',
    },
  ],
  total: 1,
  limit: 5,
  offset: 0,
  hasNext: false,
  nextCursor: null,
};

const analyticsInsights: AdminProductAnalyticsInsightsResult = {
  summary: {
    source: 'server',
    eventCount: 4,
    uniqueAreaCount: 1,
    uniqueUserCount: 2,
    failureCount: 1,
    degradedCount: 0,
    recoveryCount: 0,
    automationGeneratedCount: 0,
    automationAcceptedCount: 2,
    automationDismissedCount: 0,
    prefillUsedCount: 0,
    prefillRejectedCount: 0,
    handoffCount: 0,
    acceptanceRate: 50,
    rejectionRate: 0,
    failureRate: 25,
    topAreas: [
      {
        area: 'admin',
        eventCount: 4,
        failureCount: 1,
        degradedCount: 0,
        automationCount: 0,
      },
    ],
    topEvents: [],
    frictionSignals: [
      {
        label: 'Failed workflow events',
        value: '1',
        severity: 'warning',
        description: 'One admin workflow failed and needs follow-up.',
      },
    ],
    improvementOpportunities: [
      {
        id: 'admin-audit-retry',
        title: 'Improve audit retry visibility',
        priority: 'P1',
        area: 'admin',
        trigger: 'Audit log load failure',
        expectedImpact: 'Admins can recover faster from temporary audit outages.',
        suggestedAction: 'Keep audit retry controls visible with source-labeled state.',
        userControl: 'Admins keep manual retry control.',
      },
    ],
  },
  metadata: {
    source: 'server',
    fetchedAt: '2026-06-28T00:00:00.000Z',
    limit: 250,
    degraded: false,
    message: 'Product analytics events loaded.',
  },
};

const schedulerStatus: AdminScheduledAutomationStatusResult = {
  jobs: [
    {
      id: 'saved-search-digest-discovery',
      name: 'Saved Search Discovery',
      purpose: 'Find new saved-search matches and queue digest items.',
      schedule: '*/30 * * * *',
      command: 'npm run discover:saved-search-digests -- --commit',
      manifestPath: 'infra/k8s/base/notification-digest-cronjobs.yaml',
      requiredConfig: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      status: 'needs_verification',
      detail: 'CronJob manifest is present, but runtime execution still needs verification.',
    },
  ],
  summary: {
    total: 1,
    configuredCount: 0,
    needsVerificationCount: 1,
    degradedCount: 0,
    runHistoryReportedCount: 0,
    runHistoryMissingCount: 1,
    lastRunSucceededCount: 0,
    lastRunFailedCount: 0,
    lastRunRunningCount: 0,
    lastRunMissedCount: 0,
    lastRunUnknownCount: 0,
  },
  metadata: {
    source: 'frontend-config',
    fetchedAt: '2026-06-28T00:00:00.000Z',
    degraded: false,
    message: 'Scheduler catalog loaded.',
    providerStatus: 'not_configured',
  },
};

const expectSvgIconsDecorative = (container: ParentNode) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);

  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

const renderAdminDashboard = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'admin-user',
          email: 'admin@example.com',
          roles: ['ROLE_ADMIN'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <AdminDashboard />
    </Provider>,
  );

  return store;
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(adminService.getAuditLogsPage).mockResolvedValue(auditLogResult);
    vi.mocked(adminService.getProductAnalyticsInsights).mockResolvedValue(analyticsInsights);
    vi.mocked(adminService.getScheduledAutomationStatus).mockResolvedValue(schedulerStatus);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows safe admin console load failure copy without exposing raw errors', async () => {
    vi.mocked(adminService.getDashboardStats).mockRejectedValue(
      new Error('internal admin query failed with service_role_token=secret'),
    );

    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Admin console could not load' })).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Admin Console' })).toBeTruthy();
    expect(screen.getByText(/operational data did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry admin console' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/internal admin query failed/i)).toBeNull();
    expectSvgIconsDecorative(document.body);
  });

  it('exposes admin operational metrics, analytics, scheduler, service health, and audit rows with semantic structure', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);

    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Product Analytics Insights' })).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Scheduled automation jobs' })).toBeTruthy();
    });

    const adminMetrics = screen.getByRole('list', { name: 'Admin summary metrics' });
    expect(within(adminMetrics).getByRole('listitem', {
      name: 'Total Users: 12. Status: Active. Source: Live.',
    })).toBeTruthy();
    expect(within(adminMetrics).getByRole('listitem', {
      name: 'Services Online: 1/1. Status: Healthy. Source: Live.',
    })).toBeTruthy();

    const analyticsMetrics = screen.getByRole('list', { name: 'Product analytics summary metrics' });
    expect(within(analyticsMetrics).getByRole('listitem', { name: 'Recent Events: 4. 1 areas.' })).toBeTruthy();
    expect(within(analyticsMetrics).getByRole('listitem', { name: 'Friction: 25%. 1 signals.' })).toBeTruthy();

    expect(within(screen.getByRole('list', { name: 'Top product analytics areas' })).getByRole('listitem', {
      name: 'admin: 4 events, 1 friction signals, 0 automation events.',
    })).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Product analytics friction signals' })).getByRole('listitem', {
      name: 'Failed workflow events: 1. Severity: warning.',
    })).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Product analytics improvement opportunities' })).getByRole('listitem', {
      name: 'Improve audit retry visibility: P1, admin.',
    })).toBeTruthy();

    const schedulerSummary = screen.getByRole('list', { name: 'Scheduled automation summary' });
    expect(within(schedulerSummary).getByRole('listitem', { name: 'Needs Verification: 1.' })).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Scheduled automation jobs' })).getByRole('listitem', {
      name: 'Saved Search Discovery: Needs verification. Find new saved-search matches and queue digest items. Schedule: */30 * * * *.',
    })).toBeTruthy();

    expect(screen.getByRole('table', { name: 'Service health' })).toBeTruthy();
    expect(screen.getByRole('row', {
      name: 'API Gateway: Running, uptime 100%, source Live.',
    })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Audit log events' })).toBeTruthy();
    expect(screen.getByRole('row', {
      name: 'admin.settings.reviewed: system_settings · settings-001 by admin-user.',
    })).toBeTruthy();
    expectSvgIconsDecorative(document.body);
  });

  it('retries the existing admin console load workflow from the safe failure state', async () => {
    vi.mocked(adminService.getDashboardStats)
      .mockRejectedValueOnce(new Error('internal admin query failed with service_role_token=secret'))
      .mockResolvedValue(adminDashboardData);

    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry admin console' })).toBeTruthy();
    });

    const requestCountBeforeRetry = vi.mocked(adminService.getDashboardStats).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry admin console' }));

    await waitFor(() => {
      expect(adminService.getDashboardStats).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeTruthy();
    });
    expect(screen.queryByRole('heading', { name: 'Admin console could not load' })).toBeNull();
    expectSvgIconsDecorative(document.body);
  });
});
