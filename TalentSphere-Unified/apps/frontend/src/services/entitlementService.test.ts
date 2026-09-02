import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  entitlementService,
  normalizeTier,
  computeEntitlements,
  createFallbackContext,
  TIER_ENTITLEMENTS,
  TIER_QUOTAS,
  ENTITLEMENT_TIER_REQUIREMENTS,
  type EntitlementKey,
} from './entitlementService';
import { typedSupabase as supabase } from '../lib/supabaseClient';
import { billingMode } from './paymentService';

vi.mock('../lib/supabaseClient', () => {
  const mockMaybeSingle = vi.fn();
  const mockEqStatus = vi.fn(() => ({
    maybeSingle: mockMaybeSingle,
  }));
  const mockEqUser = vi.fn(() => ({
    eq: mockEqStatus,
  }));
  const mockSelect = vi.fn(() => ({
    eq: mockEqUser,
  }));
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
  }));

  return {
    isSupabaseConfigured: true,
    typedSupabase: {
      from: mockFrom,
    },
    supabase: {
      from: mockFrom,
    },
    __mockMaybeSingle: mockMaybeSingle,
    __mockFrom: mockFrom,
  };
});

describe('entitlementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    entitlementService.invalidateCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeTier', () => {
    it('normalizes various plan names to correct SubscriptionTier', () => {
      expect(normalizeTier(null)).toBe('free');
      expect(normalizeTier(undefined)).toBe('free');
      expect(normalizeTier('')).toBe('free');
      expect(normalizeTier('Free')).toBe('free');
      expect(normalizeTier('Free Tier')).toBe('free');
      expect(normalizeTier('Pro')).toBe('pro');
      expect(normalizeTier('Professional Plan')).toBe('pro');
      expect(normalizeTier('Growth Tier')).toBe('pro');
      expect(normalizeTier('Plus')).toBe('pro');
      expect(normalizeTier('Premium')).toBe('premium');
      expect(normalizeTier('Enterprise')).toBe('premium');
    });
  });

  describe('computeEntitlements', () => {
    it('returns standard free tier entitlements when no roles provided', () => {
      const entitlements = computeEntitlements('free');
      expect(entitlements.unlimited_applications).toBe(false);
      expect(entitlements.advanced_career_insights).toBe(false);
      expect(entitlements.priority_applicant_badge).toBe(false);
      expect(entitlements.admin_console_access).toBe(false);
      expect(entitlements.content_moderation_triage).toBe(false);
    });

    it('returns pro tier entitlements with unlimited apps and insights enabled', () => {
      const entitlements = computeEntitlements('pro');
      expect(entitlements.unlimited_applications).toBe(true);
      expect(entitlements.advanced_career_insights).toBe(true);
      expect(entitlements.resume_export_advanced).toBe(true);
      expect(entitlements.challenge_solutions_view).toBe(true);
      expect(entitlements.unlimited_ai_prompts).toBe(true);
      expect(entitlements.priority_applicant_badge).toBe(false);
      expect(entitlements.custom_company_branding).toBe(false);
    });

    it('returns premium tier entitlements including priority badge and custom branding', () => {
      const entitlements = computeEntitlements('premium');
      expect(entitlements.unlimited_applications).toBe(true);
      expect(entitlements.advanced_career_insights).toBe(true);
      expect(entitlements.priority_applicant_badge).toBe(true);
      expect(entitlements.custom_company_branding).toBe(true);
      expect(entitlements.automated_candidate_matching).toBe(true);
    });

    it('elevates admin-specific entitlements when user possesses ROLE_ADMIN', () => {
      const entitlements = computeEntitlements('free', ['ROLE_ADMIN']);
      expect(entitlements.admin_console_access).toBe(true);
      expect(entitlements.content_moderation_triage).toBe(true);
      expect(entitlements.scheduled_automation_ops).toBe(true);
    });
  });

  describe('createFallbackContext', () => {
    it('creates resilient fallback context with explicit demo billing mode and degraded flag', () => {
      const fallback = createFallbackContext('user-fallback-123', ['ROLE_USER'], 'Network error');
      expect(fallback.userId).toBe('user-fallback-123');
      expect(fallback.tier).toBe('free');
      expect(fallback.planName).toBe('Free');
      expect(fallback.status).toBe('FREE');
      expect(fallback.meta.source).toBe('fallback');
      expect(fallback.meta.degraded).toBe(true);
      expect(fallback.meta.billingMode.mode).toBe('demo');
      expect(fallback.meta.billingMode.providerBacked).toBe(false);
      expect(fallback.quotas.applicationLimitMonthly).toBe(10);
    });
  });

  describe('getUserEntitlements', () => {
    it('returns fallback context for anonymous/empty user id', async () => {
      const result = await entitlementService.getUserEntitlements('');
      expect(result.userId).toBe('anonymous');
      expect(result.tier).toBe('free');
      expect(result.meta.source).toBe('fallback');
    });

    it('fetches active pro subscription from database and returns live context', async () => {
      const mockSupabaseModule = await import('../lib/supabaseClient');
      const mockMaybeSingle = (mockSupabaseModule as any).__mockMaybeSingle;

      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'sub-pro-1',
          user_id: 'usr-100',
          status: 'ACTIVE',
          current_period_end: '2026-12-31T23:59:59.000Z',
          cancel_at_period_end: false,
          subscription_plans: {
            name: 'Pro',
            price: 19.99,
            currency: 'USD',
            interval: 'month',
            features: ['Unlimited applications', 'Analytics'],
          },
        },
        error: null,
      });

      const context = await entitlementService.getUserEntitlements('usr-100', ['ROLE_USER']);
      expect(context.userId).toBe('usr-100');
      expect(context.tier).toBe('pro');
      expect(context.planName).toBe('Pro');
      expect(context.status).toBe('ACTIVE');
      expect(context.expiresAt).toBe('2026-12-31T23:59:59.000Z');
      expect(context.entitlements.unlimited_applications).toBe(true);
      expect(context.entitlements.priority_applicant_badge).toBe(false);
      expect(context.quotas.applicationLimitMonthly).toBe('unlimited');
      expect(context.meta.source).toBe('live');
      expect(context.meta.degraded).toBe(false);
      expect(context.meta.billingMode.mode).toBe('demo');
    });

    it('uses in-memory cache for consecutive calls within TTL and switches source to cached', async () => {
      const mockSupabaseModule = await import('../lib/supabaseClient');
      const mockMaybeSingle = (mockSupabaseModule as any).__mockMaybeSingle;

      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'sub-premium-1',
          user_id: 'usr-200',
          status: 'ACTIVE',
          subscription_plans: {
            name: 'Premium',
            price: 49.99,
            currency: 'USD',
            interval: 'month',
          },
        },
        error: null,
      });

      const firstCall = await entitlementService.getUserEntitlements('usr-200');
      expect(firstCall.meta.source).toBe('live');
      expect(mockMaybeSingle).toHaveBeenCalledTimes(1);

      // Second call should come from cache
      const secondCall = await entitlementService.getUserEntitlements('usr-200');
      expect(secondCall.meta.source).toBe('cached');
      expect(secondCall.tier).toBe('premium');
      expect(secondCall.entitlements.priority_applicant_badge).toBe(true);
      expect(mockMaybeSingle).toHaveBeenCalledTimes(1); // Not called again

      // Invalidate cache and call again
      entitlementService.invalidateCache('usr-200');
      const thirdCall = await entitlementService.getUserEntitlements('usr-200');
      expect(thirdCall.meta.source).toBe('live');
      expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
    });

    it('falls back safely when database returns error', async () => {
      const mockSupabaseModule = await import('../lib/supabaseClient');
      const mockMaybeSingle = (mockSupabaseModule as any).__mockMaybeSingle;

      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'relation subscriptions does not exist' },
      });

      const context = await entitlementService.getUserEntitlements('usr-300', ['ROLE_USER']);
      expect(context.tier).toBe('free');
      expect(context.meta.source).toBe('fallback');
      expect(context.meta.degraded).toBe(true);
      expect(context.entitlements.unlimited_applications).toBe(false);
    });
  });

  describe('hasEntitlement and checkEntitlement', () => {
    it('accurately evaluates hasEntitlement boolean', async () => {
      const mockSupabaseModule = await import('../lib/supabaseClient');
      const mockMaybeSingle = (mockSupabaseModule as any).__mockMaybeSingle;

      mockMaybeSingle.mockResolvedValue({
        data: null, // Free tier user
        error: null,
      });

      const hasFreeApp = await entitlementService.hasEntitlement('usr-free', 'unlimited_applications');
      expect(hasFreeApp).toBe(false);

      const hasAdminConsole = await entitlementService.hasEntitlement(
        'usr-free',
        'admin_console_access',
        ['ROLE_ADMIN']
      );
      expect(hasAdminConsole).toBe(true);
    });

    it('provides rich checkEntitlement result with upgrade prompt when not granted', async () => {
      const mockSupabaseModule = await import('../lib/supabaseClient');
      const mockMaybeSingle = (mockSupabaseModule as any).__mockMaybeSingle;

      mockMaybeSingle.mockResolvedValue({
        data: null, // Free tier
        error: null,
      });

      const check = await entitlementService.checkEntitlement('usr-free', 'unlimited_applications');
      expect(check.granted).toBe(false);
      expect(check.currentTier).toBe('free');
      expect(check.requiredTier).toBe('pro');
      expect(check.reason).toContain('Pro plan');
      expect(check.upgradePrompt).toContain('Upgrade to Pro plan');
      expect(check.upgradePrompt).toContain('Demo Billing Mode');
      expect(check.billingMode.mode).toBe('demo');
    });

    it('provides granted checkEntitlement result when user has entitlement', async () => {
      const mockSupabaseModule = await import('../lib/supabaseClient');
      const mockMaybeSingle = (mockSupabaseModule as any).__mockMaybeSingle;

      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'sub-1',
          user_id: 'usr-pro',
          status: 'ACTIVE',
          subscription_plans: { name: 'Pro' },
        },
        error: null,
      });

      const check = await entitlementService.checkEntitlement('usr-pro', 'advanced_career_insights');
      expect(check.granted).toBe(true);
      expect(check.currentTier).toBe('pro');
      expect(check.reason).toContain('Pro tier');
      expect(check.billingMode.mode).toBe('demo');
    });
  });

  describe('sync and static helpers', () => {
    it('checks entitlement synchronously from an existing context', () => {
      const context = createFallbackContext('u-1');
      expect(entitlementService.isEntitlementGrantedSync(context, 'unlimited_applications')).toBe(false);

      context.entitlements.unlimited_applications = true;
      expect(entitlementService.isEntitlementGrantedSync(context, 'unlimited_applications')).toBe(true);
    });

    it('returns tier quotas and tier entitlements correctly', () => {
      const freeQuotas = entitlementService.getTierQuotas('free');
      expect(freeQuotas.applicationLimitMonthly).toBe(10);

      const proQuotas = entitlementService.getTierQuotas('pro');
      expect(proQuotas.applicationLimitMonthly).toBe('unlimited');

      const billing = entitlementService.getBillingMode();
      expect(billing.mode).toBe('demo');
      expect(billing.providerBacked).toBe(false);
    });
  });
});
