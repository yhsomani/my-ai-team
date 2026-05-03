import apiClient from '../api/axios';

export interface SystemStats {
  totalUsers: number;
  systemLoad: number;
  servicesOnline: number;
  totalServices: number;
  securityAlerts: number;
}

export interface ServiceHealth {
  name: string;
  status: 'Running' | 'Degraded' | 'Offline';
  uptime: number;
  version: string;
}

export interface AdminDashboardData {
  stats: SystemStats;
  services: ServiceHealth[];
}

export const adminService = {
  getDashboardStats: async (): Promise<AdminDashboardData> => {
    const response = await apiClient.get('/api/v1/admin/stats');
    return response.data;
  }
};
