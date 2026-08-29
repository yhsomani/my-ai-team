import { expect, test, type Page } from '@playwright/test';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

type JsonRecord = Record<string, unknown>;

const profiles = [
  { id: 'admin-profile-001', full_name: 'Admin One', email: 'admin-one@example.test', created_at: '2026-06-27T10:00:00.000Z' },
  { id: 'talent-profile-001', full_name: 'Talent One', email: 'talent-one@example.test', created_at: '2026-06-27T09:00:00.000Z' },
  { id: 'recruiter-profile-001', full_name: 'Recruiter One', email: 'recruiter-one@example.test', created_at: '2026-06-27T08:00:00.000Z' },
];

const applications = [
  { id: 'application-001', user_id: 'talent-profile-001', job_id: 'job-001', status: 'PENDING', created_at: '2026-06-27T10:00:00.000Z' },
  { id: 'application-002', user_id: 'talent-profile-001', job_id: 'job-002', status: 'INTERVIEW', created_at: '2026-06-27T09:55:00.000Z' },
  { id: 'application-003', user_id: 'talent-profile-002', job_id: 'job-003', status: 'REJECTED', created_at: '2026-06-27T09:50:00.000Z' },
  { id: 'application-004', user_id: 'talent-profile-003', job_id: 'job-004', status: 'OFFER', created_at: '2026-06-27T09:45:00.000Z' },
];

const auditLogs = [
  { id: 'audit-007', user_id: 'admin-profile-001', action: 'admin.settings.reviewed', entity_type: 'system_settings', entity_id: 'settings-001', ip_address: '203.0.113.10', created_at: '2026-06-27T10:07:00.000Z' },
  { id: 'audit-006', user_id: 'admin-profile-001', action: 'admin.scheduler.checked', entity_type: 'scheduler', entity_id: 'saved-search-digest-discovery', ip_address: null, created_at: '2026-06-27T10:06:00.000Z' },
  { id: 'audit-005', user_id: 'admin-profile-001', action: 'admin.service.investigated', entity_type: 'service', entity_id: 'api-gateway', ip_address: null, created_at: '2026-06-27T10:05:00.000Z' },
  { id: 'audit-004', user_id: null, action: 'scheduler.audit.completed', entity_type: 'scheduler_run', entity_id: 'notification-digest-delivery', ip_address: null, created_at: '2026-06-27T10:04:00.000Z' },
  { id: 'audit-003', user_id: 'admin-profile-001', action: 'admin.product_analytics.loaded', entity_type: 'analytics', entity_id: 'product', ip_address: null, created_at: '2026-06-27T10:03:00.000Z' },
  { id: 'audit-002', user_id: 'admin-profile-001', action: 'admin.audit.paginated', entity_type: 'audit_log', entity_id: 'cursor-001', ip_address: null, created_at: '2026-06-27T10:02:00.000Z' },
  { id: 'audit-001', user_id: null, action: 'scheduler.audit.started', entity_type: 'scheduler_run', entity_id: 'networking-reminder-delivery', ip_address: null, created_at: '2026-06-27T10:01:00.000Z' },
];

const productAnalyticsEvents = [
  {
    id: 'analytics-004',
    user_id: 'admin-profile-001',
    area: 'admin',
    event_name: 'task_failed',
    source: 'admin_console',
    object_type: 'audit_log',
    object_id: 'audit_log',
    metadata: { action: 'admin_audit_load_failed', sourceStatus: 'error' },
    occurred_at: '2026-06-27T10:04:00.000Z',
  },
  {
    id: 'analytics-003',
    user_id: 'talent-profile-001',
    area: 'ai',
    event_name: 'automation_suggestion_saved',
    source: 'ai_assistant',
    object_type: 'automation_suggestion',
    object_id: 'suggestion-001',
    metadata: { suggestionType: 'learning_search' },
    occurred_at: '2026-06-27T10:03:00.000Z',
  },
  {
    id: 'analytics-002',
    user_id: 'talent-profile-001',
    area: 'lms',
    event_name: 'task_completed',
    source: 'learning_page',
    object_type: 'course',
    object_id: 'course-001',
    metadata: { action: 'lesson_completed' },
    occurred_at: '2026-06-27T10:02:00.000Z',
  },
  {
    id: 'analytics-001',
    user_id: 'recruiter-profile-001',
    area: 'candidates',
    event_name: 'degraded_state_shown',
    source: 'candidates_page',
    object_type: 'candidate_queue',
    object_id: 'queue',
    metadata: { sourceStatus: 'partial' },
    occurred_at: '2026-06-27T10:01:00.000Z',
  },
];

const asRecord = (value: unknown): JsonRecord => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {}
);

