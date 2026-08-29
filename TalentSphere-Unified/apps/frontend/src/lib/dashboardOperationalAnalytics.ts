import { productAnalytics, type ProductAnalyticsArea, type ProductAnalyticsEventName } from './productAnalytics';

export type DashboardOperationalAnalyticsAction =
  | 'dashboard_data_loaded'
  | 'dashboard_data_load_failed'
  | 'dashboard_degraded_state_shown'
  | 'dashboard_refresh_clicked'
  | 'dashboard_retry_clicked'
  | 'dashboard_primary_action_opened'
  | 'dashboard_checklist_action_opened'
  | 'dashboard_stat_card_opened'
  | 'dashboard_quick_action_opened'
  | 'dashboard_panel_handoff_opened'
  | 'admin_console_loaded'
  | 'admin_console_load_failed'
  | 'admin_console_refresh_clicked'
  | 'admin_degraded_state_shown'
  | 'admin_service_investigation_opened'
  | 'admin_audit_retry_clicked'
  | 'admin_audit_load_more_clicked'
  | 'admin_audit_load_completed'
  | 'admin_audit_load_failed'
  | 'admin_product_analytics_loaded'
  | 'admin_product_analytics_load_failed'
  | 'admin_product_analytics_retry_clicked'
  | 'admin_scheduler_status_loaded'
  | 'admin_scheduler_status_refresh_clicked';

export type DashboardOperationalRole = 'talent' | 'recruiter' | 'admin';

interface DashboardOperationalAnalyticsInput {
  userId?: string | null;
  action: DashboardOperationalAnalyticsAction;
  role?: DashboardOperationalRole;
  sourceStatus?: 'live' | 'partial' | 'error' | 'fallback';
  issueCount?: number;
  route?: string;
  entryPoint?: string;
  taskId?: string;
  taskCompleted?: boolean;
  completedTaskCount?: number;
  totalTaskCount?: number;
  statKey?: string;
  serviceId?: string;
  serviceStatus?: string;
  linkType?: string;
  linkExternal?: boolean;
  serviceCount?: number;
  degradedServiceCount?: number;
  securityAlertCount?: number;
  latencyMs?: number;
  visibleItemCount?: number;
  auditLoadedCount?: number;
  auditTotalKnown?: boolean;
  auditHasNext?: boolean;
  schedulerConfiguredCount?: number;
  schedulerNeedsVerificationCount?: number;
  schedulerDegradedCount?: number;
  schedulerRunHistoryReportedCount?: number;
  schedulerRunHistoryMissingCount?: number;
  schedulerLastRunFailedCount?: number;
  schedulerLastRunMissedCount?: number;
  errorCategory?: string;
}

const adminActions = new Set<DashboardOperationalAnalyticsAction>([
  'admin_console_loaded',
  'admin_console_load_failed',
  'admin_console_refresh_clicked',
  'admin_degraded_state_shown',
  'admin_service_investigation_opened',
  'admin_audit_retry_clicked',
  'admin_audit_load_more_clicked',
  'admin_audit_load_completed',
  'admin_audit_load_failed',
  'admin_product_analytics_loaded',
  'admin_product_analytics_load_failed',
  'admin_product_analytics_retry_clicked',
  'admin_scheduler_status_loaded',
  'admin_scheduler_status_refresh_clicked',
]);

const getArea = (action: DashboardOperationalAnalyticsAction): ProductAnalyticsArea => (
  adminActions.has(action) ? 'admin' : 'dashboard'
);

