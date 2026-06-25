import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Badge } from '../../components/shared/Badge';
import { Skeleton } from '../../components/shared/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { Users, Server, ShieldCheck, Activity, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { Button } from '../../components/shared/AuraButton';
import { adminService, AdminDashboardData } from '../../services/adminService';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const statsData = await adminService.getDashboardStats();
      setData(statsData);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
      setError("Failed to load admin console data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatTimestamp = (value?: string) => {
    if (!value) return 'Not refreshed yet';
    return new Date(value).toLocaleString();
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
            <Button variant="outline" size="sm" onClick={loadStats} isLoading={refreshing}>
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
            <Button variant="outline" size="sm" onClick={loadStats} isLoading={refreshing}>
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
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">No services found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