const installAdminStubs = async (
  page: Page,
  options: {
    onAuditLogRows?: (context: { cursor?: string; limit: number | null; offset: number }) => JsonRecord[];
  } = {},
) => {
  const analyticsPayloads: JsonRecord[] = [];

  await installNetworkStubs(page, {
    rest: {
      applications,
      auditLogs,
      productAnalyticsEvents,
      profiles,
      onAuditLogRows: options.onAuditLogRows,
      onProductAnalyticsInsert: (payload) => {
        analyticsPayloads.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : `analytics-e2e-${analyticsPayloads.length}`,
          occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : '2026-06-27T10:10:00.000Z',
          ...payload,
        };
      },
    },
  });
  await installE2EAuth(page, ['ROLE_ADMIN']);

  return { analyticsPayloads };
};

const findAnalyticsAction = (payloads: JsonRecord[], action: string) => (
  payloads.find((payload) => asRecord(payload.metadata).action === action)
);

test.describe('admin operational console', () => {
  test('renders source-labeled operational surfaces with scheduler status and audit pagination', async ({ page }) => {
    const { analyticsPayloads } = await installAdminStubs(page);

    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: /^Admin Console$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Product Analytics Insights$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Scheduled Automations$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Service Health$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Audit Log$/ })).toBeVisible();

    await expect(page.getByText('Live Supabase admin metrics loaded successfully.')).toBeVisible();
    await expect(page.getByText('Saved Search Discovery', { exact: true })).toBeVisible();
    await expect(page.getByText('Networking Reminder Delivery', { exact: true })).toBeVisible();
    await expect(page.getByText('Notification Digest Delivery', { exact: true })).toBeVisible();
    await expect(page.getByText('Needs Verification').first()).toBeVisible();
    await expect(page.getByText('Run Reported')).not.toBeVisible();

    await expect(page.getByText('Showing 5 of 7 recent events')).toBeVisible();
    await expect(page.getByText('admin.settings.reviewed')).toBeVisible();
    await expect(page.getByText('admin.audit.paginated')).not.toBeVisible();

    await page.getByRole('button', { name: 'Load more audit events' }).click();
    await expect(page.getByText('Showing 7 of 7 recent events')).toBeVisible();
    await expect(page.getByText('admin.audit.paginated')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load more audit events' })).toHaveCount(0);

    await expect.poll(() => Boolean(findAnalyticsAction(analyticsPayloads, 'admin_audit_load_more_clicked'))).toBe(true);
    await expect.poll(() => Boolean(findAnalyticsAction(analyticsPayloads, 'admin_audit_load_completed'))).toBe(true);

    const statusLink = page.getByRole('link', { name: /^Status$/ }).first();
    await expect(statusLink).toHaveAttribute('href', 'https://status.supabase.com/');
    await statusLink.dispatchEvent('click');

    await expect.poll(() => {
      const payload = findAnalyticsAction(analyticsPayloads, 'admin_service_investigation_opened');
      const metadata = asRecord(payload?.metadata);
      return metadata.serviceId === 'supabase-postgres'
        && metadata.linkType === 'status'
        && metadata.linkExternal === true
        && !JSON.stringify(payload).includes('status.supabase.com');
    }).toBe(true);

    await page.getByRole('button', { name: 'Refresh Status' }).click();
    await expect.poll(() => Boolean(findAnalyticsAction(analyticsPayloads, 'admin_scheduler_status_refresh_clicked'))).toBe(true);
  });

  test('keeps audit failure isolated and recovers through explicit retry', async ({ page }) => {
    let allowAuditLogs = false;
    const { analyticsPayloads } = await installAdminStubs(page, {
      onAuditLogRows: () => {
        if (!allowAuditLogs) {
          throw new Error('Audit fixture unavailable');
        }
        return auditLogs;
      },
    });

    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: /^Admin Console$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Service Health$/ })).toBeVisible();
    await expect(page.getByText('Audit logs could not be loaded.')).toBeVisible();
    await expect(page.getByText('Needs retry', { exact: true })).toBeVisible();
    await expect(page.getByText('Saved Search Discovery', { exact: true })).toBeVisible();

    await expect.poll(() => Boolean(findAnalyticsAction(analyticsPayloads, 'admin_audit_load_failed'))).toBe(true);

    allowAuditLogs = true;
    await page.getByRole('button', { name: 'Retry Audit Logs' }).click();

    await expect(page.getByText('Showing 5 of 7 recent events')).toBeVisible();
    await expect(page.getByText('admin.settings.reviewed')).toBeVisible();
    await expect(page.getByText('Needs retry', { exact: true })).toHaveCount(0);
    await expect.poll(() => Boolean(findAnalyticsAction(analyticsPayloads, 'admin_audit_retry_clicked'))).toBe(true);
  });
});
