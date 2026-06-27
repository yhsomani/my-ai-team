import { beforeEach, describe, expect, it, vi } from 'vitest';
import { settingsService } from './settingsService';
import { typedSupabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => {
  const client = {
    from: vi.fn(),
  };

  return {
    supabase: client,
    typedSupabase: client,
  };
});

describe('settingsService notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (typedSupabase.from as any).mockReset();
  });

  it('normalizes notification settings from the typed schema', async () => {
    const single = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'settings_1',
        user_id: 'user_1',
        email_notifications: null,
        push_notifications: true,
        sms_notifications: null,
        job_alerts: false,
        message_notifications: null,
        newsletter: null,
        digest_frequency: 'daily',
        quiet_hours_enabled: null,
        quiet_hours_start: '18:30:00',
        quiet_hours_end: null,
        updated_at: '2026-06-27T00:00:00Z',
      },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    (typedSupabase.from as any).mockReturnValueOnce({ select });

    const result = await settingsService.getNotifications('user_1');

    expect(typedSupabase.from).toHaveBeenCalledWith('notification_settings');
    expect(result).toEqual({
      id: 'settings_1',
      user_id: 'user_1',
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      job_alerts: false,
      message_notifications: true,
      newsletter: false,
      digest_frequency: 'daily',
      quiet_hours_enabled: false,
      quiet_hours_start: '18:30',
      quiet_hours_end: '09:00',
      updated_at: '2026-06-27T00:00:00Z',
    });
  });

  it('updates existing notification settings without sending identity fields', async () => {
    const maybeSingle = vi.fn().mockResolvedValueOnce({
      data: { id: 'settings_1' },
      error: null,
    });
    const existingEq = vi.fn(() => ({ maybeSingle }));
    const existingSelect = vi.fn(() => ({ eq: existingEq }));

    const single = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'settings_1',
        user_id: 'user_1',
        email_notifications: false,
        push_notifications: true,
        sms_notifications: false,
        job_alerts: true,
        message_notifications: true,
        newsletter: false,
        digest_frequency: 'weekly',
        quiet_hours_enabled: true,
        quiet_hours_start: '19:00',
        quiet_hours_end: '08:00',
        updated_at: '2026-06-27T00:00:00Z',
      },
      error: null,
    });
    const updateSelect = vi.fn(() => ({ single }));
    const updateEq = vi.fn(() => ({ select: updateSelect }));
    const update = vi.fn(() => ({ eq: updateEq }));

    (typedSupabase.from as any)
      .mockReturnValueOnce({ select: existingSelect })
      .mockReturnValueOnce({ update });

    const result = await settingsService.updateNotifications('user_1', {
      id: 'settings_1',
      user_id: 'user_1',
      email_notifications: false,
      digest_frequency: 'weekly',
      quiet_hours_enabled: true,
      quiet_hours_start: '19:00',
      quiet_hours_end: '08:00',
      updated_at: 'stale',
    });

    expect(update).toHaveBeenCalledWith({
      email_notifications: false,
      digest_frequency: 'weekly',
      quiet_hours_enabled: true,
      quiet_hours_start: '19:00',
      quiet_hours_end: '08:00',
      updated_at: expect.any(String),
    });
    expect(result.digest_frequency).toBe('weekly');
  });
});

describe('settingsService.updateProfileSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (typedSupabase.from as any).mockReset();
  });

  it('splits profile and extended-profile settings across typed tables', async () => {
    const profileSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'user_1',
        email: 'ada@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        full_name: 'Ada Lovelace',
      },
      error: null,
    });
    const profileSelect = vi.fn(() => ({ single: profileSingle }));
    const profileEq = vi.fn(() => ({ select: profileSelect }));
    const profileUpdate = vi.fn(() => ({ eq: profileEq }));

    const userProfileMaybeSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'profile_1',
        user_id: 'user_1',
        headline: 'Analytical engine pioneer',
        location: 'London',
      },
      error: null,
    });
    const userProfileSelect = vi.fn(() => ({ maybeSingle: userProfileMaybeSingle }));
    const userProfileEq = vi.fn(() => ({ select: userProfileSelect }));
    const userProfileUpdate = vi.fn(() => ({ eq: userProfileEq }));

    (typedSupabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') return { update: profileUpdate };
      if (table === 'user_profiles') return { update: userProfileUpdate };
      throw new Error(`unexpected table ${table}`);
    });

    const result = await settingsService.updateProfileSettings('user_1', {
      first_name: 'Ada',
      last_name: 'Lovelace',
      headline: 'Analytical engine pioneer',
      location: 'London',
    });

    expect(profileUpdate).toHaveBeenCalledWith({
      first_name: 'Ada',
      last_name: 'Lovelace',
      full_name: 'Ada Lovelace',
      updated_at: expect.any(String),
    });
    expect(userProfileUpdate).toHaveBeenCalledWith({
      headline: 'Analytical engine pioneer',
      location: 'London',
      updated_at: expect.any(String),
    });
    expect(result).toEqual({
      profile: expect.objectContaining({ id: 'user_1', full_name: 'Ada Lovelace' }),
      user_profile: expect.objectContaining({ id: 'profile_1', headline: 'Analytical engine pioneer' }),
    });
  });

  it('creates an extended profile row when the typed update finds no row', async () => {
    const profileSingle = vi.fn().mockResolvedValueOnce({
      data: { id: 'user_1', email: 'ada@example.com' },
      error: null,
    });
    const profileSelect = vi.fn(() => ({ single: profileSingle }));
    const profileEq = vi.fn(() => ({ select: profileSelect }));
    const profileUpdate = vi.fn(() => ({ eq: profileEq }));

    const userProfileMaybeSingle = vi.fn().mockResolvedValueOnce({
      data: null,
      error: null,
    });
    const userProfileSelect = vi.fn(() => ({ maybeSingle: userProfileMaybeSingle }));
    const userProfileEq = vi.fn(() => ({ select: userProfileSelect }));
    const userProfileUpdate = vi.fn(() => ({ eq: userProfileEq }));

    const userProfileInsertSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'profile_1',
        user_id: 'user_1',
        headline: 'Analytical engine pioneer',
        location: 'London',
      },
      error: null,
    });
    const userProfileInsertSelect = vi.fn(() => ({ single: userProfileInsertSingle }));
    const userProfileInsert = vi.fn(() => ({ select: userProfileInsertSelect }));

    (typedSupabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') return { update: profileUpdate };
      if (table === 'user_profiles') {
        return {
          update: userProfileUpdate,
          insert: userProfileInsert,
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await settingsService.updateProfileSettings('user_1', {
      headline: 'Analytical engine pioneer',
      location: 'London',
    });

    expect(userProfileInsert).toHaveBeenCalledWith({
      user_id: 'user_1',
      headline: 'Analytical engine pioneer',
      location: 'London',
      updated_at: expect.any(String),
    });
    expect(result.user_profile).toEqual(expect.objectContaining({ id: 'profile_1' }));
  });
});

