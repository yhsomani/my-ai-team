import { supabase } from '../lib/supabaseClient';

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  job_alerts: boolean;
  message_notifications: boolean;
  newsletter: boolean;
  updated_at: string;
}

export interface BillingInfo {
  subscription_status: string;
  current_plan: string;
  next_billing_date: string;
  payment_method?: string;
  billing_history: any[];
}

export const settingsService = {
<<<<<<< HEAD
  getNotifications: async (userId: string) => {
    const response = await apiClient.get(`/api/v1/notifications/user/${userId}`);
    return response.data;
  },
  updateNotifications: async (userId: string, settings: any) => {
    // Note: notification-service currently handles individual notifications. 
    // This would be for user preference synchronization.
    const response = await apiClient.put(`/api/v1/users/${userId}`, { preferences: settings });
    return response.data;
  },
  getBilling: async (userId: string) => {
    const response = await apiClient.get(`/api/v1/payments/history/${userId}`);
    return response.data;
  },
  getPlans: async () => {
    const response = await apiClient.get('/api/v1/payments/plans');
    return response.data;
=======
  getNotifications: async (userId: string): Promise<NotificationSettings | null> => {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error);
      throw new Error(`Failed to fetch notification settings: ${error.message}`);
    }

    return data || null;
  },

  updateNotifications: async (userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    // Check if settings exist
    const { data: existing } = await supabase
      .from('notification_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    
    if (existing) {
      // Update existing
      result = await supabase
        .from('notification_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from('notification_settings')
        .insert([{
          user_id: userId,
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          job_alerts: true,
          message_notifications: true,
          newsletter: false,
          ...settings,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
    }

    const { data, error } = result;

    if (error) {
      console.error('Error updating notification settings:', error);
      throw new Error(`Failed to update notification settings: ${error.message}`);
    }

    return data;
  },

  getBilling: async (userId: string): Promise<BillingInfo | null> => {
    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans:plan_id (
          name,
          price,
          currency,
          interval
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
      throw new Error(`Failed to fetch billing info: ${subError.message}`);
    }

    // Get payment history
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (payError) {
      console.error('Error fetching payment history:', payError);
      throw new Error(`Failed to fetch billing info: ${payError.message}`);
    }

    if (!subscription) {
      return {
        subscription_status: 'INACTIVE',
        current_plan: 'Free',
        next_billing_date: '',
        billing_history: payments || []
      };
    }

    return {
      subscription_status: subscription.status,
      current_plan: subscription.subscription_plans?.name || 'Unknown',
      next_billing_date: subscription.next_billing_date || '',
      payment_method: subscription.payment_method,
      billing_history: payments || []
    };
  },

  updateProfileSettings: async (userId: string, settings: any): Promise<any> => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile settings:', error);
      throw new Error(`Failed to update profile settings: ${error.message}`);
    }

    return data;
  },

  deleteAccount: async (userId: string): Promise<void> => {
    // Note: This is a soft delete. Actual deletion should be handled carefully
    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error deleting account:', error);
      throw new Error(`Failed to delete account: ${error.message}`);
    }
>>>>>>> 4c83dee4028d58c61065c033c82cebeb5e95576e
  }
};
