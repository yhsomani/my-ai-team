import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Badge } from '../../components/shared/Badge';
import { Skeleton } from '../../components/shared/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { Users, Server, ShieldCheck, Activity, AlertTriangle, RefreshCw, Database, FileText, ExternalLink, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { Button } from '../../components/shared/AuraButton';
import { adminService, type AdminDashboardData, type AdminProductAnalyticsInsightsResult, type AdminScheduledAutomationStatusResult, type AuditLogEntry, type ScheduledAutomationRolloutStatus, type ScheduledAutomationRunStatus, type ServiceHealth, type ServiceObservabilityLink } from '../../services/adminService';
import { useAppSelector } from '../../store/hooks';
import { recordDashboardOperationalAnalytics } from '../../lib/dashboardOperationalAnalytics';

const auditLogPageSize = 5;

const getAdminErrorCategory = (error: unknown) => {
  if (!error) return 'unknown_error';
  if (error instanceof TypeError) return 'network_error';
  if (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
    return 'timeout_or_abort';
  }
  return 'request_error';
};

const getAdminServiceId = (service: ServiceHealth) => (
  service.serviceId
  || service.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  || 'unknown-service'
);

const AdminDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState<number | null>(null);
  const [auditNextCursor, setAuditNextCursor] = useState<string | null>(null);
  const [auditHasNext, setAuditHasNext] = useState(false);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditLoadingMore, setAuditLoadingMore] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [analyticsInsights, setAnalyticsInsights] = useState<AdminProductAnalyticsInsightsResult | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<AdminScheduledAutomationStatusResult | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(true);

  const recordAdminAction = useCallback((
    action: Parameters<typeof recordDashboardOperationalAnalytics>[0]['action'],
    extra: Omit<Parameters<typeof recordDashboardOperationalAnalytics>[0], 'action' | 'userId' | 'role'> = {}
  ) => {
    recordDashboardOperationalAnalytics({
      userId: user?.id,
      role: 'admin',
      action,
      ...extra,
    });
  }, [user?.id]);

  const loadStats = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const statsData = await adminService.getDashboardStats();
      setData(statsData);
      const degradedServiceCount = statsData.services.filter(service => service.status !== 'Running').length;
      recordAdminAction('admin_console_loaded', {
        sourceStatus: statsData.metadata.source,
        serviceCount: statsData.services.length,
        degradedServiceCount,
        securityAlertCount: statsData.stats.securityAlerts,
        latencyMs: statsData.metadata.latencyMs,
      });
      if (statsData.metadata.degraded || degradedServiceCount > 0 || statsData.stats.securityAlerts > 0) {
        recordAdminAction('admin_degraded_state_shown', {
          sourceStatus: statsData.metadata.source,
          serviceCount: statsData.services.length,
          degradedServiceCount,
          securityAlertCount: statsData.stats.securityAlerts,
          latencyMs: statsData.metadata.latencyMs,
        });
      }
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
      recordAdminAction('admin_console_load_failed', {
        sourceStatus: 'error',
        errorCategory: getAdminErrorCategory(err),
      });
      setError("Failed to load admin console data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recordAdminAction]);

  const loadAuditLogs = useCallback(async (cursor?: string, append = false, loadedBefore = 0) => {
    setAuditError(null);
    if (append) {
      setAuditLoadingMore(true);
    } else {
      setAuditLoading(true);
    }

    try {
      const result = await adminService.getAuditLogsPage({
        limit: auditLogPageSize,
        cursor
      });

      setAuditLogs(prev => {
        if (!append) return result.logs;
        const existingIds = new Set(prev.map(log => log.id));
        return [...prev, ...result.logs.filter(log => !existingIds.has(log.id))];
      });
      if (!append || result.total !== null) {
        setAuditTotal(result.total);
      }
      setAuditNextCursor(result.nextCursor);
      setAuditHasNext(result.hasNext);
      if (append) {
        recordAdminAction('admin_audit_load_completed', {
          auditLoadedCount: loadedBefore + result.logs.length,
          auditTotalKnown: result.total !== null,
          auditHasNext: result.hasNext,
        });
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
      recordAdminAction('admin_audit_load_failed', {
        errorCategory: getAdminErrorCategory(err),
        auditLoadedCount: loadedBefore,
      });
      setAuditError("Audit logs could not be loaded.");
    } finally {
      setAuditLoading(false);
      setAuditLoadingMore(false);
    }
  }, [recordAdminAction]);

  const getAnalyticsSourceStatus = (source?: AdminProductAnalyticsInsightsResult['metadata']['source']) => {
    if (source === 'server') return 'live';
    if (source === 'local') return 'fallback';
    if (source === 'empty') return 'partial';
    return 'error';
  };

  const loadProductAnalyticsInsights = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const result = await adminService.getProductAnalyticsInsights();
      setAnalyticsInsights(result);
      recordAdminAction('admin_product_analytics_loaded', {
        sourceStatus: getAnalyticsSourceStatus(result.metadata.source),
        visibleItemCount: result.summary.eventCount,
        issueCount: result.summary.failureCount + result.summary.degradedCount,
      });
    } catch (err) {
      console.error("Failed to fetch product analytics insights", err);
      recordAdminAction('admin_product_analytics_load_failed', {
        sourceStatus: 'error',
        errorCategory: getAdminErrorCategory(err),
      });
      setAnalyticsError("Product analytics insights could not be loaded.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [recordAdminAction]);

  const getSchedulerSourceStatus = (result?: AdminScheduledAutomationStatusResult) => {
    if (!result) return 'partial';
    if (result.summary.degradedCount > 0) return 'error';
    if (result.metadata.providerStatus === 'unavailable') return 'error';
    if (result.summary.needsVerificationCount > 0) return 'partial';
    if (result.summary.runHistoryMissingCount > 0) return 'partial';
    return 'live';
  };

  const loadScheduledAutomationStatus = useCallback(async () => {
    setSchedulerLoading(true);

    try {
      const result = await adminService.getScheduledAutomationStatus();
      setSchedulerStatus(result);
      recordAdminAction('admin_scheduler_status_loaded', {
        sourceStatus: getSchedulerSourceStatus(result),
        visibleItemCount: result.summary.total,
        issueCount: result.summary.needsVerificationCount
          + result.summary.degradedCount
          + result.summary.lastRunFailedCount
          + result.summary.lastRunMissedCount
          + result.summary.runHistoryMissingCount,
        schedulerConfiguredCount: result.summary.configuredCount,
        schedulerNeedsVerificationCount: result.summary.needsVerificationCount,
        schedulerDegradedCount: result.summary.degradedCount,
        schedulerRunHistoryReportedCount: result.summary.runHistoryReportedCount,
        schedulerRunHistoryMissingCount: result.summary.runHistoryMissingCount,
        schedulerLastRunFailedCount: result.summary.lastRunFailedCount,
        schedulerLastRunMissedCount: result.summary.lastRunMissedCount,
      });
    } finally {
      setSchedulerLoading(false);
    }
  }, [recordAdminAction]);

  const refreshAdminConsole = useCallback(() => {
    void loadStats();
    void loadAuditLogs();
    void loadProductAnalyticsInsights();
    void loadScheduledAutomationStatus();
  }, [loadAuditLogs, loadProductAnalyticsInsights, loadScheduledAutomationStatus, loadStats]);

  useEffect(() => {
    refreshAdminConsole();
  }, [refreshAdminConsole]);

  const handleAdminRefresh = () => {
    recordAdminAction('admin_console_refresh_clicked', {
      sourceStatus: data?.metadata.source,
      serviceCount: data?.services.length,
      degradedServiceCount: data?.services.filter(service => service.status !== 'Running').length,
      securityAlertCount: data?.stats.securityAlerts,
    });
    refreshAdminConsole();
  };

  const handleAuditRetry = () => {
    recordAdminAction('admin_audit_retry_clicked', {
      auditLoadedCount: auditLogs.length,
      auditTotalKnown: auditTotal !== null,
      auditHasNext,
    });
    void loadAuditLogs();
  };

  const handleAuditLoadMore = () => {
    if (!auditNextCursor) return;
    recordAdminAction('admin_audit_load_more_clicked', {
      auditLoadedCount: auditLogs.length,
      auditTotalKnown: auditTotal !== null,
      auditHasNext,
    });
    void loadAuditLogs(auditNextCursor, true, auditLogs.length);
  };

  const handleProductAnalyticsRetry = () => {
    recordAdminAction('admin_product_analytics_retry_clicked', {
      sourceStatus: getAnalyticsSourceStatus(analyticsInsights?.metadata.source),
      visibleItemCount: analyticsInsights?.summary.eventCount,
      issueCount: analyticsInsights
        ? analyticsInsights.summary.failureCount + analyticsInsights.summary.degradedCount
        : undefined,
    });
    void loadProductAnalyticsInsights();
  };

  const handleScheduledAutomationRefresh = () => {
    recordAdminAction('admin_scheduler_status_refresh_clicked', {
      sourceStatus: getSchedulerSourceStatus(schedulerStatus || undefined),
      visibleItemCount: schedulerStatus?.summary.total,
      issueCount: schedulerStatus
        ? schedulerStatus.summary.needsVerificationCount
          + schedulerStatus.summary.degradedCount
          + schedulerStatus.summary.lastRunFailedCount
          + schedulerStatus.summary.lastRunMissedCount
          + schedulerStatus.summary.runHistoryMissingCount
        : undefined,
      schedulerConfiguredCount: schedulerStatus?.summary.configuredCount,
      schedulerNeedsVerificationCount: schedulerStatus?.summary.needsVerificationCount,
      schedulerDegradedCount: schedulerStatus?.summary.degradedCount,
      schedulerRunHistoryReportedCount: schedulerStatus?.summary.runHistoryReportedCount,
      schedulerRunHistoryMissingCount: schedulerStatus?.summary.runHistoryMissingCount,
      schedulerLastRunFailedCount: schedulerStatus?.summary.lastRunFailedCount,
      schedulerLastRunMissedCount: schedulerStatus?.summary.lastRunMissedCount,
    });
    void loadScheduledAutomationStatus();
  };

  const handleServiceInvestigation = (
    service: ServiceHealth,
    link: ServiceObservabilityLink
  ) => {
    recordAdminAction('admin_service_investigation_opened', {
      serviceId: getAdminServiceId(service),
      serviceStatus: service.status,
      linkType: link.type,
      linkExternal: Boolean(link.external),
    });
  };

  const formatTimestamp = (value?: string) => {
    if (!value) return 'Not refreshed yet';
    return new Date(value).toLocaleString();
  };

  const formatEntity = (log: AuditLogEntry) => {
    if (!log.entityType && !log.entityId) return 'Platform';
    if (!log.entityType) return log.entityId || 'Entity';
    if (!log.entityId) return log.entityType;
    return `${log.entityType} · ${log.entityId}`;
  };

  const getStatusDot = (status: string) => {
    if (status === 'Running') return 'bg-success';
    if (status === 'Degraded') return 'bg-warning';
    return 'bg-destructive';
  };

  const getSourceLabel = (source?: string) => {
    return source === 'fallback' ? 'Mock fallback' : 'Live';
  };

  const getSourceBadgeVariant = (source?: string) => {
    return source === 'fallback' ? 'warning' : 'success';
  };

  const getAnalyticsBadgeVariant = (source?: AdminProductAnalyticsInsightsResult['metadata']['source']) => {
    if (source === 'server') return 'success';
    if (source === 'local') return 'warning';
    return 'outline';
  };

  const getFrictionBadgeVariant = (severity: string) => {
    if (severity === 'critical') return 'destructive';
    if (severity === 'warning') return 'warning';
    return 'outline';
  };

  const getOpportunityBadgeVariant = (priority: string) => {
    if (priority === 'P0') return 'destructive';
    if (priority === 'P1') return 'warning';
    return 'outline';
  };

  const getSchedulerBadgeVariant = (status: ScheduledAutomationRolloutStatus) => {
    if (status === 'configured') return 'success';
    if (status === 'degraded') return 'destructive';
    return 'warning';
  };

  const getSchedulerStatusLabel = (status: ScheduledAutomationRolloutStatus) => {
    if (status === 'configured') return 'Configured';
    if (status === 'degraded') return 'Degraded';
    return 'Needs verification';
  };

  const getSchedulerRunBadgeVariant = (status: ScheduledAutomationRunStatus) => {
    if (status === 'succeeded') return 'success';
    if (status === 'failed' || status === 'missed') return 'destructive';
    if (status === 'running') return 'warning';
    return 'outline';
  };

  const getSchedulerRunStatusLabel = (status: ScheduledAutomationRunStatus) => {
    if (status === 'succeeded') return 'Last run succeeded';
    if (status === 'failed') return 'Last run failed';
    if (status === 'missed') return 'Last run missed';
    if (status === 'running') return 'Run active';
    return 'Run unknown';
  };

  const formatRate = (rate: number | null) => (
    rate === null ? 'n/a' : `${rate}%`
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data || !data.stats) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin Console"
          description="Global system overview and administrative controls."
          actions={
            <Button variant="outline" size="sm" onClick={handleAdminRefresh} isLoading={refreshing}>
              <RefreshCw size={14} />
              Refresh
            </Button>
          }
        />
        <EmptyState title="Error Loading Data" description={error || "Could not connect to backend services."} />
      </div>
    );
  }

  const { stats, services, metadata } = data;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: <Users size={18} />, trend: 'Active' },
    { label: 'System Load', value: `${stats.systemLoad}%`, icon: <Activity size={18} />, trend: stats.systemLoad < 80 ? 'Stable' : 'High' },
    { label: 'Services Online', value: `${stats.servicesOnline}/${stats.totalServices}`, icon: <Server size={18} />, status: stats.servicesOnline === stats.totalServices ? 'Healthy' : 'Degraded' },
    { label: 'Security Alerts', value: stats.securityAlerts.toString(), icon: <ShieldCheck size={18} />, status: stats.securityAlerts === 0 ? 'Safe' : 'Warning' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Admin Console" 
        description="Global system overview and administrative controls."
        badge={
          <Badge variant={getSourceBadgeVariant(metadata.source)}>
            {getSourceLabel(metadata.source)}
          </Badge>
        }
        actions={
          <>
            <Badge variant="outline" className="hidden md:inline-flex">
              Refreshed {formatTimestamp(metadata.fetchedAt)}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleAdminRefresh} isLoading={refreshing}>
              <RefreshCw size={14} />
              Refresh
            </Button>
          </>
        }
      />

      {metadata.degraded && (
        <div className="rounded-lg border border-warning/20 bg-warning-muted/20 p-4 flex gap-3">
          <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Fallback data is displayed</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {metadata.message} Last attempt took {metadata.latencyMs}ms.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--text-secondary)]">{stat.label}</span>
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-semibold">{stat.value}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={stat.status === 'Safe' || stat.status === 'Healthy' || stat.trend === 'Stable' || stat.trend === 'Active' ? 'success' : 'outline'}>
                {stat.trend || stat.status}
              </Badge>
              <Badge variant={getSourceBadgeVariant(metadata.source)}>
                {getSourceLabel(metadata.source)}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 border-b border-[var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Product Analytics Insights</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {analyticsInsights?.metadata.message || 'Summarizes recent workflow events without raw payloads.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {analyticsInsights && (
              <Badge variant={getAnalyticsBadgeVariant(analyticsInsights.metadata.source)}>
                {analyticsInsights.metadata.source === 'server'
                  ? 'Server'
                  : analyticsInsights.metadata.source === 'local'
                    ? 'Local fallback'
                    : 'No events'}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleProductAnalyticsRetry}
              isLoading={analyticsLoading}
            >
              <RefreshCw size={14} />
              Refresh Analytics
            </Button>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(item => (
              <Skeleton key={item} className="h-20 w-full" />
            ))}
          </div>
        ) : analyticsError ? (
          <div className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-secondary)]">{analyticsError}</p>
            <Button variant="outline" size="sm" onClick={handleProductAnalyticsRetry} isLoading={analyticsLoading}>
              <RefreshCw size={14} />
              Retry Analytics
            </Button>
          </div>
        ) : analyticsInsights ? (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border border-[var(--border-default)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-muted)]">Recent Events</span>
                  <BarChart3 size={14} className="text-accent" />
                </div>
                <p className="mt-2 text-xl font-semibold">{analyticsInsights.summary.eventCount}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{analyticsInsights.summary.uniqueAreaCount} areas</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-muted)]">Acceptance</span>
                  <TrendingUp size={14} className="text-success" />
                </div>
                <p className="mt-2 text-xl font-semibold">{formatRate(analyticsInsights.summary.acceptanceRate)}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{analyticsInsights.summary.automationAcceptedCount} accepted</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-muted)]">Rejection</span>
                  <AlertTriangle size={14} className="text-warning" />
                </div>
                <p className="mt-2 text-xl font-semibold">{formatRate(analyticsInsights.summary.rejectionRate)}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{analyticsInsights.summary.automationDismissedCount} rejected</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-muted)]">Friction</span>
                  <Activity size={14} className="text-destructive" />
                </div>
                <p className="mt-2 text-xl font-semibold">{formatRate(analyticsInsights.summary.failureRate)}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{analyticsInsights.summary.failureCount + analyticsInsights.summary.degradedCount} signals</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Top Areas</h4>
                {analyticsInsights.summary.topAreas.length > 0 ? (
                  <div className="space-y-2">
                    {analyticsInsights.summary.topAreas.map(area => (
                      <div key={area.area} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{area.area}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {area.failureCount + area.degradedCount} friction · {area.automationCount} automation
                          </p>
                        </div>
                        <Badge variant="outline">{area.eventCount}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No areas recorded yet.</p>
                )}
              </div>

              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Friction Signals</h4>
                <div className="space-y-2">
                  {analyticsInsights.summary.frictionSignals.map(signal => (
                    <div key={signal.label} className="rounded-lg border border-[var(--border-default)] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{signal.label}</p>
                        <Badge variant={getFrictionBadgeVariant(signal.severity)}>{signal.value}</Badge>
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{signal.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Improvement Opportunities</h4>
                <div className="space-y-2">
                  {analyticsInsights.summary.improvementOpportunities.map(opportunity => (
                    <div key={opportunity.id} className="rounded-lg border border-[var(--border-default)] px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{opportunity.title}</p>
                          {opportunity.area && (
                            <p className="text-[10px] text-[var(--text-muted)]">{opportunity.area}</p>
                          )}
                        </div>
                        <Badge variant={getOpportunityBadgeVariant(opportunity.priority)}>{opportunity.priority}</Badge>
                      </div>
                      <p className="mt-2 text-[10px] text-[var(--text-muted)]">{opportunity.trigger}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{opportunity.suggestedAction}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{opportunity.userControl}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="p-5 border-b border-[var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Scheduled Automations</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {schedulerStatus?.metadata.message || 'Checks rollout visibility for scheduled background jobs.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {schedulerStatus && (
              <Badge variant={schedulerStatus.metadata.degraded ? 'warning' : 'success'}>
                {schedulerStatus.summary.configuredCount}/{schedulerStatus.summary.total} configured
              </Badge>
            )}
            {schedulerStatus && schedulerStatus.metadata.providerStatus !== 'not_configured' && (
              <Badge variant={schedulerStatus.metadata.providerStatus === 'connected' ? 'success' : 'warning'}>
                {schedulerStatus.metadata.providerStatus === 'connected' ? 'Run history' : 'Run history unavailable'}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleScheduledAutomationRefresh}
              isLoading={schedulerLoading}
            >
              <RefreshCw size={14} />
              Refresh Status
            </Button>
          </div>
        </div>
        {schedulerLoading ? (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map(item => (
              <Skeleton key={item} className="h-28 w-full" />
            ))}
          </div>
        ) : schedulerStatus ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="rounded-lg border border-[var(--border-default)] p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Configured</p>
                <p className="mt-2 text-xl font-semibold">{schedulerStatus.summary.configuredCount}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Needs Verification</p>
                <p className="mt-2 text-xl font-semibold">{schedulerStatus.summary.needsVerificationCount}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] p-3">
                <p className="text-[11px] text-[var(--text-muted)]">Degraded</p>
                <p className="mt-2 text-xl font-semibold">{schedulerStatus.summary.degradedCount}</p>
              </div>
              {schedulerStatus.metadata.providerStatus !== 'not_configured' && (
                <>
                  <div className="rounded-lg border border-[var(--border-default)] p-3">
                    <p className="text-[11px] text-[var(--text-muted)]">Run Reported</p>
                    <p className="mt-2 text-xl font-semibold">{schedulerStatus.summary.runHistoryReportedCount}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-default)] p-3">
                    <p className="text-[11px] text-[var(--text-muted)]">Run Issues</p>
                    <p className="mt-2 text-xl font-semibold">
                      {schedulerStatus.summary.lastRunFailedCount + schedulerStatus.summary.lastRunMissedCount}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              {schedulerStatus.jobs.map(job => (
                <div key={job.id} className="rounded-lg border border-[var(--border-default)] px-3 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{job.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{job.purpose}</p>
                      <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                        <Clock size={11} />
                        {job.schedule}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant={getSchedulerBadgeVariant(job.status)}>
                        {getSchedulerStatusLabel(job.status)}
                      </Badge>
                      {job.lastRunStatus && (
                        <Badge variant={getSchedulerRunBadgeVariant(job.lastRunStatus)}>
                          {getSchedulerRunStatusLabel(job.lastRunStatus)}
                        </Badge>
                      )}
                      {job.statusUrl && (
                        <a
                          href={job.statusUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                        >
                          Status <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-[var(--text-muted)]">{job.detail}</p>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Manifest: {job.manifestPath} · Config keys: {job.requiredConfig.length}
                    {job.lastVerifiedAt ? ` · Verified ${formatTimestamp(job.lastVerifiedAt)}` : ''}
                    {job.lastRunAt ? ` · Last run ${formatTimestamp(job.lastRunAt)}` : ''}
                    {job.nextRunAt ? ` · Next run ${formatTimestamp(job.nextRunAt)}` : ''}
                    {job.consecutiveFailures ? ` · Consecutive failures: ${job.consecutiveFailures}` : ''}
                  </p>
                </div>
              ))}
            </div>
            {(schedulerStatus.metadata.image || schedulerStatus.metadata.runbookUrl || schedulerStatus.metadata.providerCheckedAt) && (
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                {schedulerStatus.metadata.image && <span>Image: {schedulerStatus.metadata.image}</span>}
                {schedulerStatus.metadata.providerCheckedAt && (
                  <span>Run history checked {formatTimestamp(schedulerStatus.metadata.providerCheckedAt)}</span>
                )}
                {schedulerStatus.metadata.runbookUrl && (
                  <a href={schedulerStatus.metadata.runbookUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent">
                    Runbook <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Service Health</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Source: {getSourceLabel(metadata.source)} · {metadata.message}
            </p>
          </div>
          <Database size={18} className="text-[var(--text-muted)]" />
        </div>
        <div className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-6 py-3 font-medium">Service Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Uptime</th>
                <th className="px-6 py-3 font-medium">Version</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Detail</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {services.map((service, i) => (
                <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="px-6 py-4 font-medium">{service.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusDot(service.status)}`} />
                      <span>{service.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">{service.uptime}%</td>
                  <td className="px-6 py-4 text-[var(--text-muted)]">{service.version}</td>
                  <td className="px-6 py-4">
                    <Badge variant={getSourceBadgeVariant(service.source)}>
                      {getSourceLabel(service.source)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-muted)]">
                    <div>{service.detail || 'No detail available'}</div>
                    {service.checkedAt && (
                      <div className="text-[10px] mt-1">Checked {formatTimestamp(service.checkedAt)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {(service.observabilityLinks || []).map((link) => (
                        <a
                          key={`${service.name}-${link.type}`}
                          href={link.href}
                          target={link.external ? '_blank' : undefined}
                          rel={link.external ? 'noopener noreferrer' : undefined}
                          title={link.description}
                          onClick={() => handleServiceInvestigation(service, link)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border-default)] px-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        >
                          {link.label}
                          <ExternalLink size={12} />
                        </a>
                      ))}
                    </div>
                    {service.logQuery && !(service.observabilityLinks || []).some(link => link.type === 'logs') && (
                      <div className="mt-2 max-w-48 truncate font-mono text-[10px] text-[var(--text-muted)]" title={service.logQuery}>
                        {service.logQuery}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-muted)]">No services found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="p-5 border-b border-[var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Audit Log</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {auditTotal !== null
                ? `Showing ${auditLogs.length} of ${auditTotal} recent events`
                : `Showing ${auditLogs.length} recent events`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {auditError && <Badge variant="warning">Needs retry</Badge>}
            <FileText size={18} className="text-[var(--text-muted)]" />
          </div>
        </div>
        {auditLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(item => (
              <Skeleton key={item} className="h-10 w-full" />
            ))}
          </div>
        ) : auditError ? (
          <div className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-secondary)]">{auditError}</p>
            <Button variant="outline" size="sm" onClick={handleAuditRetry} isLoading={auditLoading}>
              <RefreshCw size={14} />
              Retry Audit Logs
            </Button>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No audit events" description="No recent audit activity was found." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]">
                  <tr>
                    <th className="px-6 py-3 font-medium">Time</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                    <th className="px-6 py-3 font-medium">Entity</th>
                    <th className="px-6 py-3 font-medium">Actor</th>
                    <th className="px-6 py-3 font-medium">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">{formatTimestamp(log.createdAt)}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{formatEntity(log)}</td>
                      <td className="px-6 py-4 text-[var(--text-muted)]">{log.userId || 'System'}</td>
                      <td className="px-6 py-4 text-[var(--text-muted)]">
                        {log.ipAddress ? `IP ${log.ipAddress}` : 'No request context'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {auditHasNext && auditNextCursor ? (
              <div className="p-4 border-t border-[var(--border-default)] flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAuditLoadMore}
                  isLoading={auditLoadingMore}
                >
                  Load more audit events
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
