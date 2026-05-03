import { supabase } from '../lib/supabaseClient';

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
    // Get user count from profiles
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get job applications count
    const { count: applicationsCount } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true });

    // Get courses count
    const { count: coursesCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    // Get challenges count
    const { count: challengesCount } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true });

    return {
      stats: {
        totalUsers: userCount || 0,
        systemLoad: 0, // Not applicable in serverless
        servicesOnline: 4, // All Supabase services are online
        totalServices: 4,
        securityAlerts: 0
      },
      services: [
        { name: 'Database', status: 'Running', uptime: 100, version: 'PostgreSQL 15' },
        { name: 'Authentication', status: 'Running', uptime: 100, version: 'Supabase Auth' },
        { name: 'Storage', status: 'Running', uptime: 100, version: 'Supabase Storage' },
        { name: 'Realtime', status: 'Running', uptime: 100, version: 'Supabase Realtime' }
      ]
    };
  },

  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_profiles (headline, current_role, xp, level)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getUserById: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_profiles (*),
        skills (*),
        experiences (*),
        educations (*)
      `)
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getSystemSettings: async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');
    
    if (error) throw error;
    return data;
  },

  updateSystemSetting: async (key: string, value: any, description?: string) => {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key, value, description, updated_at: new Date().toISOString() })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getAuditLogs: async (limit: number = 100) => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }
};
