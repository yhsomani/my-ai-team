import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../../store/slices/authSlice';
import {
  adminService,
  triggerCsvDownload,
  type AdminDashboardData,
  type AdminProductAnalyticsInsightsResult,
  type AdminScheduledAutomationStatusResult,
  type AuditLogExportResult,
  type PaginatedAuditLogsResult,
  type RetentionPolicy,
  type SystemSetting,
} from '../../services/adminService';
import {
  trustAndSafetyService,
  type PaginatedModerationReportsResult,
} from '../../services/trustAndSafetyService';
import { recordDashboardOperationalAnalytics } from '../../lib/dashboardOperationalAnalytics';
import AdminDashboard from './AdminDashboard';

vi.mock('../../services/adminService', () => ({
  adminService: {
    getDashboardStats: vi.fn(),
    getAuditLogsPage: vi.fn(),
    getProductAnalyticsInsights: vi.fn(),
    getScheduledAutomationStatus: vi.fn(),
    getAllUsers: vi.fn(),
    updateUserRole: vi.fn(),
    getSystemSettings: vi.fn(),
    updateSystemSetting: vi.fn(),
    getRetentionPolicy: vi.fn(),
    saveRetentionPolicy: vi.fn(),
    exportAuditLogCsv: vi.fn(),
  },
  triggerCsvDownload: vi.fn(),
}));

