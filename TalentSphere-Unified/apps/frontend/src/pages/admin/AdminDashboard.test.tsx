import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  logs: [],
  total: 0,
  limit: 5,
  offset: 0,
  hasNext: false,
  nextCursor: null,
};

const analyticsInsights: AdminProductAnalyticsInsightsResult = {
  summary: {
    source: 'server',
    eventCount: 0,
    uniqueAreaCount: 0,
    uniqueUserCount: 0,
    failureCount: 0,
    degradedCount: 0,
    recoveryCount: 0,
    automationGeneratedCount: 0,
    automationAcceptedCount: 0,
    automationDismissedCount: 0,
    prefillUsedCount: 0,
    prefillRejectedCount: 0,
    handoffCount: 0,
    acceptanceRate: null,
    rejectionRate: null,
    failureRate: null,
    topAreas: [],
    topEvents: [],
    frictionSignals: [],
    improvementOpportunities: [],
  },
  metadata: {
    source: 'empty',
    fetchedAt: '2026-06-28T00:00:00.000Z',
    limit: 250,
    degraded: false,
    message: 'No product analytics events are available yet.',
  },
};

const schedulerStatus: AdminScheduledAutomationStatusResult = {
  jobs: [],
  summary: {
    total: 0,
    configuredCount: 0,
    needsVerificationCount: 0,
    degradedCount: 0,
    runHistoryReportedCount: 0,
    runHistoryMissingCount: 0,
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
  });
});
