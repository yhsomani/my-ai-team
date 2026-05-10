import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Badge } from '../../components/shared/Badge';
import { Skeleton } from '../../components/shared/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { Users, Server, ShieldCheck, Activity } from 'lucide-react';
import { adminService, AdminDashboardData } from '../../services/adminService';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await adminService.getDashboardStats();
        setData(statsData);
      } catch (err) {
        console.error("Failed to fetch admin stats", err);
        setError("Failed to load admin console data.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
        <PageHeader title="Admin Console" description="Global system overview and administrative controls." />
        <EmptyState title="Error Loading Data" description={error || "Could not connect to backend services."} />
      </div>
    );
  }

  const { stats, services } = data;

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
      />

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
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold">Service Health</h3>
        </div>
        <div className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-6 py-3 font-medium">Service Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Uptime</th>
                <th className="px-6 py-3 font-medium">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {services.map((service, i) => (
                <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="px-6 py-4 font-medium">{service.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${service.status === 'Running' ? 'bg-success' : 'bg-destructive'}`} />
                      <span>{service.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">{service.uptime}%</td>
                  <td className="px-6 py-4 text-[var(--text-muted)]">{service.version}</td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--text-muted)]">No services found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-8">
        <div className="p-5 border-b border-[var(--border-default)] flex justify-between items-center">
          <h3 className="text-sm font-semibold">User Management</h3>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-6 py-4 font-medium">user@example.com</td>
                <td className="px-6 py-4"><Badge>User</Badge></td>
                <td className="px-6 py-4 text-right relative">
                  <div className="dropdown dropdown-end relative inline-block text-left group">
                    <button className="p-2 hover:bg-[var(--bg-primary)] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent" aria-label="Open menu">
                      <MoreVertical size={16} />
                    </button>
                    {/* Z-index fix: Ensure dropdown overlays other rows */}
                    <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute right-0 mt-2 w-48 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-md shadow-lg z-50 transition-all duration-200">
                      <div className="py-1">
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-2">
                          <Edit size={14} /> Edit Role
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2">
                          <Trash2 size={14} /> Suspend User
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};

export default AdminDashboard;