vi.mock('../../services/trustAndSafetyService', () => ({
  REPORT_SUBMITTED_EVENT: 'talentsphere:report-submitted',
  REPORT_RESOLVED_EVENT: 'talentsphere:report-resolved',
  trustAndSafetyService: {
    getModerationReports: vi.fn(),
    updateReportStatus: vi.fn(),
    submitContentReport: vi.fn(),
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

const adminUsers = [
  {
    id: 'user-001',
    email: 'person@example.com',
    full_name: 'Person Example',
    role: 'USER',
    created_at: '2026-06-01T00:00:00.000Z',
    user_profiles: null,
  },
] as any[];

const systemSettings: SystemSetting[] = [
  {
    key: 'enable_registrations',
    value: true,
    description: 'Allow new account registration.',
    updatedBy: null,
    updatedAt: null,
  },
  {
    key: 'feature_flags',
    value: {
      version: 1,
      defaults: {
        enable_auth: true,
        enable_user_management: true,
        enable_profile_management: true,
        enable_job_recommendations: false,
      },
      overrides: {},
    },
    description: 'Feature-flag governance store',
    updatedBy: 'admin-user',
    updatedAt: '2026-09-06T00:00:00.000Z',
  },
  {
    key: 'feature_flag_descriptions',
    value: {
      enable_auth: 'Authentication and authorization',
      enable_user_management: 'User account management',
      enable_profile_management: 'User profile CRUD operations',
      enable_job_recommendations: 'AI-powered job recommendations',
    },
    description: 'Human-readable descriptions',
    updatedBy: 'admin-user',
    updatedAt: '2026-09-06T00:00:00.000Z',
  },
];

const retentionPolicy: RetentionPolicy = {
  auditLogRetentionTtlDays: 90,
  policyNote: 'Audit logs retained for 90 days.',
  updatedAt: '2026-09-06T00:00:00.000Z',
};

const csvExportResult: AuditLogExportResult = {
  csv: 'id,created_at,action,entity_type,entity_id,actor_user_id,ip_address\naudit-1,2026-06-28T00:05:00.000Z,admin.settings.reviewed,system_settings,settings-001,admin-user,203.0.113.10',
  rowCount: 1,
  filename: 'talentsphere-audit-log-2026-09-06-12-00-00.csv',
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
    vi.mocked(recordDashboardOperationalAnalytics).mockClear();
    vi.mocked(adminService.getAuditLogsPage).mockResolvedValue(auditLogResult);
    vi.mocked(adminService.getProductAnalyticsInsights).mockResolvedValue(analyticsInsights);
    vi.mocked(adminService.getScheduledAutomationStatus).mockResolvedValue(schedulerStatus);
    vi.mocked(adminService.getAllUsers).mockResolvedValue(adminUsers);
    vi.mocked(adminService.getSystemSettings).mockResolvedValue(systemSettings);
    vi.mocked(adminService.getRetentionPolicy).mockResolvedValue(retentionPolicy);
    vi.mocked(adminService.exportAuditLogCsv).mockResolvedValue(csvExportResult);
    vi.mocked(trustAndSafetyService.getModerationReports).mockResolvedValue({
      reports: [
        {
          id: 'rep-001',
          target_type: 'job_posting',
          target_id: 'job-101',
          target_title: 'Suspicious Crypto Trading Role',
          reason: 'scam',
          details: 'Asks for upfront payment.',
          status: 'pending',
          created_at: '2026-06-28T10:00:00.000Z',
          updated_at: '2026-06-28T10:00:00.000Z',
        },
      ],
      total: 1,
      pendingCount: 1,
      underReviewCount: 0,
      resolvedCount: 0,
      dismissedCount: 0,
    });
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
    expect(screen.getByRole('heading', { name: /Trust & Safety Moderation Queue/i })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Content moderation reports' })).toBeTruthy();
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

  it('exposes user management and system settings write-side panels with semantic rows', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);

    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'User Management' })).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'System Settings Management' })).toBeTruthy();
    });

    expect(screen.getByRole('table', { name: 'Admin users' })).toBeTruthy();
    expect(screen.getByRole('row', { name: 'person@example.com: role USER.' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Role for person@example.com' })).toBeTruthy();
    expect(screen.getByLabelText('Value for enable_registrations')).toBeTruthy();
    expectSvgIconsDecorative(document.body);
  });

  it('records admin_user_role_updated analytics when an admin promotes a user', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);
    vi.mocked(adminService.updateUserRole).mockResolvedValue({ ...adminUsers[0], role: 'RECRUITER' });

    renderAdminDashboard();

    const userRegion = await screen.findByRole('region', { name: 'User Management' });
    const roleSelect = await within(userRegion).findByRole('combobox', { name: 'Role for person@example.com' });
    fireEvent.change(roleSelect, { target: { value: 'RECRUITER' } });
    fireEvent.click(within(userRegion).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(adminService.updateUserRole).toHaveBeenCalledWith('user-001', 'RECRUITER');
    });
    expect(recordDashboardOperationalAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin_user_role_updated',
        userId: 'admin-user',
        role: 'admin',
        targetUserId: 'user-001',
        roleFrom: 'USER',
        roleTo: 'RECRUITER',
      }),
    );
    expect(within(userRegion).getByRole('status').textContent).toMatch(/Updated person@example.com to RECRUITER/i);
    expectSvgIconsDecorative(document.body);
  });

  it('records admin_system_setting_updated analytics when an admin saves a setting value', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);
    vi.mocked(adminService.updateSystemSetting).mockResolvedValue({
      ...systemSettings[0],
      value: false,
      updatedAt: '2026-09-06T00:00:00.000Z',
    });

    renderAdminDashboard();

    const settingsRegion = await screen.findByRole('region', { name: 'System Settings Management' });
    const valueTextarea = await within(settingsRegion).findByLabelText('Value for enable_registrations');
    const settingRow = valueTextarea.closest('tr')!;
    fireEvent.change(valueTextarea, { target: { value: 'false' } });
    fireEvent.click(within(settingRow).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(adminService.updateSystemSetting).toHaveBeenCalledWith(
        'enable_registrations',
        false,
        'Allow new account registration.',
      );
    });
    expect(recordDashboardOperationalAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin_system_setting_updated',
        userId: 'admin-user',
        role: 'admin',
        settingKey: 'enable_registrations',
        settingAction: 'update',
      }),
    );
    expect(within(settingsRegion).getByRole('status').textContent).toMatch(/Updated enable_registrations/i);
    expectSvgIconsDecorative(document.body);
  });

  it('shows safe failure copy when user or settings panels cannot load, without exposing raw errors', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);
    vi.mocked(adminService.getAllUsers).mockRejectedValue(new Error('postgres password=supersecret leaked'));
    vi.mocked(adminService.getSystemSettings).mockRejectedValue(new Error('service_role_token=topsecret'));

    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('User list could not be loaded.')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('System settings could not be loaded.')).toBeTruthy();
    });

    expect(screen.queryByText(/supersecret/i)).toBeNull();
    expect(screen.queryByText(/topsecret/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry Users' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry Settings' })).toBeTruthy();
    expectSvgIconsDecorative(document.body);
  });

  it('exposes the data export and retention panel with retention policy fields and GDPR/CCPA context', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);

    renderAdminDashboard();

    const complianceRegion = await screen.findByRole('region', { name: 'Data Export & Retention' });
    expect(complianceRegion).toBeTruthy();

    expect(await within(complianceRegion).findByLabelText('Audit log retention TTL in days')).toBeTruthy();
    expect(await within(complianceRegion).findByLabelText('Retention policy note')).toBeTruthy();
    expect(within(complianceRegion).getAllByText(/audit logs retained for 90 days/i).length).toBeGreaterThan(0);
    expect(within(complianceRegion).getByRole('button', { name: 'Save Policy' })).toBeTruthy();
    expect(within(complianceRegion).getByRole('button', { name: 'Export Audit Log CSV' })).toBeTruthy();
    expect(within(complianceRegion).getByRole('heading', { name: 'Data Subject Access (GDPR/CCPA)' })).toBeTruthy();
    expectSvgIconsDecorative(document.body);
  });

  it('records admin_retention_policy_updated analytics when an admin saves the retention TTL', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);
    vi.mocked(adminService.saveRetentionPolicy).mockResolvedValue({
      ...retentionPolicy,
      auditLogRetentionTtlDays: 180,
      updatedAt: '2026-09-06T12:00:00.000Z',
    });

    renderAdminDashboard();

    const complianceRegion = await screen.findByRole('region', { name: 'Data Export & Retention' });
    const ttlInput = await within(complianceRegion).findByLabelText('Audit log retention TTL in days');
    fireEvent.change(ttlInput, { target: { value: '180' } });
    fireEvent.click(within(complianceRegion).getByRole('button', { name: 'Save Policy' }));

    await waitFor(() => {
      expect(adminService.saveRetentionPolicy).toHaveBeenCalledWith(180, 'Audit logs retained for 90 days.');
    });
    expect(recordDashboardOperationalAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin_retention_policy_updated',
        userId: 'admin-user',
        role: 'admin',
        settingKey: 'data_retention',
        settingAction: 'update',
        retentionTtlDays: 180,
      }),
    );
    expect(within(complianceRegion).getByRole('status').textContent).toMatch(/180 days/i);
    expectSvgIconsDecorative(document.body);
  });

  it('records admin_audit_csv_export_completed analytics when an admin exports the audit log as CSV', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);

    renderAdminDashboard();

    const complianceRegion = await screen.findByRole('region', { name: 'Data Export & Retention' });
    fireEvent.click(await within(complianceRegion).findByRole('button', { name: 'Export Audit Log CSV' }));

    await waitFor(() => {
      expect(adminService.exportAuditLogCsv).toHaveBeenCalledTimes(1);
    });
    expect(triggerCsvDownload).toHaveBeenCalledWith(
      csvExportResult.csv,
      csvExportResult.filename,
    );
    expect(recordDashboardOperationalAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin_audit_csv_export_completed',
        userId: 'admin-user',
        role: 'admin',
        visibleItemCount: 1,
      }),
    );
    expect(within(complianceRegion).getByRole('status').textContent).toMatch(/1 audit log row/i);
    expectSvgIconsDecorative(document.body);
  });

  it('records admin_feature_flag_override_set analytics when an admin toggles a feature flag in the governance panel', async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(adminDashboardData);
    vi.mocked(adminService.updateSystemSetting).mockResolvedValue({
      key: 'feature_flags',
      value: {
        version: 1,
        defaults: {
          enable_auth: true,
          enable_user_management: true,
          enable_profile_management: true,
          enable_job_recommendations: false,
        },
        overrides: {
          enable_job_recommendations: true,
        },
      },
      description: 'Feature-flag governance store',
      updatedBy: 'admin-user',
      updatedAt: '2026-09-06T00:00:00.000Z',
    });

    renderAdminDashboard();

    const flagsRegion = await screen.findByRole('region', { name: 'Feature Flag Governance' });
    expect(flagsRegion).toBeTruthy();

    const toggle = await within(flagsRegion).findByRole('switch', { name: 'Toggle enable_job_recommendations' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(adminService.updateSystemSetting).toHaveBeenCalledWith(
        'feature_flags',
        expect.objectContaining({
          version: 1,
          overrides: {
            enable_job_recommendations: true,
          },
        }),
        expect.any(String),
      );
    });

    expect(recordDashboardOperationalAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin_feature_flag_override_set',
        userId: 'admin-user',
        role: 'admin',
        flagName: 'enable_job_recommendations',
        flagEnabled: true,
        settingKey: 'feature_flags',
        settingAction: 'override_set',
      }),
    );
    expectSvgIconsDecorative(document.body);
  });
});