describe('settingsService.getBilling', () => {
  let subscriptionSingle: any;
  let paymentLimit: any;

  const wireBillingQueries = () => {
    subscriptionSingle = vi.fn();
    paymentLimit = vi.fn();

    const subscriptionStatusEq = vi.fn(() => ({ single: subscriptionSingle }));
    const subscriptionUserEq = vi.fn(() => ({ eq: subscriptionStatusEq }));
    const subscriptionSelect = vi.fn(() => ({ eq: subscriptionUserEq }));

    const paymentLimitFn = vi.fn(() => paymentLimit());
    const paymentOrder = vi.fn(() => ({ limit: paymentLimitFn }));
    const paymentUserEq = vi.fn(() => ({ order: paymentOrder }));
    const paymentSelect = vi.fn(() => ({ eq: paymentUserEq }));

    (typedSupabase.from as any).mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return { select: subscriptionSelect };
      }
      if (table === 'payments') {
        return { select: paymentSelect };
      }
      throw new Error(`unexpected table ${table}`);
    });

    return {
      subscriptionStatusEq,
      subscriptionUserEq,
      paymentLimitFn,
      paymentOrder,
      paymentUserEq,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (typedSupabase.from as any).mockReset();
    wireBillingQueries();
  });

  it('maps an active subscription and payment history', async () => {
    subscriptionSingle.mockResolvedValueOnce({
      data: {
        id: 'sub_1',
        user_id: 'user_1',
        status: 'ACTIVE',
        next_billing_date: '2026-07-27T00:00:00Z',
        payment_method: 'Visa ending 4242',
        subscription_plans: {
          name: 'Pro',
          price: 20,
          currency: 'USD',
          interval: 'month',
        },
      },
      error: null,
    });
    paymentLimit.mockResolvedValueOnce({
      data: [{ id: 'pay_1', amount: 20, status: 'COMPLETED' }],
      error: null,
    });

    const result = await settingsService.getBilling('user_1');

    expect(typedSupabase.from).toHaveBeenCalledWith('subscriptions');
    expect(typedSupabase.from).toHaveBeenCalledWith('payments');
    expect(result).toEqual({
      subscription_status: 'ACTIVE',
      current_plan: 'Pro',
      next_billing_date: '2026-07-27T00:00:00Z',
      payment_method: 'Visa ending 4242',
      billing_history: [{ id: 'pay_1', amount: 20, status: 'COMPLETED' }],
    });
  });

  it('returns free billing info when no active subscription exists', async () => {
    subscriptionSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });
    paymentLimit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const result = await settingsService.getBilling('user_1');

    expect(result).toEqual({
      subscription_status: 'INACTIVE',
      current_plan: 'Free',
      next_billing_date: '',
      billing_history: [],
    });
  });

  it('throws a stable billing error when payment history fails', async () => {
    subscriptionSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });
    paymentLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'database unavailable' },
    });

    await expect(settingsService.getBilling('user_1')).rejects.toThrow(
      'Failed to fetch billing info: database unavailable'
    );
  });

  it('soft deletes a profile through the typed profile schema', async () => {
    const eq = vi.fn().mockResolvedValueOnce({ error: null });
    const update = vi.fn(() => ({ eq }));
    (typedSupabase.from as any).mockReturnValueOnce({ update });

    await settingsService.deleteAccount('user_1');

    expect(typedSupabase.from).toHaveBeenCalledWith('profiles');
    expect(update).toHaveBeenCalledWith({
      is_active: false,
      deleted_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith('id', 'user_1');
  });

  it('throws a stable error when profile soft delete fails', async () => {
    const eq = vi.fn().mockResolvedValueOnce({ error: { message: 'permission denied' } });
    const update = vi.fn(() => ({ eq }));
    (typedSupabase.from as any).mockReturnValueOnce({ update });

    await expect(settingsService.deleteAccount('user_1')).rejects.toThrow(
      'Failed to delete account: permission denied'
    );
  });
});
