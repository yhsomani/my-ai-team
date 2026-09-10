import { typedSupabase as supabase, type Database, type Json } from '../lib/supabaseClient';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type SubscriptionPlanRow = Database['public']['Tables']['subscription_plans']['Row'];

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  payment_method?: string;
  stripe_session_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentPlan {
  id?: string;
  name: string;
  price: number;
  currency?: string;
  interval?: 'month' | 'year';
  features: string[];
  is_active?: boolean;
}

const PAYMENT_STATUSES: Payment['status'][] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

const normalizePaymentStatus = (status: string | null | undefined): Payment['status'] => {
  return PAYMENT_STATUSES.includes(status as Payment['status'])
    ? status as Payment['status']
    : 'PENDING';
};

const normalizeCurrency = (currency: string | null | undefined) => currency || 'USD';

const jsonArrayToStrings = (value: Json | undefined): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const mapPayment = (row: Partial<PaymentRow>): Payment => ({
  id: row.id || '',
  user_id: row.user_id || '',
  amount: row.amount || 0,
  currency: normalizeCurrency(row.currency),
  description: row.description || '',
  status: normalizePaymentStatus(row.status),
  payment_method: row.payment_method || undefined,
  stripe_session_id: row.stripe_session_id || undefined,
  created_at: row.created_at || '',
  updated_at: row.updated_at || '',
});

const mapPaymentPlan = (row: SubscriptionPlanRow): PaymentPlan => ({
  id: row.id,
  name: row.name,
  price: row.price,
  currency: normalizeCurrency(row.currency),
  interval: row.interval === 'year' ? 'year' : 'month',
  features: jsonArrayToStrings(row.features),
  is_active: row.is_active,
});

export const billingMode = {
  mode: 'demo',
  label: 'Demo billing mode',
  providerBacked: false,
  limitation: 'Provider-backed checkout and webhooks are not verified in this build.',
} as const;

export const paymentService = {
  createSession: async (
    userId: string,
    amount: number,
    currency: string,
    description: string
  ): Promise<{ sessionId: string; url: string }> => {
    // Create payment record in database
    const payment = {
      user_id: userId,
      amount,
      currency,
      description,
      status: 'PENDING' as const
    };

    const { data: localPaymentData, error } = await supabase
      .from('payments')
      .insert([payment])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment record:', error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }

    // Call Supabase Edge Function to create actual Stripe session
    const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        userId,
        amount,
        currency,
        description,
        paymentId: localPaymentData.id
      }
    });

    if (sessionError) {
      console.error('Error creating Stripe session:', sessionError);
      throw new Error(`Failed to create checkout session: ${sessionError.message}`);
    }

    return {
      sessionId: sessionData.id,
      url: sessionData.url
    };
  },

  getStatus: async (sessionId: string): Promise<Payment | null> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching payment status:', error);
      throw new Error(`Failed to fetch payment status: ${error.message}`);
    }

    return data ? mapPayment(data) : null;
  },

  getHistory: async (userId: string): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }

    return (data || []).map(mapPayment);
  },

  getPlans: async (): Promise<PaymentPlan[]> => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching payment plans:', error);
      throw new Error(`Failed to fetch plans: ${error.message}`);
    }

    return (data || []).map(mapPaymentPlan);
  },

  subscribeToPlan: async (userId: string, planId: string): Promise<any> => {
    // Invoke edge function to subscribe via stripe rather than local DB insert directly.
    const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { userId, planId }
    });

    if (error) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to subscribe: ${error.message}`);
    }

    return data;
  },

  createBillingPortalSession: async (userId: string): Promise<{ url?: string; [key: string]: any }> => {
    const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
      body: { userId }
    });

    if (error) {
      console.error('Error creating billing portal session:', error);
      throw new Error(`Failed to open billing portal: ${error.message}`);
    }

    return {
      ...data,
      url: data?.url || data?.billingPortalUrl || data?.paymentUrl
    };
  },

  getUserSubscription: async (userId: string): Promise<any | null> => {
    const { data, error } = await supabase
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

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }

    return data || null;
  }
};
