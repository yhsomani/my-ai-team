import { typedSupabase, type Database } from '../lib/supabaseClient';
import {
  normalizeNotificationDigestFrequency,
  normalizeNotificationQuietTime,
  type NotificationDigestFrequency,
} from '../lib/notificationPreferences';

type NotificationSettingsRow = Database['public']['Tables']['notification_settings']['Row'];
type NotificationSettingsInsert = Database['public']['Tables']['notification_settings']['Insert'];
type NotificationSettingsUpdate = Database['public']['Tables']['notification_settings']['Update'];
type BillingSubscriptionRow = Database['public']['Tables']['subscriptions']['Row'] & {
  subscription_plans?: {
    name?: string | null;
    price?: number | null;
    currency?: string | null;
    interval?: string | null;
  } | null;
};
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  job_alerts: boolean;
  message_notifications: boolean;
  newsletter: boolean;
  digest_frequency?: NotificationDigestFrequency;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  updated_at: string;
}

export interface BillingInfo {
  subscription_status: string;
  current_plan: string;
  next_billing_date: string;
  payment_method?: string;
  billing_history: any[];
}

export interface ProfileSettingsUpdate {
  first_name?: string;
  last_name?: string;
  headline?: string;
  location?: string;
}

export interface ProfileSettingsResult {
  profile: ProfileRow;
  user_profile: UserProfileRow | null;
}

const mapNotificationSettingsRow = (row: NotificationSettingsRow): NotificationSettings => ({
  id: row.id,
  user_id: row.user_id,
  email_notifications: row.email_notifications ?? true,
  push_notifications: row.push_notifications ?? true,
  sms_notifications: row.sms_notifications ?? false,
  job_alerts: row.job_alerts ?? true,
  message_notifications: row.message_notifications ?? true,
  newsletter: row.newsletter ?? false,
  digest_frequency: normalizeNotificationDigestFrequency(row.digest_frequency),
  quiet_hours_enabled: row.quiet_hours_enabled ?? false,
  quiet_hours_start: normalizeNotificationQuietTime(row.quiet_hours_start, '18:00'),
  quiet_hours_end: normalizeNotificationQuietTime(row.quiet_hours_end, '09:00'),
  updated_at: row.updated_at || '',
});

const buildNotificationSettingsUpdate = (
  settings: Partial<NotificationSettings>,
  updatedAt: string
): NotificationSettingsUpdate => {
  const update: NotificationSettingsUpdate = { updated_at: updatedAt };

  if (settings.email_notifications !== undefined) update.email_notifications = settings.email_notifications;
  if (settings.push_notifications !== undefined) update.push_notifications = settings.push_notifications;
  if (settings.sms_notifications !== undefined) update.sms_notifications = settings.sms_notifications;
  if (settings.job_alerts !== undefined) update.job_alerts = settings.job_alerts;
  if (settings.message_notifications !== undefined) update.message_notifications = settings.message_notifications;
  if (settings.newsletter !== undefined) update.newsletter = settings.newsletter;
  if (settings.digest_frequency !== undefined) update.digest_frequency = normalizeNotificationDigestFrequency(settings.digest_frequency);
  if (settings.quiet_hours_enabled !== undefined) update.quiet_hours_enabled = settings.quiet_hours_enabled;
  if (settings.quiet_hours_start !== undefined) update.quiet_hours_start = normalizeNotificationQuietTime(settings.quiet_hours_start, '18:00');
  if (settings.quiet_hours_end !== undefined) update.quiet_hours_end = normalizeNotificationQuietTime(settings.quiet_hours_end, '09:00');

  return update;
};

const buildNotificationSettingsInsert = (
  userId: string,
  settings: Partial<NotificationSettings>,
  updatedAt: string
): NotificationSettingsInsert => ({
  user_id: userId,
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  job_alerts: true,
  message_notifications: true,
  newsletter: false,
  digest_frequency: 'immediate',
  quiet_hours_enabled: false,
  quiet_hours_start: '18:00',
  quiet_hours_end: '09:00',
  ...buildNotificationSettingsUpdate(settings, updatedAt),
});