const getEventName = (action: DashboardOperationalAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'dashboard_degraded_state_shown':
    case 'admin_degraded_state_shown':
      return 'degraded_state_shown';
    case 'dashboard_retry_clicked':
    case 'admin_audit_retry_clicked':
    case 'admin_product_analytics_retry_clicked':
      return 'error_recovery_clicked';
    case 'dashboard_data_loaded':
    case 'admin_console_loaded':
    case 'admin_audit_load_completed':
    case 'admin_product_analytics_loaded':
    case 'admin_scheduler_status_loaded':
      return 'task_completed';
    case 'admin_console_load_failed':
    case 'dashboard_data_load_failed':
    case 'admin_audit_load_failed':
    case 'admin_product_analytics_load_failed':
      return 'task_failed';
    case 'dashboard_primary_action_opened':
    case 'dashboard_checklist_action_opened':
    case 'dashboard_stat_card_opened':
    case 'dashboard_quick_action_opened':
    case 'dashboard_panel_handoff_opened':
    case 'dashboard_refresh_clicked':
    case 'admin_console_refresh_clicked':
    case 'admin_service_investigation_opened':
    case 'admin_audit_load_more_clicked':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: DashboardOperationalAnalyticsAction) => {
  switch (action) {
    case 'dashboard_retry_clicked':
      return 'dashboard_recovery';
    case 'dashboard_checklist_action_opened':
      return 'dashboard_checklist';
    case 'dashboard_stat_card_opened':
      return 'dashboard_stat';
    case 'dashboard_quick_action_opened':
      return 'dashboard_quick_action';
    case 'dashboard_panel_handoff_opened':
      return 'dashboard_panel';
    case 'admin_service_investigation_opened':
      return 'service_investigation';
    case 'admin_degraded_state_shown':
      return 'admin_service_health';
    case 'admin_audit_retry_clicked':
    case 'admin_audit_load_more_clicked':
    case 'admin_audit_load_completed':
    case 'admin_audit_load_failed':
      return 'audit_log';
    case 'admin_product_analytics_loaded':
    case 'admin_product_analytics_load_failed':
    case 'admin_product_analytics_retry_clicked':
      return 'product_analytics_insights';
    case 'admin_scheduler_status_loaded':
    case 'admin_scheduler_status_refresh_clicked':
      return 'scheduled_automation_status';
    case 'admin_console_loaded':
    case 'admin_console_load_failed':
    case 'admin_console_refresh_clicked':
      return 'admin_console';
    case 'dashboard_data_loaded':
    case 'dashboard_degraded_state_shown':
    case 'dashboard_primary_action_opened':
    default:
      return 'dashboard';
  }
};

const getObjectId = ({
  serviceId,
  taskId,
  statKey,
  route,
}: Pick<DashboardOperationalAnalyticsInput, 'serviceId' | 'taskId' | 'statKey' | 'route'>) => (
  serviceId || taskId || statKey || route || undefined
);

const getLatencyBand = (latencyMs?: number) => {
  if (latencyMs === undefined || !Number.isFinite(latencyMs)) return undefined;
  if (latencyMs < 500) return 'fast';
  if (latencyMs < 1500) return 'moderate';
  return 'slow';
};

export const recordDashboardOperationalAnalytics = ({
  userId,
  action,
  role,
  sourceStatus,
  issueCount,
  route,
  entryPoint,
  taskId,
  taskCompleted,
  completedTaskCount,
  totalTaskCount,
  statKey,
  serviceId,
  serviceStatus,
  linkType,
  linkExternal,
  serviceCount,
  degradedServiceCount,
  securityAlertCount,
  latencyMs,
  visibleItemCount,
  auditLoadedCount,
  auditTotalKnown,
  auditHasNext,
  schedulerConfiguredCount,
  schedulerNeedsVerificationCount,
  schedulerDegradedCount,
  schedulerRunHistoryReportedCount,
  schedulerRunHistoryMissingCount,
  schedulerLastRunFailedCount,
  schedulerLastRunMissedCount,
  errorCategory,
}: DashboardOperationalAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: getArea(action),
    eventName: getEventName(action),
    source: getArea(action) === 'admin' ? 'admin_console' : 'dashboard_page',
    objectType: getObjectType(action),
    objectId: getObjectId({ serviceId, taskId, statKey, route }),
    metadata: {
      action,
      role,
      sourceStatus,
      issueCount,
      route,
      entryPoint,
      taskId,
      taskCompleted,
      completedTaskCount,
      totalTaskCount,
      statKey,
      serviceId,
      serviceStatus,
      linkType,
      linkExternal,
      serviceCount,
      degradedServiceCount,
      securityAlertCount,
      latencyBand: getLatencyBand(latencyMs),
      visibleItemCount,
      auditLoadedCount,
      auditTotalKnown,
      auditHasNext,
      schedulerConfiguredCount,
      schedulerNeedsVerificationCount,
      schedulerDegradedCount,
      schedulerRunHistoryReportedCount,
      schedulerRunHistoryMissingCount,
      schedulerLastRunFailedCount,
      schedulerLastRunMissedCount,
      errorCategory,
      userControl: action.endsWith('_shown')
        || action.endsWith('_loaded')
        || action.endsWith('_failed')
        || action === 'admin_audit_load_completed'
        ? 'observed'
        : 'explicit',
      mutationScope: 'read_only_operational_workflow',
    },
  });
};
