import { supabase } from '../lib/supabaseClient';

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
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  is_active: boolean;
}

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

    const { data, error } = await supabase
      .from('payments')
      .insert([payment])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment record:', error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }

    // In a real implementation, you would call Stripe API here
    // For now, return mock session data
    return {
      sessionId: `sess_${data.id}`,
      url: `/payment/success?session_id=sess_${data.id}`
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

    return data || null;
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

    return data || [];
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

    return data || [];
  },

  subscribeToPlan: async (userId: string, planId: string): Promise<any> => {
    const subscription = {
      user_id: userId,
      plan_id: planId,
      status: 'ACTIVE' as const,
      started_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscription])
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to subscribe: ${error.message}`);
    }

    return data;
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
