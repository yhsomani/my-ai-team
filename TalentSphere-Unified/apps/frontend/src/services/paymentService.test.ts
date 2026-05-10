import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from './paymentService';
import { supabase } from '../lib/supabaseClient';

// Mock the supabase client
vi.mock('../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

describe('paymentService', () => {
  let mockInsert: any;
  let mockSelect: any;
  let mockSingle: any;
  let mockInvoke: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn();
    mockSelect = vi.fn(() => ({ single: mockSingle }));
    mockInsert = vi.fn(() => ({ select: mockSelect }));
    (supabase.from as any).mockReturnValue({ insert: mockInsert });
    mockInvoke = supabase.functions.invoke;
  });

  describe('createSession', () => {
    it('should successfully create a payment record and a checkout session', async () => {
      // Mock local database insertion success
      const mockPaymentId = 'pay_123';
      mockSingle.mockResolvedValueOnce({
        data: { id: mockPaymentId },
        error: null,
      });

      // Mock edge function success
      const mockSessionId = 'cs_123';
      const mockUrl = 'https://checkout.stripe.com/pay/cs_123';
      mockInvoke.mockResolvedValueOnce({
        data: { id: mockSessionId, url: mockUrl },
        error: null,
      });

      const userId = 'user_123';
      const amount = 5000;
      const currency = 'usd';
      const description = 'Test Payment';

      const result = await paymentService.createSession(userId, amount, currency, description);

      // Verify supabase.from('payments').insert was called with correct payload
      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(mockInsert).toHaveBeenCalledWith([{
        user_id: userId,
        amount,
        currency,
        description,
        status: 'PENDING'
      }]);

      // Verify supabase.functions.invoke was called with correct payload
      expect(mockInvoke).toHaveBeenCalledWith('create-checkout-session', {
        body: {
          userId,
          amount,
          currency,
          description,
          paymentId: mockPaymentId
        }
      });

      // Verify return value
      expect(result).toEqual({
        sessionId: mockSessionId,
        url: mockUrl
      });
    });

    it('should throw an error if database insertion fails', async () => {
      const errorMessage = 'Database connection error';
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: errorMessage },
      });

      await expect(paymentService.createSession('user_123', 5000, 'usd', 'Test Payment')).rejects.toThrow(`Failed to create payment: ${errorMessage}`);

      // Verify that edge function was not called if local insert fails
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should throw an error if checkout session creation fails', async () => {
      // Mock local database insertion success
      const mockPaymentId = 'pay_123';
      mockSingle.mockResolvedValueOnce({
        data: { id: mockPaymentId },
        error: null,
      });

      // Mock edge function failure
      const errorMessage = 'Stripe API error';
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: errorMessage },
      });

      await expect(paymentService.createSession('user_123', 5000, 'usd', 'Test Payment')).rejects.toThrow(`Failed to create checkout session: ${errorMessage}`);
    });
  });
});

  describe('getStatus', () => {
    let mockEq: any;
    let mockSingleStatus: any;

    beforeEach(() => {
      mockSingleStatus = vi.fn();
      mockEq = vi.fn(() => ({ single: mockSingleStatus }));
      const mockSelectStatus = vi.fn(() => ({ eq: mockEq }));
      (supabase.from as any).mockReturnValue({ select: mockSelectStatus });
    });

    it('should fetch payment status successfully', async () => {
      const mockPayment = { id: 'pay_123', status: 'COMPLETED' };
      mockSingleStatus.mockResolvedValueOnce({ data: mockPayment, error: null });

      const sessionId = 'cs_123';
      const result = await paymentService.getStatus(sessionId);

      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(mockEq).toHaveBeenCalledWith('stripe_session_id', sessionId);
      expect(result).toEqual(mockPayment);
    });

    it('should return null if no payment is found (PGRST116)', async () => {
      mockSingleStatus.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const result = await paymentService.getStatus('cs_123');
      expect(result).toBeNull();
    });

    it('should throw an error on other database errors', async () => {
      const errorMessage = 'DB Error';
      mockSingleStatus.mockResolvedValueOnce({ data: null, error: { code: 'OTHER_ERR', message: errorMessage } });

      await expect(paymentService.getStatus('cs_123')).rejects.toThrow(`Failed to fetch payment status: ${errorMessage}`);
    });
  });

  describe('getHistory', () => {
    let mockOrder: any;
    let mockEq: any;

    beforeEach(() => {
      mockOrder = vi.fn();
      mockEq = vi.fn(() => ({ order: mockOrder }));
      const mockSelectHistory = vi.fn(() => ({ eq: mockEq }));
      (supabase.from as any).mockReturnValue({ select: mockSelectHistory });
    });

    it('should fetch payment history successfully', async () => {
      const mockPayments = [{ id: 'pay_1' }, { id: 'pay_2' }];
      mockOrder.mockResolvedValueOnce({ data: mockPayments, error: null });

      const userId = 'user_123';
      const result = await paymentService.getHistory(userId);

      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(mockPayments);
    });

    it('should return an empty array if data is null', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null });
      const result = await paymentService.getHistory('user_123');
      expect(result).toEqual([]);
    });

    it('should throw an error if fetching history fails', async () => {
      const errorMessage = 'Network issue';
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: errorMessage } });

      await expect(paymentService.getHistory('user_123')).rejects.toThrow(`Failed to fetch payment history: ${errorMessage}`);
    });
  });

  describe('getPlans', () => {
    let mockOrder: any;
    let mockEq: any;

    beforeEach(() => {
      mockOrder = vi.fn();
      mockEq = vi.fn(() => ({ order: mockOrder }));
      const mockSelectPlans = vi.fn(() => ({ eq: mockEq }));
      (supabase.from as any).mockReturnValue({ select: mockSelectPlans });
    });

    it('should fetch active subscription plans successfully', async () => {
      const mockPlans = [{ id: 'plan_1', price: 10 }, { id: 'plan_2', price: 20 }];
      mockOrder.mockResolvedValueOnce({ data: mockPlans, error: null });

      const result = await paymentService.getPlans();

      expect(supabase.from).toHaveBeenCalledWith('subscription_plans');
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
      expect(mockOrder).toHaveBeenCalledWith('price', { ascending: true });
      expect(result).toEqual(mockPlans);
    });

    it('should return an empty array if data is null', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null });
      const result = await paymentService.getPlans();
      expect(result).toEqual([]);
    });

    it('should throw an error if fetching plans fails', async () => {
      const errorMessage = 'Not found';
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: errorMessage } });

      await expect(paymentService.getPlans()).rejects.toThrow(`Failed to fetch plans: ${errorMessage}`);
    });
  });

  describe('subscribeToPlan', () => {
    let mockInvoke: any;
    beforeEach(() => {
      mockInvoke = supabase.functions.invoke;
    });
    it('should successfully subscribe to a plan via edge function', async () => {
      const mockSubscription = { id: 'sub_123', status: 'active' };
      mockInvoke.mockResolvedValueOnce({ data: mockSubscription, error: null });

      const userId = 'user_123';
      const planId = 'plan_123';
      const result = await paymentService.subscribeToPlan(userId, planId);

      expect(mockInvoke).toHaveBeenCalledWith('create-subscription', {
        body: { userId, planId }
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should throw an error if subscribing to a plan fails', async () => {
      const errorMessage = 'Stripe subscription failed';
      mockInvoke.mockResolvedValueOnce({ data: null, error: { message: errorMessage } });

      await expect(paymentService.subscribeToPlan('user_123', 'plan_123')).rejects.toThrow(`Failed to subscribe: ${errorMessage}`);
    });
  });

  describe('getUserSubscription', () => {
    let mockSingle: any;
    let mockEqStatus: any;
    let mockEqUser: any;

    beforeEach(() => {
      mockSingle = vi.fn();
      mockEqStatus = vi.fn(() => ({ single: mockSingle }));
      mockEqUser = vi.fn(() => ({ eq: mockEqStatus }));
      const mockSelect = vi.fn(() => ({ eq: mockEqUser }));
      (supabase.from as any).mockReturnValue({ select: mockSelect });
    });

    it('should fetch an active user subscription successfully', async () => {
      const mockSubscriptionData = {
        id: 'sub_1',
        status: 'ACTIVE',
        subscription_plans: { name: 'Pro', price: 50, currency: 'usd', interval: 'month' }
      };
      mockSingle.mockResolvedValueOnce({ data: mockSubscriptionData, error: null });

      const userId = 'user_123';
      const result = await paymentService.getUserSubscription(userId);

      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockEqUser).toHaveBeenCalledWith('user_id', userId);
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'ACTIVE');
      expect(result).toEqual(mockSubscriptionData);
    });

    it('should return null if no active subscription is found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const result = await paymentService.getUserSubscription('user_123');
      expect(result).toBeNull();
    });

    it('should throw an error if fetching subscription fails with other errors', async () => {
      const errorMessage = 'Timeout error';
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'TIMEOUT', message: errorMessage } });

      await expect(paymentService.getUserSubscription('user_123')).rejects.toThrow(`Failed to fetch subscription: ${errorMessage}`);
    });
  });