const getFullNameUpdate = (settings: ProfileSettingsUpdate) => {
  if (settings.first_name === undefined || settings.last_name === undefined) return undefined;

  return [settings.first_name, settings.last_name]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ') || null;
};

export const settingsService = {
  getNotifications: async (userId: string): Promise<NotificationSettings | null> => {
    const { data, error } = await typedSupabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error);
      throw new Error(`Failed to fetch notification settings: ${error.message}`);
    }

    return data ? mapNotificationSettingsRow(data) : null;
  },

  updateNotifications: async (userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    const updatedAt = new Date().toISOString();
    const updatePayload = buildNotificationSettingsUpdate(settings, updatedAt);
    const insertPayload = buildNotificationSettingsInsert(userId, settings, updatedAt);

    const { data: existing, error: existingError } = await typedSupabase
      .from('notification_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking notification settings:', existingError);
      throw new Error(`Failed to update notification settings: ${existingError.message}`);
    }

    let result;
    
    if (existing) {
      result = await typedSupabase
        .from('notification_settings')
        .update(updatePayload)
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      result = await typedSupabase
        .from('notification_settings')
        .insert(insertPayload)
        .select()
        .single();
    }

    const { data, error } = result;

    if (error) {
      console.error('Error updating notification settings:', error);
      throw new Error(`Failed to update notification settings: ${error.message}`);
    }

    return mapNotificationSettingsRow(data);
  },

  getBilling: async (userId: string): Promise<BillingInfo | null> => {
    // Get user's subscription
    const { data: subscriptionData, error: subError } = await typedSupabase
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

    const subscription = subscriptionData as BillingSubscriptionRow | null;

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
      throw new Error(`Failed to fetch billing info: ${subError.message}`);
    }

    // Get payment history
    const { data: payments, error: payError } = await typedSupabase
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
      payment_method: subscription.payment_method || undefined,
      billing_history: payments || []
    };
  },

  updateProfileSettings: async (userId: string, settings: ProfileSettingsUpdate): Promise<ProfileSettingsResult> => {
    const updatedAt = new Date().toISOString();
    const profileUpdate: ProfileUpdate = {
      updated_at: updatedAt,
    };
    if (settings.first_name !== undefined) profileUpdate.first_name = settings.first_name;
    if (settings.last_name !== undefined) profileUpdate.last_name = settings.last_name;

    const fullName = getFullNameUpdate(settings);
    if (fullName !== undefined) profileUpdate.full_name = fullName;

    const { data: profile, error: profileError } = await typedSupabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile settings:', profileError);
      throw new Error(`Failed to update profile settings: ${profileError.message}`);
    }

    const userProfileUpdate: UserProfileUpdate = {
      updated_at: updatedAt,
    };
    if (settings.headline !== undefined) userProfileUpdate.headline = settings.headline;
    if (settings.location !== undefined) userProfileUpdate.location = settings.location;

    if (settings.headline === undefined && settings.location === undefined) {
      return {
        profile,
        user_profile: null,
      };
    }

    const { data: userProfile, error: userProfileError } = await typedSupabase
      .from('user_profiles')
      .update(userProfileUpdate)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (userProfileError) {
      console.error('Error updating extended profile settings:', userProfileError);
      throw new Error(`Failed to update profile settings: ${userProfileError.message}`);
    }

    if (userProfile) {
      return {
        profile,
        user_profile: userProfile,
      };
    }

    const userProfileInsert: UserProfileInsert = {
      user_id: userId,
      headline: settings.headline,
      location: settings.location,
      updated_at: updatedAt,
    };
    const { data: insertedUserProfile, error: insertError } = await typedSupabase
      .from('user_profiles')
      .insert(userProfileInsert)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating extended profile settings:', insertError);
      throw new Error(`Failed to update profile settings: ${insertError.message}`);
    }

    return {
      profile,
      user_profile: insertedUserProfile,
    };
  },

  deleteAccount: async (userId: string): Promise<void> => {
    // Note: This is a soft delete. Actual deletion should be handled carefully
    const { error } = await typedSupabase
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
  }
};
